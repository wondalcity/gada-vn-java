<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;

/**
 * Handles user-level auth operations: finding/creating users,
 * granting initial worker role, generating Firebase custom tokens.
 *
 * Used by: OtpController, LoginController
 */
class UserSessionService
{
    public function __construct(
        private FirebaseTokenService $firebaseToken,
        private FirebaseAuth $firebaseAuth,
    ) {}

    /**
     * Find or create a Firebase user for the given phone number.
     * Returns a Firebase custom token and whether this is a new signup.
     *
     * Called after OTP is successfully verified.
     *
     * @param  string $phone  E.164 phone number
     * @return array{ customToken: string, isNewUser: bool }
     */
    public function getOrCreateFirebaseUserForPhone(string $phone): array
    {
        // Try to find existing Firebase user by phone
        try {
            $firebaseUser = $this->firebaseAuth->getUserByPhoneNumber($phone);
            $firebaseUid  = $firebaseUser->uid;
            $isNewUser    = false;
        } catch (\Kreait\Firebase\Exception\Auth\UserNotFound) {
            // First-time phone login — create Firebase user
            $request = \Kreait\Firebase\Auth\CreateUser::new()
                ->withPhoneNumber($phone);
            $firebaseUser = $this->firebaseAuth->createUser($request);
            $firebaseUid  = $firebaseUser->uid;
            $isNewUser    = true;
        }

        // Ensure local DB record exists (may already exist from prior middleware run)
        $user = User::firstOrCreate(
            ['firebase_uid' => $firebaseUid],
            ['phone' => $phone, 'locale' => 'ko', 'status' => 'active'],
        );

        // Auto-grant worker role on first creation
        if ($user->wasRecentlyCreated) {
            DB::table('auth.user_roles')->insertOrIgnore([
                'user_id'    => $user->id,
                'role'       => 'worker',
                'status'     => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // isNewUser from our perspective = profile incomplete
        $isNewUser = $user->isNewUser();

        // Create Firebase custom token for the client to exchange
        $customToken = $this->firebaseToken->createCustomToken($firebaseUid);

        return [
            'customToken' => $customToken,
            'isNewUser'   => $isNewUser,
        ];
    }

    /**
     * Validate email/password credentials.
     * Returns a Firebase custom token on success so the client can
     * exchange it for a Firebase ID Token via signInWithCustomToken().
     *
     * @throws \RuntimeException on invalid credentials
     */
    public function loginWithEmailPassword(string $email, string $password): string
    {
        $user = User::where('email', $email)
            ->where('status', 'active')
            ->first();

        if (!$user || !$user->password) {
            throw new \RuntimeException('INVALID_CREDENTIALS');
        }

        if (!Hash::check($password, $user->password)) {
            throw new \RuntimeException('INVALID_CREDENTIALS');
        }

        return $this->firebaseToken->createCustomToken($user->firebase_uid);
    }

    /**
     * Verify a Facebook Firebase ID Token and upsert the local user.
     * Called by: POST /auth/social/facebook
     *
     * The client already has the Firebase ID Token from client-side Facebook OAuth.
     * We verify it, upsert the user, and return the user record.
     *
     * @return array{ user: User, isNewUser: bool }
     */
    public function loginWithFacebook(string $idToken): array
    {
        // Verify the Firebase ID Token sent from the client
        $firebaseUid = $this->firebaseToken->verifyIdToken($idToken);

        // Get Firebase user details (name, email, photo)
        $firebaseUser = $this->firebaseAuth->getUser($firebaseUid);

        $user = User::firstOrCreate(
            ['firebase_uid' => $firebaseUid],
            [
                'name'   => $firebaseUser->displayName,
                'email'  => $firebaseUser->email,
                'locale' => 'ko',
                'status' => 'active',
            ],
        );

        if ($user->wasRecentlyCreated) {
            DB::table('auth.user_roles')->insertOrIgnore([
                'user_id'    => $user->id,
                'role'       => 'worker',
                'status'     => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Load roles for the UserResource
        $user->load('roles', 'managerProfile');

        return [
            'user'      => $user,
            'isNewUser' => $user->isNewUser(),
        ];
    }

    /**
     * Revoke all Firebase refresh tokens for a user.
     * This signs them out of all devices immediately.
     * Firebase ID tokens may still be valid for up to 1 hour after revocation.
     */
    public function revokeAllTokens(User $user): void
    {
        try {
            $this->firebaseAuth->revokeRefreshTokens($user->firebase_uid);
        } catch (\Throwable $e) {
            // Log but don't fail — token may already be revoked
            \Log::warning("Failed to revoke Firebase tokens for user {$user->id}: " . $e->getMessage());
        }
    }
}
