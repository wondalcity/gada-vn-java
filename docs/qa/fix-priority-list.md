# GADA VN — Fix Priority List
**Date**: 2026-03-21
**Total issues**: 38
**P0**: 5 (must fix before first deployment)
**P1**: 18 (must fix before public launch)
**P2**: 15 (recommended improvements)

---

## P0 — Blockers (application non-functional without these)

### P0-01 — `auth.user_roles` table missing ✅ FIXED 2026-03-21
**ID**: GAP-DB-01
**Impact**: Every authenticated API request crashes (`DB::table('auth.user_roles')` — table not found)
**Layer**: Database / Laravel
**Fix applied**: `packages/db/migrations/007_user_roles_table.sql` — see `docs/qa/p0-fix-log.md`
**Original fix plan**:
1. Check if a migration 007+ creates `auth.user_roles` (not in provided scope)
2. If missing, create `/packages/db/migrations/007_user_roles_table.sql`:
```sql
CREATE TABLE IF NOT EXISTS auth.user_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('worker', 'manager', 'admin')),
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by  UUID REFERENCES auth.users(id),
    revoked_at  TIMESTAMPTZ,
    revoked_by  UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);
-- Backfill from auth.users.role
INSERT INTO auth.user_roles (user_id, role, granted_at)
SELECT id, lower(role), created_at FROM auth.users
WHERE role IS NOT NULL
ON CONFLICT DO NOTHING;
```
**Effort**: 1h
**Owner**: Backend

---

### P0-02 — `auth.users.status` CHECK constraint rejects `DELETED` ✅ FIXED 2026-03-21
**ID**: GAP-DB-05
**Impact**: `AdminUserController::destroy()` sets `status = 'DELETED'` — PostgreSQL CHECK constraint `status IN ('ACTIVE','SUSPENDED','PENDING')` will throw a 500
**Layer**: Database / Laravel admin
**Fix applied**: `packages/db/migrations/008_users_deleted_status.sql` (Option A: extend CHECK) — see `docs/qa/p0-fix-log.md`
**Original fix plan**: Either update the CHECK constraint or use `status = 'SUSPENDED'` + `deleted_at TIMESTAMPTZ`:
```sql
-- Option A: extend CHECK
ALTER TABLE auth.users DROP CONSTRAINT users_status_check;
ALTER TABLE auth.users ADD CONSTRAINT users_status_check
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED'));

-- Option B: add deleted_at (preferred for data recovery)
ALTER TABLE auth.users ADD COLUMN deleted_at TIMESTAMPTZ;
```
Update `UserController::destroy()` to match chosen approach.
**Effort**: 30m
**Owner**: Backend

---

### P0-03 — `gada_session` cookie expires after 1 hour ✅ FIXED 2026-03-21
**ID**: GAP-WEB-01
**Impact**: Users are logged out after 1 hour if the cookie expires before the Firebase token refresh updates it
**Layer**: Next.js frontend
**Fix applied**: `apps/web-next/src/lib/auth/session.ts` — `max-age` extended from `3600` to `604800` (7 days) — see `docs/qa/p0-fix-log.md`
**Note**: The cookie IS set correctly after login (confirmed in `useAuth.ts`); the issue was the short TTL.
**Original fix plan**: In the Firebase login success handler (likely in `useAuth.ts` or `LoginForm.tsx`), after receiving the Firebase ID token:
```typescript
// Set non-httpOnly cookie for SSR middleware detection
document.cookie = `gada_session=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`
```
Or: have the API return a `Set-Cookie: gada_session=...` header on login and the client reads it.
**Effort**: 2h (investigation + fix)
**Owner**: Frontend

---

### P0-04 — Mobile contract signing sends SVG, API expects PNG ✅ FIXED 2026-03-21
**ID**: GAP-MOB-03
**Impact**: Every mobile `POST /worker/contracts/{id}/sign` will fail — `ContractService::workerSign()` calls `uploadSignatureFromDataUrl()` which parses base64 PNG; it will fail on an SVG string
**Layer**: Mobile + Laravel
**Fix applied** (Option B):
- Mobile: `btoa`-encodes SVG as `data:image/svg+xml;base64,...` data URL; field name corrected from `signatureData` → `signature_data_url`.
- Backend: `uploadSignatureFromDataUrl()` now accepts any `image/*` MIME type; `ContentType` derived dynamically; S3 key extension computed via new `mimeTypeFromDataUrl()` + `signatureExtension()` helpers.
See `docs/qa/p0-fix-log.md`
**Effort**: 4h
**Owner**: Mobile + Backend

