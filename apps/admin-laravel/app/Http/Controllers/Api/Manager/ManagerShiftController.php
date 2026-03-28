<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manager\StoreShiftRequest;
use App\Models\Job;
use App\Models\JobShift;
use App\Models\ManagerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Manages daily shifts (app.job_shifts) for a job owned by the authenticated manager.
 *
 * All routes are protected by middleware('role:manager').
 */
class ManagerShiftController extends Controller
{
    // ─── Ownership guards ────────────────────────────────────────────────────

    private function resolvedManagerProfile(Request $request): ManagerProfile
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $manager = $user->managerProfile;

        if ($manager === null || $manager->approval_status !== 'APPROVED') {
            abort(403, '승인된 매니저 프로필이 없습니다.');
        }

        return $manager;
    }

    private function ownedJob(string $jobId, ManagerProfile $manager): Job
    {
        $job = Job::findOrFail($jobId);

        if ($job->manager_id !== $manager->id) {
            abort(403, '이 공고에 대한 접근 권한이 없습니다.');
        }

        return $job;
    }

    // ─── Resource builder ───────────────────────────────────────────────────

    private function shiftResource(JobShift $shift): array
    {
        return [
            'id'        => $shift->id,
            'jobId'     => $shift->job_id,
            'workDate'  => $shift->work_date?->toDateString(),
            'status'    => $shift->status,
            'createdAt' => $shift->created_at?->toIso8601String(),
        ];
    }

    // ─── Routes ─────────────────────────────────────────────────────────────

    /**
     * GET /manager/jobs/{jobId}/shifts
     * List all shifts for a job, ordered by work_date ascending.
     */
    public function index(Request $request, string $jobId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $job     = $this->ownedJob($jobId, $manager);

        $shifts = $job->shifts()
            ->orderBy('work_date')
            ->get()
            ->map(fn (JobShift $s) => $this->shiftResource($s))
            ->values();

        return response()->json([
            'statusCode' => 200,
            'data'       => $shifts,
        ]);
    }

    /**
     * POST /manager/jobs/{jobId}/shifts
     * Create one or many shifts. Supports:
     *   - Single: { work_date: "2026-04-01" }
     *   - Batch:  { dates: ["2026-04-01", "2026-04-02", ...] }
     *
     * Duplicate (job_id, work_date) pairs are silently skipped via DB unique constraint.
     * Returns all shifts for the job after insertion.
     */
    public function store(StoreShiftRequest $request, string $jobId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $job     = $this->ownedJob($jobId, $manager);

        // Collect dates — prefer `dates[]` batch, fall back to single `work_date`
        $dates = $request->input('dates')
            ?? ($request->input('work_date') ? [$request->input('work_date')] : []);

        $now = now()->toDateTimeString();

        foreach ($dates as $date) {
            try {
                DB::table('app.job_shifts')->insertOrIgnore([
                    'id'         => \Illuminate\Support\Str::uuid()->toString(),
                    'job_id'     => $job->id,
                    'work_date'  => $date,
                    'status'     => 'OPEN',
                    'created_at' => $now,
                ]);
            } catch (\Exception) {
                // Silently skip any unexpected constraint violations
            }
        }

        // Return the full up-to-date shift list for this job
        $shifts = $job->shifts()
            ->orderBy('work_date')
            ->get()
            ->map(fn (JobShift $s) => $this->shiftResource($s))
            ->values();

        return response()->json([
            'statusCode' => 201,
            'data'       => $shifts,
        ], 201);
    }

    /**
     * PATCH /manager/shifts/{shiftId}/cancel
     * Cancel a single shift. Verifies the shift belongs to a job owned by this manager.
     */
    public function cancel(Request $request, string $shiftId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);

        $shift = JobShift::findOrFail($shiftId);

        // Verify ownership via the parent job
        $job = Job::findOrFail($shift->job_id);
        if ($job->manager_id !== $manager->id) {
            abort(403, '이 교대 근무에 대한 접근 권한이 없습니다.');
        }

        $shift->update(['status' => 'CANCELLED']);

        return response()->json([
            'statusCode' => 200,
            'data'       => $this->shiftResource($shift->fresh()),
        ]);
    }
}
