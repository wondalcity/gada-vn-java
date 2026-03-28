# GADA VN — Security Fix List

**Date**: 2026-03-21
**Source**: docs/qa/security-review.md
**Total fixes**: 16 (P0: 4, P1: 6, P2: 6)

---

## P0 — Critical (Block Launch)

### SEC-P0-01 · Fix suspended user authentication bypass

**File**: `apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php:48`

```php
// BEFORE
if ($user->status === 'deleted') {
    return response()->json(['error' => 'Account suspended'], 403);
}

// AFTER
$blockedStatuses = ['deleted', 'DELETED', 'SUSPENDED'];
if (in_array($user->status, $blockedStatuses, true)) {
    return response()->json(['error' => 'Account is not active'], 403);
}
```

Also fix the underlying status inconsistency (see SEC-P1-02) — after that fix, simplify to:
```php
if (in_array($user->status, ['SUSPENDED', 'DELETED'], true)) {
    return response()->json(['error' => 'Account is not active'], 403);
}
```

**Effort**: 15 min
**Test**: Suspended worker token → 403. Active worker token → passes. Deleted user → 403.

---

### SEC-P0-02 · Add rate limiting to auth and contract signing endpoints

**File**: `apps/admin-laravel/routes/api.php`

```php
// BEFORE
Route::post('/auth/otp/verify', [OtpController::class, 'verify']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/social/facebook', [SocialAuthController::class, 'facebook']);
Route::post('/auth/register', [RegisterController::class, 'register'])->middleware('firebase.auth');

// AFTER
Route::post('/auth/otp/verify', [OtpController::class, 'verify'])
    ->middleware('throttle:10,1');     // 10 attempts per minute per IP
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,15');   // 10 attempts per 15 minutes per IP
Route::post('/auth/social/facebook', [SocialAuthController::class, 'facebook'])
    ->middleware('throttle:10,15');
Route::post('/auth/register', [RegisterController::class, 'register'])
    ->middleware(['firebase.auth', 'throttle:5,1']);

// Also for contract signing (inside worker auth group):
Route::post('/worker/contracts/{id}/sign', [WorkerContractController::class, 'sign'])
    ->middleware('throttle:5,1');
```

Register the named `otp` throttle in `app/Providers/RouteServiceProvider.php` (already present) and add:
```php
RateLimiter::for('contract-sign', function (Request $request) {
    return Limit::perMinute(5)->by($request->user()->id ?? $request->ip());
});
```

**Effort**: 30 min
**Test**: Submit 11 OTP verify requests → 11th returns 429. Login 11 times in 15 min → 429.

---

### SEC-P0-03 · Add size and format validation to signature data URL

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Worker/WorkerContractController.php:80`

```php
// BEFORE
'signature_data_url' => 'required|string',

// AFTER
'signature_data_url' => [
    'required',
    'string',
    'max:2097152',   // 2MB max (base64 of ~1.5MB binary)
    'regex:/^data:image\/(png|jpeg|jpg|svg\+xml);base64,[A-Za-z0-9+\/]+=*$/',
],
```

Additionally, add a custom validation rule to reject SVGs with suspicious content:
```php
// In WorkerContractController or a FormRequest:
function (string $attribute, mixed $value, \Closure $fail) {
    if (str_contains($value, 'data:image/svg+xml')) {
        $svgContent = base64_decode(explode(',', $value)[1] ?? '');
        if (
            str_contains($svgContent, '<script') ||
            str_contains($svgContent, 'javascript:') ||
            str_contains($svgContent, '<!ENTITY') ||
            str_contains($svgContent, 'SYSTEM')
        ) {
            $fail('Invalid signature format.');
        }
    }
}
```

**Effort**: 1 hour
**Test**: Submit 3MB string → 422. Submit `data:application/js;base64,...` → 422. Submit SVG with `<script>` → 422. Valid PNG data URL → 200.

---

### SEC-P0-04 · Remove manager signature URL from worker response

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Worker/WorkerContractController.php:47-52`

```php
// BEFORE — show() method response
return response()->json([
    'contract' => $contract,
    'worker_sig_url' => $workerSigUrl,
    'manager_sig_url' => $managerSigUrl,   // ← REMOVE THIS
]);

// AFTER
return response()->json([
    'contract' => $contract,
    'worker_sig_url' => $workerSigUrl,
    // manager_sig_url intentionally omitted from worker-facing response
]);
```

Manager signature URL should only be returned in:
- Manager-facing contract detail endpoint (`/manager/contracts/{id}`)
- Admin-facing contract detail endpoint

**Effort**: 15 min
**Test**: Worker calls GET `/worker/contracts/{id}` → response has no `manager_sig_url` field. Manager calls their equivalent endpoint → response has both URLs.

---

## P1 — High (Fix Before Launch)

### SEC-P1-01 · Refactor raw SQL construction in AdminUserController

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Admin/AdminUserController.php:59-103`

Replace fragile `WHERE {$where}` string interpolation with a safe query builder pattern:

```php
// BEFORE (fragile string interpolation)
$where = "1=1";
$bindings = [];
if ($role) {
    $where .= " AND r.role = ?";
    $bindings[] = $role;
}
$sql = "SELECT ... FROM auth.users u WHERE {$where}";