---

### P0-05 — `GenerateContractJob` references non-existent tables ✅ FIXED 2026-03-21
**ID**: GAP-API-04
**Impact**: If this job is ever dispatched (e.g., via queue retry on a stale job), it will hard-fail and fill error logs
**Layer**: Laravel
**Fix applied**: `apps/admin-laravel/app/Jobs/GenerateContractJob.php` deleted — see `docs/qa/p0-fix-log.md`
**Effort**: 5m
**Owner**: Backend

---

## P1 — Launch blockers (user-facing gaps, SEO, data integrity)

### P1-01 — `ref.translations` table missing
**ID**: GAP-DB-04
**Impact**: Admin translation manager is silent (returns empty array). Translations managed in code only.
**Fix**: Create migration with `ref.translations` table (see gap-analysis.md GAP-DB-04)
**Effort**: 1h
**Owner**: Backend

---

### P1-02 — Notification controller not implemented
**ID**: GAP-API-01
**Impact**: FCM tokens are stored and routes are registered, but GET /notifications returns 500 or empty
**Fix**: Implement `NotificationController` to read `ops.notifications` for the authenticated user
```php
public function index(Request $request)
{
    $user = $request->user();
    $notifications = DB::table('ops.notifications')
        ->where('user_id', $user->id)
        ->orderByDesc('created_at')
        ->paginate(20);
    return response()->json(['statusCode' => 200, 'data' => $notifications]);
}
```
**Effort**: 3h
**Owner**: Backend

---

### P1-03 — Web notification page missing
**ID**: GAP-WEB-02
**Impact**: Web workers/managers have no way to view notifications
**Fix**: Create `apps/web-next/src/app/[locale]/(app)/worker/notifications/page.tsx` and `manager/notifications/page.tsx` with paginated notification list and mark-read actions
**Effort**: 4h
**Owner**: Frontend

---

### P1-04 — Contract VOID path unimplemented
**ID**: GAP-API-02
**Impact**: Contracts stuck in unsigned state cannot be cancelled; manager has no recourse if worker never signs
**Fix**: Add `PATCH /manager/contracts/{id}/void` endpoint + update `ContractService::void()`
```php
// routes/api.php inside manager group:
Route::patch('/contracts/{id}/void', [ManagerContractController::class, 'void']);
```
**Effort**: 3h
**Owner**: Backend

---

### P1-05 — No `sitemap.xml`
**ID**: GAP-WEB-06, GAP-SEO-03
**Impact**: Google cannot efficiently discover job URLs; poor initial crawl coverage
**Fix**: Create `apps/web-next/src/app/sitemap.ts`:
```typescript
import { MetadataRoute } from 'next'
import { fetchPublicJobs, fetchProvinces } from '@/lib/api/public'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobsResult, provinces] = await Promise.all([
    fetchPublicJobs({ page: 1, limit: 1000 }),
    fetchProvinces('ko'),
  ])
  const jobEntries = jobsResult.jobs.map(j => ({
    url: `https://gada.vn/ko/jobs/${j.slug}`,
    lastModified: new Date(j.publishedAt),
    changeFrequency: 'daily' as const,
    priority: 0.8,
    alternates: { languages: { vi: `https://gada.vn/vi/jobs/${j.slug}`, en: `https://gada.vn/en/jobs/${j.slug}` } }
  }))
  // add province, site, static entries...
  return [...staticEntries, ...jobEntries, ...provinceEntries]
}
```
**Effort**: 3h
**Owner**: Frontend

---

### P1-06 — Add `slug` column to `ref.vn_provinces` and `app.construction_sites`
**ID**: GAP-DB-02, GAP-DB-03
**Impact**: Runtime PHP slug-matching is O(n) on every public page request; no DB index possible
**Fix**:
```sql
-- Migration 008_slugs.sql
ALTER TABLE ref.vn_provinces ADD COLUMN IF NOT EXISTS slug TEXT;
UPDATE ref.vn_provinces SET slug = lower(regexp_replace(
    translate(name_vi, 'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
                       'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'),
    '[^a-z0-9]', '-', 'g')) WHERE slug IS NULL;
ALTER TABLE ref.vn_provinces ADD CONSTRAINT vn_provinces_slug_unique UNIQUE (slug);
ALTER TABLE ref.vn_provinces ALTER COLUMN slug SET NOT NULL;

