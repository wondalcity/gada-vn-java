# GADA VN — MVP Performance Review

**Date**: 2026-03-21
**Reviewer**: Performance Engineering (AI-assisted)
**Scope**: Public job listing, image delivery, bundle, API latency, admin dashboard, applicant list, contract generation, map/address lazy loading

---

## Summary

| Severity | Count |
|----------|-------|
| P0 (Critical — measurable user-facing impact at MVP scale) | 6 |
| P1 (High — will degrade under load or with moderate data) | 8 |
| P2 (Medium — optimise within 30 days) | 6 |
| **Total** | **20** |

---

## P0 — Critical

### PERF-P0-01 · N+1 province DB query on every job in the public listing

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php:195`

```php
// formatListItem() is called for EACH job in the collection map (line 83)
private function formatListItem(Job $job): array
{
    ...
    [$provinceNameVi, $provinceSlug] = $this->resolveProvinceForSite($site); // ← line 195
    ...
}

// resolveProvinceForSite() runs a DB query every call (lines 241-247)
$row = DB::table('ref.vn_provinces as p')
    ->where(function ($q) use ($site) {
        $q->where('p.code', $site->province)
          ->orWhere('p.name_vi', $site->province);
    })
    ->select('p.name_vi')
    ->first();
```

**Impact**: 12 jobs per page = 12 separate round-trips to `ref.vn_provinces`. At 10ms per DB round-trip, this adds 120ms to every public listing request. Compounds with related jobs (lines 145-167) which maps through `formatListItem()` for up to 4 more jobs.

**Root cause**: Province lookup not batched before the `map()` call at line 83. The `ref.vn_provinces` table has ~63 rows and never changes — this should be resolved in a single query with an IN clause, or cached entirely.

---

### PERF-P0-02 · Full table scans in PHP for province slug and site slug resolution

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php:261-291`

```php
// resolveProvinceBySlug(): fetches ALL ~63 provinces into PHP, filters in PHP
private function resolveProvinceBySlug(string $slug): ?object
{
    $provinces = DB::table('ref.vn_provinces')
        ->select('code', 'name_vi', 'name_en')
        ->get();                                  // ← fetches every row

    foreach ($provinces as $province) {
        if (Str::slug($province->name_vi) === $slug) {  // PHP-side slug matching
            return $province;
        }
    }
    return null;
}

// resolveSiteIdsBySlug(): fetches ALL sites into PHP, filters in PHP
private function resolveSiteIdsBySlug(string $siteSlug): array
{
    $sites = DB::table('app.construction_sites')
        ->select('id', 'name')
        ->get();                                  // ← fetches every site

    return $sites
        ->filter(fn ($s) => Str::slug($s->name) === $siteSlug)
        ->pluck('id')
        ->all();
}
```

**Impact**: `resolveSiteIdsBySlug()` scales with the number of construction sites. At 500 sites: 500 rows serialised, shipped over the DB socket, deserialised into PHP objects, then iterated — all to return 1-5 IDs. Called on every filtered listing request.

**Root cause**: No `slug` column on `ref.vn_provinces` or `app.construction_sites`. Slugs computed at query time in PHP rather than stored in DB.

---

### PERF-P0-03 · Job detail page is `force-dynamic` with `cache: 'no-store'` — zero CDN caching

**Files**:
- `apps/web-next/src/app/[locale]/(public)/jobs/[slug]/page.tsx:15` — `export const dynamic = 'force-dynamic'`
- `apps/web-next/src/lib/api/public.ts:116` — `cache: 'no-store'`

```typescript
// [slug]/page.tsx:15
export const dynamic = 'force-dynamic'   // disables all Next.js caching and CDN edge caching

// public.ts:116
const res = await fetch(`${BASE}/public/jobs/${slug}?locale=${locale}`, {
    cache: 'no-store',                   // forces a fresh API call on every render
})
```

**Impact**: Every page view of every job detail URL (the most SEO-critical pages) triggers:
1. A full SSR render in Next.js (no cache hit)
2. A fresh API call to Laravel (no fetch cache)
3. Laravel executes SQL queries (no result cache)

