<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Handles phone OTP generation, storage, verification, and rate limiting.
 *
 * OTP flow:
 * 1. send($phone)   — generate 6-digit OTP, store in Redis (TTL 15min), send SMS
 * 2. verify($phone, $otp) — check OTP, delete on success, throw on failure
 *
 * Rate limiting: max 5 sends per phone per 15 minutes (config: gada.otp_rate_limit).
 */
class OtpService
{
    /** Redis key prefix for storing OTPs */
    private const OTP_PREFIX = 'gada:otp:code:';

    /** Redis key prefix for rate limiting */
    private const RATE_PREFIX = 'gada:otp:rate:';

    /** OTP TTL in seconds (15 minutes) */
    private const OTP_TTL = 900;

    public function __construct(private FirebaseTokenService $firebase) {}

    /**
     * Send an OTP to the given phone number.
     *
     * @param  string $phone  E.164 format, e.g. "+84901234567"
     * @throws \RuntimeException if rate limit exceeded
     */
    public function send(string $phone): void
    {
        // ── Rate limit check ──────────────────────────────────────────────
        $rateKey   = self::RATE_PREFIX . $phone;
        $maxAttempts = config('gada.otp_rate_limit.max_attempts', 5);
        $decayMinutes = config('gada.otp_rate_limit.decay_minutes', 15);

        $attempts = (int) Cache::get($rateKey, 0);
        if ($attempts >= $maxAttempts) {
            throw new \RuntimeException('OTP_RATE_LIMIT_EXCEEDED');
        }

        // ── Generate OTP ──────────────────────────────────────────────────
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // ── Store in Redis ────────────────────────────────────────────────
        Cache::put(self::OTP_PREFIX . $phone, $otp, self::OTP_TTL);

        // ── Increment rate counter ────────────────────────────────────────
        if ($attempts === 0) {
            Cache::put($rateKey, 1, $decayMinutes * 60);
        } else {
            Cache::increment($rateKey);
        }

        // ── Send SMS ──────────────────────────────────────────────────────
        $this->sendSms($phone, $otp);
    }

    /**
     * Verify the OTP for a phone number.
     * Deletes the OTP on success (one-time use).
     *
     * @param  string $phone  E.164 phone number
     * @param  string $otp    6-digit string
     * @throws \RuntimeException if OTP is invalid or expired
     */
    public function verify(string $phone, string $otp): void
    {
        $key      = self::OTP_PREFIX . $phone;
        $stored   = Cache::get($key);

        if ($stored === null) {
            throw new \RuntimeException('OTP_EXPIRED');
        }

        if (!hash_equals((string) $stored, (string) $otp)) {
            throw new \RuntimeException('OTP_INVALID');
        }

        // One-time use — delete after successful verification
        Cache::forget($key);
    }

    /**
     * Send an SMS with the OTP code.
     *
     * In development: logs to console instead of sending real SMS.
     * In production: integrate with SMS provider (Twilio, AWS SNS, etc.).
     */
    private function sendSms(string $phone, string $otp): void
    {
        if (config('app.env') !== 'production') {
            // Development: log OTP to stdout (never in production!)
            Log::info("[OTP DEBUG] Phone: {$phone} | Code: {$otp}");
            return;
        }

        // TODO: Integrate SMS provider
        // Example: Twilio
        // $twilio = new \Twilio\Rest\Client(config('services.twilio.sid'), config('services.twilio.token'));
        // $twilio->messages->create($phone, [
        //     'from' => config('services.twilio.from'),
        //     'body' => "GADA VN 인증번호: {$otp} (15분 이내 입력)",
        // ]);

        throw new \RuntimeException('SMS_PROVIDER_NOT_CONFIGURED');
    }
}
