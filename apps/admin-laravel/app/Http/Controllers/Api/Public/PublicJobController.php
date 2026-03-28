<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Services\Storage\S3Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Public job browsing — no auth required.
 *
 * GET /public/jobs          — paginated job list with filters
 * GET /public/jobs/{slug}   — full job detail
 */
class PublicJobController extends Controller
{
    public function __construct(private readonly S3Service $s3) {}

    /**
     * GET /public/jobs
     *
     * Query params:
     *   province  — province slug (e.g. "ha-noi"), matched against ref.vn_provinces.name_vi
     *   tradeId   — integer trade ID
     *   siteSlug  — slug computed from site name (Str::slug(site.name))
     *   page      — page number (default 1)
     *   limit     — items per page (default 12)
     *
     * Only returns jobs with status IN ('OPEN', 'FILLED'), published_at IS NOT NULL,
     * and (expires_at IS NULL OR expires_at > NOW()).
     */
    public function index(Request $request): JsonResponse
    {
        $limit = max(1, (int) $request->input('limit', 12));
        $page  = max(1, (int) $request->input('page', 1));

        $query = Job::with([
            'site:id,name,address,province,district,lat,lng,image_s3_keys,cover_image_idx',
            'trade:id,code,name_ko,name_vi',
        ])
            ->whereIn('status', ['OPEN', 'FILLED'])
            ->whereNotNull('published_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->when($request->filled('tradeId'), fn ($q) => $q->where('trade_id', (int) $request->input('tradeId')))
            ->when($request->filled('province'), function ($q) use ($request) {
                // Resolve the province slug to province values stored in the sites table.
                // ref.vn_provinces has no slug column; we fetch all provinces and find the match in PHP.
                $requestedSlug = strtolower($request->input('province'));
                $matchedProvince = $this->resolveProvinceBySlug($requestedSlug);

                if ($matchedProvince) {
                    // construction_sites.province may store either the code or the name_vi
                    $q->whereHas('site', function ($s) use ($matchedProvince) {
                        $s->where(function ($inner) use ($matchedProvince) {
                            $inner->where('province', $matchedProvince->code)
                                  ->orWhere('province', $matchedProvince->name_vi);
                        });
                    });
                }
            })
            ->when($request->filled('siteSlug'), function ($q) use ($request) {
                // Sites have no slug column; match by computing slug from name.
                // We use a LIKE on name after stripping slug separators — not perfect but functional.
                // Better: fetch sites whose Str::slug(name) matches, then filter by site_id.
                $siteSlug    = $request->input('siteSlug');
                $siteIds     = $this->resolveSiteIdsBySlug($siteSlug);
                if (!empty($siteIds)) {
                    $q->whereIn('site_id', $siteIds);
                }
            })
            ->orderBy('work_date', 'asc');

        $total      = $query->count();
        $jobs       = $query->forPage($page, $limit)->get();
        $totalPages = (int) ceil($total / max(1, $limit));

        $items = $jobs->map(fn (Job $job) => $this->formatListItem($job));

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'jobs'       => $items,
                'total'      => $total,
                'page'       => $page,
                'totalPages' => $totalPages,
            ],
        ]);
    }

    /**
     * GET /public/jobs/{slug}
     *
     * Full job detail including site info, province slug, and up to 4 related jobs
     * sharing the same trade or same province (excluding this job).
     */
    public function show(string $slug): JsonResponse
    {
        $job = Job::with([
            'site',
            'trade:id,code,name_ko,name_vi',
        ])
            ->where('slug', $slug)
            ->whereNotNull('published_at')
            ->firstOrFail();

        $site  = $job->site;
        $trade = $job->trade;

        // Resolve province
        [$provinceNameVi, $provinceSlug] = $this->resolveProvinceForSite($site);

        // Cover image URL for the job
        $coverImageUrl = $this->resolveCoverImageUrl(
            $job->image_s3_keys ?? [],
            $job->cover_image_idx ?? 0
        );

        // Site data
        $siteData = null;
        if ($site) {
            $siteCoverUrl = $this->resolveCoverImageUrl(
                $site->image_s3_keys ?? [],
                $site->cover_image_idx ?? 0
            );
            $siteData = [
                'slug'         => Str::slug($site->name),
                'nameKo'       => $site->name,
                'nameVi'       => $site->name,
                'address'      => $site->address,
                'province'     => $provinceNameVi,
                'provinceSlug' => $provinceSlug,
                'lat'          => $site->lat,
                'lng'          => $site->lng,
                'coverImageUrl'=> $siteCoverUrl,
            ];
        }

        // Related jobs: same trade OR same province, max 4, excluding this job
        $relatedJobs = Job::with([
            'site:id,name,address,province,district,lat,lng,image_s3_keys,cover_image_idx',
            'trade:id,code,name_ko,name_vi',
        ])
            ->whereIn('status', ['OPEN', 'FILLED'])
            ->whereNotNull('published_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->where('id', '!=', $job->id)
            ->where(function ($q) use ($job, $site) {
                $q->where(function ($inner) use ($job) {
                    if ($job->trade_id) {
                        $inner->where('trade_id', $job->trade_id);
                    }
                });
                if ($site && $site->province) {
                    $q->orWhereHas('site', fn ($s) => $s->where('province', $site->province));
                }
            })
            ->limit(4)
            ->get()
            ->map(fn (Job $j) => $this->formatListItem($j));

        return response()->json([
            'statusCode' => 200,
            'data'       => array_merge(
                $this->formatListItem($job),
                [
                    'descriptionKo'  => $job->description,
                    'descriptionVi'  => $job->description,
                    'benefits'       => $job->benefits ?? [],
                    'requirements'   => $job->requirements ?? [],
                    'site'           => $siteData,
                    'relatedJobs'    => $relatedJobs,
                ]
            ),
        ]);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Format a single job for list responses.
     */
    private function formatListItem(Job $job): array
    {
        $site  = $job->site;
        $trade = $job->trade;

        [$provinceNameVi, $provinceSlug] = $this->resolveProvinceForSite($site);

        $coverImageUrl = $this->resolveCoverImageUrl(
            $job->image_s3_keys ?? [],
            $job->cover_image_idx ?? 0
        );

        return [
            'id'             => $job->id,
            'slug'           => $job->slug,
            'titleKo'        => $job->title,
            'titleVi'        => $job->title,
            'tradeNameKo'    => $trade?->name_ko,
            'tradeNameVi'    => $trade?->name_vi,
            'provinceNameVi' => $provinceNameVi,
            'provinceSlug'   => $provinceSlug,
            'siteSlug'       => $site ? Str::slug($site->name) : null,
            'siteNameKo'     => $site?->name,
            'workDate'       => $job->work_date?->toDateString(),
            'startTime'      => $job->start_time ? substr((string) $job->start_time, 0, 5) : null,
            'endTime'        => $job->end_time   ? substr((string) $job->end_time, 0, 5)   : null,
            'dailyWage'      => $job->daily_wage,
            'slotsTotal'     => $job->slots_total,
            'slotsFilled'    => $job->slots_filled,
            'status'         => $job->status,
            'coverImageUrl'  => $coverImageUrl,
            'publishedAt'    => $job->published_at?->toIso8601String(),
        ];
    }

    /**
     * Resolve province name and slug for a given Site model (or null).
     * Returns [nameVi, slug] tuple.
     *
     * construction_sites.province stores TEXT (province code like 'HN', or name_vi like 'Hà Nội').
     * We match against ref.vn_provinces by code or name_vi.
     *
     * @param  \App\Models\Site|null $site
     * @return array{0: string|null, 1: string|null}
     */
    private function resolveProvinceForSite(?\App\Models\Site $site): array
    {
        if (! $site || ! $site->province) {
            return [null, null];
        }

        $row = DB::table('ref.vn_provinces as p')
            ->where(function ($q) use ($site) {
                $q->where('p.code', $site->province)
                  ->orWhere('p.name_vi', $site->province);
            })
            ->select('p.name_vi')
            ->first();

        if ($row) {
            return [$row->name_vi, Str::slug($row->name_vi)];
        }

        // Fallback: use raw value as-is
        return [$site->province, Str::slug($site->province)];
    }

    /**
     * Find a province row whose Str::slug(name_vi) equals $slug.
     * Fetches all provinces (small table, ~63 rows) and matches in PHP.
     */
    private function resolveProvinceBySlug(string $slug): ?object
    {
        $provinces = DB::table('ref.vn_provinces')
            ->select('code', 'name_vi', 'name_en')
            ->get();

        foreach ($provinces as $province) {
            if (Str::slug($province->name_vi) === $slug) {
                return $province;
            }
        }

        return null;
    }

    /**
     * Return site IDs whose Str::slug(name) matches the given slug.
     * Fetches all site id+name pairs and matches in PHP.
     * Only used for siteSlug filtering; the sites table is typically small per use case.
     */
    private function resolveSiteIdsBySlug(string $siteSlug): array
    {
        $sites = DB::table('app.construction_sites')
            ->select('id', 'name')
            ->get();

        return $sites
            ->filter(fn ($s) => Str::slug($s->name) === $siteSlug)
            ->pluck('id')
            ->all();
    }

    /**
     * Given an array of S3 keys and a cover index, return a presigned URL
     * for the cover image, or null if no keys exist.
     */
    private function resolveCoverImageUrl(array $keys, int $idx): ?string
    {
        if (empty($keys)) {
            return null;
        }

        $key = $keys[$idx] ?? $keys[0] ?? null;

        return $key ? $this->s3->presignedUrl($key) : null;
    }
}
