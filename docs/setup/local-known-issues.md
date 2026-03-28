# GADA VN — Local Known Issues

This document tracks every known defect, limitation, and workaround
that affects local development and smoke testing.

Issues are prioritised P0 (blocks all testing) through P3 (cosmetic / low impact).
Cross-references to `docs/qa/security-fix-list.md` and `docs/release/blockers.md`
are noted where the issue has wider impact beyond local dev.

---

## KI-001 — SUSPENDED users bypass Firebase auth check

**Priority**: P0 (security / auth blocker)
**Status**: OPEN
**Source file**: `apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php:48`
**Tracker**: `docs/qa/security-fix-list.md` → SEC-001, `docs/release/blockers.md` → BLK-001

**Symptom**: A user account with `status = 'SUSPENDED'` in `auth.users` can still make
authenticated API requests and receive 200 responses. Only `status = 'deleted'` is
currently blocked.

**Root cause**:
```php
// Current code (broken):
if ($user->status === 'deleted') {
    return response()->json(['message' => 'Account suspended'], 403);
}

// Needed:
$blockedStatuses = ['SUSPENDED', 'DELETED', 'deleted'];
if (in_array($user->status, $blockedStatuses, true)) {
    return response()->json(['message' => 'Account suspended'], 403);
}
```

**Impact on local testing**: verification checklist item F-12 will fail.
**Workaround**: manually set `status = 'SUSPENDED'` in DB and observe that the user
is NOT blocked (document as a known fail, not a test environment issue).

**Fix owner**: Backend/Admin team

---

## KI-002 — No rate limiting on `/auth/login` and `/auth/social/facebook`

**Priority**: P1 (security)
**Status**: OPEN
**Source file**: `apps/admin-laravel/routes/api.php:54-55`
**Tracker**: `docs/qa/security-fix-list.md` → SEC-002, `docs/release/blockers.md` → BLK-002

**Symptom**: `POST /v1/auth/login` and `POST /v1/auth/social/facebook` have no
`throttle:` middleware. An attacker can make unlimited requests. The OTP send
endpoint (`/auth/otp/send`) has `throttle:otp` but login does not.

**Impact on local testing**: no observable test failure; this is a production risk.
Smoke test ST-07-A will succeed, but a brute-force test would also succeed.

**Workaround**: none for local testing. Tag affected test results accordingly.

---

## KI-003 — N+1 query on public job listing (province resolution)

**Priority**: P1 (performance)
**Status**: OPEN
**Source file**: `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php:241-247`
**Tracker**: `docs/qa/performance-fix-list.md` → PERF-001

**Symptom**: `GET /v1/public/jobs` executes one extra DB query per job row to
resolve the province name. With 3 seeded jobs this is imperceptible locally;
with 100+ jobs in staging it causes visible latency (>500 ms per page).

**Impact on local testing**: ST-09-A passes correctly; PERF impact only visible
with many rows.

**Workaround**: keep seed data small (< 10 jobs) to avoid noticeable slowdown.

---

## KI-004 — No pagination on `GET /manager/jobs/{jobId}/applications`

**Priority**: P1
**Status**: OPEN
**Source file**: `apps/admin-laravel/app/Http/Controllers/Api/Manager/ManagerApplicationController.php:64`
**Tracker**: `docs/release/blockers.md` → BLK-003

**Symptom**: The applications list endpoint calls `.get()` with no `LIMIT`.
A job with hundreds of applicants will load all of them into PHP memory.

**Impact on local testing**: ST-12-A passes with the 1-2 seeded applications.
The bug is not observable until a job accumulates many applicants.

**Workaround**: not required for local testing.

---

## KI-005 — `firebase_uid` placeholder values incompatible with real Firebase

**Priority**: P1
**Status**: KNOWN LIMITATION (by design for emulator)
**Source file**: `packages/db/seeds/001_dev_data.sql:26-54`