The comment at line 14 says "always fresh for job detail (status, headcount may change)" — but job status changes are rare events. Using `force-dynamic` + `no-store` for "slots may have changed" is equivalent to disabling a cache entirely to avoid showing a 5-minute-old count.

**Additionally**: `fetchPublicJobBySlug()` is called TWICE per page render:
- Line 19: inside `generateMetadata()`
- Line 48: inside the page component

Both calls hit the API independently (no deduplication) because `cache: 'no-store'` bypasses Next.js request memoisation.

---

### PERF-P0-04 · Dashboard loads with 9 separate COUNT queries — no aggregation, no caching

**File**: `apps/admin-laravel/app/Http/Controllers/Admin/DashboardController.php:13-45`

```php
$pendingApprovals = DB::table('app.manager_profiles')
    ->where('approval_status', 'PENDING')->count();          // query 1

$totalUsers = DB::table('auth.users')
    ->where('status', 'ACTIVE')->count();                    // query 2

$newUsersThisWeek = DB::table('auth.users')
    ->where('created_at', '>=', now()->subDays(7))->count(); // query 3

$newUsersLastWeek = DB::table('auth.users')
    ->whereBetween('created_at', [...)->count();             // query 4

$activeJobs = DB::table('app.jobs')
    ->where('status', 'OPEN')->count();                      // query 5

$filledJobs = DB::table('app.jobs')
    ->where('status', 'FILLED')->count();                    // query 6

$completedJobs = DB::table('app.jobs')
    ->where('status', 'COMPLETED')->count();                 // query 7

$totalJobs = DB::table('app.jobs')->count();                 // query 8

$todayAttendance = DB::table('app.attendance_records')
    ->...->groupBy('status')->pluck('cnt', 'status');        // query 9
```

Plus `$userGrowthRaw` (line 61), `$pendingList` (line 77), `$recentSites` (line 94), `$recentJobs` (line 105) — **13 total sequential queries** to render the dashboard.

**Impact**: Dashboard renders in serial DB round-trips. At 10ms each, that's 130ms of pure query time before any PHP processing or blade rendering. No result caching — every admin page refresh re-executes all 13 queries.

**Additional**: User growth chart (line 61) uses `DATE(created_at)` GROUP BY with no index on `auth.users(created_at)`. Full table scan as user count grows.

---

### PERF-P0-05 · `bulkAccept()` executes N×UPDATE statements in a loop

**File**: `apps/admin-laravel/app/Services/Application/ApplicationService.php:144-152`

```php
$accepted = 0;
foreach ($pending as $app) {
    $app->update([               // ← individual UPDATE per application
        'status'      => 'ACCEPTED',
        'reviewed_at' => now(),
        'reviewed_by' => $managerProfileId,
    ]);
    $accepted++;
}
```

**Impact**: Bulk-accepting 20 applicants = 20 separate `UPDATE app.job_applications SET ... WHERE id = ?` statements, all inside a single transaction. Each statement is a DB round-trip. For a construction site job with 50 applicants, this is 50 round-trips.

**Root cause**: Using per-row Eloquent `update()` instead of a single batch `UPDATE ... WHERE id IN (...)`.

---

### PERF-P0-06 · Applicant list loads ALL records with no pagination

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Manager/ManagerApplicationController.php:55-64`

```php
$applications = Application::where('job_id', $jobId)
    ->with([
        'worker' => fn($q) => $q
            ->with('user:id,name,phone')
            ->leftJoin('ref.construction_trades as t', ...)
            ->select('app.worker_profiles.*', 't.name_ko as trade_name_ko'),
    ])
    ->when($request->status, ...)
    ->orderBy('applied_at', 'asc')
    ->get();    // ← no LIMIT, no paginate()
