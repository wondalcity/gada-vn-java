<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('q');
        $role   = $request->query('role');

        $query = DB::table('auth.users as u')
            ->leftJoin('auth.user_roles as r', function ($j) {
                $j->on('r.user_id', '=', 'u.id')->whereNull('r.revoked_at');
            })
            ->leftJoin('app.worker_profiles as wp', 'wp.user_id', '=', 'u.id')
            ->leftJoin('app.manager_profiles as mp', 'mp.user_id', '=', 'u.id')
            ->select([
                'u.id', 'u.email', 'u.phone', 'u.status', 'u.role', 'u.created_at',
                DB::raw("STRING_AGG(r.role, ',') as roles"),
                DB::raw("COALESCE(wp.full_name, mp.representative_name, split_part(u.email, '@', 1), u.phone) as full_name"),
                DB::raw("COALESCE(wp.profile_complete, FALSE) as profile_complete"),
            ])
            ->groupBy('u.id', 'u.email', 'u.phone', 'u.status', 'u.role', 'u.created_at',
                       'wp.full_name', 'mp.representative_name', 'wp.profile_complete');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('u.email', 'ilike', "%$search%")
                  ->orWhere('u.phone', 'ilike', "%$search%")
                  ->orWhere('wp.full_name', 'ilike', "%$search%");
            });
        }

        if ($role) {
            $query->where(function ($q) use ($role) {
                $q->whereRaw("LOWER(u.role) = LOWER(?)", [$role])
                  ->orWhereRaw("LOWER(u.role) ILIKE ?", ["%$role%"]);
            });
        }

        $users = $query->orderByDesc('u.created_at')->paginate(25);

        return view('admin.users.index', compact('users', 'search', 'role'));
    }

    public function show(string $id)
    {
        $user = DB::table('auth.users as u')
            ->where('u.id', $id)
            ->first();
        abort_if(!$user, 404);

        $roles = DB::table('auth.user_roles')
            ->where('user_id', $id)
            ->get();

        $workerProfile = DB::table('app.worker_profiles')
            ->where('user_id', $id)
            ->first();

        $managerProfile = DB::table('app.manager_profiles')
            ->where('user_id', $id)
            ->first();

        $applicationCount = DB::table('app.job_applications as a')
            ->join('app.worker_profiles as wp', 'wp.id', '=', 'a.worker_id')
            ->where('wp.user_id', $id)
            ->count();

        $recentActivity = DB::table('ops.audit_logs')
            ->where('user_id', $id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return view('admin.users.show', compact(
            'user', 'roles', 'workerProfile', 'managerProfile',
            'applicationCount', 'recentActivity'
        ));
    }

    public function suspend(Request $request, string $id)
    {
        DB::table('auth.users')->where('id', $id)->update(['status' => 'SUSPENDED']);
        return back()->with('success', '계정이 정지되었습니다.');
    }

    public function activate(Request $request, string $id)
    {
        DB::table('auth.users')->where('id', $id)->update(['status' => 'ACTIVE']);
        return back()->with('success', '계정이 활성화되었습니다.');
    }

    public function destroy(Request $request, string $id)
    {
        // Soft-delete: mark as DELETED
        DB::table('auth.users')->where('id', $id)->update(['status' => 'DELETED']);
        return redirect()->route('admin.users.index')->with('success', '계정이 삭제되었습니다.');
    }
}
