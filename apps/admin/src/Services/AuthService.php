<?php
declare(strict_types=1);

namespace GadaAdmin\Services;

class AuthService
{
    private const MAX_ATTEMPTS = 5;
    private const LOCKOUT_SECONDS = 900; // 15 minutes

    public function attempt(string $username, string $password): bool
    {
        // Rate limiting
        $attempts = $_SESSION['login_attempts'] ?? 0;
        $lastAttempt = $_SESSION['last_attempt_at'] ?? 0;

        if ($attempts >= self::MAX_ATTEMPTS) {
            $elapsed = time() - $lastAttempt;
            if ($elapsed < self::LOCKOUT_SECONDS) {
                return false;
            }
            // Reset after lockout period
            $_SESSION['login_attempts'] = 0;
        }

        $validUsername = $_ENV['ADMIN_USERNAME'] ?? 'admin';
        $validPasswordHash = $_ENV['ADMIN_PASSWORD_HASH'] ?? '';

        if ($username === $validUsername && password_verify($password, $validPasswordHash)) {
            $_SESSION['admin_authenticated'] = true;
            $_SESSION['admin_username'] = $username;
            $_SESSION['login_attempts'] = 0;
            return true;
        }

        $_SESSION['login_attempts'] = $attempts + 1;
        $_SESSION['last_attempt_at'] = time();
        return false;
    }

    public function logout(): void
    {
        $_SESSION = [];
        session_destroy();
    }

    public static function verifyCsrf(string $token): bool
    {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }

    public static function generateCsrf(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }
}
