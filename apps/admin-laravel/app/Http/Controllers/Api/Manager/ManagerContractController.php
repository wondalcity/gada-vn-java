<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Contract;
use App\Models\ManagerProfile;
use App\Services\Contract\ContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles contract generation, viewing, and manager signature.
 *
 * POST /manager/applications/{applicationId}/contract  — generate contract from accepted application
 * GET  /manager/contracts/{id}                         — view contract detail + presigned download URL
 * POST /manager/contracts/{id}/sign                    — submit manager signature (base64 PNG data URL)
 */
class ManagerContractController extends Controller
{
    public function __construct(private readonly ContractService $contractService) {}

    /**
     * POST /manager/applications/{applicationId}/contract
     *
     * Generate a new contract for an ACCEPTED application.
     * Only the manager who owns the job may call this.
     */
    public function generate(Request $request, string $applicationId): JsonResponse
    {
        $user    = $request->user();
        $manager = ManagerProfile::where('user_id', $user->id)
            ->where('approval_status', 'APPROVED')
            ->firstOrFail();

        $application = Application::with(['job.site', 'job.trade', 'worker', 'job.manager'])
            ->findOrFail($applicationId);

        if ($application->job->manager_id !== $manager->id) {
            return response()->json([
                'statusCode' => 403,
                'message'    => '접근 권한이 없습니다.',
            ], 403);
        }

        if ($application->status !== 'ACCEPTED') {
            return response()->json([
                'statusCode' => 422,
                'message'    => '합격 처리된 지원만 계약서를 생성할 수 있습니다.',
            ], 422);
        }

        if (Contract::where('application_id', $applicationId)->exists()) {
            return response()->json([
                'statusCode' => 409,
                'message'    => '이미 계약서가 생성되었습니다.',
            ], 409);
        }

        $contract = $this->contractService->generate($application);

        return response()->json([
            'statusCode' => 201,
            'data'       => [
                'id'     => $contract->id,
                'status' => $contract->status,
            ],
        ], 201);
    }

    /**
     * GET /manager/contracts/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user    = $request->user();
        $manager = ManagerProfile::where('user_id', $user->id)->firstOrFail();

        $contract = Contract::with(['job.site', 'job.trade', 'worker'])->findOrFail($id);

        if ($contract->manager_id !== $manager->id) {
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
                'workerName'      => $contract->worker->full_name,
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
     * POST /manager/contracts/{id}/sign
     */
    public function sign(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'signature_data_url' => 'required|string',
        ]);

        $user    = $request->user();
        $manager = ManagerProfile::where('user_id', $user->id)->firstOrFail();

        $contract = Contract::findOrFail($id);

        if ($contract->manager_id !== $manager->id) {
            return response()->json([
                'statusCode' => 403,
                'message'    => '접근 권한이 없습니다.',
            ], 403);
        }

        if ($contract->status !== 'PENDING_MANAGER_SIGN') {
            return response()->json([
                'statusCode' => 422,
                'message'    => '서명할 수 없는 상태입니다.',
            ], 422);
        }

        $contract    = $this->contractService->managerSign(
            $contract,
            $manager,
            $request->input('signature_data_url'),
            $request->ip()
        );
        $downloadUrl = $this->contractService->getDownloadUrl($contract);

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'id'              => $contract->id,
                'status'          => $contract->status,
                'managerSignedAt' => $contract->manager_signed_at?->toIso8601String(),
                'downloadUrl'     => $downloadUrl,
            ],
        ], 200);
    }
}
