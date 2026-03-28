<?php

namespace App\Services\Attendance;

use App\Models\AttendanceRecord;
use App\Models\Application;
use Illuminate\Support\Facades\DB;

class AttendanceService
{
    /**
     * Upsert attendance for a list of workers on a given job/date.
     * Each item: { worker_id, status, check_in_time?, check_out_time?, notes? }
     * Automatically computes hours_worked if check_in and check_out are provided.
     * Writes to attendance_audits for any records that changed.
     *
     * @param  string  $jobId
     * @param  string  $workDate
     * @param  array   $records
     * @param  string  $managerProfileId
     * @param  string  $changedByUserId
     * @param  string|null  $reason
     * @return AttendanceRecord[]
     */
    public function upsertBatch(
        string $jobId,
        string $workDate,
        array  $records,
        string $managerProfileId,
        string $changedByUserId,
        ?string $reason = null
    ): array {
        return DB::transaction(function () use ($jobId, $workDate, $records, $managerProfileId, $changedByUserId, $reason) {
            $saved = [];

            foreach ($records as $rec) {
                $workerId   = $rec['worker_id'];
                $status     = strtoupper($rec['status'] ?? 'PENDING');
                $checkIn    = $rec['check_in_time'] ?? null;
                $checkOut   = $rec['check_out_time'] ?? null;
                $notes      = $rec['notes'] ?? null;

                // Auto-compute hours_worked
                $hoursWorked = $rec['hours_worked'] ?? null;
                if ($hoursWorked === null && $checkIn && $checkOut) {
                    [$inH, $inM]   = explode(':', $checkIn);
                    [$outH, $outM] = explode(':', $checkOut);
                    $inMins  = (int)$inH * 60 + (int)$inM;
                    $outMins = (int)$outH * 60 + (int)$outM;
                    if ($outMins > $inMins) {
                        $hoursWorked = round(($outMins - $inMins) / 60, 2);
                    }
                }
                if ($status === 'HALF_DAY' && $hoursWorked === null) {
                    $hoursWorked = 4.0;
                }

                // Load existing record for audit diff
                $existing = AttendanceRecord::where('job_id', $jobId)
                    ->where('worker_id', $workerId)
                    ->where('work_date', $workDate)
                    ->first();

                $newData = [
                    'job_id'         => $jobId,
                    'worker_id'      => $workerId,
                    'work_date'      => $workDate,
                    'status'         => $status,
                    'check_in_time'  => $checkIn,
                    'check_out_time' => $checkOut,
                    'hours_worked'   => $hoursWorked,
                    'marked_by'      => $managerProfileId,
                    'marked_at'      => now(),
                    'notes'          => $notes,
                ];

                if ($existing) {
                    // Only write audit if something actually changed
                    $changed = collect(['status', 'check_in_time', 'check_out_time', 'hours_worked', 'notes'])
                        ->some(fn($field) => $existing->$field != $newData[$field]);

                    if ($changed) {
                        DB::table('app.attendance_audits')->insert([
                            'attendance_id' => $existing->id,
                            'changed_by'    => $changedByUserId,
                            'changed_at'    => now(),
                            'old_status'    => $existing->status,
                            'new_status'    => $status,
                            'old_check_in'  => $existing->check_in_time,
                            'new_check_in'  => $checkIn,
                            'old_check_out' => $existing->check_out_time,
                            'new_check_out' => $checkOut,
                            'old_hours'     => $existing->hours_worked,
                            'new_hours'     => $hoursWorked,
                            'old_notes'     => $existing->notes,
                            'new_notes'     => $notes,
                            'reason'        => $reason,
                        ]);
                        $existing->update($newData);
                        $saved[] = $existing->fresh();
                    } else {
                        $saved[] = $existing;
                    }
                } else {
                    $record  = AttendanceRecord::create($newData);
                    $saved[] = $record;
                }
            }

            return $saved;
        });
    }

    /**
     * Get worker roster for a job on a specific date.
     * Returns all ACCEPTED/CONTRACTED applications for this job,
     * merged with any existing attendance records for the given date.
     *
     * @param  string  $jobId
     * @param  string  $workDate
     * @return array
     */
    public function getRoster(string $jobId, string $workDate): array
    {
        // All hired workers (ACCEPTED or CONTRACTED applications)
        $applications = Application::where('job_id', $jobId)
            ->whereIn('status', ['ACCEPTED', 'CONTRACTED'])
            ->with([
                'worker' => fn($q) => $q
                    ->with('user:id,name,phone')
                    ->leftJoin('ref.construction_trades as t', 't.id', '=', 'app.worker_profiles.primary_trade_id')
                    ->select('app.worker_profiles.*', 't.name_ko as trade_name_ko'),
            ])
            ->get();

        // Existing attendance records for this date, keyed by worker_id
        $existing = AttendanceRecord::where('job_id', $jobId)
            ->where('work_date', $workDate)
            ->get()
            ->keyBy('worker_id');

        return $applications->map(function ($app) use ($existing) {
            $attendance = $existing->get($app->worker_id);
            return [
                'applicationId'    => $app->id,
                'workerId'         => $app->worker_id,
                'workerName'       => $app->worker?->user?->name ?? '(미입력)',
                'workerPhone'      => $app->worker?->user?->phone,
                'tradeNameKo'      => $app->worker->trade_name_ko ?? null,
                'experienceMonths' => $app->worker?->experience_months ?? 0,
                'attendance'       => $attendance ? $this->formatRecord($attendance) : null,
            ];
        })->values()->all();
    }

    /**
     * Get attendance history for a specific worker, optionally filtered by job.
     *
     * @param  string       $workerProfileId
     * @param  string|null  $jobId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getWorkerHistory(string $workerProfileId, ?string $jobId = null): \Illuminate\Database\Eloquent\Collection
    {
        return AttendanceRecord::where('worker_id', $workerProfileId)
            ->when($jobId, fn($q) => $q->where('job_id', $jobId))
            ->with(['job:id,title,work_date', 'job.site:id,name'])
            ->orderBy('work_date', 'desc')
            ->get();
    }

    /**
     * Get the full audit trail for a single attendance record.
     *
     * @param  string  $attendanceId
     * @return array
     */
    public function getAuditHistory(string $attendanceId): array
    {
        return DB::table('app.attendance_audits as a')
            ->leftJoin('auth.users as u', 'u.id', '=', 'a.changed_by')
            ->where('a.attendance_id', $attendanceId)
            ->orderBy('a.changed_at', 'desc')
            ->select('a.*', 'u.name as changer_name')
            ->get()
            ->map(fn($row) => (array)$row)
            ->all();
    }

    /**
     * Format an AttendanceRecord for API responses.
     *
     * @param  AttendanceRecord  $r
     * @return array
     */
    public function formatRecord(AttendanceRecord $r): array
    {
        return [
            'id'           => $r->id,
            'status'       => $r->status,
            'checkInTime'  => $r->check_in_time,
            'checkOutTime' => $r->check_out_time,
            'hoursWorked'  => $r->hours_worked,
            'markedAt'     => $r->marked_at?->toIso8601String(),
            'notes'        => $r->notes,
        ];
    }
}