**Symptom**: Seed users have placeholder Firebase UIDs
(`dev-firebase-admin-001`, etc.). These UIDs only work with the Firebase Auth
emulator (`firebase emulators:start --only auth`). Attempting to authenticate
against a real Firebase project with these UIDs will fail — the emulator-issued
token's `uid` field will not match any real Firebase account.

**Impact on local testing**: all ST-06 and auth-dependent tests require the
Firebase Auth emulator to be running.

**Workaround for real Firebase testing**:
1. Create phone number accounts in Firebase Console for each test phone number.
2. Note the real Firebase UIDs assigned.
3. `UPDATE auth.users SET firebase_uid = '<real-uid>' WHERE phone = '+84900000001';`
4. Repeat for each seed account.

---

## KI-006 — `docker-compose.yml` references legacy apps (not active apps)

**Priority**: P2 (dev environment confusion)
**Status**: KNOWN LIMITATION
**Source file**: `docker-compose.yml`

**Symptom**: `docker-compose.yml` defines service containers for `apps/web`
(legacy Next.js) and `apps/admin` (legacy PHP shell). The currently active apps
are `apps/web-next` and `apps/admin-laravel`. Running `docker compose up` starts
the wrong app containers.

**Impact on local testing**: if a developer runs `docker compose up` expecting to
start the full stack, the wrong containers start and ports conflict.

**Workaround**:
- Only use docker-compose for PostgreSQL and Redis:
  ```bash
  docker compose up postgres redis -d   # or: pnpm services:up
  ```
- Start `apps/web-next`, `apps/api`, and `apps/admin-laravel` manually in separate
  terminals (see `local-development-guide.md`).

**Long-term fix**: update `docker-compose.yml` to reference active app directories.

---

## KI-007 — No queue worker process — all operations are synchronous

**Priority**: P2
**Status**: KNOWN LIMITATION (by design for MVP)

**Symptom**: Neither the NestJS API nor the Laravel admin panel have a dedicated
queue worker. Contract generation and FCM push notifications are executed
synchronously within the HTTP request cycle.

**Implications**:
- Contract generation adds ~1-2 s to the HTTP response time (S3 upload).
- Under high load, slow S3 writes can cause HTTP timeouts.
- Failed S3 uploads surface as 500 errors with no retry mechanism.
- `QUEUE_CONNECTION=sync` means `php artisan queue:work` is not needed.

**Impact on local testing**: ST-04 confirms no queue worker required; ST-13 tests
contract generation synchronously and expects immediate S3 upload.

**Workaround**: no action needed for local dev. For production readiness, contract
generation should be moved to a queued job (see `performance-fix-list.md`).

---

## KI-008 — S3 file upload requires real AWS credentials (no local emulator)

**Priority**: P2
**Status**: OPEN
**Affects**: ST-05, ST-07 (S3 uploads), ST-13 (contract generation)

**Symptom**: `POST /v1/files/presigned-url` generates presigned PUT URLs pointing
to real S3. Without valid `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, all
presigned URL requests fail with HTTP 403 (Forbidden) or SDK initialisation errors.

**Impact on local testing**: ST-05-B and all file upload verification items fail
without AWS credentials or LocalStack.

**Workaround — Option A: Use real AWS (recommended for staging)**
- Create a personal IAM user with `s3:PutObject` / `s3:GetObject` on a dev bucket.
- Set credentials in root `.env.local`.

**Workaround — Option B: LocalStack**
1. Install LocalStack: `brew install localstack`
2. Start: `localstack start -d`
3. Create a local bucket:
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 mb s3://gada-vn-local-uploads
   ```
4. Add to root `.env.local`:
   ```
   AWS_ENDPOINT_URL=http://localhost:4566
   AWS_ACCESS_KEY_ID=test
   AWS_SECRET_ACCESS_KEY=test
   S3_BUCKET=gada-vn-local-uploads
   AWS_BUCKET=gada-vn-local-uploads
   ```
