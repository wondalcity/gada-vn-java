# GADA VN — Gap Analysis
**Date**: 2026-03-21
**Scope**: Missing implementations, unresolved stubs, incomplete flows

---

## 1. Database / Migration Gaps

### GAP-DB-01 — `auth.user_roles` table may be missing
**Status**: Unverified (not in migrations 001–006)
**Impact**: Application crashes on every authenticated request
**Evidence**:
- `FirebaseAuthMiddleware` line ~41: `DB::table('auth.user_roles')->insertOrIgnore(...)`
- `User::roles()`: `hasMany(UserRole::class)` → `auth.user_roles`
- `RoleMiddleware`: queries `auth.user_roles`
**Expected migration** (if missing):
```sql
CREATE TABLE auth.user_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('worker', 'manager', 'admin')),
    status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by  UUID REFERENCES auth.users(id),
    revoked_at  TIMESTAMPTZ,
    revoked_by  UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);
```

### GAP-DB-02 — `ref.vn_provinces` missing `slug` column
**Status**: Confirmed gap
**Impact**: Province slug computation (`Str::slug(name_vi)`) done at runtime on every request — requires full table scan + PHP string matching; no index possible
**Expected fix**: Add `slug TEXT GENERATED ALWAYS AS (lower(regexp_replace(name_vi, '[^a-z0-9]+', '-', 'gi'))) STORED` or a simple `ALTER TABLE ref.vn_provinces ADD COLUMN slug TEXT UNIQUE`

### GAP-DB-03 — `app.construction_sites` missing `slug` column
**Status**: Confirmed gap
**Impact**: Same as GAP-DB-02 — `Str::slug(site.name)` matched in PHP on every `/public/sites/{slug}` request
**Expected fix**: `ALTER TABLE app.construction_sites ADD COLUMN slug TEXT UNIQUE` + backfill + index

### GAP-DB-04 — `ref.translations` table may not exist
**Status**: Unverified
**Impact**: `AdminTranslationController::index()` catches DB exception and returns empty array silently — admin will see blank translation manager
**Expected migration**:
```sql
CREATE TABLE IF NOT EXISTS ref.translations (
    id      BIGSERIAL PRIMARY KEY,
    locale  TEXT NOT NULL,
    key     TEXT NOT NULL,
    value   TEXT NOT NULL,
    UNIQUE (locale, key)
);
```

### GAP-DB-05 — No `deleted_at` soft-delete column on `auth.users`
**Status**: Confirmed gap
**Impact**: `AdminUserController::destroy()` sets `status = 'DELETED'` but `auth.users.status` CHECK constraint is `ACTIVE|SUSPENDED|PENDING` — `DELETED` will fail the constraint
**Expected fix**: Either add `'DELETED'` to the CHECK constraint, or add `deleted_at TIMESTAMPTZ` for soft delete

---

## 2. Laravel Backend Gaps

### GAP-API-01 — Notification delivery not implemented
**Status**: Routes registered, controller referenced, but implementation unknown
**Routes**: `GET /notifications`, `PATCH /{id}/read`, `POST /read-all`
**Expected**: `NotificationController` should query `ops.notifications` and return paginated list
**Web frontend**: No notifications page in `apps/web-next`

### GAP-API-02 — Contract VOID transition has no endpoint
**Status**: No route registered for voiding a contract
**Impact**: Contracts stuck in `PENDING_WORKER_SIGN` or `PENDING_MANAGER_SIGN` can never be cancelled
**Expected**: `PATCH /manager/contracts/{id}/void` or `PATCH /admin/contracts/{id}/void`

### GAP-API-03 — Admin has no contract management API
**Status**: No admin contract endpoints in `routes/api.php`
**Impact**: Admin cannot list, inspect, or void contracts
**Expected routes**:
```
GET  /admin/contracts              — paginated contract list with status filter
GET  /admin/contracts/{id}         — contract detail with audit trail
PATCH /admin/contracts/{id}/void   — force-void any contract
```

### GAP-API-04 — `GenerateContractJob` is dead code with broken table references
**File**: `app/Jobs/GenerateContractJob.php`
**Issues**:
- References `app.hires` (table does not exist)
- References `app.employment_contracts` (renamed to `app.contracts`)
- Not dispatched by any controller (contract creation is synchronous in `ContractService`)
**Expected fix**: Delete the file, or rewrite to queue PDF generation post-`FULLY_SIGNED`

### GAP-API-05 — `MeController::destroy()` — account deletion incomplete
**Route**: `DELETE /me/account`
**Expected behavior**: Delete Firebase user, revoke tokens, anonymize PII in DB, soft-delete user record
**Actual behavior**: Unknown (controller not read in scope) — likely a stub