// AFTER (safe array-based construction)
$conditions = ["1=1"];
$bindings = [];
if ($role) {
    $conditions[] = "r.role = ?";
    $bindings[] = $role;
}
if ($status) {
    $conditions[] = "u.status = ?";
    $bindings[] = strtoupper($status);
}
if ($search) {
    $conditions[] = "(u.full_name ILIKE ? OR u.phone_number ILIKE ?)";
    $bindings[] = "%{$search}%";
    $bindings[] = "%{$search}%";
}
$whereClause = implode(' AND ', $conditions);
$sql = "SELECT ... FROM auth.users u WHERE {$whereClause}";
```

The key change: `$whereClause` is constructed from a whitelist array, never from raw user input.

**Effort**: 2 hours
**Test**: Search with `'; DROP TABLE auth.users; --` → valid 200 with 0 results, no SQL error.

---

### SEC-P1-02 · Normalize status values to uppercase

**Files**:
- `apps/admin-laravel/app/Http/Controllers/Api/Account/MeController.php:94`
- `apps/admin-laravel/app/Models/User.php` (add status constants)

```php
// Add to User model
const STATUS_ACTIVE    = 'ACTIVE';
const STATUS_SUSPENDED = 'SUSPENDED';
const STATUS_PENDING   = 'PENDING';
const STATUS_DELETED   = 'DELETED';

// MeController.php:94 — BEFORE
$user->update(['status' => 'deleted']);

// MeController.php:94 — AFTER
$user->update(['status' => User::STATUS_DELETED]);
```

Also update `FirebaseAuthMiddleware` after this fix (see SEC-P0-01 updated version above).

**Effort**: 30 min
**Test**: Self-delete via `/me` → DB has `status = 'DELETED'` (uppercase). Admin delete → same. Subsequent login attempt → 403.

---

### SEC-P1-03 · Add audit logging for PII access and mutations

**Files**: Multiple controllers

Create a shared `AuditService` or use an existing logging mechanism:

```php
// New: app/Services/AuditService.php
class AuditService
{
    public function log(string $action, string $resourceType, string $resourceId, ?array $metadata = null): void
    {
        DB::table('ops.audit_log')->insert([
            'actor_user_id' => auth()->id(),
            'action'        => $action,       // e.g. 'ID_DOCUMENT_UPLOAD', 'CONTRACT_SIGN'
            'resource_type' => $resourceType, // e.g. 'worker_id_document', 'contract'
            'resource_id'   => $resourceId,
            'metadata'      => $metadata ? json_encode($metadata) : null,
            'ip_address'    => request()->ip(),
            'created_at'    => now(),
        ]);
    }
}
```

Add audit calls in:
- `WorkerIdDocumentController::store()` → `$audit->log('ID_DOCUMENT_UPLOAD', 'worker_id_document', $user->id)`
- `WorkerIdDocumentController::show()` → `$audit->log('ID_DOCUMENT_VIEW', 'worker_id_document', $targetUserId)`
- `ContractService::workerSign()` → `$audit->log('CONTRACT_SIGN_WORKER', 'contract', $contractId)`
- `ContractService::managerSign()` → `$audit->log('CONTRACT_SIGN_MANAGER', 'contract', $contractId)`
- `AdminUserController::bulkStatus()` → `$audit->log('ADMIN_BULK_STATUS', 'user', implode(',', $ids), ['new_status' => $status])`
- `AdminUserController::destroy()` → `$audit->log('ADMIN_USER_DELETE', 'user', $userId)`

Requires migration for `ops.audit_log` table if not yet present.

**Effort**: 3 hours
**Test**: Upload ID document → audit log entry created. Admin bulk-suspend 3 users → 1 audit entry with metadata. Check log actor_user_id is set correctly.

---

### SEC-P1-04 · Add file size limit to ID document upload

**File**: `apps/admin-laravel/app/Http/Requests/Worker/UploadIdDocumentRequest.php`

```php
// BEFORE
'document_file' => 'required|file|mimes:jpg,jpeg,png,pdf',

// AFTER
'document_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',   // 10MB max
```

Also add server-side upload size guard in `php.ini` / `upload_max_filesize = 10M` in the deployment config.

**Effort**: 15 min
**Test**: Upload 11MB file → 422 with validation error. Upload 5MB valid JPEG → 200.

---

### SEC-P1-05 · Add entropy to S3 key for identity documents

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Worker/WorkerIdDocumentController.php`

```php
// BEFORE
$key = "worker-id/{$user->id}";

// AFTER
$randomSuffix = bin2hex(random_bytes(16));   // 32-char hex nonce
$key = "worker-id/{$user->id}/{$randomSuffix}";

