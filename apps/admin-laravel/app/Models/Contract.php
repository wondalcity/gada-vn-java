<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Maps to app.contracts.
 * Tracks the full lifecycle of a worker-manager contract:
 * PENDING_WORKER_SIGN → PENDING_MANAGER_SIGN → FULLY_SIGNED (or VOID).
 */
class Contract extends Model
{
    protected $table = 'app.contracts';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'application_id',
        'job_id',
        'worker_id',
        'manager_id',
        'contract_html',
        'contract_pdf_s3_key',
        'worker_signature_s3_key',
        'manager_signature_s3_key',
        'worker_signed_at',
        'manager_signed_at',
        'worker_signed_ip',
        'manager_signed_ip',
        'status',
    ];

    protected $casts = [
        'worker_signed_at'  => 'datetime',
        'manager_signed_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class, 'application_id');
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class, 'job_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(WorkerProfile::class, 'worker_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(ManagerProfile::class, 'manager_id');
    }
}
