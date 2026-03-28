# Release Blockers — GADA VN MVP

**Date**: 2026-03-21
**Status**: All blockers open
**Resolution required before**: Production release

Each blocker has an owner field. Assign before work begins.

---

## How to Use This Document

- Work blockers in the order listed (P0 before P1).
- When a blocker is resolved: mark the status cell `✅ RESOLVED — YYYY-MM-DD`.
- A production release requires all P0 blockers resolved and all P0/P1 UAT items passing.

---

## P0 Blockers — Must Resolve Before Any Production Deploy

---

### BLK-001 — Suspended accounts bypass authentication

| Field | Value |
|-------|-------|
| **ID** | BLK-001 |
| **Priority** | P0 |
| **Category** | Security |
| **File** | `apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php:48` |
| **Owner** | _______________ |
| **Effort** | ~1h |
| **Status** | ⬜ OPEN |

**Problem**: The middleware only blocks users with `status === 'deleted'` (exact lowercase match). Suspended users (`status = 'SUSPENDED'`) retain full API access until their Firebase JWT expires (up to 1 hour). Uppercase `'DELETED'` is also not blocked.

**Risk**: Admin suspends an account for abuse. The user continues making API calls, posting jobs, viewing contracts, or downloading ID documents for up to 60 minutes.

**Fix**:

```php
// apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php
// Replace line 48:

$blockedStatuses = ['SUSPENDED', 'DELETED', 'deleted'];
if (in_array($user->status, $blockedStatuses, true)) {
    return response()->json([
        'statusCode' => 403,
        'message'    => '계정이 비활성화 상태입니다.',
    ], 403);
}
```

**Test cases**:
- Suspend a user via admin panel → make an authenticated API request with a fresh JWT → should receive 403.
- Delete a user → same test → 403.
- Active user → 200 (unchanged).

---

### BLK-002 — No rate limiting on login and social auth endpoints

| Field | Value |
|-------|-------|
| **ID** | BLK-002 |
| **Priority** | P0 |
| **Category** | Security |
| **File** | `apps/admin-laravel/routes/api.php:45,46` |
| **Owner** | _______________ |
| **Effort** | ~30min |
| **Status** | ⬜ OPEN |

**Problem**: `POST /auth/login` and `POST /auth/social/facebook` have no rate limiting. An attacker can make unlimited login attempts, enabling credential stuffing and account enumeration at no cost.

**Risk**: User accounts compromised via brute-force or credential stuffing. Firebase OTP send has throttling (`throttle:otp`) but login verification does not.

**Fix**:

```php
// apps/admin-laravel/routes/api.php

// Add throttle to login and social auth:
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,15');           // 10 attempts per 15 minutes per IP

Route::post('/auth/social/facebook', [AuthController::class, 'socialFacebook'])
    ->middleware('throttle:10,15');

Route::post('/auth/otp/verify', [OtpController::class, 'verify'])
    ->middleware('throttle:5,1');             // 5 attempts per minute (already has send throttle)
```

**Also add to `config/app.php` or `RouteServiceProvider` if not present**:
```php
'throttle:otp' => \Illuminate\Routing\Middleware\ThrottleRequests::class . ':3,1',
// 3 OTP sends per minute per IP
```

**Test cases**:
- Make 11 sequential POST requests to `/auth/login` from the same IP → 11th should return 429 Too Many Requests.
- Make 6 sequential POST requests to `/auth/otp/verify` → 6th should return 429.
- After 15 minutes, rate limit resets → login works again.

---

### BLK-003 — No pagination on manager applicant list

| Field | Value |
|-------|-------|
| **ID** | BLK-003 |
| **Priority** | P0 |
| **Category** | Security / Performance |
| **File** | `apps/admin-laravel/app/Http/Controllers/Api/Manager/ManagerApplicationController.php:64` |
| **Owner** | _______________ |
| **Effort** | ~1h (controller + frontend) |
| **Status** | ⬜ OPEN |