ALTER TABLE app.construction_sites ADD COLUMN IF NOT EXISTS slug TEXT;
-- Backfill from name + id suffix for uniqueness
UPDATE app.construction_sites SET slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'gi')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;
ALTER TABLE app.construction_sites ADD CONSTRAINT sites_slug_unique UNIQUE (slug);
```
Update `PublicJobController` and `PublicSiteController` to use `WHERE province.slug = ?` and `WHERE site.slug = ?` directly.
**Effort**: 4h
**Owner**: Backend

---

### P1-07 — `jobs.slug` uniqueness not enforced
**ID**: GAP-SEO-04
**Impact**: Slug collision produces wrong job detail on public page
**Fix**: Verify `UNIQUE` constraint exists on `app.jobs.slug` (check migration 001 line ~195). If absent:
```sql
ALTER TABLE app.jobs ADD CONSTRAINT jobs_slug_unique UNIQUE (slug);
```
Update `ManagerJobController::store()` to handle conflict with a suffix loop.
**Effort**: 2h
**Owner**: Backend

---

### P1-08 — Manager self-application not blocked
**ID**: GAP-API-09
**Impact**: A manager can apply to their own job, distorting slot counts
**Fix**: In `ApplicationService::apply()`, add after fetching the job:
```php
$workerUserId = $workerProfile->user_id;
if ($job->manager->user_id === $workerUserId) {
    throw new \DomainException('SELF_APPLY');
}
```
**Effort**: 30m
**Owner**: Backend

---

### P1-09 — Duplicate application race condition
**ID**: GAP-CROSS-02
**Impact**: Concurrent clicks could create two PENDING applications for the same (job, worker) pair before the DB constraint fires (DB constraint will catch it, but user gets a 500 instead of a clean error)
**Fix**: Add `lockForUpdate()` to the duplicate check in `ApplicationService::apply()`:
```php
$existing = Application::where('job_id', $jobId)
    ->where('worker_id', $workerProfileId)
    ->whereNotIn('status', ['WITHDRAWN', 'REJECTED'])
    ->lockForUpdate()
    ->first();
```
Wrap the entire apply() in `DB::transaction()` if not already.
**Effort**: 1h
**Owner**: Backend

---

### P1-10 — OG image missing on job/site/province pages
**ID**: GAP-WEB-07
**Impact**: Social media shares of job postings show no image — poor click-through rates
**Fix**: Add `images` to `generateMetadata` in `jobs/[slug]/page.tsx`:
```typescript
images: job.coverImageUrl
  ? [{ url: job.coverImageUrl, width: 1200, height: 630 }]
  : [{ url: 'https://gada.vn/og-default.jpg', width: 1200, height: 630 }],
```
Create a default OG image at `apps/web-next/public/og-default.jpg`.
**Effort**: 2h
**Owner**: Frontend

---

### P1-11 — JSON-LD missing on province listing pages
**ID**: GAP-SEO-02
**Fix**: In `/locations/[province]/page.tsx`, add `ItemList` JSON-LD:
```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: `${province.nameVi} 건설 일자리`,
  itemListElement: result.jobs.map((job, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: { '@type': 'JobPosting', title: job.titleKo, url: `https://gada.vn/ko/jobs/${job.slug}` }
  }))
}
```
**Effort**: 1h
**Owner**: Frontend

---

### P1-12 — Update schema.md to match implementation
**ID**: Consistency-Review sections 1.2, 1.3
**Impact**: Developer confusion when onboarding; incorrect enum values cause bugs in future code
**Fix**: Update `docs/architecture/database-schema.md`:
- Change all enum values to UPPERCASE
- Rename `ref.trades` → `ref.construction_trades`
- Rename `ref.provinces` → `ref.vn_provinces`
- Rename `app.employment_contracts` → `app.contracts`
- Remove `app.hires` section (modeled via `job_applications`)
- Add `app.contracts` section matching migration 001 lines 241–266
- Add `auth.user_roles` section (once GAP-DB-01 is resolved)
**Effort**: 2h
**Owner**: Backend / Tech Lead

---

### P1-13 — `NEXT_PUBLIC_API_BASE_URL` defaults to production
**ID**: GAP-WEB-04
**Fix**:
1. Create `apps/web-next/.env.local.example`:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key_here
   ```
2. Update `public.ts` fallback: `?? 'http://localhost:8000/api/v1'`
3. Set production value in CI/CD environment variables only
**Effort**: 30m
**Owner**: Frontend / DevOps

