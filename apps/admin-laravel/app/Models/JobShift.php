<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Maps to app.job_shifts.
 * One row per (job_id, work_date) pair; unique constraint enforced at DB level.
 * No Eloquent timestamps — created_at is managed by DB default, no updated_at column.
 */
class JobShift extends Model
{
    public $timestamps = false;

    protected $table = 'app.job_shifts';

    protected $fillable = ['job_id', 'work_date', 'status'];

    protected $casts = [
        'work_date'  => 'date',
        'created_at' => 'datetime',
    ];

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class, 'job_id');
    }
}