### GAP-API-06 — No FCM push notification on contract state changes
**Status**: `ops.fcm_tokens` table exists, FCM infrastructure is available
**Missing triggers**:
- Contract created → push to worker: "계약서가 생성되었습니다"
- Worker signed → push to manager: "근로자가 서명했습니다"
- Manager signed → push to worker: "계약이 완료되었습니다"
**Compare**: Attendance changes have no push notification trigger either

### GAP-API-07 — Public API has no job `count` endpoint
**Status**: No `GET /public/stats` endpoint
**Impact**: Landing page shows "N개 활성 공고" but must either fetch full listing or hardcode the count
**Expected**: `GET /public/stats` → `{ activeJobs: N, provinces: N, registeredWorkers: N }`

### GAP-API-08 — `WorkerProfileController` — `id_number` field not in DB
**Status**: `worker_profiles` migration has `id_number TEXT` (from migration 001)
**Model fillable**: Includes `id_number` ✓
**Issue**: `id_verified` flag set but `id_number` has no uniqueness constraint — duplicate IDs possible
**Expected**: `UNIQUE` constraint on `(id_number)` or compound index

### GAP-API-09 — Manager application self-application not blocked
**Status**: No check preventing a manager (who is also a registered worker) from applying to their own jobs
**Route**: `POST /jobs/{jobId}/apply`
**Expected**: `ApplicationService::apply()` should check `job->manager->user_id !== workerProfile->user_id`

---

## 3. Next.js Frontend Gaps

### GAP-WEB-01 — `gada_session` cookie not visibly set
**Status**: `middleware.ts` checks `gada_session` cookie to protect `(app)/*` routes, but no code in scope shows this cookie being set after Firebase login
**Expected**: After `POST /auth/login` returns a token, client should `document.cookie = 'gada_session=<token>; ...'`
**Impact**: All authenticated web pages may redirect to login even after successful Firebase auth

### GAP-WEB-02 — Web notification page missing
**Routes in API**: `GET /notifications`, `PATCH /{id}/read`, `POST /read-all`
**Mobile**: `apps/mobile/app/(worker)/notifications.tsx` and `(manager)/notifications.tsx` exist
**Web**: No equivalent at `(app)/worker/notifications/page.tsx` or `(app)/manager/notifications/page.tsx`
**Impact**: Web users have no way to view or dismiss notifications

### GAP-WEB-03 — `public` i18n namespace unverified
**Reference**: `generateMetadata` in landing page calls `getTranslations({ locale, namespace: 'public' })`
**Status**: Not confirmed to exist in `/packages/i18n/locales/{ko|vi|en}/`
**Impact**: Build error if namespace is missing

