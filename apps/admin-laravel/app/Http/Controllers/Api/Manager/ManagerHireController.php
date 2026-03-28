<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Contract;
use App\Models\ManagerProfile;
use App\Services\Contract\ContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Returns all ACCEPTED / CONTRACTED applications for the manager,
 * enriched with contract status and download URL.
 *
 * GET /manager/hires
 */
class ManagerHireController extends Controller
{
    public function __construct(private readonly ContractService $contractService) {}

    /**
     * GET /manager/hires
     */
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $manager = ManagerProfile::where('user_id', $user->id)->firstOrFail();

        // All ACCEPTED or CONTRACTED applications for jobs owned by this manager
        $hires = Application::with(['job.site', 'worker'])
            ->whereHas('job', fn ($q) => $q->where('manager_id', $manager->id))
            ->whereIn('status', ['ACCEPTED', 'CONTRACTED'])
            ->orderByDesc('reviewed_at')
            ->get();

        // Batch-load contracts keyed by application_id to avoid N+1
        $appIds    = $hires->pluck('id');
        $contracts = Contract::whereIn('application_id', $appIds)
            ->get()
            ->keyBy('application_id');

        $data = $hires->map(function (Application $hire) use ($contracts): array {
            $contract = $contracts[$hire->id] ?? null;

            return [
                'id'          => $hire->id,
                'jobId'       => $hire->job_id,
                'jobTitle'    => $hire->job->title,
                'siteName'    => $hire->job->site->name ?? '',
                'workDate'    => $hire->job->work_date,
                'dailyWage'   => $hire->job->daily_wage,
                'workerName'  => $hire->worker->full_name,
                'workerPhone' => DB::table('auth.users')
                    ->where('id', $hire->worker->user_id)
                    ->value('phone') ?? '',
                'status'      => $hire->status,
                'reviewedAt'  => $hire->reviewed_at,
                'contract'    => $contract ? [
                    'id'              => $contract->id,
                    'status'          => $contract->status,
                    'workerSignedAt'  => $contract->worker_signed_at?->toIso8601String(),
                    'managerSignedAt' => $contract->manager_signed_at?->toIso8601String(),
                    'downloadUrl'     => $this->contractService->getDownloadUrl($contract),
                ] : null,
            ];
        });

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
        ], 200);
    }
}
