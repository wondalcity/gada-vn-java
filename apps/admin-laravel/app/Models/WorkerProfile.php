<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Represents a worker's profile in app.worker_profiles.
 * Created automatically on first GET /worker/profile.
 * profile_complete is set to true once full_name, date_of_birth, and gender are populated.
 */
class WorkerProfile extends Model
{
    protected $table = 'app.worker_profiles';

    protected $fillable = [
        'user_id', 'full_name', 'date_of_birth', 'gender', 'experience_months',
        'primary_trade_id', 'current_province', 'current_district', 'lat', 'lng',
        'id_number', 'id_front_s3_key', 'id_back_s3_key', 'id_verified',
        'signature_s3_key', 'profile_picture_s3_key', 'bio',
        'bank_account_number', 'bank_name', 'profile_complete',
        'terms_accepted', 'privacy_accepted', 'terms_accepted_at',
    ];

    protected $casts = [
        'date_of_birth'     => 'date',
        'id_verified'       => 'boolean',
        'profile_complete'  => 'boolean',
        'terms_accepted'    => 'boolean',
        'privacy_accepted'  => 'boolean',
        'terms_accepted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
