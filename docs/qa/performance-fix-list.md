# GADA VN — Performance Fix List

**Date**: 2026-03-21
**Source**: docs/qa/performance-review.md
**Total fixes**: 20 (P0: 6, P1: 8, P2: 6)

---

## P0 — Critical (Fix Before Launch)

### PERF-P0-01 · Batch province lookup — eliminate N+1 on job listing

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php`

**Problem**: `resolveProvinceForSite()` is called inside `formatListItem()` which is mapped over every job (line 83). Each call issues a separate DB query to `ref.vn_provinces`.

**Fix**: Load all distinct province values needed upfront, build a lookup map, pass to `formatListItem()`.

```php
// In index() and show(), BEFORE calling formatListItem():

// 1. Collect all distinct province values from loaded jobs
$provinceValues = $jobs->map(fn ($j) => $j->site?->province)
    ->filter()
    ->unique()
    ->values()
    ->all();

// 2. Single query to get all needed province rows
$provinceMap = DB::table('ref.vn_provinces')
    ->where(function ($q) use ($provinceValues) {
        $q->whereIn('code', $provinceValues)
          ->orWhereIn('name_vi', $provinceValues);
    })
    ->select('code', 'name_vi')
    ->get()
    ->keyBy('code');   // or index however you resolve

// 3. Pass map to formatListItem():
private function formatListItem(Job $job, Collection $provinceMap): array
{
    $site = $job->site;
    $row  = $site ? ($provinceMap->get($site->province) ?? $provinceMap->firstWhere('name_vi', $site->province)) : null;
    $provinceNameVi = $row?->name_vi ?? $site?->province;
    $provinceSlug   = $provinceNameVi ? Str::slug($provinceNameVi) : null;
    // ...
}
```

**For `show()` (single job)**: `resolveProvinceForSite()` is fine — it's called only once. Keep as-is.

**Effort**: 2 hours
**Impact**: Reduces listing queries from ~16 to ~3. Eliminates 120ms+ of DB round-trips per request.

---

### PERF-P0-02 · Add slug columns to DB — eliminate PHP-side full-table filtering

**Files**:
- `packages/db/migrations/009_add_slugs.sql` (new migration)
- `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php:261-291`

**Fix A**: Add `slug` column to `ref.vn_provinces`, backfill, index:

```sql
-- packages/db/migrations/009_add_slugs.sql

-- Province slugs (computed once, stored permanently)
ALTER TABLE ref.vn_provinces ADD COLUMN IF NOT EXISTS slug TEXT;
UPDATE ref.vn_provinces
    SET slug = lower(regexp_replace(
        translate(name_vi,
            'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ',
            'aaaaaaaaaaaaaaaaaeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyda aaaaaaaaaaaaaaaaaeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyD'
        ),
        '[^a-z0-9]+', '-', 'g'
    ));
ALTER TABLE ref.vn_provinces ADD CONSTRAINT vn_provinces_slug_unique UNIQUE (slug);
CREATE INDEX idx_vn_provinces_slug ON ref.vn_provinces(slug);

-- Site slugs (computed from name, regenerated on name change)
ALTER TABLE app.construction_sites ADD COLUMN IF NOT EXISTS slug TEXT;
UPDATE app.construction_sites SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
CREATE INDEX idx_sites_slug ON app.construction_sites(slug);
```

**Fix B**: Replace PHP slug-resolution methods with single SQL queries:

```php
// resolveProvinceBySlug() — BEFORE: fetches all rows, filters in PHP
// AFTER: single indexed lookup
private function resolveProvinceBySlug(string $slug): ?object
{
    return DB::table('ref.vn_provinces')
        ->where('slug', $slug)
        ->select('code', 'name_vi', 'name_en', 'slug')
        ->first();
}

// resolveSiteIdsBySlug() — BEFORE: fetches all sites, filters in PHP
// AFTER: single indexed lookup
private function resolveSiteIdsBySlug(string $siteSlug): array
{
    return DB::table('app.construction_sites')
        ->where('slug', $siteSlug)
        ->pluck('id')
        ->all();
}
```

**Effort**: 2 hours (migration + 2 method rewrites)
**Impact**: Eliminates full table scans. `resolveSiteIdsBySlug()` goes from O(n sites) to O(log n).

---

### PERF-P0-03 · Switch job detail from `force-dynamic` to ISR + deduplicate fetch

**Files**:
- `apps/web-next/src/app/[locale]/(public)/jobs/[slug]/page.tsx`
- `apps/web-next/src/lib/api/public.ts:114-121`

**Fix A**: Replace `force-dynamic` + `no-store` with short ISR:

```typescript
// [slug]/page.tsx — BEFORE
export const dynamic = 'force-dynamic'

