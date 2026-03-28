<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $search     = $request->query('q');
        $entityType = $request->query('entity');
        $action     = $request->query('action');
        $dateFrom   = $request->query('from');
        $dateTo     = $request->query('to');

        $query = DB::table('ops.audit_logs as al')
            ->leftJoin('auth.users as u', 'u.id', '=', 'al.user_id')
            ->select([
                'al.id', 'al.action', 'al.entity_type', 'al.entity_id',
                'al.old_values', 'al.new_values', 'al.ip_address',
                'al.created_at', 'u.email as user_email',
            ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('u.email', 'ilike', "%$search%")
                  ->orWhere('al.entity_type', 'ilike', "%$search%")
                  ->orWhere('al.entity_id', 'ilike', "%$search%");
            });
        }
        if ($entityType) $query->where('al.entity_type', $entityType);
        if ($action)     $query->where('al.action', $action);
        if ($dateFrom)   $query->where('al.created_at', '>=', $dateFrom);
        if ($dateTo)     $query->where('al.created_at', '<=', $dateTo . ' 23:59:59');

        $logs = $query->orderByDesc('al.created_at')->paginate(50);

        $entityTypes = DB::table('ops.audit_logs')
            ->select(DB::raw('DISTINCT entity_type'))
            ->orderBy('entity_type')
            ->pluck('entity_type');

        return view('admin.audit.index', compact('logs', 'search', 'entityType', 'action', 'dateFrom', 'dateTo', 'entityTypes'));
    }
}
