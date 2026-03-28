<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Site;
use App\Services\Storage\S3Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Public construction site detail — no auth required.
 *
 * GET /public/sites/{slug}  — full site detail with active job count and presigned image URLs
 *
 * The app.construction_sites table has no dedicated slug column. The slug
 * is computed at runtime as Str::slug($site->name). Lookup is performed by
 * fetching candidates whose slugified name matches the requested slug.
 */
class PublicSiteController extends Controller
{
    public function __construct(private readonly S3Service $s3) {}

    /**
     * GET /public/sites/{slug}
     *
     * $slug is matched against Str::slug(site.name). If multiple sites share
     * the same computed slug the first result (by created_at) is returned.
     */
    public function show(string $slug): JsonResponse
    {
        // Sites have no slug column — resolve by matching computed slug from name.
        // Fetch all sites and match in PHP (practical for typical dataset sizes).
        $site = $this->resolveSiteBySlug($slug);

        if (! $site) {
            abort(404, '현장을 찾을 수 없습니다.');
        }

        // Resolve province info
        [$provinceNameVi, $provinceSlug] = $this->resolveProvinceForSite($site);

        // Generate presigned URLs for all images (15-min TTL)
        $imageKeys  = $site->image_s3_keys ?? [];
        $coverIdx   = $site->cover_image_idx ?? 0;
        $coverKey   = $imageKeys[$coverIdx] ?? $imageKeys[0] ?? null;
        $coverUrl   = $coverKey ? $this->s3->presignedUrl($coverKey) : null;
        $imageUrls  = array_values(
            array_map(fn (string $key) => $this->s3->presignedUrl($key), $imageKeys)
        );

        // Count active jobs (OPEN or FILLED, published, not expired)
        $activeJobCount = $site->jobs()
            ->whereIn('status', ['OPEN', 'FILLED'])
            ->whereNotNull('published_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->count();

        // Manager company name (load manager if available)
        $managerCompany = null;
        if ($site->manager_id) {
            $manager = DB::table('app.manager_profiles')
                ->where('id', $site->manager_id)
                ->select('company_name', 'representative_name')
                ->first();

            $managerCompany = $manager?->company_name ?? $manager?->representative_name;
        }

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'id'             => $site->id,
                'slug'           => Str::slug($site->name),
                'nameKo'         => $site->name,
                'nameVi'         => $site->name,
                'address'        => $site->address,
                'province'       => $provinceNameVi,
                'provinceSlug'   => $provinceSlug,
                'siteType'       => $site->site_type,
                'imageUrls'      => $imageUrls,
                'coverImageUrl'  => $coverUrl,
                'lat'            => $site->lat,
                'lng'            => $site->lng,
                'managerCompany' => $managerCompany,
                'activeJobCount' => $activeJobCount,
            ],
        ]);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Resolve a Site model by matching Str::slug($site->name) === $slug.
     * Returns the first match ordered by created_at ASC, or null if none found.
     */
    private function resolveSiteBySlug(string $slug): ?Site
    {
        // Fetch only id + name + created_at first for the match, then load full model.
        $candidates = DB::table('app.construction_sites')
            ->select('id', 'name')
            ->orderBy('created_at', 'asc')
            ->get();

        $matchedId = null;
        foreach ($candidates as $row) {
            if (Str::slug($row->name) === $slug) {
                $matchedId = $row->id;
                break;
            }
        }

        if (! $matchedId) {
            return null;
        }

        return Site::findOrFail($matchedId);
    }

    /**
     * Resolve province display name and slug for a given Site model.
     * construction_sites.province is plain TEXT (may be code like 'HN' or name like 'Hà Nội').
     * We match against ref.vn_provinces by code OR name_vi.
     *
     * @return array{0: string|null, 1: string|null}
     */
    private function resolveProvinceForSite(Site $site): array
    {
        if (! $site->province) {
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

        return [$site->province, Str::slug($site->province)];
    }
}
