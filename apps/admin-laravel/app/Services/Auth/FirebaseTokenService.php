<?php

namespace App\Services\Auth;

use Kreait\Firebase\Contract\Auth;

class FirebaseTokenService
{
    public function __construct(private Auth $auth) {}

    /**
     * Verify a Firebase ID token and return the Firebase UID.
     *
     * @throws \Kreait\Firebase\Exception\Auth\FailedToVerifyToken
     */
    public function verifyIdToken(string $idToken): string
    {
        $verifiedToken = $this->auth->verifyIdToken($idToken);
        return $verifiedToken->claims()->get('sub');
    }

    /**
     * Create a custom token for a Firebase UID (used in OTP flow).
     */
    public function createCustomToken(string $uid): string
    {
        return $this->auth->createCustomToken($uid)->toString();
    }
}
