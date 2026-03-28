<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Represents a user in auth.users.
 *
 * All users are automatically workers (worker role assigned on first login).
 * Manager role is gated by admin approval via manager_profiles.
 * Admin/super_admin roles are granted manually.
 */
class User extends Authenticatable
{
    protected $table = 'auth.users';

    protected $fillable = [
        'firebase_uid', 'name', 'phone', 'email',
        'password', 'locale', 'status',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    // ─── Relationships ──────────────────────────────────────────────────────

    /**
     * Active roles only (status=active AND revoked_at IS NULL).
     * Used by hasRole() for all auth checks.
     */
    public function roles(): HasMany
    {
        return $this->hasMany(UserRole::class)
            ->where('status', 'active')
            ->whereNull('revoked_at');
    }

    /**
     * All roles including revoked — used by admin views.
     */
    public function allRoles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    /**
     * Current manager profile (is_current = true).
     * Null if user has never applied to be a manager.
     */
    public function managerProfile(): HasOne
    {
        return $this->hasOne(ManagerProfile::class)
            ->where('is_current', true)
            ->latest();
    }

    // ─── Role checks ────────────────────────────────────────────────────────

    /**
     * Check if the user holds a given active role.
     * Roles are loaded eagerly in FirebaseAuthMiddleware via loadMissing('roles').
     */
    public function hasRole(string $role): bool
    {
        if ($this->relationLoaded('roles')) {
            return $this->roles->contains('role', $role);
        }
        return $this->roles()->where('role', $role)->exists();
    }

    /** Every authenticated user is a worker. */
    public function isWorker(): bool
    {
        return $this->hasRole('worker');
    }

    /**
     * Manager role is only active once admin approves the registration.
     * The role record is only inserted after approval, so this check is sufficient.
     */
    public function isManager(): bool
    {
        return $this->hasRole('manager');
    }

    /** Admins and super-admins have full access. */
    public function isAdmin(): bool
    {
        return $this->hasRole('admin') || $this->isSuperAdmin();
    }

    /**
     * Super admin is checked by email against env config.
     * NOT stored in DB — prevents privilege escalation via DB compromise.
     */
    public function isSuperAdmin(): bool
    {
        if (!$this->email) return false;
        $emails = array_filter(explode(',', config('gada.super_admin_emails', '')));
        return in_array(trim($this->email), $emails);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    /** True if the user's profile is incomplete (no name yet). */
    public function isNewUser(): bool
    {
        return empty($this->name);
    }
}
