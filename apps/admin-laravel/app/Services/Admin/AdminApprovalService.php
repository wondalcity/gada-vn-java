<?php

namespace App\Services\Admin;

use Illuminate\Support\Facades\DB;

class AdminApprovalService
{
    public function approve(string $profileId, string $adminUserId): void
    {
        DB::transaction(function () use ($profileId, $adminUserId) {
            $profile = DB::table('app.manager_profiles')->where('id', $profileId)->lockForUpdate()->first();
            if (!$profile || $profile->approval_status !== 'PENDING') return;

            DB::table('app.manager_profiles')->where('id', $profileId)->update([
                'approval_status'  => 'APPROVED',
                'approved_at'      => now(),
                'approved_by'      => $adminUserId,
                'rejection_reason' => null,
                'updated_at'       => now(),
            ]);

            DB::table('auth.user_roles')->updateOrInsert(
                ['user_id' => $profile->user_id, 'role' => 'manager'],
                ['status' => 'active', 'granted_at' => now(), 'granted_by' => $adminUserId, 'revoked_at' => null]
            );
        });
    }

    public function reject(string $profileId, string $reason, string $adminUserId): void
    {
        DB::table('app.manager_profiles')->where('id', $profileId)->update([
            'approval_status'  => 'REJECTED',
            'rejection_reason' => $reason,
            'approved_by'      => $adminUserId,
            'approved_at'      => now(),
            'updated_at'       => now(),
        ]);
    }
}
