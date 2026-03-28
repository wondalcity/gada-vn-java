<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Job;
use App\Models\ManagerProfile;
use App\Services\Application\ApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manager-facing application management.
 *
 * GET    /manager/jobs/{jobId}/applications            — list applications for a job
 * PATCH  /manager/applications/{id}/accept             — accept an application
 * PATCH  /manager/applications/{id}/reject             — reject an application
 * POST   /manager/jobs/{jobId}/applications/bulk-accept — bulk accept
 * PATCH  /manager/hires/{id}/cancel                   — cancel an accepted hire
 */
class ManagerApplicationController extends Controller
{
    public function __construct(private ApplicationService $service) {}

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function getManagerProfile(Request $request): ManagerProfile
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        return ManagerProfile::where('user_id', $user->id)
            ->where('is_current', true)
            ->firstOrFail();
    }

    private function assertJobOwnership(Job $job, ManagerProfile $manager): void
    {
        if ($job->manager_id !== $manager->id) {
            abort(403, '접근 권한이 없습니다');
        }
    }

    // ─── Endpoints ────────────────────────────────────────────────────────────

    /**
     * GET /manager/jobs/{jobId}/applications
     */
    public function index(Request $request, string $jobId): JsonResponse
    {
        $manager = $this->getManagerProfile($request);
        $job     = Job::findOrFail($jobId);
        $this->assertJobOwnership($job, $manager);

        $applications = Application::where('job_id', $jobId)
            ->with([
                'worker' => fn($q) => $q
                    ->with('user:id,name,phone')
                    ->leftJoin('ref.construction_trades as t', 't.id', '=', 'app.worker_profiles.primary_trade_id')
                    ->select('app.worker_profiles.*', 't.name_ko as trade_name_ko'),
            ])
            ->when($request->status, fn($q, $s) => $q->where('status', strtoupper($s)))
            ->orderBy('applied_at', 'asc')
            ->get();

        $data = $applications->map(function (Application $app) {
            $worker = $app->worker;
            $user   = $worker?->user;

            return [
                'id'        => $app->id,
                'status'    => $app->status,
                'appliedAt' => $app->applied_at,
                'notes'     => $app->notes,
                'worker'    => $worker ? [
                    'id'                => $worker->id,
                    'name'              => $user?->name,
                    'phone'             => $user?->phone,
                    'experienceMonths'  => $worker->experience_months,
                    'primaryTradeId'    => $worker->primary_trade_id,
                    'tradeNameKo'       => $worker->trade_name_ko ?? null,
                    'idVerified'        => $worker->id_verified,
                    'hasSignature'      => filled($worker->signature_s3_key),
                    'profilePictureUrl' => null, // Presigned URL computed separately if needed
                ] : null,
            ];
        });

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
            'meta'       => [
                'slotsTotal'  => $job->slots_total,
                'slotsFilled' => $job->slots_filled,
                'status'      => $job->status,
            ],
        ]);
    }

    /**
     * PATCH /manager/applications/{id}/accept
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        $manager     = $this->getManagerProfile($request);
        $application = Application::findOrFail($id);
        $job         = Job::findOrFail($application->job_id);
        $this->assertJobOwnership($job, $manager);

        try {
            $this->service->accept($application, $manager->id);
        } catch (\DomainException $e) {
            $messages = [
                'JOB_FULL'                  => '더 이상 선발할 수 없습니다 (정원 초과)',
                'INVALID_STATUS_TRANSITION' => '이미 처리된 지원입니다',
            ];
            $msg = $messages[$e->getMessage()] ?? $e->getMessage();
            return response()->json(['statusCode' => 422, 'message' => $msg], 422);
        }

        $job->refresh();

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'applicationId' => $application->id,
                'newStatus'     => 'ACCEPTED',
                'slotsFilled'   => $job->slots_filled,
                'slotsTotal'    => $job->slots_total,
                'jobStatus'     => $job->status,
            ],
        ]);
    }

    /**
     * PATCH /manager/applications/{id}/reject
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $manager     = $this->getManagerProfile($request);
        $application = Application::findOrFail($id);
        $job         = Job::findOrFail($application->job_id);
        $this->assertJobOwnership($job, $manager);

        $this->service->reject($application, $manager->id, $request->notes);

        $job->refresh();

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'applicationId' => $application->id,
                'newStatus'     => 'REJECTED',
                'slotsFilled'   => $job->slots_filled,
                'slotsTotal'    => $job->slots_total,
                'jobStatus'     => $job->status,
            ],
        ]);
    }

    /**
     * POST /manager/jobs/{jobId}/applications/bulk-accept
     */
    public function bulkAccept(Request $request, string $jobId): JsonResponse
    {
        $request->validate([
            'applicationIds'   => 'required|array|min:1',
            'applicationIds.*' => 'uuid',
        ]);

        $manager = $this->getManagerProfile($request);
        $job     = Job::findOrFail($jobId);
        $this->assertJobOwnership($job, $manager);

        try {
            $result = $this->service->bulkAccept($job, $request->applicationIds, $manager->id);
        } catch (\DomainException $e) {
            if ($e->getMessage() === 'EXCEEDS_SLOTS') {
                return response()->json([
                    'statusCode' => 422,
                    'message'    => '선택한 인원이 잔여 모집 인원을 초과합니다',
                ], 422);
            }
            return response()->json(['statusCode' => 422, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'statusCode' => 200,
            'data'       => $result,
        ]);
    }

    /**
     * PATCH /manager/hires/{id}/cancel
     * Cancels an ACCEPTED application (demotes it back to REJECTED, frees a slot).
     */
    public function cancelHire(Request $request, string $id): JsonResponse
    {
        $manager     = $this->getManagerProfile($request);
        $application = Application::where('id', $id)
            ->where('status', 'ACCEPTED')
            ->firstOrFail();

        $job = Job::findOrFail($application->job_id);
        $this->assertJobOwnership($job, $manager);

        $this->service->reject($application, $manager->id, '매니저 취소');

        $job->refresh();

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'applicationId' => $application->id,
                'newStatus'     => 'REJECTED',
                'slotsFilled'   => $job->slots_filled,
                'slotsTotal'    => $job->slots_total,
            ],
        ]);
    }
}
