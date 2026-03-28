<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SiteController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('q');
        $status = $request->query('status');

        $query = DB::table('app.construction_sites as s')
            ->join('app.manager_profiles as mp', 'mp.id', '=', 's.manager_id')
            ->select([
                's.id', 's.name', 's.address', 's.province', 's.status',
                's.created_at',
                'mp.representative_name as manager_name', 'mp.company_name',
                DB::raw("(SELECT COUNT(*) FROM app.jobs WHERE site_id = s.id AND status = 'OPEN') as open_jobs"),
                DB::raw("(SELECT COUNT(*) FROM app.jobs WHERE site_id = s.id) as total_jobs"),
            ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('s.name', 'ilike', "%$search%")
                  ->orWhere('s.address', 'ilike', "%$search%")
                  ->orWhere('mp.representative_name', 'ilike', "%$search%");
            });
        }
        if ($status) {
            $query->where('s.status', $status);
        }

        $sites = $query->orderByDesc('s.created_at')->paginate(20);
        return view('admin.sites.index', compact('sites', 'search', 'status'));
    }

    public function show(string $id)
    {
        $site = DB::table('app.construction_sites as s')
            ->join('app.manager_profiles as mp', 'mp.id', '=', 's.manager_id')
            ->where('s.id', $id)
            ->select(['s.*', 'mp.representative_name as manager_name', 'mp.company_name'])
            ->first();
        abort_if(!$site, 404);

        $jobs = DB::table('app.jobs as j')
            ->leftJoin('ref.construction_trades as t', 't.id', '=', 'j.trade_id')
            ->where('j.site_id', $id)
            ->select(['j.id', 'j.title', 'j.status', 'j.work_date', 'j.daily_wage',
                      'j.slots_total', 'j.slots_filled', 't.name_ko as trade_name'])
            ->orderByDesc('j.created_at')
            ->get();

        return view('admin.sites.show', compact('site', 'jobs'));
    }

    public function deactivate(string $id)
    {
        DB::table('app.construction_sites')->where('id', $id)
            ->update(['status' => 'INACTIVE', 'updated_at' => now()]);

        // Also cancel OPEN jobs on this site
        DB::table('app.jobs')->where('site_id', $id)->where('status', 'OPEN')
            ->update(['status' => 'CANCELLED', 'updated_at' => now()]);

        return back()->with('success', '현장이 비활성화되었습니다.');
    }
}
