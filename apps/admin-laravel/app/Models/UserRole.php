<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Represents a single role assignment in auth.user_roles.
 * Users can have multiple roles (worker + manager simultaneously).
 * A role is "active" when status='active' AND revoked_at IS NULL.
 */
class UserRole extends Model
{
    protected $table = 'auth.user_roles';

    protected $fillable = [
        'user_id', 'role', 'status', 'revoked_at',
    ];

    protected $casts = [
        'revoked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
