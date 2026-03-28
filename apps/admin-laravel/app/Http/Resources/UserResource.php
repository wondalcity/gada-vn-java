<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transforms a User model into the standard API response shape.
 * Used by: GET /me, POST /auth/social/facebook, POST /auth/register
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var User $this */
        $roles = $this->relationLoaded('roles') ? $this->roles : collect();

        return [
            'id'          => $this->id,
            'firebaseUid' => $this->firebase_uid,
            'name'        => $this->name,
            'phone'       => $this->phone,
            'email'       => $this->email,
            'locale'      => $this->locale ?? 'ko',
            'status'      => $this->status,

            // Computed role flags — used by frontend to gate manager features
            'isWorker'  => $this->isWorker(),
            'isManager' => $this->isManager(),
            'isAdmin'   => $this->isAdmin(),

            // Manager approval status — null if never applied, 'pending'|'approved'|'rejected'|'revoked' otherwise
            'managerStatus' => $this->managerProfile?->approval_status,

            // Full role list for debugging / admin use
            'roles' => $roles->map(fn ($role) => [
                'role'      => $role->role,
                'status'    => $role->status,
                'grantedAt' => $role->created_at?->toIso8601String(),
                'revokedAt' => $role->revoked_at?->toIso8601String(),
            ]),
        ];
    }
}
