<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Http\Requests\Worker\UploadIdDocumentRequest;
use App\Http\Resources\WorkerProfileResource;
use App\Models\WorkerProfile;
use App\Services\Storage\S3Service;
use Illuminate\Http\JsonResponse;

/**
 * Handles government-issued ID document uploads for workers.
 *
 * POST /worker/profile/id-documents
 *   Multipart upload of id_front and id_back images plus the id_number string.
 *   Resets id_verified to false on every upload so admin must re-verify.
 */
class WorkerIdDocumentController extends Controller
{
    public function __construct(private readonly S3Service $s3) {}

    /**
     * POST /worker/profile/id-documents
     * Uploads both ID images to S3 and updates the worker profile.
     * id_verified is always reset to false to trigger a fresh admin review.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(UploadIdDocumentRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $profile = WorkerProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['profile_complete' => false, 'id_verified' => false]
        );

        $prefix   = "worker-id/{$user->id}";
        $frontKey = $this->s3->upload($request->file('id_front'), $prefix);
        $backKey  = $this->s3->upload($request->file('id_back'), $prefix);

        $profile->update([
            'id_number'       => $request->validated('id_number'),
            'id_front_s3_key' => $frontKey,
            'id_back_s3_key'  => $backKey,
            'id_verified'     => false, // reset: admin must re-verify after any re-upload
        ]);

        return response()->json([
            'statusCode' => 201,
            'data'       => new WorkerProfileResource($profile->fresh()),
        ], 201);
    }
}
