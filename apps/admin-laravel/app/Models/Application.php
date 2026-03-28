<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Maps to app.job_applications.
 * "Hires" are ACCEPTED applications — no separate hires table.
 */
class Application extends Model
{
    protected $table = 'app.job_applications';

    public $timestamps = false;

    protected $fillable = [
        'job_id', 'worker_id', 'status',
        'applied_at', 'reviewed_at', 'reviewed_by', 'notes',
    ];

    protected $casts = [
        'applied_at'  => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class, 'job_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(WorkerProfile::class, 'worker_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(ManagerProfile::class, 'reviewed_by');
    }
}
