<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\UserSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Signs a user out by revoking all Firebase refresh tokens.
 *
 * After revocation:
 * - New Firebase ID Tokens cannot be obtained with existing refresh tokens
 * - Existing ID tokens remain valid for up to 1 hour (Firebase limitation)
 * - Client must delete gada_session cookie and Capacitor Preferences
 */
class LogoutController extends Controller
{
    public function __construct(private UserSessionService $session) {}

    /**
     * POST /api/v1/auth/logout
     *
     * Requires: Authorization: Bearer <Firebase ID Token>
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke all Firebase refresh tokens (signs out all devices)
        $this->session->revokeAllTokens($user);

        // Remove FCM token for this device if provided
        $fcmToken = $request->input('fcmToken');
        if ($fcmToken) {
            \DB::table('ops.fcm_tokens')
                ->where('user_id', $user->id)
                ->where('token', $fcmToken)
                ->delete();
        }

        return response()->json([
            'statusCode' => 200,
            'data' => ['message' => 'Logged out successfully.'],
        ]);
    }
}
