<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JobController extends Controller
{
    public function index(Request $request)
    {
        $search  = $request->query('q');
        $status  = $request->query('status');
        $tradeId = $request->query('trade');

        $query = DB::table('app.jobs as j')
            ->join('app.construction_sites as s', 's.id', '=', 'j.site_id')
            ->join('app.manager_profiles as mp', 'mp.id', '=', 'j.manager_id')
            ->leftJoin('ref.construction_trades as t', 't.id', '=', 'j.trade_id')
            ->select([
                'j.id', 'j.title', 'j.status', 'j.daily_wage', 'j.work_date',
                'j.slots_total', 'j.slots_filled', 'j.created_at',
                's.name as site_name', 's.province',
                'mp.representative_name as manager_name',
                't.name_ko as trade_name',
            ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('j.title', 'ilike', "%$search%")
                  ->orWhere('s.name', 'ilike', "%$search%")
                  ->orWhere('mp.representative_name', 'ilike', "%$search%");
            });
        }
        if ($status) $query->where('j.status', $status);
        if ($tradeId) $query->where('j.trade_id', $tradeId);

        $jobs = $query->orderByDesc('j.created_at')->paginate(25);
        $trades = DB::table('ref.construction_trades')->orderBy('name_ko')->get();

        return view('admin.jobs.index', compact('jobs', 'search', 'status', 'tradeId', 'trades'));
    }

    public function show(string $id)
    {
        $job = DB::table('app.jobs as j')
            ->join('app.construction_sites as s', 's.id', '=', 'j.site_id')
            ->join('app.manager_profiles as mp', 'mp.id', '=', 'j.manager_id')
            ->leftJoin('ref.construction_trades as t', 't.id', '=', 'j.trade_id')
            ->where('j.id', $id)
            ->select(['j.*', 's.name as site_name', 's.address', 's.province',
                      'mp.representative_name as manager_name', 't.name_ko as trade_name'])
            ->first();
        abort_if(!$job, 404);

        $applications = DB::table('app.job_applications as a')
            ->join('app.worker_profiles as wp', 'wp.id', '=', 'a.worker_id')
            ->where('a.job_id', $id)
            ->select(['a.id', 'a.status', 'a.applied_at', 'wp.full_name'])
            ->orderByDesc('a.applied_at')
            ->limit(20)
            ->get();

        $attendance = DB::table('app.attendance_records')
            ->select(DB::raw("status, COUNT(*) as cnt"))
            ->where('job_id', $id)
            ->groupBy('status')
            ->pluck('cnt', 'status');

        return view('admin.jobs.show', compact('job', 'applications', 'attendance'));
    }

    public function close(string $id)
    {
        DB::table('app.jobs')->where('id', $id)
            ->update(['status' => 'CANCELLED', 'updated_at' => now()]);
        return back()->with('success', '공고가 마감되었습니다.');
    }
}