5. Presigned URLs will point to `http://localhost:4566/gada-vn-local-uploads/...`

**Note**: Laravel `ContractService` hardcodes the AWS SDK client; the
`AWS_ENDPOINT_URL` override must also be applied there or LocalStack will not work
for Laravel-side contract uploads.

---

## KI-009 — Facebook login requires Facebook Developer App configuration

**Priority**: P2
**Status**: OPEN
**Affects**: ST-07, verification items FB-01 through FB-08

**Symptom**: Facebook OAuth popup fails with
`Can't Load URL: The domain of this URL isn't included in the app's domains`
unless `localhost:3000` is registered in the Facebook Developer App settings.

**Setup steps**:
1. Go to `https://developers.facebook.com/` → your app → Settings → Basic.
2. Under **App Domains**, add `localhost`.
3. Go to Facebook Login → Settings → Valid OAuth Redirect URIs.
4. Add: `https://gada-vn-dev.firebaseapp.com/__/auth/handler`
   (Firebase handles the OAuth redirect; this URI comes from Firebase Console →
   Authentication → Sign-in method → Facebook → OAuth redirect URI).
5. Set `App ID` and `App Secret` in Firebase Console → Authentication →
   Sign-in method → Facebook.

**Workaround**: if Facebook App is not configured, skip FB-01 through FB-08 and
mark as BLOCKED. Phone OTP (via emulator) must still pass for core auth coverage.

---

## KI-010 — Google Maps API key must allow localhost referrer

**Priority**: P2
**Status**: OPEN
**Affects**: ST-08, verification items G-01 through G-07

**Symptom**: Maps JavaScript API returns `RefererNotAllowedMapError` in browser
console. Autocomplete input renders but dropdown never appears.

**Setup steps**:
1. Go to Google Cloud Console → Credentials → your API key → Application restrictions.
2. Under **Website restrictions**, add:
   - `http://localhost:3000/*`
   - `http://localhost:3000`
3. Under **API restrictions**, ensure **Maps JavaScript API** and **Places API** are enabled.

**Workaround**: without a valid Maps API key set in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`,
the address autocomplete falls back to a plain text input. Lat/lng must be
entered manually for smoke tests that require site coordinates.

---

## KI-011 — `apps/mobile-shell` is not a runnable app

**Priority**: P3 (documentation confusion)
**Status**: KNOWN LIMITATION

**Symptom**: The directory `apps/mobile-shell/` exists and contains planning
documents (`.md` files) but no runnable React Native code. A developer looking
for the mobile app there will find nothing to run.

**Workaround**: the actual mobile app is at `apps/mobile/`. Use
`cd apps/mobile && pnpm start` to start Expo.

---

## KI-012 — S3 bucket name inconsistency across services

**Priority**: P2 (configuration)
**Status**: OPEN
**Tracker**: `docs/setup/missing-env-vars.md` → MISMATCH-001

**Symptom**: Three different environment variable names refer to the same S3 bucket:
- `S3_UPLOADS_BUCKET` — root `.env.example` original name
- `S3_BUCKET` — read by NestJS `apps/api/src/modules/files/files.service.ts:20`
- `AWS_BUCKET` — read by Laravel `apps/admin-laravel` (Laravel convention)

If any one is set but not the others, the corresponding service silently uses a
different bucket (or falls back to the hardcoded default `gada-vn-uploads`).

**Workaround**: set all three in root `.env.local`:
```
S3_BUCKET=gada-vn-local-uploads
AWS_BUCKET=gada-vn-local-uploads
```
The root `.env.example` has been updated to include both names with this note.

**Long-term fix**: standardise on `S3_UPLOADS_BUCKET` across all services.

---

## KI-013 — `packages/core/dist/` must be built before starting API

**Priority**: P1 (startup blocker)
**Status**: KNOWN LIMITATION (documented)
**Tracker**: `docs/setup/local-blockers.md` → LB-001

**Symptom**: `cd apps/api && pnpm dev` throws
`Cannot find module '@gada-vn/core'` if `packages/core/dist/` does not exist.
`tsconfig` paths point to `dist/`, not `src/`.

**Workaround**: always run `pnpm packages:build` (or `make packages`) before
starting the API for the first time after a fresh clone.

The bootstrap script (`scripts/bootstrap.sh`) and `pnpm setup` perform this step
automatically.

---

## KI-014 — FIREBASE_PRIVATE_KEY multiline handling

**Priority**: P1 (startup blocker for NestJS API)
**Status**: KNOWN LIMITATION
**Tracker**: `docs/setup/local-blockers.md` → LB-005

**Symptom**: NestJS API fails on startup with
`Error: FIREBASE_PRIVATE_KEY must contain actual newlines (found literal \\n)`.

**Root cause**: when the Firebase private key is pasted into a shell `.env` file,
the `\n` characters are often stored as literal backslash-n rather than real
newline characters.

**Fix**: in `root .env.local`, the private key must be wrapped in double quotes
with real newline characters:
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkq...
...rest of key...
-----END PRIVATE KEY-----"
```