**Problem**: `GET /manager/jobs/{id}/applications` calls `.get()` with no limit. If a job receives 500 applicants, the endpoint loads all 500 Eloquent models, serializes them, and sends the full payload. At 1,000 applicants this causes memory exhaustion and 30s+ response times.

**Risk**: (1) Performance: endpoint becomes unusable for popular jobs. (2) Security: unauthenticated or low-privilege actor could trigger memory exhaustion via a crafted request (though endpoint is behind `firebase.auth`).

**Fix**:

```php
// ManagerApplicationController.php — index() method, replace line 64

$applications = Application::where('job_id', $jobId)
    ->with(['worker.user', 'worker.profile'])
    ->when($request->status, fn($q, $s) => $q->where('status', strtoupper($s)))
    ->orderBy('applied_at', 'asc')
    ->paginate(50);  // ← was .get()

return response()->json([
    'statusCode' => 200,
    'data'       => $applications->items(),
    'meta'       => [
        'current_page' => $applications->currentPage(),
        'last_page'    => $applications->lastPage(),
        'per_page'     => $applications->perPage(),
        'total'        => $applications->total(),
    ],
]);
```

**Frontend update required**: The web and mobile applicant list components must handle the `meta` pagination response and implement a "load more" or page navigation control.

**Test cases**:
- Job with 60 applicants: GET request returns 50 items + `meta.total = 60`, `meta.last_page = 2`.
- GET with `?page=2` returns remaining 10 items.
- GET with `?status=PENDING` filters before pagination.

---

### BLK-004 — N+1 query on public job listing

| Field | Value |
|-------|-------|
| **ID** | BLK-004 |
| **Priority** | P0 |
| **Category** | Performance |
| **File** | `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php` |
| **Owner** | _______________ |
| **Effort** | ~1h |
| **Status** | ⬜ OPEN |

**Problem**: `resolveProvinceForSite()` executes one DB query per job item inside the listing `map()`. A page of 20 jobs triggers 21 database queries (1 job list + 20 province lookups). Under moderate traffic (50 concurrent listing requests), this produces ~1,050 province queries per second.

**Risk**: Public job listing page — the highest-traffic endpoint — degrades rapidly under load. This page is also indexed by search engines, so slow response affects SEO.

**Fix**:

```php
// In the index() method, before the $jobs->map() loop:

// Pre-load all provinces into a lookup array (63 rows, ~5KB in memory)
$provinceLookup = DB::table('ref.vn_provinces')
    ->select('code', 'name_vi', 'name_ko')
    ->get()
    ->keyBy('code')           // key by province code
    ->toArray();

// Pass $provinceLookup to formatListItem() instead of hitting DB per job
// Modify resolveProvinceForSite() to accept the lookup array as a parameter:

private function resolveProvinceForSite(object $site, array $provinceLookup): array {
    $province = $provinceLookup[$site->province] ?? null;
    if (!$province) return ['', ''];
    return [$province->name_vi, Str::slug($province->name_vi)];
}
```

**Test cases**:
- Enable query logging (`DB::enableQueryLog()`), call the listing endpoint, assert total query count ≤ 3 (jobs, sites, one province pre-load).
- Listing page returns correct province names.

---

### BLK-005 — EAS project ID is a placeholder

| Field | Value |
|-------|-------|
| **ID** | BLK-005 |
| **Priority** | P0 |
| **Category** | Mobile Build |
| **File** | `apps/mobile/app.json:60` |
| **Owner** | _______________ |
| **Effort** | ~1h |
| **Status** | ⬜ OPEN |

**Problem**: `"projectId": "your-eas-project-id"` in `app.json` is a placeholder. EAS builds fail or link to the wrong Expo project until this is replaced.

**Fix**:
1. Go to `expo.dev` and create or locate the GADA VN project.
2. Copy the project UUID.
3. Replace `"your-eas-project-id"` in `apps/mobile/app.json:60`.
4. Run `eas build --platform android --profile preview` to confirm the build links to the correct project.

---

### BLK-006 — Mobile app cannot switch Firebase config per environment

