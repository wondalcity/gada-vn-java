<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\FacebookAuthRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\UserSessionService;
use Illuminate\Http\JsonResponse;

/**
 * Handles Facebook social login via Firebase OAuth.
 *
 * Client-side flow (before hitting this endpoint):
 * 1. Firebase JS SDK: signInWithPopup(new FacebookAuthProvider())
 * 2. Firebase returns a Firebase ID Token
 * 3. Client sends that ID Token to this endpoint
 *
 * Server-side (this controller):
 * 1. Verify the Firebase ID Token
 * 2. Upsert user in auth.users (name, email from Facebook profile)
 * 3. Return user record + isNewUser flag
 *
 * After this call, the client sets gada_session = the SAME idToken it sent us,
 * since it's already a valid Firebase ID Token.
 */
class FacebookAuthController extends Controller
{
    public function __construct(private UserSessionService $session) {}

    /**
     * POST /api/v1/auth/social/facebook
     */
    public function store(FacebookAuthRequest $request): JsonResponse
    {
        $idToken = $request->validated('idToken');

        try {
            $result = $this->session->loginWithFacebook($idToken);
        } catch (\Kreait\Firebase\Exception\Auth\FailedToVerifyToken $e) {
            return response()->json([
                'statusCode' => 401,
                'message'    => 'Invalid Facebook authentication token.',
            ], 401);
        } catch (\Throwable $e) {
            \Log::error('Facebook auth error: ' . $e->getMessage());
            return response()->json(['statusCode' => 500, 'message' => 'Authentication failed.'], 500);
        }

        return response()->json([
            'statusCode' => 200,
            'data' => [
                'isNewUser' => $result['isNewUser'],
                'user'      => new UserResource($result['user']),
            ],
        ]);
    }
}