**Alternative**: some teams base64-encode the key and decode it in the
FirebaseService initialisation. Not currently implemented.

---

## KI-015 — Laravel Redis extension required for default session config

**Priority**: P2
**Status**: KNOWN LIMITATION

**Symptom**: Laravel admin panel throws `Class "Redis" not found` on first request
if the PHP Redis extension is not installed. The default `.env` sets
`SESSION_DRIVER=redis` and `CACHE_STORE=redis`.

**Workaround for local dev without PHP Redis extension**:
```
CACHE_STORE=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
```
Set these in `apps/admin-laravel/.env`. All Laravel admin features work correctly
with file-based sessions for local development.

**Workaround for installing Redis extension**:
```bash
pecl install redis
# then add extension=redis.so to php.ini
```

---

## KI-016 — `export const dynamic = 'force-dynamic'` on job detail page

**Priority**: P2 (performance)
**Status**: OPEN
**Source file**: `apps/web-next/src/app/[locale]/(public)/jobs/[slug]/page.tsx:15`
**Tracker**: `docs/qa/performance-fix-list.md` → PERF-003

**Symptom**: the public job detail page bypasses all Next.js caching. Every visitor
triggers a fresh server-side render and a new API call to the backend. Under load
this becomes a significant bottleneck.

**Impact on local testing**: page renders correctly. Perf impact only visible
under load or in production.

**Workaround**: none needed for local testing.

---

## Issue Summary Table

| ID | Priority | Status | One-Line Description |
|----|----------|--------|----------------------|
| KI-001 | P0 | OPEN | SUSPENDED users bypass auth check |
| KI-002 | P1 | OPEN | No rate limiting on login/social routes |
| KI-003 | P1 | OPEN | N+1 queries on public job listing |
| KI-004 | P1 | OPEN | No pagination on applications list |
| KI-005 | P1 | BY DESIGN | Seed UIDs only work with Firebase emulator |
| KI-006 | P2 | KNOWN | docker-compose.yml references legacy apps |
| KI-007 | P2 | BY DESIGN | No queue worker — all ops are synchronous |
| KI-008 | P2 | OPEN | S3 upload requires real AWS or LocalStack |
| KI-009 | P2 | OPEN | Facebook login requires Dev App setup |
| KI-010 | P2 | OPEN | Google Maps requires localhost referrer in API key |
| KI-011 | P3 | KNOWN | apps/mobile-shell is not a runnable app |
| KI-012 | P2 | OPEN | S3 bucket env var name inconsistency |
| KI-013 | P1 | KNOWN | packages/core/dist/ must be built first |
| KI-014 | P1 | KNOWN | Firebase private key newline format |
| KI-015 | P2 | KNOWN | PHP Redis extension required for default session config |
| KI-016 | P2 | OPEN | Job detail page force-dynamic disables CDN caching |