```

**Impact**: For a popular job posting with 200+ applications, the API loads every application record + full worker profile + trade join into PHP memory, serialises to JSON, and ships the entire response to the browser. The client-side `ApplicantListClient.tsx` then renders all of them as DOM nodes simultaneously (line 266: `filtered.map(applicant => <ApplicantCard ...>)`).

At 200 applicants: ~200KB JSON payload + 200 DOM nodes with event handlers = noticeable input delay on mobile.

---

## P1 — High

### PERF-P1-01 · `ContractService` instantiates a new S3Client 3–4× per sign operation

**File**: `apps/admin-laravel/app/Services/Contract/ContractService.php:18-27`

```php
private function makeS3Client(): S3Client
{
    return new S3Client([     // ← creates new client every call
        'version'     => 'latest',
        'region'      => config('filesystems.disks.s3.region'),
        'credentials' => [...],
    ]);
}
```

Called at:
- `s3PutContent()` line 32 — 1 new client per content upload
- `s3PresignedUrl()` line 42 — 1 new client per presigned URL
- `workerSign()` line 191 — 1 new client for signature upload

For `workerSign()`: signature upload (1 client) + presigned URL generation at line 199 (1 client) + HTML re-upload via `s3PutContent()` at line 212 (1 client) = **3 S3Client instances** for one signing action, each establishing credentials and connection overhead.

**Impact**: Each `S3Client` instantiation re-parses credentials from config, re-initialises AWS SDK internals. No connection reuse. Adds ~20-50ms overhead per sign operation.

---

### PERF-P1-02 · `generateHtml()` issues an extra DB query for worker phone

**File**: `apps/admin-laravel/app/Services/Contract/ContractService.php:325-327`

```php
$workerPhone = DB::table('auth.users')
    ->where('id', $worker->user_id)
    ->value('phone') ?? '';
```

**Impact**: Called during contract generation AND during both signature steps (each regenerates HTML). Three extra DB queries per contract lifecycle purely for a phone number. The worker profile is already eagerly loaded with `loadMissing(['job.site', 'job.trade', 'worker', 'job.manager'])` at line 142, but `auth.users.phone` is not included.

---

### PERF-P1-03 · Public job listing executes count + data as two separate queries

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php:79-80`

```php
$total = $query->count();               // query 1: SELECT COUNT(*)
$jobs  = $query->forPage($page, $limit)->get();  // query 2: SELECT * ... LIMIT
```

**Impact**: Two DB round-trips where one (`paginate()`) would suffice. The `count()` call on line 79 runs the full WHERE/JOIN against the jobs table before the data query runs. Small overhead at low volume but a clean fix.

---

### PERF-P1-04 · `JobCard` cover images have no dimensions — causes CLS

**File**: `apps/web-next/src/components/jobs/JobCard.tsx:43-47`

```tsx
<img
    src={job.coverImageUrl}
    alt={job.titleKo}
    loading="lazy"              // ✓ lazy loading is correct
    className="w-full h-full object-cover ..."
/>
```

`loading="lazy"` is correct. However, no `width`/`height` attributes (or `aspect-ratio` CSS) means the browser cannot reserve space for the image before it loads, causing **Cumulative Layout Shift (CLS)** as cards reflow when images arrive. CLS is a Core Web Vital that directly affects Google ranking.

The parent div has `h-40` (`160px` height) via Tailwind, which partially mitigates this — but the img itself has no intrinsic size hint. Using `next/image` with `fill` or explicit dimensions would eliminate CLS entirely.

---

### PERF-P1-05 · Missing DB indexes for dashboard and time-series queries

**File**: `packages/db/migrations/001_schemas.sql` — index block after line 209

Confirmed present:
- `idx_jobs_work_date`, `idx_jobs_slug`, `idx_jobs_status`, `idx_jobs_site_id`, `idx_jobs_manager_id`, `idx_jobs_trade_id` ✓
- `idx_applications_job_id`, `idx_applications_worker_id`, `idx_applications_status` ✓
- `idx_attendance_job_id`, `idx_attendance_worker_id`, `idx_attendance_work_date` ✓

