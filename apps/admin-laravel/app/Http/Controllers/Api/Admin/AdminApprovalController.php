<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin manager approval endpoints (API).
 *
 * GET    /admin/manager-approvals           — list pending/approved/rejected
 * GET    /admin/manager-approvals/{id}      — detail
 * PATCH  /admin/manager-approvals/{id}/approve
 * PATCH  /admin/manager-approvals/{id}/reject
 */
class AdminApprovalController extends Controller
{
    /**
     * GET /admin/manager-approvals
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'PENDING');
        $limit  = min((int) $request->query('limit', 20), 100);

        $rows = DB::table('app.manager_profiles as mp')
            ->join('auth.users as u', 'u.id', '=', 'mp.user_id')
            ->select([
                'mp.id', 'mp.representative_name', 'mp.company_name',
                'mp.contact_phone', 'mp.province', 'mp.approval_status',
                'mp.created_at', 'mp.approved_at', 'mp.rejection_reason',
                'u.email', 'u.phone as user_phone',
            ])
            ->where('mp.approval_status', $status)
            ->orderByDesc('mp.created_at')
            ->paginate($limit);

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'items'    => $rows->items(),
                'total'    => $rows->total(),
                'page'     => $rows->currentPage(),
                'lastPage' => $rows->lastPage(),
            ],
        ]);
    }

    /**
     * GET /admin/manager-approvals/{id}
     */
    public function show(string $id): JsonResponse
    {
        $profile = DB::table('app.manager_profiles as mp')
            ->join('auth.users as u', 'u.id', '=', 'mp.user_id')
            ->where('mp.id', $id)
            ->select([
                'mp.*', 'u.email', 'u.phone as user_phone',
                'u.firebase_uid', 'u.status as user_status',
            ])
            ->first();

        if (!$profile) {
            return response()->json(['statusCode' => 404, 'message' => 'Not found'], 404);
        }

        return response()->json(['statusCode' => 200, 'data' => $profile]);
    }

    /**
     * PATCH /admin/manager-approvals/{id}/approve
     */
    public function approve(string $id): JsonResponse
    {
        $affected = DB::table('app.manager_profiles')
            ->where('id', $id)
            ->update([
                'approval_status' => 'APPROVED',
                'approved_at'     => now(),
                'rejection_reason' => null,
                'updated_at'      => now(),
            ]);

        if ($affected === 0) {
            return response()->json(['statusCode' => 404, 'message' => 'Not found'], 404);
        }

        return response()->json(['statusCode' => 200, 'data' => ['success' => true]]);
    }

    /**
     * PATCH /admin/manager-approvals/{id}/reject
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $affected = DB::table('app.manager_profiles')
            ->where('id', $id)
            ->update([
                'approval_status'  => 'REJECTED',
                'rejection_reason' => $data['reason'] ?? null,
                'updated_at'       => now(),
            ]);

        if ($affected === 0) {
            return response()->json(['statusCode' => 404, 'message' => 'Not found'], 404);
        }

        return response()->json(['statusCode' => 200, 'data' => ['success' => true]]);
    }
}
