# GADA VN — MVP Security Review

**Date**: 2026-03-21
**Reviewer**: Security Review (AI-assisted)
**Scope**: Identity documents, contracts, bank account data, RBAC, file access control, auth/session handling, audit logging, rate limiting, PII exposure
**Apps reviewed**: `apps/admin-laravel` (Laravel 11 PHP 8.2), `apps/web-next` (Next.js 15), `apps/mobile` (Expo SDK 51)

---

## Summary

| Severity | Count |
|----------|-------|
| P0 (Critical — block launch) | 4 |
| P1 (High — fix before launch) | 6 |
| P2 (Medium — fix within 30 days) | 6 |
| **Total** | **16** |

---

## P0 — Critical (Block Launch)

### SEC-P0-01 · Suspended users can fully authenticate

**File**: `apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php:48`

```php
// Current — BROKEN: only catches lowercase 'deleted'
if ($user->status === 'deleted') {
    return response()->json(['error' => 'Account suspended'], 403);
}
```

**Problem**: The middleware only rejects users with `status === 'deleted'` (lowercase). It does NOT block:
- `status = 'SUSPENDED'` — admin-suspended accounts can continue using the entire API
- `status = 'DELETED'` — uppercase deletion via `AdminUserController` (line 225) is also bypassed; only `MeController::destroy()` (lowercase) is caught

The `AdminUserController` sets `status = 'DELETED'` (uppercase, line 225). The `MeController` sets `status = 'deleted'` (lowercase, line 94). Neither value passes the single `=== 'deleted'` check in the middleware consistently. A suspended worker can continue applying for jobs, signing contracts, and accessing PII.

**Impact**: Suspended/banned users have full API access. Compliance risk for violating workers.

---

### SEC-P0-02 · Missing rate limiting on authentication and signing endpoints

**File**: `apps/admin-laravel/routes/api.php`

```php
// Line 42: HAS throttle ✓
Route::post('/auth/otp/send', ...)->middleware('throttle:otp');

// Line 43: NO throttle ✗
Route::post('/auth/otp/verify', [OtpController::class, 'verify']);

// Line 45: NO throttle ✗
Route::post('/auth/login', [AuthController::class, 'login']);

// Line 46: NO throttle ✗
Route::post('/auth/social/facebook', [SocialAuthController::class, 'facebook']);

// Line 44: NO throttle ✗ (has firebase.auth but no rate limit)
Route::post('/auth/register', [RegisterController::class, 'register'])->middleware('firebase.auth');

// Line 81: NO throttle ✗
Route::post('/worker/contracts/{id}/sign', ...);
```

**Problem**: OTP verification has no rate limit — an attacker can brute-force a 6-digit OTP (1,000,000 combinations) with no restriction. Login has no lockout. Contract signing has no rate limit allowing replay attempts.

**Impact**: OTP brute-force → account takeover. Login brute-force → credential stuffing. Contract signing spam → data integrity issues.

---

### SEC-P0-03 · No size or format validation on signature data URL

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Worker/WorkerContractController.php:80`

```php
// Current — only validates presence and string type
'signature_data_url' => 'required|string',
```

**Problem**: A `signature_data_url` field with no size limit allows:
1. **Memory exhaustion**: A 100MB base64 string would be decoded and uploaded to S3, consuming Laravel worker memory and S3 bandwidth
2. **Arbitrary file upload**: No validation that the data URL is actually an image (SVG/PNG). An attacker could send `data:application/javascript;base64,...` or `data:text/html;base64,...`
3. **XXE via SVG**: A malicious SVG with external entity references could be stored and later rendered

**Impact**: Denial of service, stored XSS via SVG (if later rendered inline), or storage abuse.

---

### SEC-P0-04 · Manager's signature URL leaked to worker

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Worker/WorkerContractController.php:47-52`

```php
// Lines 47-52 in show() method
'worker_sig_url' => $workerSigUrl,
'manager_sig_url' => $managerSigUrl,   // ← manager's S3 presigned URL returned to worker
```