**Missing indexes** (affecting dashboard and admin queries):
```sql
-- auth.users: user growth chart (DashboardController:61), new-users-this-week (line 21,25)
-- Without this, DATE(created_at) GROUP BY is a full table scan
CREATE INDEX idx_users_created_at ON auth.users(created_at);

-- app.jobs: recent jobs list (DashboardController:113), order by created_at
CREATE INDEX idx_jobs_created_at ON app.jobs(created_at DESC);

-- app.construction_sites: recent sites list (DashboardController:100)
CREATE INDEX idx_sites_created_at ON app.construction_sites(created_at DESC);

-- app.manager_profiles: pending approval filter (DashboardController:13,77,88)
-- approval_status has no index despite being the primary dashboard filter
CREATE INDEX idx_manager_profiles_approval_status ON app.manager_profiles(approval_status)
    WHERE approval_status = 'PENDING';
```

---

### PERF-P1-06 · `next.config.ts` has no image format or caching configuration

**File**: `apps/web-next/next.config.ts:10-21`

```typescript
images: {
    remotePatterns: [
        { protocol: 'https', hostname: '*.amazonaws.com' },
        { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
    // Missing:
    // formats: ['image/avif', 'image/webp'],
    // minimumCacheTTL: 86400,
    // deviceSizes: [640, 750, 828, 1080, 1200],
    // imageSizes: [16, 32, 64, 96, 128, 256],
},
```

CLAUDE.md notes "CloudFront + Lambda/Sharp (WebP)" infrastructure exists. However, Next.js Image component is not configured to request WebP/AVIF formats, and there is no `minimumCacheTTL` — meaning Next.js image optimisation cache may evict frequently, causing re-processing of the same images.

**Impact**: Images served as original JPEG/PNG (potentially 2-5× larger than WebP equivalent). No browser-level cache hint for optimised images.

---

### PERF-P1-07 · `fetchPublicJobBySlug` called twice per job detail page render

**File**: `apps/web-next/src/app/[locale]/(public)/jobs/[slug]/page.tsx:17-48`

```typescript
// generateMetadata — line 19
const job = await fetchPublicJobBySlug(slug, locale).catch(() => null)

// page component — line 48 (separate call, no sharing)
const job = await fetchPublicJobBySlug(slug, locale).catch(() => null)
```

With `cache: 'no-store'` in `fetchPublicJobBySlug`, Next.js request memoisation (which deduplicates identical `fetch()` calls within a single render pass) is disabled. Both calls execute independently, making two API → Laravel → SQL roundtrips per page render.

---

### PERF-P1-08 · No virtual scrolling or client-side pagination on applicant list

**File**: `apps/web-next/src/components/manager/applicants/ApplicantListClient.tsx:266-276`

```tsx
filtered.map(applicant => (
    <ApplicantCard
        key={applicant.id}
        applicant={applicant}
        onOpenDetail={setSelectedApplicant}
        onQuickAccept={handleAccept}
        onQuickReject={(id) => handleReject(id)}
        isActing={actingId === applicant.id}
    />
))
```

All `filtered` applicants are rendered simultaneously. For a large job (100+ applicants), this creates 100+ DOM nodes each with `onClick` event handlers, `animate-pulse` skeleton states, and SVG icons. On a mid-range Android device, this will cause visible jank on tab switches due to heavy reconciliation.

---

## P2 — Medium

### PERF-P2-01 · `fetchProvinceBySlug()` fetches all provinces to find one

**File**: `apps/web-next/src/lib/api/public.ts:150-152`

```typescript
export async function fetchProvinceBySlug(slug: string, locale = 'ko'): Promise<Province | null> {
    const provinces = await fetchProvinces(locale)   // fetches all 63
    return provinces.find(p => p.slug === slug) ?? null
}
```

Provinces are already cached with `revalidate: 86400` (line 133), so this is low-cost in normal operation. However, if the province cache is cold (e.g. after deployment), this downloads all 63 provinces to return 1.

---

### PERF-P2-02 · `contract_html` TEXT column stores full HTML redundantly

**File**: `apps/admin-laravel/app/Services/Contract/ContractService.php:163, 219, 279`

```php
// generate() — line 163
'contract_html' => $html,        // stored in DB column

// Also uploaded to S3 (line 154):
$this->s3PutContent($htmlKey, $html, 'text/html; charset=utf-8');
```

