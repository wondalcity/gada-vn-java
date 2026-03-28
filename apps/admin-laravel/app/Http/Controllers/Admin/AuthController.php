<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (session()->has('admin_id')) {
            return redirect()->route('admin.dashboard');
        }
        return view('admin.login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // Check password
        if ($request->password !== config('gada.admin_panel_password')) {
            return back()->withErrors(['password' => '비밀번호가 올바르지 않습니다.'])->withInput();
        }

        // Find user by email
        $user = DB::table('auth.users')->where('email', $request->email)->first();

        if (!$user) {
            return back()->withErrors(['email' => '등록되지 않은 이메일입니다.'])->withInput();
        }

        // Check admin role
        $isAdmin = DB::table('auth.user_roles')
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->whereNull('revoked_at')
            ->exists();

        $isSuperAdmin = in_array($user->email, array_filter(
            explode(',', config('gada.super_admin_emails', ''))
        ));

        if (!$isAdmin && !$isSuperAdmin) {
            return back()->withErrors(['email' => '관리자 권한이 없습니다.'])->withInput();
        }

        session([
            'admin_id'    => $user->id,
            'admin_email' => $user->email,
            'admin_name'  => $user->name ?? $user->email,
        ]);

        return redirect()->route('admin.dashboard')->with('success', '로그인되었습니다.');
    }

    public function logout(Request $request)
    {
        session()->forget(['admin_id', 'admin_email', 'admin_name']);
        return redirect()->route('admin.login')->with('success', '로그아웃되었습니다.');
    }
}
