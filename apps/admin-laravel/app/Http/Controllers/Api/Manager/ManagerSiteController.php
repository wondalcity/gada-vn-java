<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manager\StoreSiteRequest;
use App\Http\Requests\Manager\UpdateSiteRequest;
use App\Models\Site;
use App\Services\Storage\S3Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Manages construction sites owned by the authenticated manager.
 *
 * All routes are protected by middleware('role:manager').
 * Every method performs an ownership check: site.manager_id === manager_profile.id
 */
class ManagerSiteController extends Controller
{
    public function __construct(private readonly S3Service $s3) {}

    // ─── Ownership guard ────────────────────────────────────────────────────

    /**
     * Resolve the approved manager profile for the current user.
     * Returns 403 if none exists or if the profile has not been approved.
     */
    private function resolvedManagerProfile(Request $request): \App\Models\ManagerProfile
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $manager = $user->managerProfile;

        if ($manager === null || $manager->approval_status !== 'APPROVED') {
            abort(403, '승인된 매니저 프로필이 없습니다.');
        }

        return $manager;
    }

    /**
     * Resolve a site and verify it belongs to the given manager.
     */
    private function ownedSite(string $siteId, \App\Models\ManagerProfile $manager): Site
    {
        $site = Site::findOrFail($siteId);

        if ($site->manager_id !== $manager->id) {
            abort(403, '이 현장에 대한 접근 권한이 없습니다.');
        }

        return $site;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    /**
     * Build the camelCase site resource array with presigned image URLs.
     */
    private function siteResource(Site $site, ?int $jobCount = null): array
    {
        $imageKeys   = $site->image_s3_keys ?? [];
        $coverIdx    = $site->cover_image_idx ?? 0;
        $coverKey    = $imageKeys[$coverIdx] ?? null;
        $coverUrl    = $coverKey ? $this->s3->presignedUrl($coverKey) : null;
        $imageUrls   = array_map(fn (string $key) => $this->s3->presignedUrl($key), $imageKeys);

        return [
            'id'           => $site->id,
            'name'         => $site->name,
            'address'      => $site->address,
            'province'     => $site->province,
            'district'     => $site->district,
            'lat'          => $site->lat,
            'lng'          => $site->lng,
            'siteType'     => $site->site_type,
            'status'       => $site->status,
            'coverImageUrl'=> $coverUrl,
            'imageUrls'    => array_values($imageUrls),
            'jobCount'     => $jobCount ?? $site->jobs()->count(),
            'createdAt'    => $site->created_at?->toIso8601String(),
            'updatedAt'    => $site->updated_at?->toIso8601String(),
        ];
    }

    // ─── Routes ─────────────────────────────────────────────────────────────

    /**
     * GET /manager/sites
     * List all sites owned by this manager, paginated 20, with job counts.
     */
    public function index(Request $request): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);

        $paginator = Site::where('manager_id', $manager->id)
            ->withCount('jobs')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $data = $paginator->getCollection()->map(function (Site $site) {
            return $this->siteResource($site, $site->jobs_count);
        })->values();

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
            'meta'       => [
                'total'       => $paginator->total(),
                'page'        => $paginator->currentPage(),
                'limit'       => $paginator->perPage(),
                'lastPage'    => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * POST /manager/sites
     * Create a new construction site for this manager.
     */
    public function store(StoreSiteRequest $request): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);

        $site = Site::create(array_merge(
            $request->validated(),
            ['manager_id' => $manager->id]
        ));

        return response()->json([
            'statusCode' => 201,
            'data'       => $this->siteResource($site, 0),
        ], 201);
    }

    /**
     * GET /manager/sites/{siteId}
     * Single site with recent jobs (limit 10, ordered by work_date desc) and presigned cover URL.
     */
    public function show(Request $request, string $siteId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $site    = $this->ownedSite($siteId, $manager);

        $recentJobs = $site->jobs()
            ->orderBy('work_date', 'desc')
            ->limit(10)
            ->get()
            ->map(fn (\App\Models\Job $job) => [
                'id'        => $job->id,
                'title'     => $job->title,
                'workDate'  => $job->work_date?->toDateString(),
                'status'    => $job->status,
                'slotsTotal'=> $job->slots_total,
                'slotsFilled'=> $job->slots_filled,
            ])->values();

        $resource                = $this->siteResource($site);
        $resource['recentJobs']  = $recentJobs;

        return response()->json(['statusCode' => 200, 'data' => $resource]);
    }

    /**
     * PUT /manager/sites/{siteId}
     * Partial update of allowed site fields.
     */
    public function update(UpdateSiteRequest $request, string $siteId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $site    = $this->ownedSite($siteId, $manager);

        $site->update($request->validated());

        return response()->json([
            'statusCode' => 200,
            'data'       => $this->siteResource($site->fresh()),
        ]);
    }

    /**
     * PATCH /manager/sites/{siteId}/status
     * Change site status: ACTIVE | COMPLETED | PAUSED
     */
    public function updateStatus(Request $request, string $siteId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $site    = $this->ownedSite($siteId, $manager);

        $request->validate([
            'status' => ['required', 'in:ACTIVE,COMPLETED,PAUSED'],
        ]);

        $site->update(['status' => $request->input('status')]);

        return response()->json([
            'statusCode' => 200,
            'data'       => $this->siteResource($site->fresh()),
        ]);
    }

    /**
     * POST /manager/sites/{siteId}/images
     * Upload a single image to S3 and append its key to image_s3_keys.
     * If this is the first image, cover_image_idx is set to 0 automatically.
     */
    public function uploadImage(Request $request, string $siteId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $site    = $this->ownedSite($siteId, $manager);

        $request->validate([
            'image' => ['required', 'file', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
        ]);

        $key  = $this->s3->upload($request->file('image'), "sites/{$siteId}");
        $keys = $site->image_s3_keys ?? [];
        $keys[] = $key;

        $coverIdx = count($keys) === 1 ? 0 : $site->cover_image_idx;

        $site->update([
            'image_s3_keys'   => $keys,
            'cover_image_idx' => $coverIdx,
        ]);

        return response()->json([
            'statusCode' => 200,
            'data'       => $this->siteResource($site->fresh()),
        ]);
    }

    /**
     * DELETE /manager/sites/{siteId}
     * Soft-delete by setting status=COMPLETED.
     * Blocked if the site has any OPEN jobs.
     */
    public function destroy(Request $request, string $siteId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $site    = $this->ownedSite($siteId, $manager);

        $openJobCount = $site->jobs()->where('status', 'OPEN')->count();
        if ($openJobCount > 0) {
            return response()->json([
                'statusCode' => 422,
                'message'    => '현장에 진행 중인 일자리가 있습니다.',
            ], 422);
        }

        $site->update(['status' => 'COMPLETED']);

        return response()->json([
            'statusCode' => 200,
            'data'       => ['message' => '현장이 완료 처리되었습니다.'],
        ]);
    }
}
