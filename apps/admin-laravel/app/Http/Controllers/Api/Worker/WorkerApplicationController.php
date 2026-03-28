<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\WorkerProfile;
use App\Services\Application\ApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Worker-facing application endpoints.
 *
 * POST   /jobs/{jobId}/apply           — apply for a job
 * GET    /worker/applications          — list own applications
 * DELETE /worker/applications/{id}     — withdraw a pending application
 */
class WorkerApplicationController extends Controller
{
    public function __construct(private ApplicationService $service) {}

    /**
     * POST /jobs/{jobId}/apply
     */
    public function store(Request $request, string $jobId): JsonResponse
    {
        $request->validate([
            'cover_letter' => 'nullable|string|max:500',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $workerProfile = WorkerProfile::where('user_id', $user->id)->first();

        if (!$workerProfile) {
            return response()->json([
                'statusCode' => 422,
                'message'    => '프로필을 먼저 완성해주세요',
            ], 422);
        }

        try {
            $application = $this->service->apply($jobId, $workerProfile->id);
        } catch (\DomainException $e) {
            $messages = [
                'JOB_NOT_OPEN'    => '마감된 공고입니다',
                'JOB_FULL'        => '모집이 완료되었습니다',
                'JOB_EXPIRED'     => '지원 기간이 종료되었습니다',
                'ALREADY_APPLIED' => '이미 지원한 공고입니다',
            ];
            $msg = $messages[$e->getMessage()] ?? $e->getMessage();
            return response()->json(['statusCode' => 422, 'message' => $msg], 422);
        }

        return response()->json([
            'statusCode' => 201,
            'data'       => [
                'id'        => $application->id,
                'status'    => 'PENDING',
                'appliedAt' => $application->applied_at,
            ],
        ], 201);
    }

    /**
     * GET /worker/applications
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $workerProfile = WorkerProfile::where('user_id', $user->id)->first();

        if (!$workerProfile) {
            return response()->json([
                'statusCode' => 200,
                'data'       => [],
                'meta'       => ['total' => 0, 'page' => 1, 'limit' => 20, 'lastPage' => 1],
            ]);
        }

        $paginated = Application::where('worker_id', $workerProfile->id)
            ->with(['job' => fn($q) => $q->with('site')])
            ->orderBy('applied_at', 'desc')
            ->paginate(20);

        $data = $paginated->getCollection()->map(function (Application $app) {
            $job  = $app->job;
            $site = $job?->site;

            return [
                'id'        => $app->id,
                'jobId'     => $app->job_id,
                'jobTitle'  => $job?->title,
                'siteName'  => $site?->name,
                'siteId'    => $site?->id,
                'workDate'  => $job?->work_date?->toDateString(),
                'dailyWage' => $job?->daily_wage,
                'status'    => $app->status,
                'appliedAt' => $app->applied_at,
                'notes'     => $app->notes,
            ];
        });

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
            'meta'       => [
                'total'    => $paginated->total(),
                'page'     => $paginated->currentPage(),
                'limit'    => $paginated->perPage(),
                'lastPage' => $paginated->lastPage(),
            ],
        ]);
    }

    /**
     * DELETE /worker/applications/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $workerProfile = WorkerProfile::where('user_id', $user->id)->firstOrFail();

        $application = Application::where('id', $id)
            ->where('worker_id', $workerProfile->id)
            ->firstOrFail();

        try {
            $this->service->withdraw($application, $workerProfile->id);
        } catch (\DomainException $e) {
            if ($e->getMessage() === 'CANNOT_WITHDRAW') {
                return response()->json([
                    'statusCode' => 422,
                    'message'    => '합격 또는 완료된 지원은 취소할 수 없습니다',
                ], 422);
            }
            return response()->json(['statusCode' => 422, 'message' => $e->getMessage()], 422);
        }

        return response()->json(null, 204);
    }
}