// Store the key in the DB record so it can be retrieved later:
$document->update(['s3_key' => $key]);
```

This ensures that even if the user UUID is known, the full S3 key cannot be guessed.

**Effort**: 1 hour (includes DB migration to store s3_key if not already stored)
**Test**: Upload document → S3 key contains UUID + random suffix. Attempting `worker-id/{uuid}` directly → no such key in S3.

---

### SEC-P1-06 · Add rate limiting to registration

Already covered in SEC-P0-02 above (registration throttle added as part of that fix).

**Effort**: 0 (included in SEC-P0-02)

---

## P2 — Medium (Fix Within 30 Days)

### SEC-P2-01 · Trim whitespace from super admin email list

**File**: `apps/admin-laravel/app/Models/User.php`

```php
// BEFORE
$emails = explode(',', config('app.super_admin_emails', ''));
return in_array($this->email, $emails);

// AFTER
$emails = array_map('trim', explode(',', config('app.super_admin_emails', '')));
return in_array($this->email, $emails, true);
```

**Effort**: 5 min
**Test**: Set env `SUPER_ADMIN_EMAILS=admin@gada.vn, ops@gada.vn` (note space). Both emails → isSuperAdmin() returns true.

---

### SEC-P2-02 · Explicitly configure CORS

**File**: `apps/admin-laravel/config/cors.php` (create if missing)

```php
<?php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => [
        env('APP_FRONTEND_URL', 'http://localhost:3000'),
        // Add production web-next domain
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

**Effort**: 30 min
**Test**: OPTIONS preflight from allowed origin → 200 with correct CORS headers. OPTIONS from disallowed origin → CORS headers absent or 403.

---

### SEC-P2-03 · Add array size limit to bulk endpoints

**File**: `apps/admin-laravel/app/Http/Requests/Admin/BulkStatusRequest.php` (or equivalent)

```php
// BEFORE
'ids' => 'required|array',
'ids.*' => 'required|uuid',

// AFTER
'ids' => 'required|array|max:100',
'ids.*' => 'required|uuid',
```

**Effort**: 15 min
**Test**: Submit 101 UUIDs → 422. Submit 100 → 200.

---

### SEC-P2-04 · Avoid embedding presigned URLs in stored contract HTML

**File**: `apps/admin-laravel/app/Services/Contract/ContractService.php`

Instead of embedding presigned URLs in the HTML at generation time, use placeholder tokens and resolve them to fresh presigned URLs at render time:

```php
// Store contract HTML with placeholder tokens:
$html = str_replace($workerSigPresignedUrl, '{{WORKER_SIG}}', $html);
$html = str_replace($managerSigPresignedUrl, '{{MANAGER_SIG}}', $html);

// At render/download time, generate fresh presigned URLs and substitute:
$html = str_replace('{{WORKER_SIG}}', $this->generatePresignedUrl($contract->worker_sig_key), $html);
```

**Effort**: 2 hours
**Test**: Download contract HTML → signature URLs are freshly generated (short TTL). Stored HTML in S3 → contains only placeholder tokens.

---

### SEC-P2-05 · Add bank account number format validation

**File**: `apps/admin-laravel/app/Http/Requests/Worker/UpdateBankAccountRequest.php`

```php
// BEFORE
'bank_account_number' => 'nullable|string|max:50',

// AFTER
'bank_account_number' => [
    'nullable',
    'string',
    'min:6',
    'max:20',
    'regex:/^[0-9]+$/',   // Vietnamese bank accounts are numeric only
],
```

**Effort**: 30 min
**Test**: Submit `'ABC123'` → 422. Submit `'123456789012'` → 200.

---

### SEC-P2-06 · Reset RLS context after each request

**File**: `apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php`

Add a termination hook or use `SET LOCAL` (transaction-scoped) instead of `SET`:

```php
// Option A: Use SET LOCAL (only valid within a transaction — requires wrapping request in transaction)
// This is the most correct approach but requires architectural change

// Option B: Reset after response using middleware terminate()
public function terminate(Request $request, Response $response): void
{
    try {
        DB::statement("SET app.current_user_id = ''");
    } catch (\Throwable) {
        // Ignore — connection may already be returned to pool
    }
}
```

Document in `config/database.php` that pgBouncer must be in **session pooling mode** (not transaction mode) until Option A is implemented.

**Effort**: 1 hour
**Test**: Verify that after a request completes, `SHOW app.current_user_id` on the same connection returns empty string.

---

## Remediation Timeline

| Priority | Items | Est. Effort | Deadline |
|----------|-------|-------------|----------|
| P0 — Critical | 4 fixes | ~2.5 hours | Before any user testing |
| P1 — High | 6 fixes | ~8 hours | Before production launch |
| P2 — Medium | 6 fixes | ~5 hours | Within 30 days of launch |
| **Total** | **16 fixes** | **~15.5 hours** | |

### Recommended Order

1. **SEC-P0-01** + **SEC-P1-02** together (status normalization + auth block) — 45 min
2. **SEC-P0-02** (rate limiting) — 30 min
3. **SEC-P0-03** (signature validation) — 1 hour
4. **SEC-P0-04** (manager URL leak) — 15 min
5. **SEC-P1-01** (SQL construction) — 2 hours
6. **SEC-P1-03** (audit logging) — 3 hours (requires schema migration)
7. **SEC-P1-04** + **SEC-P1-05** (ID document hardening) — 1.25 hours
8. P2 items in any order after launch
