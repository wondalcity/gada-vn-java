<?php

namespace App\Http\Resources;

use App\Models\WorkerProfile;
use App\Services\Storage\S3Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transforms a WorkerProfile model into the standard API response shape.
 * S3 keys are replaced with presigned URLs (15-minute TTL).
 * Public assets (profile_picture) may also use CDN_BASE_URL if configured.
 *
 * Used by: GET /worker/profile, PUT /worker/profile,
 *          POST /worker/profile/id-documents, POST /worker/profile/signature
 */
class WorkerProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var WorkerProfile $this */
        $s3 = app(S3Service::class);
        $cdnBase = rtrim(config('app.cdn_base_url', env('CDN_BASE_URL', '')), '/');

        return [
            'id'               => $this->id,
            'userId'           => $this->user_id,
            'fullName'         => $this->full_name,
            'dateOfBirth'      => $this->date_of_birth?->toDateString(),
            'gender'           => $this->gender,
            'experienceMonths' => $this->experience_months,
            'primaryTradeId'   => $this->primary_trade_id,
            'currentProvince'  => $this->current_province,
            'bio'              => $this->bio,
            'bankAccountNumber'=> $this->bank_account_number,
            'bankName'         => $this->bank_name,
            'profileComplete'  => (bool) $this->profile_complete,
            'idNumber'         => $this->id_number,
            'idVerified'       => (bool) $this->id_verified,

            // S3-backed files — return presigned URLs or CDN URLs; null if not uploaded yet
            'idFrontUrl'       => $this->id_front_s3_key
                                    ? $s3->presignedUrl($this->id_front_s3_key)
                                    : null,
            'idBackUrl'        => $this->id_back_s3_key
                                    ? $s3->presignedUrl($this->id_back_s3_key)
                                    : null,
            'signatureUrl'     => $this->signature_s3_key
                                    ? $s3->presignedUrl($this->signature_s3_key)
                                    : null,
            'profilePictureUrl'=> $this->profile_picture_s3_key
                                    ? ($cdnBase
                                        ? $cdnBase . '/' . ltrim($this->profile_picture_s3_key, '/')
                                        : $s3->presignedUrl($this->profile_picture_s3_key))
                                    : null,

            'termsAccepted'    => (bool) $this->terms_accepted,
            'privacyAccepted'  => (bool) $this->privacy_accepted,
            'termsAcceptedAt'  => $this->terms_accepted_at?->toIso8601String(),

            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
