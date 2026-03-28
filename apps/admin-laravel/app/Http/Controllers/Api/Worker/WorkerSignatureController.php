<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Http\Requests\Worker\UploadSignatureRequest;
use App\Http\Resources\WorkerProfileResource;
use App\Models\WorkerProfile;
use App\Services\Storage\S3Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Handles worker signature uploads.
 * Accepts either a file upload or a base64-encoded PNG data URL.
 *
 * POST /worker/profile/signature
 */
class WorkerSignatureController extends Controller
{
    public function __construct(private readonly S3Service $s3) {}

    /**
     * POST /worker/profile/signature
     * Stores the worker's signature image in S3 and saves the key.
     * Accepts a multipart file (signature) OR a base64 PNG data URL (signature_data_url).
     *
     * @throws \Illuminate\Validation\ValidationException
     * @throws RuntimeException
     */
    public function store(UploadSignatureRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $prefix = "worker-signatures/{$user->id}";

        if ($request->hasFile('signature')) {
            $signatureKey = $this->s3->upload($request->file('signature'), $prefix);
        } else {
            $signatureKey = $this->uploadFromDataUrl(
                $request->input('signature_data_url'),
                $prefix
            );
        }

        $profile = WorkerProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['profile_complete' => false, 'id_verified' => false]
        );

        $profile->update(['signature_s3_key' => $signatureKey]);

        return response()->json([
            'statusCode' => 200,
            'data'       => new WorkerProfileResource($profile->fresh()),
        ]);
    }

    /**
     * Decode a base64 PNG data URL, write it to a temporary file,
     * wrap it as an UploadedFile, upload to S3, then clean up the temp file.
     *
     * @param  string $dataUrl  e.g. "data:image/png;base64,iVBOR..."
     * @param  string $prefix   S3 key prefix
     * @return string           The resulting S3 key
     * @throws RuntimeException if the data URL is malformed or decoding fails
     */
    private function uploadFromDataUrl(string $dataUrl, string $prefix): string
    {
        // Strip the "data:image/png;base64," header
        if (!preg_match('/^data:image\/(\w+);base64,(.+)$/s', $dataUrl, $matches)) {
            throw new RuntimeException('Invalid signature_data_url format.');
        }

        $extension = strtolower($matches[1]); // e.g. "png"
        $binary    = base64_decode($matches[2], strict: true);

        if ($binary === false) {
            throw new RuntimeException('Failed to decode base64 signature data.');
        }

        // Write to a system temp file
        $tmpPath = sys_get_temp_dir() . '/' . Str::uuid() . '.' . $extension;
        file_put_contents($tmpPath, $binary);

        try {
            $mimeType   = match ($extension) {
                'jpg', 'jpeg' => 'image/jpeg',
                default       => 'image/png',
            };
            $uploaded = new UploadedFile(
                path: $tmpPath,
                originalName: "signature.{$extension}",
                mimeType: $mimeType,
                error: UPLOAD_ERR_OK,
                test: true  // bypass is_uploaded_file() check in tests / non-SAPI contexts
            );

            return $this->s3->upload($uploaded, $prefix);
        } finally {
            @unlink($tmpPath);
        }
    }
}
