<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Trade;

/**
 * Maps to app.jobs.
 * Benefits and requirements are stored as JSONB; image_s3_keys as TEXT[].
 * daily_wage is VND stored as integer (NUMERIC in DB, cast to int here).
 */
class Job extends Model
{
    protected $table = 'app.jobs';

    protected $fillable = [
        'site_id', 'manager_id', 'title', 'description', 'trade_id',
        'work_date', 'start_time', 'end_time',
        'daily_wage', 'currency', 'benefits', 'requirements',
        'slots_total', 'slots_filled', 'status',
        'slug', 'published_at', 'expires_at',
        'image_s3_keys', 'cover_image_idx',
    ];

    protected $casts = [
        'benefits'        => 'array',
        'requirements'    => 'array',
        'image_s3_keys'   => 'array',
        'work_date'       => 'date',
        'published_at'    => 'datetime',
        'expires_at'      => 'datetime',
        'daily_wage'      => 'integer',
        'cover_image_idx' => 'integer',
        'slots_total'     => 'integer',
        'slots_filled'    => 'integer',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(ManagerProfile::class, 'manager_id');
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(JobShift::class, 'job_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'job_id');
    }

    public function trade(): BelongsTo
    {
        return $this->belongsTo(Trade::class, 'trade_id');
    }
}