The full contract HTML (~4-10KB per contract) is stored in both the `app.contracts.contract_html` TEXT column AND in S3. The HTML is re-generated and re-written to both locations on every signature step (lines 212+219, 272+279). This means:
- DB row grows by 4-10KB per contract
- `contract_html` is always the "current" version but bloats every `SELECT *` on the contracts table
- No reason to store in DB if S3 is the canonical source

---

### PERF-P2-03 · Province and trade reference data not cached in Redis

**Stack**: Redis 7 (ElastiCache) is provisioned per CLAUDE.md but not used for reference data.

`ref.vn_provinces` (~63 rows) and `ref.construction_trades` (~120 rows) are static lookup tables that change at most once per year. The public jobs API fetches them on every filtered request (via `resolveProvinceForSite` per job). These are ideal Redis candidates with a 24-hour TTL.

---

### PERF-P2-04 · `jobs/page.tsx` ISR revalidation at 60 seconds

**File**: `apps/web-next/src/app/[locale]/(public)/jobs/page.tsx:13`

```typescript
export const revalidate = 60
```

60 seconds means up to 60 stale page variants are cached simultaneously (one per province/trade combination). The data (job listings) changes infrequently — typically when a manager publishes a new job or a job expires. On-demand ISR via webhook on publish events would allow longer TTLs (5-15 minutes) for better cache hit rates without staleness.

---

### PERF-P2-05 · Map/location data not lazy-loaded on public site detail pages

**Files**: `apps/web-next/src/app/[locale]/(public)/sites/[slug]/page.tsx`, `JobDetailView` component

Site and job detail pages render map/lat-lng coordinates but map library loading behaviour is not verified. If a map component (e.g. Google Maps, Leaflet) is imported at the top of a page component, it adds to the initial JS bundle and blocks page rendering even for users who never scroll to the map section.

Investigation needed: confirm map library is `dynamic(() => import(...), { ssr: false })` loaded.

---

### PERF-P2-06 · No `Cache-Control` headers on authenticated API responses

**File**: `apps/admin-laravel/routes/api.php` — no middleware or controller sets `Cache-Control` headers on list responses.

Manager job and applicant list responses contain `Authorization`-gated data that must not be cached by shared caches. However, absence of explicit `Cache-Control: private, no-store` headers means behaviour is undefined across CDN/proxy layers (some proxies may cache 200 responses by default).

Conversely, responses that COULD be safely cached with `max-age` (e.g. province lists, trade lists) return no cache headers, so the browser re-fetches them on every navigation.

---

## Architecture Notes

### What is working well
- Eager loading with `Job::with(['site:...', 'trade:...'])` at `PublicJobController:41` prevents N+1 on job→site and job→trade relations ✓
- `ref.vn_provinces` and `ref.construction_trades` correctly set 24h revalidation in `fetchProvinces()` / `fetchTrades()` ✓
- `JobCard.tsx:46` has `loading="lazy"` on cover images ✓
- `ApplicationService::bulkAccept()` wraps in a single DB transaction ✓
- Application UNIQUE constraint `(job_id, worker_id)` at migration line 230 prevents duplicate applications at the DB level ✓
- GIST index on `app.construction_sites.location` (PostGIS geometry) present ✓

### Query count per page — current vs target

| Page / Action | Current queries | Target |
|---------------|-----------------|--------|
| Public job listing (12 jobs, province filter) | 2 (count+data) + 12 (province per job) + 1 (province slug resolve) + 1 (all sites slug resolve) = **~16** | **3** |
| Job detail page (1 job + 4 related) | 2 (fetch×2 due to double call) + 5 (province per related job) = **~7** | **2** |
| Dashboard | **13** sequential queries | **5** aggregated + parallel |
| Contract worker sign | SQL lookup + 3× S3Client + DB query for phone + HTML write | 1 SQL + 1× S3Client + 1 S3 put |
| Bulk accept (20 applicants) | 20 UPDATE + 1 job UPDATE = **21** | **2** (batch UPDATE + job UPDATE) |