| Field | Value |
|-------|-------|
| **ID** | BLK-006 |
| **Priority** | P0 |
| **Category** | Mobile Build / Environment Isolation |
| **File** | `apps/mobile/app.json` → must become `apps/mobile/app.config.ts` |
| **Owner** | _______________ |
| **Effort** | ~2h |
| **Status** | ⬜ OPEN |

**Problem**: `app.json` is static and cannot conditionally select `google-services.json` (Android Firebase config) based on the build environment. Staging builds will use the production Firebase project unless this is resolved.

**Risk**: Staging test workers and managers will be registered in the production Firebase Auth user list. This violates environment isolation rule R2 and pollutes production data.

**Fix**: Convert `app.json` to `app.config.ts`:

```typescript
// apps/mobile/app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = process.env.APP_ENV ?? 'development';
  const isProduction = appEnv === 'production';

  return {
    ...config,
    name: isProduction ? 'GADA VN' : 'GADA VN (Staging)',
    android: {
      ...config.android,
      googleServicesFile: isProduction
        ? './google-services.json'
        : './google-services.staging.json',
    },
    ios: {
      ...config.ios,
      googleServicesFile: isProduction
        ? './GoogleService-Info.plist'
        : './GoogleService-Info.staging.plist',
    },
    extra: {
      eas: { projectId: 'YOUR_ACTUAL_EAS_PROJECT_ID' },
    },
  };
};
```

Ensure `google-services.staging.json` and `GoogleService-Info.staging.plist` are uploaded as EAS secret files (not committed to the repo).

---

### BLK-007 — Staging has not been deployed

| Field | Value |
|-------|-------|
| **ID** | BLK-007 |
| **Priority** | P0 |
| **Category** | Staging Validation |
| **File** | `docs/release/staging-release-plan.md` |
| **Owner** | _______________ |
| **Effort** | 1–2 days |
| **Status** | ⬜ OPEN |

**Problem**: No staging environment exists. All release validation, smoke tests, and UAT depend on a functional staging environment.

**Steps** (see `docs/release/staging-release-plan.md` for full detail):
1. Bootstrap CDK staging stacks: `cdk deploy --context env=staging --all`
2. Run DB migration as ECS one-shot task
3. Configure Firebase staging project (`gada-vn-staging`) with test phone numbers
4. Deploy all three ECS services from the `staging` branch
5. Run `docs/release/staging-smoke-test.md` — P0/P1 items

---

### BLK-008 — UAT has not been conducted

| Field | Value |
|-------|-------|
| **ID** | BLK-008 |
| **Priority** | P0 |
| **Category** | UAT |
| **File** | `docs/qa/uat-checklist-*.md` |
| **Owner** | _______________ |
| **Effort** | 2–3 days |
| **Status** | ⬜ OPEN |

**Problem**: No user acceptance testing has been performed. All P0 items across three checklists (admin, manager, worker) must pass before production release.

**Steps**:
1. Assign testers: 1 admin tester, 1 manager tester (Korean speaker), 1 worker tester (Vietnamese speaker preferred).
2. Run checklists in this order: worker → manager → admin (worker flow is a prerequisite for manager and admin flows).
3. File a GitHub issue for every FAIL item.
4. Resolve all P0 failures before sign-off.
5. Document P1/P2 failures as known issues with a fix timeline.

---

## P1 Blockers — Must Resolve Before or Immediately After Launch

---

### BLK-009 — Controller-level signature validation is insufficient

| Field | Value |
|-------|-------|
| **ID** | BLK-009 |
| **Priority** | P1 |
| **Category** | Security |
| **File** | `apps/admin-laravel/app/Http/Controllers/WorkerContractController.php:80` |
| **Owner** | _______________ |
| **Effort** | ~30min |
| **Status** | ⬜ OPEN |

**Current**: `'signature_data_url' => 'required|string'`

**The service layer (`ContractService.php:64`) does validate format**, so this is not a data corruption risk. However, a malformed large payload (~10MB base64 string) passes controller validation and must travel through request parsing and service invocation before being rejected.

**Fix** — add size and format validation at the controller boundary:

```php
'signature_data_url' => [
    'required',
    'string',
    'max:2097152',   // 2MB limit (base64 string length)
    'regex:/^data:image\/(png|jpeg|jpg|svg\+xml);base64,[A-Za-z0-9+\/]+=*$/',
],
```

---

### BLK-010 — No translation files committed (decision required)

| Field | Value |
|-------|-------|
| **ID** | BLK-010 |
| **Priority** | P1 |
| **Category** | i18n |
| **Owner** | _______________ |
| **Effort** | 3–5 days (if bilingual launch) |
| **Status** | ⬜ OPEN — DECISION REQUIRED |

**Problem**: `apps/web-next/messages/` and `apps/mobile/src/locales/` do not exist. If the MVP targets Vietnamese-speaking workers, a Vietnamese locale must be available at launch.

**Decision required**:
- **Option A — Korean-only launch**: Mark as known limitation. All UI is in Korean. Unblock by confirming with stakeholders.
- **Option B — Bilingual launch (Ko + Vi)**: Create translation JSON files, translate all strings, QA with native Vietnamese speaker, commit before deploy. Add `i18n:check` script to CI to prevent future missing keys.

---

### BLK-011 — `apps/web-next/.env.example` does not exist

| Field | Value |
|-------|-------|
| **ID** | BLK-011 |
| **Priority** | P1 |
| **Category** | Developer Operations |
| **File** | `apps/web-next/.env.example` |
| **Owner** | _______________ |
| **Effort** | ~30min |
| **Status** | ⬜ OPEN |

**Problem**: Next.js web app has no `.env.example`. Any new developer or CI environment cannot know what `NEXT_PUBLIC_*` variables are required without reading `docs/release/env-matrix.md`.

**Fix**: Create `apps/web-next/.env.example` with all variables from `docs/release/env-matrix.md` section 2, with placeholder values. Commit to repo.

---

### BLK-012 — Admin panel password must be rotated before deploy

| Field | Value |
|-------|-------|
| **ID** | BLK-012 |
| **Priority** | P1 |
| **Category** | Security |
| **Owner** | _______________ |
| **Effort** | ~15min |
| **Status** | ⬜ OPEN |

**Problem**: `docs/release/env-matrix.md` documents the default admin panel password as `gadaAdmin2026!`. This value must not be used in any deployed environment (staging or production).

**Fix**:
1. Generate a strong password (20+ chars, mixed case, numbers, symbols).
2. Store in SSM: `aws ssm put-parameter --name /gada-vn/production/ADMIN_PANEL_PASSWORD --value '<new-password>' --type SecureString --overwrite`
3. Repeat for staging with a different password.
4. Redeploy ECS admin service to pick up the new value.

---

## Blocker Resolution Tracking

| ID | Title | Priority | Owner | Status | Resolved date |
|----|-------|----------|-------|--------|--------------|
| BLK-001 | Suspended accounts bypass auth | P0 | | ⬜ OPEN | |
| BLK-002 | No rate limiting on login/social | P0 | | ⬜ OPEN | |
| BLK-003 | No pagination on applicant list | P0 | | ⬜ OPEN | |
| BLK-004 | N+1 query on job listing | P0 | | ⬜ OPEN | |
| BLK-005 | EAS project ID placeholder | P0 | | ⬜ OPEN | |
| BLK-006 | Mobile cannot switch Firebase per env | P0 | | ⬜ OPEN | |
| BLK-007 | Staging not deployed | P0 | | ⬜ OPEN | |
| BLK-008 | UAT not conducted | P0 | | ⬜ OPEN | |
| BLK-009 | Controller signature validation weak | P1 | | ⬜ OPEN | |
| BLK-010 | No translation files (decision needed) | P1 | | ⬜ OPEN | |
| BLK-011 | web-next/.env.example missing | P1 | | ⬜ OPEN | |
| BLK-012 | Admin password not rotated | P1 | | ⬜ OPEN | |

**GO condition**: BLK-001 through BLK-008 all resolved AND all P0 UAT items passing.
