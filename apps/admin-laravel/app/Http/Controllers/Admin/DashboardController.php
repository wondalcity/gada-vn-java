<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        // --- Stats cards ---
        $pendingApprovals = DB::table('app.manager_profiles')
            ->where('approval_status', 'PENDING')
            ->count();

        $totalUsers = DB::table('auth.users')
            ->where('status', 'ACTIVE')
            ->count();

        $newUsersThisWeek = DB::table('auth.users')
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        $newUsersLastWeek = DB::table('auth.users')
            ->whereBetween('created_at', [now()->subDays(14), now()->subDays(7)])
            ->count();

        $userGrowthPct = $newUsersLastWeek > 0
            ? round((($newUsersThisWeek - $newUsersLastWeek) / $newUsersLastWeek) * 100)
            : ($newUsersThisWeek > 0 ? 100 : 0);

        $activeJobs = DB::table('app.jobs')
            ->where('status', 'OPEN')
            ->count();

        $filledJobs = DB::table('app.jobs')
            ->where('status', 'FILLED')
            ->count();

        $completedJobs = DB::table('app.jobs')
            ->where('status', 'COMPLETED')
            ->count();

        $totalJobs = DB::table('app.jobs')->count();

        // --- Attendance today ---
        $todayAttendance = DB::table('app.attendance_records')
            ->select(DB::raw("status, COUNT(*) as cnt"))
            ->where('work_date', today())
            ->groupBy('status')
            ->pluck('cnt', 'status');

        $attendedToday = $todayAttendance->get('ATTENDED', 0);
        $absentToday   = $todayAttendance->get('ABSENT', 0);
        $halfDayToday  = $todayAttendance->get('HALF_DAY', 0);
        $pendingToday  = $todayAttendance->get('PENDING', 0);
        $totalToday    = $attendedToday + $absentToday + $halfDayToday + $pendingToday;

        // --- User growth (daily for last 14 days) ---
        $userGrowthRaw = DB::table('auth.users')
            ->select(DB::raw("DATE(created_at) as date, COUNT(*) as cnt"))
            ->where('created_at', '>=', now()->subDays(13))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->pluck('cnt', 'date');

        $growthLabels = [];
        $growthData   = [];
        for ($i = 13; $i >= 0; $i--) {
            $d = now()->subDays($i)->format('Y-m-d');
            $growthLabels[] = now()->subDays($i)->format('m/d');
            $growthData[]   = (int) $userGrowthRaw->get($d, 0);
        }

        // --- Pending approvals (recent 8) ---
        $pendingList = DB::table('app.manager_profiles as mp')
            ->join('auth.users as u', 'u.id', '=', 'mp.user_id')
            ->select([
                'mp.id',
                'mp.representative_name',
                'mp.business_type',
                'mp.company_name',
                'mp.contact_phone',
                'mp.created_at',
                'u.email',
            ])
            ->where('mp.approval_status', 'PENDING')
            ->orderByDesc('mp.created_at')
            ->limit(8)
            ->get();

        // --- Recent sites (last 6) ---
        $recentSites = DB::table('app.construction_sites as s')
            ->join('app.manager_profiles as mp', 'mp.id', '=', 's.manager_id')
            ->select([
                's.id', 's.name', 's.address', 's.province', 's.status',
                's.created_at', 'mp.representative_name as manager_name',
            ])
            ->orderByDesc('s.created_at')
            ->limit(6)
            ->get();

        // --- Recent jobs (last 6) ---
        $recentJobs = DB::table('app.jobs as j')
            ->join('app.construction_sites as s', 's.id', '=', 'j.site_id')
            ->leftJoin('ref.construction_trades as t', 't.id', '=', 'j.trade_id')
            ->select([
                'j.id', 'j.title', 'j.daily_wage', 'j.work_date',
                'j.status', 'j.slots_total', 'j.slots_filled',
                'j.created_at', 's.name as site_name', 't.name_ko as trade_name',
            ])
            ->orderByDesc('j.created_at')
            ->limit(6)
            ->get();

        return view('admin.dashboard.index', compact(
            'pendingApprovals', 'totalUsers', 'newUsersThisWeek', 'userGrowthPct',
            'activeJobs', 'filledJobs', 'completedJobs', 'totalJobs',
            'attendedToday', 'absentToday', 'halfDayToday', 'pendingToday', 'totalToday',
            'growthLabels', 'growthData',
            'pendingList', 'recentSites', 'recentJobs'
        ));
    }
}
