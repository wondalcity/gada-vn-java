<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin-facing attendance override.
 * Admins may correct any attendance record regardless of which manager created it.
 * A mandatory reason is required on every admin edit.
 *
 * PATCH /admin/attendance/{id}
 */
class AdminAttendanceController extends Controller
{
    /**
     * PATCH /admin/attendance/{id}
     * Override any attendance record. Writes an audit row before applying the change.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'status'         => 'required|in:ATTENDED,ABSENT,HALF_DAY,PENDING',
            'check_in_time'  => 'nullable|date_format:H:i',
            'check_out_time' => 'nullable|date_format:H:i',
            'hours_worked'   => 'nullable|numeric|min:0|max:24',
            'notes'          => 'nullable|string|max:500',
            'reason'         => 'required|string|max:500',   // admin must always provide reason
        ]);

        $record = AttendanceRecord::findOrFail($id);

        // Write audit record before applying the change
        DB::table('app.attendance_audits')->insert([
            'attendance_id' => $record->id,
            'changed_by'    => $request->user()->id,
            'changed_at'    => now(),
            'old_status'    => $record->status,
            'new_status'    => $request->status,
            'old_check_in'  => $record->check_in_time,
            'new_check_in'  => $request->check_in_time,
            'old_check_out' => $record->check_out_time,
            'new_check_out' => $request->check_out_time,
            'old_hours'     => $record->hours_worked,
            'new_hours'     => $request->hours_worked,
            'old_notes'     => $record->notes,
            'new_notes'     => $request->notes,
            'reason'        => $request->reason,
        ]);

        $record->update([
            'status'         => $request->status,
            'check_in_time'  => $request->check_in_time,
            'check_out_time' => $request->check_out_time,
            'hours_worked'   => $request->hours_worked,
            'notes'          => $request->notes,
            'marked_at'      => now(),
        ]);

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'id'     => $record->id,
                'status' => $record->status,
            ],
        ]);
    }
}
