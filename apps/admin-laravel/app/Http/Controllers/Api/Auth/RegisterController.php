<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * Completes a user's profile after first OTP login.
 *
 * Called with a valid Firebase ID Token (user is already authenticated).
 * FirebaseAuthMiddleware has already loaded the user into $request->user().
 *
 * This is the only step where name + optional email/password are set.
 * Once name is set, isNewUser() returns false for future logins.
 */
class RegisterController extends Controller
{
    /**
     * POST /api/v1/auth/register
     *
     * Requires: Authorization: Bearer <Firebase ID Token>
     */
    public function store(RegisterRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        // Update name (required — marks profile as complete)
        $update = ['name' => $data['name']];

        // Email is optional — set if provided
        if (!empty($data['email'])) {
            $update['email'] = $data['email'];
        }

        // Password is optional — enables email/password login in addition to OTP
        if (!empty($data['password'])) {
            $update['password'] = Hash::make($data['password']);
        }

        $user->update($update);

        // Load relations for response
        $user->load('roles', 'managerProfile');

        return response()->json([
            'statusCode' => 200,
            'data' => new UserResource($user),
        ]);
    }
}
