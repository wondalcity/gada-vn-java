<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WorkerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin user management endpoints.
 *
 * GET    /admin/users      — paginated user list with roles, profile complete flag, application count
 * GET    /admin/users/{id} — full user detail
 * DELETE /admin/users/{id} — soft delete (set status=DELETED)
 */
class AdminUserController extends Controller
{
    /**
     * GET /admin/users
     * Returns a paginated list of all users with their active roles,
     * profile completeness flag (from app.worker_profiles), and application count.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page'    => 'integer|min:1',
            'limit'   => 'integer|min:1|max:100',
            'status'  => 'nullable|in:ACTIVE,INACTIVE,DELETED,SUSPENDED',
            'search'  => 'nullable|string|max:100',
        ]);

        $page  = (int) $request->query('page', 1);
        $limit = (int) $request->query('limit', 20);
        $offset = ($page - 1) * $limit;

        $search = $request->query('search');
        $status = $request->query('status');

        // Build WHERE clauses
        $conditions = ['1=1'];
        $bindings   = [];

        if ($status) {
            $conditions[] = 'u.status = ?';
            $bindings[]   = $status;
        }

        if ($search) {
            $conditions[] = '(u.email ILIKE ? OR u.phone ILIKE ? OR wp.full_name ILIKE ?)';
            $term         = '%' . $search . '%';
            $bindings[]   = $term;
            $bindings[]   = $term;
            $bindings[]   = $term;
        }

        $where = implode(' AND ', $conditions);

        $totalResult = DB::select(
            "SELECT COUNT(*) AS total
             FROM auth.users u
             LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
             WHERE {$where}",
            $bindings
        );
        $total = (int) ($totalResult[0]->total ?? 0);

        $rows = DB::select(
            "SELECT
                u.id,
                u.email,
                u.phone,
                u.status,
                u.created_at,
                wp.full_name,
                COALESCE(wp.profile_complete, false) AS profile_complete,
                (
                    SELECT COUNT(*)
                    FROM app.job_applications ja
                    INNER JOIN app.worker_profiles wp2 ON wp2.id = ja.worker_id
                    WHERE wp2.user_id = u.id
                ) AS application_count
             FROM auth.users u
             LEFT JOIN app.worker_profiles wp ON wp.user_id = u.id
             WHERE {$where}
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?",
            array_merge($bindings, [$limit, $offset])
        );

        // Fetch roles for all returned users in one query
        $userIds = array_column($rows, 'id');
        $roleMap = [];

        if (!empty($userIds)) {
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $roleRows     = DB::select(
                "SELECT user_id, role
                 FROM auth.user_roles
                 WHERE user_id IN ({$placeholders})
                   AND status = 'active'
                   AND revoked_at IS NULL",
                $userIds
            );
            foreach ($roleRows as $r) {
                $roleMap[$r->user_id][] = $r->role;
            }
        }

        $data = array_map(function ($row) use ($roleMap) {
            return [
                'id'               => $row->id,
                'email'            => $row->email,
                'phone'            => $row->phone,
                'status'           => $row->status,
                'roles'            => $roleMap[$row->id] ?? [],
                'fullName'         => $row->full_name,
                'profileComplete'  => (bool) $row->profile_complete,
                'applicationCount' => (int) $row->application_count,
                'createdAt'        => $row->created_at,
            ];
        }, $rows);

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
            'meta'       => [
                'total' => $total,
                'page'  => $page,
                'limit' => $limit,
                'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    /**
     * GET /admin/users/{id}
     * Returns full detail for a single user, including all roles (active and revoked),
     * worker profile, and manager profile if present.
     */
    public function show(string $id): JsonResponse
    {
        $user = User::with(['allRoles', 'managerProfile'])->findOrFail($id);

        $workerProfile = WorkerProfile::where('user_id', $user->id)->first();

        $applicationCount = $workerProfile
            ? DB::table('app.job_applications')
                  ->where('worker_id', $workerProfile->id)
                  ->count()
            : 0;

        $roles = $user->allRoles->map(fn ($r) => [
            'role'      => $r->role,
            'status'    => $r->status,
            'revokedAt' => $r->revoked_at?->toIso8601String(),
        ])->toArray();

        $managerProfile = $user->managerProfile ? [
            'companyName'      => $user->managerProfile->company_name,
            'approvalStatus'   => $user->managerProfile->approval_status,
            'businessType'     => $user->managerProfile->business_type,
            'representativeName' => $user->managerProfile->representative_name,
            'province'         => $user->managerProfile->province,
        ] : null;

        $data = [
            'id'               => $user->id,
            'email'            => $user->email,
            'phone'            => $user->phone,
            'status'           => $user->status,
            'locale'           => $user->locale,
            'roles'            => $roles,
            'fullName'         => $workerProfile?->full_name,
            'profileComplete'  => (bool) ($workerProfile?->profile_complete ?? false),
            'applicationCount' => (int) $applicationCount,
            'workerProfile'    => $workerProfile ? [
                'gender'            => $workerProfile->gender,
                'dateOfBirth'       => $workerProfile->date_of_birth?->toDateString(),
                'currentProvince'   => $workerProfile->current_province,
                'currentDistrict'   => $workerProfile->current_district,
                'primaryTradeId'    => $workerProfile->primary_trade_id,
                'experienceMonths'  => $workerProfile->experience_months,
                'idVerified'        => (bool) $workerProfile->id_verified,
                'termsAccepted'     => (bool) $workerProfile->terms_accepted,
                'termsAcceptedAt'   => $workerProfile->terms_accepted_at?->toIso8601String(),
            ] : null,
            'managerProfile'   => $managerProfile,
            'createdAt'        => $user->created_at?->toIso8601String(),
        ];

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
        ]);
    }

    /**
     * DELETE /admin/users/{id}
     * Soft-deletes a user by setting their status to DELETED.
     * Prevents deletion of admin/super-admin accounts.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Prevent self-deletion
        if ($user->id === $request->user()->id) {
            return response()->json([
                'statusCode' => 422,
                'message'    => 'Cannot delete your own account.',
            ], 422);
        }

        // Prevent deletion of other admins
        if ($user->isAdmin()) {
            return response()->json([
                'statusCode' => 403,
                'message'    => 'Cannot delete admin accounts.',
            ], 403);
        }

        $user->update(['status' => 'DELETED']);

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'id'     => $user->id,
                'status' => 'DELETED',
            ],
        ]);
    }
}