**Problem**: The worker-facing contract detail endpoint returns presigned S3 URLs for BOTH the worker's own signature AND the manager's signature. The manager's signature is a PNG/SVG of their handwritten name — it's PII that the worker has no legitimate need to access directly. The presigned URL also bypasses RLS entirely.

**Impact**: Manager PII (handwritten signature) exposed to every worker on a mutual contract. Presigned URL valid for 900 seconds can be shared or logged.

---

## P1 — High (Fix Before Launch)

### SEC-P1-01 · Raw SQL WHERE clause built via string interpolation in AdminUserController

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Admin/AdminUserController.php:59-103`

```php
// Line 65
$sql = "SELECT ... FROM auth.users u WHERE {$where}";

// Line 87
$sql = "SELECT ... FROM auth.users u WHERE {$where}";

// Line 103
$sql = "SELECT ... FROM auth.users u WHERE user_id IN ({$placeholders})";
```

**Problem**: The `$where` string is assembled from validated inputs (`$role`, `$status`, `$search`), and `$placeholders` uses positional `?` parameters. However, the `$where` clause itself contains interpolated string fragments rather than parameterized bindings. The `$search` field uses `ILIKE '%' || ? || '%'` (parameterized) but the structure of the WHERE clause itself is directly interpolated. Future modifications or additional filter fields could introduce SQL injection if contributors don't recognize the fragile pattern.

**Impact**: Currently mitigated by request validation, but one future unvalidated filter field → SQL injection on admin data. This is admin-only but still a high-risk pattern.

---

### SEC-P1-02 · Status inconsistency causes deletion bypass

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Account/MeController.php:94` vs `apps/admin-laravel/app/Http/Controllers/Api/Admin/AdminUserController.php:225`

```php
// MeController.php:94 — sets lowercase 'deleted'
$user->update(['status' => 'deleted']);

// AdminUserController.php:225 — sets uppercase 'DELETED'
$user->update(['status' => 'DELETED']);
```

**Problem**: Two code paths set different case values for the same logical state. The `FirebaseAuthMiddleware` check (SEC-P0-01 above) already fails for both, but additionally:
- `AdminUserController::bulkStatus()` likely has similar inconsistency
- Any query that filters `WHERE status = 'DELETED'` will miss self-deleted accounts (lowercase), and vice versa
- The migration 008 CHECK constraint allows both cases: `IN ('ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED')` — only uppercase — so `'deleted'` actually violates the DB constraint but may be silently truncated by Eloquent

**Impact**: Database constraint violation on self-delete. Inconsistent admin queries returning incomplete results.

---

### SEC-P1-03 · No audit logging on PII access or mutations

**Files**:
- `apps/admin-laravel/app/Http/Controllers/Api/Worker/WorkerIdDocumentController.php` — no audit log on upload/view
- `apps/admin-laravel/app/Http/Controllers/Api/Admin/AdminUserController.php` — no audit log on bulk status changes or deletions
- `apps/admin-laravel/app/Services/Contract/ContractService.php` — no audit log on signature uploads

**Problem**: No audit trail exists for:
- Worker identity document uploads (government ID — highly sensitive PII)
- Admin viewing or downloading identity documents
- Admin performing bulk account status changes
- Contract signature uploads

Without an audit log, there is no forensic capability in case of a breach or compliance audit.

**Impact**: No forensic capability. Non-compliant with typical data protection requirements for identity document handling.

---

### SEC-P1-04 · No file size limit on ID document upload

**File**: `apps/admin-laravel/app/Http/Requests/Worker/UploadIdDocumentRequest.php` (validation rules)

The `WorkerIdDocumentController` accepts ID document uploads with no file size limit in the validation rules. A worker could upload a 500MB file, causing:
- Memory exhaustion on the Laravel worker process
- Excessive S3 storage charges
- Potential DoS of the upload endpoint

**Impact**: Denial of service, storage cost abuse.

---