### GAP-WEB-04 — No `NEXT_PUBLIC_API_BASE_URL` for local dev
**Current default**: `https://api.gada.vn/api/v1`
**Impact**: Local development calls production API silently
**Expected**: `.env.local.example` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`

### GAP-WEB-05 — No loading state for `generateStaticParams` provinces
**File**: `app/[locale]/(public)/locations/[province]/page.tsx`
**Issue**: `generateStaticParams()` calls `fetchProvinces()` at build time — if the API is down at build time, it returns `[]` and no province pages are pre-generated
**Expected**: `export const dynamicParams = true` to allow runtime fallback to SSR (this should already be the default, but explicit is better)

### GAP-WEB-06 — No `sitemap.xml` or `robots.txt`
**Status**: No `app/sitemap.ts` or `app/robots.ts` in Next.js app
**Impact**: Search engines cannot efficiently crawl the site; no priority hints for job pages
**Expected**: Dynamic sitemap including all job slugs + province pages + static pages

### GAP-WEB-07 — No OpenGraph image (og:image) for job listings
**Status**: `generateMetadata` on jobs listing and province pages set OG tags but `images` property is absent
**Impact**: Social shares show no preview image
**Expected**: Default OG image (`/og-default.png`) and per-job cover image when `coverImageUrl` is available

### GAP-WEB-08 — Tailwind config not found
**Expected**: `apps/web-next/tailwind.config.ts`
**Impact**: Design tokens are hardcoded inline instead of in the Tailwind theme. Adding a new primary color requires touching every component file.

### GAP-WEB-09 — No error boundary on client components
**Status**: `WorkerContractDetailClient`, `ManagerHiresClient`, etc. handle fetch errors with inline `if (error) return <div>retry</div>` — no React Error Boundary wrapping
**Impact**: Unhandled JS errors (not fetch errors) will crash the entire subtree

### GAP-WEB-10 — No offline / stale-while-revalidate strategy for authenticated pages
**Status**: Authenticated pages fetch on every mount (`apiClient` with no caching)
**Impact**: Slow LTE connections produce blank screens until fetch completes
**Expected**: SWR or React Query with stale-while-revalidate

---

## 4. Mobile App Gaps

### GAP-MOB-01 — Worker applications list screen missing
**Mobile file expected**: `apps/mobile/app/(worker)/applications.tsx`
**Status**: Not found in directory listing
**Impact**: Mobile workers cannot see their application status history

### GAP-MOB-02 — Manager site/job CRUD not in mobile
**Status**: By design (web-only feature), but undocumented
**Recommendation**: Add a note in `README.md` that manager CRUD is web-only in v1

### GAP-MOB-03 — Mobile contract signature uses SVG paths, web uses PNG canvas
**Mobile**: `canvas.tsx` builds `<svg>` with `M/L` path commands, sends `signatureData: svgString`
**Web**: `useSignatureCanvas` uses HTML5 Canvas, sends `signature_data_url: pngDataUrl`
**API endpoint**: `POST /worker/contracts/{id}/sign` with `signature_data_url`
**Problem**: Mobile sends SVG string but the API expects a base64 PNG data URL
**Impact**: Mobile contract signing will fail with current backend implementation
**Expected fix**: Standardize on one format (PNG recommended) or detect format server-side

### GAP-MOB-04 — No deep link handling for contract notifications
**Status**: FCM push notifications are configured, but no deep link handler routes the user to `/contracts/[id]` on tap
**Expected**: `Notifications.addNotificationResponseReceivedListener` handler in root `_layout.tsx`

---

## 5. Admin Dashboard Gaps

### GAP-ADMIN-01 — Attendance override page not in Blade admin
**API**: `PATCH /v1/admin/attendance/{id}` — fully implemented with audit trail
**Web admin**: No corresponding Blade page at `/admin/attendance`
**Impact**: Admins must use a raw API tool (Postman/curl) to override attendance records
**Expected**: Add attendance search + override form to admin Blade dashboard

### GAP-ADMIN-02 — Translation manager UI shows nothing
**Status**: Depends on `ref.translations` DB table (GAP-DB-04) — if table missing, returns empty array
**Impact**: Admin translation manager is a blank page on fresh deployment

### GAP-ADMIN-03 — No manager profile re-application flow in admin
**Status**: Rejected managers can re-submit (new row with `is_current=true`), but the admin approval list shows the latest `is_current=true` record only
**Issue**: Admin has no history view of previous applications from the same user
**Expected**: Show previous submissions on the approval detail page

### GAP-ADMIN-04 — Dashboard user growth chart has no date labels for middle points
**File**: `resources/views/admin/dashboard/index.blade.php`
**Issue**: Bar chart shows date label only every 3rd bar (`$i % 3 === 0`)
**Cosmetic issue** — low priority

---

## 6. SEO / Public Page Gaps

### GAP-SEO-01 — No canonical alternate for `hreflang` on dynamic pages
**Status**: Job detail and site detail pages set `alternates.canonical` but may not set `alternates.languages` for hreflang
**Impact**: Googlebot may not correctly associate the 3 locale versions of the same job

### GAP-SEO-02 — No structured data for province pages
**Status**: `/locations/[province]` renders job listings but emits no JSON-LD
**Expected**: `ItemList` JSON-LD with each job's `@type: JobPosting`

### GAP-SEO-03 — No `sitemap.xml` (see GAP-WEB-06)

### GAP-SEO-04 — Job slugs are not stable
**Status**: `app.jobs.slug` is set at creation time (in `ManagerJobController::store()`)
**Issue**: No slug uniqueness strategy documented — if two jobs have the same title + date, slug collision is possible
**Expected**: `UNIQUE` constraint on `jobs.slug` + auto-incrementing suffix on collision

---

## 7. Cross-Cutting Concerns

### GAP-CROSS-01 — No rate limiting on contract signing
**Status**: `POST /worker/contracts/{id}/sign` has no `throttle:` middleware
**Risk**: A worker could spam signature requests
**Expected**: `throttle:5,1` (5 per minute)

### GAP-CROSS-02 — No idempotency key on job application
**Status**: `POST /jobs/{jobId}/apply` — duplicate check is done at DB level (`UNIQUE(job_id, worker_id)` excluding WITHDRAWN/REJECTED via application logic)
**Issue**: `ApplicationService::apply()` fetches and inserts in a transaction but no `lockForUpdate()` on the uniqueness check row — concurrent duplicate clicks could create two applications before the constraint fires
**Expected**: `DB::lockForUpdate()` on the existing application check, mirroring the slot-filling lock pattern

### GAP-CROSS-03 — No CORS configuration documented
**Status**: Laravel API is consumed by web-next (SSR) and mobile (native) — CORS headers not visible in provided files
**Expected**: `config/cors.php` with `allowed_origins` and `allowed_headers` configured

### GAP-CROSS-04 — No API versioning strategy for breaking changes
**Status**: All routes under `/v1/` — good start
**Issue**: No documented process for introducing `/v2/` or deprecating `/v1/` endpoints
**Expected**: API deprecation policy in `README.md`
