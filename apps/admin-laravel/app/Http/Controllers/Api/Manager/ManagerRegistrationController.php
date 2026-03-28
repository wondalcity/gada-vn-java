<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manager\ManagerRegistrationRequest;
use App\Models\ManagerProfile;
use App\Services\Storage\S3Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles manager registration submissions and status checks.
 *
 * POST /manager/register           — submit (or re-submit) a manager registration application
 * GET  /manager/registration/status — check the current application status and pre-fill data
 */
class ManagerRegistrationController extends Controller
{
    public function __construct(private readonly S3Service $s3) {}

    /**
     * POST /manager/register
     * Accepts a multipart registration form with business details and optional supporting files.
     * If the user has a previous is_current=true application it is archived (is_current=false)
     * and a fresh row is created with approval_status='PENDING'.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(ManagerRegistrationRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Archive any existing current application
        ManagerProfile::where('user_id', $user->id)
            ->where('is_current', true)
            ->update(['is_current' => false]);

        // Upload business registration document to S3 if provided
        $businessRegS3Key = null;
        if ($request->hasFile('business_reg_doc')) {
            $businessRegS3Key = $this->s3->upload(
                $request->file('business_reg_doc'),
                "manager-docs/{$user->id}"
            );
        }

        // Upload signature to S3 if provided
        $signatureS3Key = null;
        if ($request->hasFile('signature')) {
            $signatureS3Key = $this->s3->upload(
                $request->file('signature'),
                "manager-signatures/{$user->id}"
            );
        }

        /** @var ManagerProfile $profile */
        $profile = ManagerProfile::create([
            'user_id'               => $user->id,
            'business_type'         => $request->validated('business_type'),
            'company_name'          => $request->validated('company_name'),
            'representative_name'   => $request->validated('representative_name'),
            'representative_dob'    => $request->validated('representative_dob'),
            'representative_gender' => $request->validated('representative_gender'),
            'business_reg_number'   => $request->validated('business_reg_number'),
            'business_reg_s3_key'   => $businessRegS3Key,
            'contact_phone'         => $request->validated('contact_phone'),
            'contact_address'       => $request->validated('contact_address'),
            'province'              => $request->validated('province'),
            'first_site_name'       => $request->validated('first_site_name'),
            'first_site_address'    => $request->validated('first_site_address'),
            'signature_s3_key'      => $signatureS3Key,
            'terms_accepted'        => $request->validated('terms_accepted'),
            'privacy_accepted'      => $request->validated('privacy_accepted'),
            'approval_status'       => 'PENDING',
            'is_current'            => true,
        ]);

        return response()->json([
            'statusCode' => 201,
            'data'       => [
                'id'             => $profile->id,
                'approvalStatus' => $profile->approval_status,
                'submittedAt'    => $profile->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * GET /manager/registration/status
     * Returns the current application status and full profile data for pre-filling re-applications.
     * Always returns 200 — hasApplied=false if no application exists.
     */
    public function status(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        /** @var ManagerProfile|null $profile */
        $profile = ManagerProfile::where('user_id', $user->id)
            ->where('is_current', true)
            ->latest()
            ->first();

        if ($profile === null) {
            return response()->json([
                'statusCode' => 200,
                'data'       => [
                    'hasApplied'      => false,
                    'approvalStatus'  => null,
                    'submittedAt'     => null,
                    'rejectionReason' => null,
                    'profile'         => null,
                ],
            ]);
        }

        // Generate presigned URLs for stored S3 keys (15 min TTL)
        $businessRegDocUrl = $profile->business_reg_s3_key
            ? $this->s3->presignedUrl($profile->business_reg_s3_key, 900)
            : null;

        $signatureUrl = $profile->signature_s3_key
            ? $this->s3->presignedUrl($profile->signature_s3_key, 900)
            : null;

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'hasApplied'      => true,
                'approvalStatus'  => $profile->approval_status,
                'submittedAt'     => $profile->created_at?->toIso8601String(),
                'rejectionReason' => $profile->rejection_reason,
                'profile'         => [
                    'businessType'       => $profile->business_type,
                    'companyName'        => $profile->company_name,
                    'representativeName' => $profile->representative_name,
                    'representativeDob'  => $profile->representative_dob?->toDateString(),
                    'representativeGender' => $profile->representative_gender,
                    'businessRegNumber'  => $profile->business_reg_number,
                    'businessRegDocUrl'  => $businessRegDocUrl,
                    'contactPhone'       => $profile->contact_phone,
                    'contactAddress'     => $profile->contact_address,
                    'province'           => $profile->province,
                    'firstSiteName'      => $profile->first_site_name,
                    'firstSiteAddress'   => $profile->first_site_address,
                    'signatureUrl'       => $signatureUrl,
                    'termsAccepted'      => $profile->terms_accepted,
                    'privacyAccepted'    => $profile->privacy_accepted,
                ],
            ],
        ]);
    }
}