### SEC-P1-05 · Predictable S3 key structure for government ID documents

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Worker/WorkerIdDocumentController.php`

```php
// S3 key pattern:
$key = "worker-id/{$user->id}";
```

**Problem**: S3 key is entirely predictable given a user UUID. If S3 bucket policy is ever misconfigured (public or overly broad IAM), an attacker with any valid UUID can access any worker's government ID document. There is no nonce or random component in the key.

Additionally, presigned URLs for ID documents are generated with no record of who requested them and when.

**Impact**: ID document exposure if S3 bucket misconfiguration occurs. No access audit trail.

---

### SEC-P1-06 · No rate limiting on registration endpoint

**File**: `apps/admin-laravel/routes/api.php:44`

```php
Route::post('/auth/register', [RegisterController::class, 'register'])
    ->middleware('firebase.auth');
// Missing: ->middleware('throttle:5,1');
```

**Problem**: The registration endpoint requires a valid Firebase token (good) but has no rate limit. An attacker with a compromised Firebase service account or who generates many Firebase tokens could mass-register fake accounts, bypassing the intended manual manager approval process.

**Impact**: Account farming, spam registration, bypass of manager approval queue integrity.

---

## P2 — Medium (Fix Within 30 Days)

### SEC-P2-01 · `isSuperAdmin()` email matching vulnerable to whitespace

**File**: `apps/admin-laravel/app/Models/User.php`

```php
public function isSuperAdmin(): bool
{
    $emails = explode(',', config('app.super_admin_emails', ''));
    return in_array($this->email, $emails);
}
```

**Problem**: If `SUPER_ADMIN_EMAILS=admin@gada.vn, ops@gada.vn` is set with spaces after commas, `explode(',', ...)` produces `['admin@gada.vn', ' ops@gada.vn']`. The leading space causes the match to fail for `ops@gada.vn`, silently locking out the ops superadmin. There is no `array_map('trim', ...)` applied.

**Impact**: Accidental lockout of super admin accounts due to env variable formatting.

---

### SEC-P2-02 · CORS not explicitly configured

**Files**: No `config/cors.php` found in `apps/admin-laravel/`

**Problem**: Laravel 11 defaults to CORS middleware being present but with permissive defaults. The API is consumed by a Next.js web app (different origin in production) and mobile app. Without explicit CORS configuration specifying allowed origins, the API either rejects legitimate cross-origin requests or allows all origins.

**Impact**: If permissive: any website can make credentialed cross-origin requests to the API. If restrictive: the web app may break in production when origins differ from defaults.

---

### SEC-P2-03 · `bulk-accept` endpoint has no array size limit

**File**: `apps/admin-laravel/routes/api.php` (admin routes for bulk accept/reject)

The bulk accept/reject endpoints accept an array of UUIDs with no `max:100` validation. A single request with 10,000 UUIDs could:
- Execute 10,000 DB queries (if not batched)
- Take minutes to complete, holding a DB connection
- Generate excessive notification jobs

**Impact**: Self-DoS of admin panel, DB connection exhaustion.

---

### SEC-P2-04 · Contract HTML with embedded presigned URLs stored in S3

**File**: `apps/admin-laravel/app/Services/Contract/ContractService.php`

Contract HTML is generated and stored in S3. If the HTML embeds presigned S3 URLs for signature images (TTL: 900s for signatures, 3600s for contract embedding), the HTML itself becomes a security-sensitive artifact: anyone with the contract HTML URL gets working image URLs for the duration of the TTL.

**Impact**: If contract HTML URL leaks (e.g., in logs, browser history), signature image URLs are also exposed for up to 1 hour.

---

### SEC-P2-05 · Bank account number has no format validation

**File**: `apps/admin-laravel/app/Http/Requests/Worker/` (bank account update request)

```php
// Current validation
'bank_account_number' => 'nullable|string|max:50',
```

**Problem**: No format validation on bank account number. Vietnamese bank account numbers follow specific formats per bank. Without validation, invalid account numbers pass to payment processing, and there is no check against likely typos that could result in misdirected payments.

**Impact**: Financial loss from misdirected salary payments. No defense against accidental data entry errors.

---

### SEC-P2-06 · RLS user context may persist across connection pool reuses

**File**: `apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php:53`

```php
DB::statement("SET app.current_user_id = ?", [$user->id]);
```

**Problem**: `SET` (without `LOCAL`) persists for the duration of the database session, not just the current transaction. With PgBouncer or pgpool in transaction pooling mode, the same DB connection is reused by different HTTP requests. If `SET app.current_user_id` is not reset after each request, a subsequent request on the same connection (for a different user) may briefly run under the wrong RLS context.

This is only a risk if connection pooling is in transaction mode (not session mode). However, the current code provides no mitigation.

**Impact**: In transaction-mode connection pooling: cross-user RLS bypass, data leakage between requests.

---

## Additional Observations

### Auth Token Handling (Web)
- `apps/web-next/src/lib/auth/session.ts`: `gada_session` cookie has `SameSite=Strict` ✓, `Secure` in production ✓, `HttpOnly` absent — Firebase ID Token stored in a JS-accessible cookie allows XSS to steal auth tokens
- Session `max-age` was corrected to 7 days (P0 fix applied) — Firebase ID Tokens expire in 1 hour, so the cookie persists but the token inside becomes invalid; the web app must handle token refresh

### RBAC Assessment
- `RoleMiddleware.php` is correctly implemented — checks `auth.user_roles` with `status='active'` and `revoked_at IS NULL` ✓
- `hasRole()` uses eager-loaded relation — no N+1 query ✓
- Manager approval restriction: managers cannot use manager-role endpoints until approved — correct ✓
- Workers cannot access manager endpoints — correct ✓

### Contract State Machine
- `PENDING_WORKER_SIGN → PENDING_MANAGER_SIGN → FULLY_SIGNED` transitions are enforced in `ContractService` ✓
- No orphaned state transitions observed ✓

### Firebase Auth Integration
- `FirebaseAuthMiddleware` uses Kreait Firebase PHP SDK for token verification — production-grade ✓
- `firstOrCreate` pattern auto-creates users on first valid Firebase token — intentional design but means any valid Firebase user gets an account; no registration step required ✗ (depends on business intent)

---

## Risk Matrix

| ID | Finding | Exploitability | Impact | Priority |
|----|---------|----------------|--------|----------|
| SEC-P0-01 | Suspended users can authenticate | High (no attack needed, just use app) | High | **P0** |
| SEC-P0-02 | No rate limiting on OTP verify / login | High (trivial to brute-force) | Critical | **P0** |
| SEC-P0-03 | No size/format limit on signature data URL | Medium (requires valid auth) | High | **P0** |
| SEC-P0-04 | Manager signature URL leaked to worker | Low (requires valid auth) | Medium | **P0** |
| SEC-P1-01 | SQL string interpolation in admin controller | Low (admin-only, currently validated) | High | **P1** |
| SEC-P1-02 | Status case inconsistency (deleted vs DELETED) | Low | Medium | **P1** |
| SEC-P1-03 | No audit log on PII access | N/A (design gap) | High (compliance) | **P1** |
| SEC-P1-04 | No file size limit on ID document upload | Medium (requires valid auth) | Medium | **P1** |
| SEC-P1-05 | Predictable S3 key for government ID | Low (needs misconfiguration) | Critical (if triggered) | **P1** |
| SEC-P1-06 | No rate limiting on registration | Medium | Medium | **P1** |
| SEC-P2-01 | isSuperAdmin whitespace vulnerability | Low (env config issue) | Medium | **P2** |
| SEC-P2-02 | CORS not explicitly configured | Medium | Medium | **P2** |
| SEC-P2-03 | Bulk accept no array size limit | Low (admin-only) | Low | **P2** |
| SEC-P2-04 | Contract HTML with embedded presigned URLs | Low | Low | **P2** |
| SEC-P2-05 | Bank account no format validation | N/A (user error) | High (financial) | **P2** |
| SEC-P2-06 | RLS context leakage via connection pool | Low (config-dependent) | Critical (if triggered) | **P2** |
