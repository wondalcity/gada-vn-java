<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Observers\AuditLogObserver;

/**
 * Maps to app.attendance_records.
 * Tracks per-worker attendance for a given job and work date.
 * UNIQUE(job_id, worker_id, work_date) enforced at DB level.
 */
class AttendanceRecord extends Model
{
    protected $table = 'app.attendance_records';

    protected $fillable = [
        'job_id', 'worker_id', 'contract_id', 'work_date',
        'status', 'check_in_time', 'check_out_time', 'hours_worked',
        'marked_by', 'marked_at', 'notes',
    ];

    protected $casts = [
        'work_date'    => 'date',
        'marked_at'    => 'datetime',
        'hours_worked' => 'float',
    ];

    protected static function booted(): void
    {
        static::observe(AuditLogObserver::class);
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class, 'job_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(WorkerProfile::class, 'worker_id');
    }

    public function marker(): BelongsTo
    {
        return $this->belongsTo(ManagerProfile::class, 'marked_by');
    }
}