// AFTER — remove force-dynamic, add revalidation
export const revalidate = 120  // 2 minutes: fresh enough for slot counts, CDN-cacheable
```

```typescript
// public.ts:114-121 — BEFORE
const res = await fetch(`${BASE}/public/jobs/${slug}?locale=${locale}`, {
    cache: 'no-store',
})

// AFTER
const res = await fetch(`${BASE}/public/jobs/${slug}?locale=${locale}`, {
    next: { revalidate: 120, tags: [`job-${slug}`] },
})
```

**Fix B**: Eliminate double fetch. Use React `cache()` to memoize within a single render pass:

```typescript
// public.ts — add memoized version
import { cache } from 'react'

export const fetchPublicJobBySlugCached = cache(
    async (slug: string, locale = 'ko'): Promise<PublicJobDetail | null> => {
        const res = await fetch(`${BASE}/public/jobs/${slug}?locale=${locale}`, {
            next: { revalidate: 120, tags: [`job-${slug}`] },
        })
        if (!res.ok) return null
        return (await res.json()).data
    }
)
```

```typescript
// [slug]/page.tsx — use cached version in both generateMetadata and page component
import { fetchPublicJobBySlugCached } from '@/lib/api/public'

export async function generateMetadata({ params }: Props) {
    const { locale, slug } = await params
    const job = await fetchPublicJobBySlugCached(slug, locale).catch(() => null)
    // ...
}

export default async function JobDetailPage({ params }: Props) {
    const { locale, slug } = await params
    const job = await fetchPublicJobBySlugCached(slug, locale).catch(() => null)
    // ...
}
```

**Effort**: 1 hour
**Impact**: Job detail pages become CDN-cacheable (enormous SEO and latency benefit). API calls halved per page render. Cache hit rate ~95%+ for popular job slugs.

---

### PERF-P0-04 · Consolidate dashboard queries into aggregates + add caching

**File**: `apps/admin-laravel/app/Http/Controllers/Admin/DashboardController.php`

**Fix**: Replace 4 separate `auth.users` COUNT queries and 4 separate `app.jobs` COUNT queries with 2 aggregate queries:

```php
// BEFORE: 8 separate COUNT queries for stats

