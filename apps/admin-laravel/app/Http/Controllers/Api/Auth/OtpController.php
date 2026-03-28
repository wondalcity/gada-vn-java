<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Services\Auth\OtpService;
use App\Services\Auth\UserSessionService;
use Illuminate\Http\JsonResponse;

/**
 * Handles phone OTP authentication flow.
 *
 * Flow:
 * 1. POST /auth/otp/send   — validates phone, sends 6-digit OTP via SMS
 * 2. POST /auth/otp/verify — verifies OTP, returns Firebase custom token
 *
 * After /verify, the client calls Firebase SDK signInWithCustomToken()
 * to exchange the custom token for a Firebase ID Token, which is then
 * used as the Bearer token for all subsequent API calls.
 */
class OtpController extends Controller
{
    public function __construct(
        private OtpService $otp,
        private UserSessionService $session,
    ) {}

    /**
     * POST /api/v1/auth/otp/send
     *
     * Rate-limited: 5 per phone per 15 minutes (gada.otp_rate_limit config).
     * Additional rate limiting via WAF (100 requests per 5 min per IP).
     */
    public function send(SendOtpRequest $request): JsonResponse
    {
        $phone = $request->validated('phone');

        try {
            $this->otp->send($phone);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'OTP_RATE_LIMIT_EXCEEDED' => response()->json([
                    'statusCode' => 429,
                    'message'    => 'Too many OTP requests. Please wait 15 minutes.',
                ], 429),
                default => response()->json([
                    'statusCode' => 500,
                    'message'    => 'Failed to send OTP. Please try again.',
                ], 500),
            };
        }

        return response()->json([
            'statusCode' => 200,
            'data'       => ['message' => 'OTP sent successfully.'],
        ]);
    }

    /**
     * POST /api/v1/auth/otp/verify
     *
     * Returns a Firebase custom token the client must exchange via
     * signInWithCustomToken() — the client then has a Firebase ID Token
     * for Bearer auth on all subsequent requests.
     *
     * isNewUser = true when user has no name (profile incomplete).
     * Frontend redirects to /register when isNewUser is true.
     */
    public function verify(VerifyOtpRequest $request): JsonResponse
    {
        ['phone' => $phone, 'otp' => $otp] = $request->validated();

        try {
            $this->otp->verify($phone, $otp);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'OTP_EXPIRED' => response()->json([
                    'statusCode' => 400,
                    'message'    => 'OTP has expired. Please request a new one.',
                ], 400),
                'OTP_INVALID' => response()->json([
                    'statusCode' => 400,
                    'message'    => 'Invalid OTP.',
                    'errors'     => ['otp' => ['The verification code is incorrect.']],
                ], 400),
                default => response()->json(['statusCode' => 500, 'message' => 'Verification failed.'], 500),
            };
        }

        try {
            $result = $this->session->getOrCreateFirebaseUserForPhone($phone);
        } catch (\Throwable $e) {
            \Log::error('Firebase user creation failed after OTP verify: ' . $e->getMessage());
            return response()->json(['statusCode' => 500, 'message' => 'Authentication failed.'], 500);
        }

        return response()->json([
            'statusCode' => 200,
            'data' => [
                'customToken' => $result['customToken'],
                'isNewUser'   => $result['isNewUser'],
            ],
        ]);
    }
}