---

### P1-14 — Mobile deep link for contract push notifications
**ID**: GAP-MOB-04
**Fix**: In `apps/mobile/app/_layout.tsx`, add notification response handler:
```typescript
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener(res => {
    const contractId = res.notification.request.content.data?.contract_id
    if (contractId) router.push(`/(worker)/contracts/${contractId}`)
  })
  return () => sub.remove()
}, [])
```
**Effort**: 2h
**Owner**: Mobile

---

### P1-15 — Worker applications list missing from mobile
**ID**: GAP-MOB-01
**Fix**: Create `apps/mobile/app/(worker)/applications.tsx` showing paginated applications with status badges, matching the web-next `WorkerApplicationsClient`
**Effort**: 4h
**Owner**: Mobile

---

### P1-16 — Rate limiting on contract sign endpoint
**ID**: GAP-CROSS-01
**Fix**: Add throttle middleware to sign routes in `routes/api.php`:
```php
Route::post('/contracts/{id}/sign', [WorkerContractController::class, 'sign'])
    ->middleware('throttle:5,1');
// In manager group:
Route::post('/contracts/{id}/sign', [ManagerContractController::class, 'sign'])
    ->middleware('throttle:5,1');
```
**Effort**: 15m
**Owner**: Backend

---

### P1-17 — Admin attendance override page missing from Blade dashboard
**ID**: GAP-ADMIN-01
**Fix**: Add to `routes/web.php` and create `Admin/AttendanceController` + view `admin/attendance/index.blade.php` with search by job/worker/date and override form requiring `reason`
**Effort**: 4h
**Owner**: Backend

---

### P1-18 — `public` i18n namespace verification
**ID**: GAP-WEB-03
**Fix**: Verify `packages/i18n/locales/{ko,vi,en}/public.json` (or similar) exists. If missing, add entries for:
```json
{
  "landing.hero.title": "베트남 건설 일자리 한 곳에서",
  "landing.hero.subtitle": "...",
  "jobs.listing.title": "건설 일자리 공고",
  "jobs.province.title": "{province} 건설 일자리"
}
```
**Effort**: 2h
**Owner**: Frontend

---

## P2 — Recommended improvements (post-launch)

### P2-01 — Create shared Tailwind design token config
**ID**: GAP-WEB-08
Create `packages/config/tailwind.tokens.js` exporting the color palette, and extend it in both `apps/web-next/tailwind.config.ts` and `apps/mobile` config.

### P2-02 — Add React Error Boundaries to client components
**ID**: GAP-WEB-09
Wrap major client component trees with `<ErrorBoundary fallback={<ErrorCard />}>` using `react-error-boundary`.

### P2-03 — Implement SWR / React Query for authenticated data
**ID**: GAP-WEB-10
Replace manual `useState` + `useEffect` + `apiClient` patterns with `useSWR` for automatic revalidation, deduplication, and stale-while-revalidate behavior.

### P2-04 — Add public stats endpoint
**ID**: GAP-API-07
`GET /public/stats` → `{ activeJobs, totalProvinces, registeredWorkers }` — cached 5 minutes. Use on landing page hero to show live numbers.

### P2-05 — Admin contract management UI and API
**ID**: GAP-API-03
Add admin routes for listing all contracts + force-void; add Blade page at `/admin/contracts`.

### P2-06 — Push notification triggers on contract state changes
**ID**: GAP-API-06
Add FCM dispatch in `ContractService::workerSign()` and `managerSign()` using the existing FCM token infrastructure.

### P2-07 — Multilingual job titles and descriptions
**ID**: Consistency-Review 5.2
Add `title_ko`, `title_vi`, `description_ko`, `description_vi` columns to `app.jobs` (with backfill). Update public API to return real multilingual content.

### P2-08 — Document mobile-only vs. web-only features
Add a feature matrix table to `README.md` clearly showing which features are mobile-only, web-only, and cross-platform.

### P2-09 — CORS configuration documentation
**ID**: GAP-CROSS-03
Add `config/cors.php` to source control with environment-aware `allowed_origins` array and document it in `README.md`.

### P2-10 — API versioning / deprecation policy
**ID**: GAP-CROSS-04
Document in `README.md`: how breaking changes are versioned, sunset timeline for `/v1`, and how clients are notified.

### P2-11 — Admin approval history view
**ID**: GAP-ADMIN-03
On `admin/approvals/{id}` detail page, show all previous `is_current=false` submissions from the same `user_id` with timestamps and outcomes.