// AFTER: 2 aggregate queries
$userStats = DB::table('auth.users')
    ->selectRaw("
        COUNT(*) FILTER (WHERE status = 'ACTIVE')                              AS total_active,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')        AS new_this_week,
        COUNT(*) FILTER (WHERE created_at BETWEEN NOW() - INTERVAL '14 days'
                               AND NOW() - INTERVAL '7 days')                   AS new_last_week
    ")
    ->first();

$jobStats = DB::table('app.jobs')
    ->selectRaw("
        COUNT(*)                                     AS total,
        COUNT(*) FILTER (WHERE status = 'OPEN')      AS active,
        COUNT(*) FILTER (WHERE status = 'FILLED')    AS filled,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed
    ")
    ->first();

$pendingApprovals = DB::table('app.manager_profiles')
    ->where('approval_status', 'PENDING')
    ->count();

// Extract values:
$totalUsers       = $userStats->total_active;
$newUsersThisWeek = $userStats->new_this_week;
$newUsersLastWeek = $userStats->new_last_week;
$activeJobs       = $jobStats->active;
// ...
```

**Additionally**: Cache dashboard stats in Redis for 5 minutes (stats cards only — not the pending/recent lists):

```php
$stats = Cache::remember('dashboard.stats', 300, function () {
    // The aggregate queries above
});
```

**Effort**: 2 hours
**Impact**: Dashboard query count drops from 13 sequential to 5 (2 aggregates + attendance + pending list + recent lists). Stats cards cached → sub-millisecond for repeat loads.

---

### PERF-P0-05 · Replace N×UPDATE loop with single batch UPDATE in `bulkAccept()`

**File**: `apps/admin-laravel/app/Services/Application/ApplicationService.php:144-152`

```php
// BEFORE: N separate UPDATE statements
$accepted = 0;
foreach ($pending as $app) {
    $app->update([
        'status'      => 'ACCEPTED',
        'reviewed_at' => now(),
        'reviewed_by' => $managerProfileId,
    ]);
    $accepted++;
}

// AFTER: single batch UPDATE
$accepted  = $pending->count();
$acceptedIds = $pending->pluck('id')->all();

Application::whereIn('id', $acceptedIds)->update([
    'status'      => 'ACCEPTED',
    'reviewed_at' => now(),
    'reviewed_by' => $managerProfileId,
]);
```

**Effort**: 30 min
**Impact**: 20-applicant bulk accept: 20 UPDATE → 1 UPDATE. Eliminates N DB round-trips in transaction.

---

### PERF-P0-06 · Add pagination to applicant list API and client

**Files**:
- `apps/admin-laravel/app/Http/Controllers/Api/Manager/ManagerApplicationController.php:55-97`
- `apps/web-next/src/components/manager/applicants/ApplicantListClient.tsx`

**Fix A** — API: add pagination:

```php
// BEFORE
->get();   // all records

// AFTER — paginate, or at minimum add a generous limit
->orderBy('applied_at', 'asc')
->paginate(50);   // 50 per page (sufficient for typical jobs; large jobs split across pages)

// Update response to include pagination meta:
return response()->json([
    'statusCode' => 200,
    'data'       => [
        'applicants' => $data,
        'meta'       => [
            'slotsTotal'  => $job->slots_total,
            'slotsFilled' => $job->slots_filled,
            'status'      => $job->status,
            'currentPage' => $applications->currentPage(),
            'lastPage'    => $applications->lastPage(),
            'total'       => $applications->total(),
        ],
    ],
]);
```

**Fix B** — Client: add "Load more" button or simple pagination. Tab-based filtering already works client-side — pagination only needed when total > 50.

**Effort**: 2 hours (API + client)
**Impact**: Eliminates loading 200+ records into memory. Reduces initial payload from potentially 200KB+ to ~20KB.

---

## P1 — High (Fix Before Launch)

### PERF-P1-01 · Inject S3Client as singleton in ContractService

**File**: `apps/admin-laravel/app/Services/Contract/ContractService.php`

```php
// BEFORE: makeS3Client() called fresh every time
private function makeS3Client(): S3Client
{
    return new S3Client([...]);
}

// AFTER: lazy-initialised class property
private ?S3Client $s3Client = null;

private function getS3Client(): S3Client
{
    if ($this->s3Client === null) {
        $this->s3Client = new S3Client([
            'version'     => 'latest',
            'region'      => config('filesystems.disks.s3.region'),
            'credentials' => [
                'key'    => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
        ]);
    }
    return $this->s3Client;
}
```

Replace all `$this->makeS3Client()` calls with `$this->getS3Client()`. The service is already injected via Laravel DI, so the instance lives for the request lifetime — single client, single connection establishment.

**Effort**: 30 min
**Impact**: Eliminates redundant S3Client instantiation. Per sign operation: 3–4 client creations → 1.

---

### PERF-P1-02 · Eager-load worker phone in contract generation

**File**: `apps/admin-laravel/app/Services/Contract/ContractService.php:325-327`

```php
// BEFORE: separate DB query inside generateHtml()
$workerPhone = DB::table('auth.users')
    ->where('id', $worker->user_id)
    ->value('phone') ?? '';

// AFTER: include user phone in the eager load
// In generate(), workerSign(), managerSign() — change loadMissing to:
$application->loadMissing(['job.site', 'job.trade', 'worker.user', 'job.manager']);

// Then in generateHtml():
$workerPhone = $application->worker->user?->phone ?? '';
```

Requires `WorkerProfile` model to have a `user()` belongsTo relation (likely already present — verify).

**Effort**: 30 min
**Impact**: Eliminates 1 DB query per `generateHtml()` call (3 calls per contract lifecycle = 3 queries saved).

---

### PERF-P1-03 · Use `paginate()` instead of `count()` + `forPage()->get()`

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php:79-81`

```php
// BEFORE: two queries
$total      = $query->count();
$jobs       = $query->forPage($page, $limit)->get();
$totalPages = (int) ceil($total / max(1, $limit));

// AFTER: one query via paginate()
$paginator  = $query->paginate($limit, ['*'], 'page', $page);
$jobs       = $paginator->items();
$total      = $paginator->total();
$totalPages = $paginator->lastPage();
```

**Effort**: 30 min
**Impact**: Reduces public listing from 2 DB queries to 1 for the main jobs fetch.

---

### PERF-P1-04 · Add explicit dimensions to `JobCard` cover images

**File**: `apps/web-next/src/components/jobs/JobCard.tsx:43-47`

Option A — Use `next/image` with `fill` (recommended):

```tsx
import Image from 'next/image'

// BEFORE
<img
    src={job.coverImageUrl}
    alt={job.titleKo}
    loading="lazy"
    className="w-full h-full object-cover ..."
/>

// AFTER
<Image
    src={job.coverImageUrl}
    alt={job.titleKo}
    fill
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    className="object-cover group-hover:scale-105 transition-transform duration-300"
    loading="lazy"
/>
```

The parent div already has `h-40 overflow-hidden` which constrains the fill image correctly.

Option B — Keep `<img>` but add intrinsic dimensions:

```tsx
<img
    src={job.coverImageUrl}
    alt={job.titleKo}
    width={400}
    height={160}
    loading="lazy"
    className="w-full h-full object-cover ..."
/>
```

**Effort**: 1 hour (update all image usages in JobCard, JobDetailView, SiteDetailClient)
**Impact**: Eliminates CLS from image loading. Core Web Vital improvement → Google ranking benefit.

---

### PERF-P1-05 · Add missing DB indexes for dashboard queries

**File**: `packages/db/migrations/010_performance_indexes.sql` (new migration)

```sql
-- Dashboard: user growth chart and new-user counts
CREATE INDEX idx_users_created_at ON auth.users(created_at);

-- Dashboard: recent jobs list
CREATE INDEX idx_jobs_created_at ON app.jobs(created_at DESC);

-- Dashboard: recent sites list
CREATE INDEX idx_sites_created_at ON app.construction_sites(created_at DESC);

-- Dashboard: pending approval filter (most common admin filter)
CREATE INDEX idx_manager_profiles_approval_status
    ON app.manager_profiles(approval_status)
    WHERE approval_status = 'PENDING';

-- Public listing: composite for common filter (status + published_at + expires_at)
-- Supports the main listing query predicate at PublicJobController:45-49
CREATE INDEX idx_jobs_listing ON app.jobs(status, published_at, work_date)
    WHERE status IN ('OPEN', 'FILLED') AND published_at IS NOT NULL;
```

**Effort**: 1 hour (migration + EXPLAIN ANALYZE validation)
**Impact**: Dashboard user-growth query and recent-items queries become index scans instead of sequential scans. Public listing benefits from composite index.

---

### PERF-P1-06 · Configure Next.js image optimisation formats and cache TTL

**File**: `apps/web-next/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
    // ADD:
    formats: ['image/avif', 'image/webp'],   // serve modern formats to supporting browsers
    minimumCacheTTL: 86400,                  // cache optimised images for 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
  },
}
```

**Effort**: 15 min
**Impact**: WebP images are typically 25-35% smaller than JPEG at equivalent quality. AVIF is 50% smaller. Direct improvement to page load speed for image-heavy job listings.

---

### PERF-P1-07 · Use `react/cache` to deduplicate job detail fetch

Already covered in **PERF-P0-03 Fix B**. No additional work needed.

---

### PERF-P1-08 · Add client-side virtual list or load-more to applicant list

**File**: `apps/web-next/src/components/manager/applicants/ApplicantListClient.tsx`

For MVP, a simple "show first 50, load more" pattern avoids the complexity of virtual scrolling:

```tsx
// Add to component state:
const [visibleCount, setVisibleCount] = React.useState(50)

// Replace full render:
const visible = filtered.slice(0, visibleCount)

return (
    <>
        {visible.map(applicant => (
            <ApplicantCard key={applicant.id} ... />
        ))}
        {filtered.length > visibleCount && (
            <button
                onClick={() => setVisibleCount(c => c + 50)}
                className="w-full py-3 text-sm text-[#0669F7]"
            >
                더 보기 ({filtered.length - visibleCount}명 더)
            </button>
        )}
    </>
)
```

**Effort**: 30 min
**Impact**: Initial render limited to 50 DOM nodes regardless of total applicant count. Eliminates jank on tab switches for high-volume jobs.

---

## P2 — Medium (Fix Within 30 Days)

### PERF-P2-01 · Cache province/trade reference data in Redis

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicProvinceController.php` and equivalent

```php
// Wrap province and trade queries in Redis cache (24-hour TTL)
$provinces = Cache::remember('ref.provinces', 86400, function () {
    return DB::table('ref.vn_provinces')
        ->select('code', 'name_vi', 'name_en', 'slug')
        ->orderBy('name_vi')
        ->get();
});
```

Also cache in `resolveProvinceBySlug()` after PERF-P0-02 is applied — provinces are already indexed by slug, but a Redis cache avoids the DB round-trip entirely for hot slugs.

**Effort**: 1 hour
**Impact**: Province/trade endpoint response time: ~15ms DB → <1ms Redis.

---

### PERF-P2-02 · Move `contract_html` storage to S3-only

**File**: `apps/admin-laravel/app/Services/Contract/ContractService.php`

```php
// In generate(), workerSign(), managerSign():
// REMOVE: 'contract_html' => $html, from Contract::create/update

// Keep only the S3 key reference:
'contract_pdf_s3_key' => $htmlKey,

// When contract HTML is needed for display, fetch from S3:
public function getContractHtml(Contract $contract): string
{
    $client = $this->getS3Client();
    $result = $client->getObject([
        'Bucket' => config('filesystems.disks.s3.bucket'),
        'Key'    => $contract->contract_pdf_s3_key,
    ]);
    return (string) $result['Body'];
}
```

Also requires migrating the `contract_html` column to nullable or removing it in a subsequent migration.

**Effort**: 2 hours (code + migration)
**Impact**: Reduces `app.contracts` row size by 4-10KB per row. `SELECT *` on contracts table no longer pulls large TEXT blobs. Bonus: removes the DB-S3 data duplication.

---

### PERF-P2-03 · Increase job listing ISR TTL and use on-demand revalidation

**File**: `apps/web-next/src/app/[locale]/(public)/jobs/page.tsx:13`

```typescript
// BEFORE
export const revalidate = 60

// AFTER
export const revalidate = 600  // 10 minutes — jobs don't change every minute
```

In Laravel, trigger on-demand revalidation when a job is published or status changes:

```php
// In job publish/status-change handler:
Http::post(config('app.web_revalidate_url') . '/api/revalidate', [
    'secret' => config('app.revalidate_secret'),
    'tag'    => 'JOBS_LISTING',
]);
```

**Effort**: 1 hour
**Impact**: Higher cache hit rate for job listing pages. CDN serves more requests without hitting Next.js.

---

### PERF-P2-04 · Confirm map components use dynamic imports

**Files**: Any component rendering a map (Leaflet, Google Maps, etc.)

Verify all map components are lazy-loaded:

```typescript
// Correct pattern
const MapView = dynamic(() => import('@/components/MapView'), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
})
```

If any map library is currently imported statically at the top of a page component, move to `dynamic()` import. Map libraries (Leaflet, Google Maps JS SDK) are typically 200KB+ and must not block initial page rendering.

**Effort**: 30 min to audit and fix
**Impact**: Reduces initial JS parse time on job and site detail pages.

---

### PERF-P2-05 · Add explicit `Cache-Control` headers to API responses

**File**: `apps/admin-laravel/app/Http/Controllers/Api/Public/PublicJobController.php` and others

```php
// Public endpoints — cacheable by CDN
return response()->json([...])->header('Cache-Control', 'public, max-age=60, s-maxage=300');

// Authenticated endpoints — must not be shared-cached
return response()->json([...])->header('Cache-Control', 'private, no-store');

// Reference data (provinces, trades) — long-lived
return response()->json([...])->header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
```

**Effort**: 1 hour (apply across all controllers)
**Impact**: Prevents accidental CDN caching of authenticated data. Enables correct browser-level caching of public data.

---

### PERF-P2-06 · Increase `fetchPublicJobs` revalidation to 5 minutes

**File**: `apps/web-next/src/lib/api/public.ts:107`

```typescript
// BEFORE
next: { revalidate: 60, tags: ['JOBS_LISTING'] },

// AFTER
next: { revalidate: 300, tags: ['JOBS_LISTING'] },
```

Pair with PERF-P2-03 (on-demand ISR on publish events) so cache is invalidated immediately when real changes occur, but stale background loads are less frequent.

**Effort**: 5 min
**Impact**: 5× fewer background revalidation requests to the API under the same traffic load.

---

## Optimisation Roadmap

| Phase | Fixes | Target Metric | Estimated Effort |
|-------|-------|---------------|------------------|
| **Sprint 1 (Pre-launch)** | P0-01, P0-02, P0-03, P0-04, P0-05, P0-06 | Public listing API: 400ms → <80ms; Dashboard: 130ms → <30ms | ~10h |
| **Sprint 2 (Launch week)** | P1-01 through P1-08 | Job detail TTFB: 600ms → <100ms (CDN cached); Applicant list: 50→200 users handled | ~7h |
| **Sprint 3 (30 days post)** | P2-01 through P2-06 | Province API: 15ms → <1ms (Redis); Image size: -30% via WebP | ~6.5h |
| **Total** | 20 fixes | | **~23.5h** |

### Quick wins (< 1 hour each, high impact)

1. **PERF-P0-05** (`bulkAccept` batch) — 30 min, eliminates N×UPDATE
2. **PERF-P1-01** (S3Client singleton) — 30 min, eliminates redundant connections
3. **PERF-P1-03** (`paginate()`) — 30 min, eliminates one DB query per listing request
4. **PERF-P1-06** (next.config.ts image formats) — 15 min, enables WebP for all images
5. **PERF-P2-06** (revalidate 60→300) — 5 min, 5× fewer background fetches
