<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Models\WorkerProfile;
use App\Services\Attendance\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Worker-facing attendance history.
 *
 * GET /worker/attendance?jobId=...  — list the worker's attendance records
 */
class WorkerAttendanceController extends Controller
{
    public function __construct(private AttendanceService $service) {}

    /**
     * GET /worker/attendance?jobId=...
     * Returns the authenticated worker's attendance history.
     * Optionally filtered by jobId.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['jobId' => 'nullable|uuid']);

        /** @var \App\Models\User $user */
        $user          = $request->user();
        $workerProfile = WorkerProfile::where('user_id', $user->id)->first();

        if (!$workerProfile) {
            return response()->json(['statusCode' => 200, 'data' => []]);
        }

        $records = $this->service->getWorkerHistory($workerProfile->id, $request->jobId);

        $data = $records->map(fn($r) => [
            'id'           => $r->id,
            'jobId'        => $r->job_id,
            'jobTitle'     => $r->job?->title,
            'siteName'     => $r->job?->site?->name,
            'workDate'     => $r->work_date?->format('Y-m-d'),
            'status'       => $r->status,
            'checkInTime'  => $r->check_in_time,
            'checkOutTime' => $r->check_out_time,
            'hoursWorked'  => $r->hours_worked,
            'notes'        => $r->notes,
            'markedAt'     => $r->marked_at?->toIso8601String(),
        ]);

        return response()->json(['statusCode' => 200, 'data' => $data]);
    }
}
