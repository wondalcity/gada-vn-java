<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tracks a user's manager registration application.
 * is_current = true only for the most recent submission.
 * Re-submissions create a new row and set old one to is_current = false.
 */
class ManagerProfile extends Model
{
    protected $table = 'app.manager_profiles';

    protected $fillable = [
        'user_id', 'business_type', 'company_name', 'representative_name',
        'representative_dob', 'representative_gender', 'business_reg_number',
        'business_reg_s3_key', 'contact_phone', 'contact_address', 'province',
        'profile_picture_s3_key', 'signature_s3_key',
        'terms_accepted', 'privacy_accepted',
        'approval_status', 'is_current', 'rejection_reason',
        'first_site_name', 'first_site_address',
    ];

    protected $casts = [
        'representative_dob' => 'date',
        'terms_accepted'     => 'boolean',
        'privacy_accepted'   => 'boolean',
        'is_current'         => 'boolean',
        'approved_at'        => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
