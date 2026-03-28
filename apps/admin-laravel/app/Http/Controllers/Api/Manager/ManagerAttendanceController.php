<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Models\ManagerProfile;
use App\Services\Attendance\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manager-facing attendance management.
 *
 * GET  /manager/jobs/{jobId}/attendance                       — roster + existing records for a date
 * PUT  /manager/jobs/{jobId}/attendance                       — upsert batch of attendance records
 * GET  /manager/jobs/{jobId}/attendance/{attendanceId}/audit  — audit trail for a record
 */
class ManagerAttendanceController extends Controller
{
    public function __construct(private AttendanceService $service) {}

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function getManager(Request $request): ManagerProfile
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $manager = $user->managerProfile;
        if (!$manager) {
            abort(403, '매니저 프로필이 없습니다.');
        }
        return $manager;
    }

    // ─── Endpoints ────────────────────────────────────────────────────────────

    /**
     * GET /manager/jobs/{jobId}/attendance?date=YYYY-MM-DD
     * Returns the full worker roster merged with any existing attendance for the date.
     */
    public function index(Request $request, string $jobId): JsonResponse
    {
        $request->validate(['date' => 'required|date']);
        $workDate = $request->date;

        $manager = $this->getManager($request);
        $job     = Job::findOrFail($jobId);
        if ($job->manager_id !== $manager->id) {
            abort(403);
        }

        $roster = $this->service->getRoster($jobId, $workDate);

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'jobId'    => $jobId,
                'jobTitle' => $job->title,
                'workDate' => $workDate,
                'roster'   => $roster,
            ],
        ]);
    }

    /**
     * PUT /manager/jobs/{jobId}/attendance
     * Upsert attendance records for one or more workers on a given date.
     */
    public function upsert(Request $request, string $jobId): JsonResponse
    {
        $request->validate([
            'work_date'                => 'required|date',
            'records'                  => 'required|array|min:1',
            'records.*.worker_id'      => 'required|uuid',
            'records.*.status'         => 'required|in:ATTENDED,ABSENT,HALF_DAY,PENDING',
            'records.*.check_in_time'  => 'nullable|date_format:H:i',
            'records.*.check_out_time' => 'nullable|date_format:H:i',
            'records.*.hours_worked'   => 'nullable|numeric|min:0|max:24',
            'records.*.notes'          => 'nullable|string|max:500',
            'reason'                   => 'nullable|string|max:500',
        ]);

        $manager = $this->getManager($request);
        $job     = Job::findOrFail($jobId);
        if ($job->manager_id !== $manager->id) {
            abort(403);
        }

        $saved = $this->service->upsertBatch(
            $jobId,
            $request->work_date,
            $request->records,
            $manager->id,
            $request->user()->id,
            $request->reason
        );

        return response()->json([
            'statusCode' => 200,
            'data'       => array_map([$this->service, 'formatRecord'], $saved),
        ]);
    }

    /**
     * GET /manager/jobs/{jobId}/attendance/{attendanceId}/audit
     * Returns the audit trail for a specific attendance record.
     */
    public function auditHistory(Request $request, string $jobId, string $attendanceId): JsonResponse
    {
        $manager = $this->getManager($request);
        $job     = Job::findOrFail($jobId);
        if ($job->manager_id !== $manager->id) {
            abort(403);
        }

        $history = $this->service->getAuditHistory($attendanceId);

        return response()->json([
            'statusCode' => 200,
            'data'       => $history,
        ]);
    }
}
