<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Maps to app.construction_sites.
 * image_s3_keys stores an array of S3 object keys; cover_image_idx points to the cover.
 */
class Site extends Model
{
    protected $table = 'app.construction_sites';

    protected $fillable = [
        'manager_id', 'name', 'address', 'province', 'district',
        'lat', 'lng', 'site_type', 'status',
        'image_s3_keys', 'cover_image_idx',
    ];

    protected $casts = [
        'image_s3_keys'   => 'array',
        'lat'             => 'float',
        'lng'             => 'float',
        'cover_image_idx' => 'integer',
    ];

    public function manager(): BelongsTo
    {
        return $this->belongsTo(ManagerProfile::class, 'manager_id');
    }

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'site_id');
    }
}
