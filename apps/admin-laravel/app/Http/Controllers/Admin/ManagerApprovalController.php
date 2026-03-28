<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ManagerProfile;
use App\Services\Storage\S3Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ManagerApprovalController extends Controller
{
    public function __construct(private S3Service $s3) {}

    public function index(Request $request)
    {
        $status = $request->query('status', 'PENDING');
        $search = $request->query('q');

        $query = DB::table('app.manager_profiles as mp')
            ->join('auth.users as u', 'u.id', '=', 'mp.user_id')
            ->select([
                'mp.id', 'mp.representative_name', 'mp.business_type',
                'mp.company_name', 'mp.contact_phone', 'mp.province',
                'mp.approval_status', 'mp.created_at', 'mp.approved_at',
                'mp.rejection_reason', 'u.email', 'u.phone as user_phone',
            ])
            ->where('mp.approval_status', $status);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('mp.representative_name', 'ilike', "%$search%")
                  ->orWhere('u.email', 'ilike', "%$search%")
                  ->orWhere('mp.company_name', 'ilike', "%$search%");
            });
        }

        $profiles = $query->orderByDesc('mp.created_at')->paginate(20);
        $counts = DB::table('app.manager_profiles')
            ->select(DB::raw("approval_status, COUNT(*) as cnt"))
            ->groupBy('approval_status')
            ->pluck('cnt', 'approval_status');

        return view('admin.approvals.index', compact('profiles', 'status', 'search', 'counts'));
    }

    public function show(string $id)
    {
        $profile = DB::table('app.manager_profiles as mp')
            ->join('auth.users as u', 'u.id', '=', 'mp.user_id')
            ->leftJoin('auth.users as rev', 'rev.id', '=', 'mp.approved_by')
            ->select([
                'mp.*', 'u.email', 'u.phone as user_phone',
                'u.created_at as user_created_at',
                'rev.email as reviewer_email',
            ])
            ->where('mp.id', $id)
            ->first();

        abort_if(!$profile, 404);

        // Presigned URLs
        $businessRegUrl = $profile->business_reg_s3_key
            ? $this->s3->presignedUrl($profile->business_reg_s3_key, 900)
            : null;
        $signatureUrl = $profile->signature_s3_key
            ? $this->s3->presignedUrl($profile->signature_s3_key, 900)
            : null;

        // User's sites
        $sites = DB::table('app.construction_sites')
            ->where('manager_id', $profile->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return view('admin.approvals.show', compact('profile', 'businessRegUrl', 'signatureUrl', 'sites'));
    }

    public function approve(Request $request, string $id)
    {
        $profile = ManagerProfile::findOrFail($id);

        DB::transaction(function () use ($profile) {
            $adminId = session('admin_id');
            $profile->update([
                'approval_status'  => 'APPROVED',
                'approved_at'      => now(),
                'approved_by'      => $adminId,
                'rejection_reason' => null,
            ]);

            // Grant manager role
            DB::table('auth.user_roles')->updateOrInsert(
                ['user_id' => $profile->user_id, 'role' => 'manager'],
                ['status' => 'active', 'granted_at' => now(), 'granted_by' => $adminId, 'revoked_at' => null]
            );
        });

        return redirect()->route('admin.approvals.show', $id)
            ->with('success', '승인되었습니다. 매니저 권한이 부여되었습니다.');
    }

    public function reject(Request $request, string $id)
    {
        $request->validate(['reason' => 'required|string|min:5|max:500']);
        $profile = ManagerProfile::findOrFail($id);

        $profile->update([
            'approval_status'  => 'REJECTED',
            'rejection_reason' => $request->reason,
            'approved_by'      => session('admin_id'),
            'approved_at'      => now(),
        ]);

        return redirect()->route('admin.approvals.show', $id)
            ->with('success', '반려 처리되었습니다.');
    }
}
