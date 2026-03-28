<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\Auth\UserSessionService;
use Illuminate\Http\JsonResponse;

/**
 * Handles email + password login.
 *
 * Validates credentials stored in auth.users.password (bcrypt).
 * Returns a Firebase custom token on success.
 * Client exchanges it for a Firebase ID Token via signInWithCustomToken().
 *
 * Why Firebase custom token instead of returning a JWT directly?
 * → Keeps auth consistent: ALL API calls use Firebase ID Tokens as Bearer.
 * → Firebase handles token refresh automatically client-side.
 */
class LoginController extends Controller
{
    public function __construct(private UserSessionService $session) {}

    /**
     * POST /api/v1/auth/login
     */
    public function store(LoginRequest $request): JsonResponse
    {
        ['email' => $email, 'password' => $password] = $request->validated();

        try {
            $customToken = $this->session->loginWithEmailPassword($email, $password);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'INVALID_CREDENTIALS') {
                // Return generic message — do not reveal whether email exists
                return response()->json([
                    'statusCode' => 401,
                    'message'    => 'Invalid email or password.',
                ], 401);
            }
            return response()->json(['statusCode' => 500, 'message' => 'Login failed.'], 500);
        }

        return response()->json([
            'statusCode' => 200,
            'data' => [
                'customToken' => $customToken,
            ],
        ]);
    }
}
