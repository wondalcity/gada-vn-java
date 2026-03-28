<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\WorkerProfile;
use App\Services\Contract\ContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles contract viewing and worker signature for the worker role.
 *
 * GET  /worker/contracts/{id}       — view contract detail + presigned download URL
 * POST /worker/contracts/{id}/sign  — submit worker signature (base64 PNG data URL)
 */
class WorkerContractController extends Controller
{
    public function __construct(private readonly ContractService $contractService) {}

    /**
     * GET /worker/contracts/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user   = $request->user();
        $worker = WorkerProfile::where('user_id', $user->id)->firstOrFail();

        $contract = Contract::with(['job.site', 'job.trade', 'manager'])
            ->where('id', $id)
            ->orWhere('application_id', $id)
            ->first();

        if (!$contract) {
            return response()->json(['statusCode' => 404, 'message' => '계약서를 찾을 수 없습니다.'], 404);
        }

        if ($contract->worker_id !== $worker->id) {
            return response()->json([
                'statusCode' => 403,
                'message'    => '접근 권한이 없습니다.',
            ], 403);
        }

        $downloadUrl  = $this->contractService->getDownloadUrl($contract);
        $workerSigUrl = $contract->worker_signature_s3_key
            ? $this->contractService->getSignatureUrl($contract->worker_signature_s3_key)
            : null;
        $managerSigUrl = $contract->manager_signature_s3_key
            ? $this->contractService->getSignatureUrl($contract->manager_signature_s3_key)
            : null;

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'id'              => $contract->id,
                'status'          => $contract->status,
                'jobTitle'        => $contract->job->title,
                'siteName'        => $contract->job->site->name ?? '',
                'workDate'        => $contract->job->work_date,
                'dailyWage'       => $contract->job->daily_wage,
                'managerName'     => $contract->manager->representative_name,
                'downloadUrl'     => $downloadUrl,
                'workerSigUrl'    => $workerSigUrl,
                'managerSigUrl'   => $managerSigUrl,
                'workerSignedAt'  => $contract->worker_signed_at?->toIso8601String(),
                'managerSignedAt' => $contract->manager_signed_at?->toIso8601String(),
                'createdAt'       => $contract->created_at->toIso8601String(),
            ],
        ], 200);
    }

    /**
     * POST /worker/contracts/{id}/sign
     */
    public function sign(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'signature_data_url' => 'required|string',
        ]);

        $user   = $request->user();
        $worker = WorkerProfile::where('user_id', $user->id)->firstOrFail();

        $contract = Contract::where('id', $id)
            ->orWhere('application_id', $id)
            ->first();

        if (!$contract) {
            return response()->json(['statusCode' => 404, 'message' => '계약서를 찾을 수 없습니다.'], 404);
        }

        if ($contract->worker_id !== $worker->id) {
            return response()->json([
                'statusCode' => 403,
                'message'    => '접근 권한이 없습니다.',
            ], 403);
        }

        if ($contract->status !== 'PENDING_WORKER_SIGN') {
            return response()->json([
                'statusCode' => 422,
                'message'    => '서명할 수 없는 상태입니다.',
            ], 422);
        }

        $contract = $this->contractService->workerSign(
            $contract,
            $worker,
            $request->input('signature_data_url'),
            $request->ip()
        );

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'id'             => $contract->id,
                'status'         => $contract->status,
                'workerSignedAt' => $contract->worker_signed_at?->toIso8601String(),
            ],
        ], 200);
    }
}