### P2-12 — `id_number` uniqueness constraint
**ID**: GAP-API-08
```sql
ALTER TABLE app.worker_profiles ADD CONSTRAINT worker_id_number_unique UNIQUE (id_number)
WHERE id_number IS NOT NULL;
```

### P2-13 — `robots.txt`
Create `apps/web-next/public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /ko/worker/
Disallow: /ko/manager/
Disallow: /ko/login
Disallow: /ko/register
Sitemap: https://gada.vn/sitemap.xml
```

### P2-14 — Mobile manager attendance read-only view
Currently manager attendance editing is web-only. Add a read-only attendance roster view for mobile managers at `apps/mobile/app/(manager)/attendance/[jobId].tsx`.

### P2-15 — `GenerateContractPdfJob` stub for async PDF generation
When `ContractService::managerSign()` sets status to `FULLY_SIGNED`, dispatch a queue job to generate a real PDF (via a headless browser or Gotenberg) and update `contract_pdf_s3_key` with the actual PDF. Currently the "PDF" is an HTML file.

---

## Summary Table

| ID | Issue | Priority | Layer | Effort |
|----|-------|----------|-------|--------|
| P0-01 | `auth.user_roles` table missing | P0 | DB | 1h |
| P0-02 | `status='DELETED'` violates CHECK | P0 | DB | 30m |
| P0-03 | `gada_session` cookie never set | P0 | Frontend | 2h |
| P0-04 | Mobile signature format mismatch (SVG vs PNG) | P0 | Mobile+Backend | 4h |
| P0-05 | Dead `GenerateContractJob` with wrong table refs | P0 | Backend | 5m |
| P1-01 | `ref.translations` table missing | P1 | DB | 1h |
| P1-02 | Notification controller not implemented | P1 | Backend | 3h |
| P1-03 | Web notification page missing | P1 | Frontend | 4h |
| P1-04 | Contract VOID path unimplemented | P1 | Backend | 3h |
| P1-05 | No `sitemap.xml` | P1 | Frontend | 3h |
| P1-06 | No `slug` column on provinces/sites | P1 | DB+Backend | 4h |
| P1-07 | `jobs.slug` uniqueness not enforced | P1 | DB+Backend | 2h |
| P1-08 | Manager self-application not blocked | P1 | Backend | 30m |
| P1-09 | Duplicate application race condition | P1 | Backend | 1h |
| P1-10 | OG image missing | P1 | Frontend | 2h |
| P1-11 | JSON-LD missing on province pages | P1 | Frontend | 1h |
| P1-12 | schema.md outdated enums + table names | P1 | Docs | 2h |
| P1-13 | API URL defaults to production | P1 | Frontend | 30m |
| P1-14 | Mobile deep link for push notifications | P1 | Mobile | 2h |
| P1-15 | Worker applications list missing from mobile | P1 | Mobile | 4h |
| P1-16 | No rate limiting on contract sign | P1 | Backend | 15m |
| P1-17 | Admin attendance override page missing | P1 | Backend | 4h |
| P1-18 | `public` i18n namespace unverified | P1 | Frontend | 2h |
| P2-01 | Shared Tailwind design tokens | P2 | Frontend | 4h |
| P2-02 | React Error Boundaries | P2 | Frontend | 3h |
| P2-03 | SWR / React Query | P2 | Frontend | 8h |
| P2-04 | Public stats endpoint | P2 | Backend | 2h |
| P2-05 | Admin contract management | P2 | Backend | 6h |
| P2-06 | Push notification triggers | P2 | Backend | 4h |
| P2-07 | Multilingual job titles | P2 | DB+Backend | 8h |
| P2-08 | Mobile/web feature matrix in README | P2 | Docs | 1h |
| P2-09 | CORS configuration | P2 | Backend | 1h |
| P2-10 | API versioning policy | P2 | Docs | 1h |
| P2-11 | Admin approval history view | P2 | Backend | 3h |
| P2-12 | `id_number` uniqueness constraint | P2 | DB | 30m |
| P2-13 | `robots.txt` | P2 | Frontend | 15m |
| P2-14 | Mobile manager attendance view | P2 | Mobile | 4h |
| P2-15 | Async PDF generation job | P2 | Backend | 8h |

**Total P0 effort**: ~7.5h
**Total P1 effort**: ~39h
**Total P2 effort**: ~54h
