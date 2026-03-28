<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manager\StoreJobRequest;
use App\Http\Requests\Manager\UpdateJobRequest;
use App\Models\Job;
use App\Models\JobShift;
use App\Models\ManagerProfile;
use App\Models\Site;
use App\Services\Storage\S3Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Manages jobs under a construction site owned by the authenticated manager.
 *
 * All routes are protected by middleware('role:manager').
 * Ownership: job.manager_id === manager_profile.id
 */
class ManagerJobController extends Controller
{
    public function __construct(private readonly S3Service $s3) {}

    // ─── Ownership guards ────────────────────────────────────────────────────

    private function resolvedManagerProfile(Request $request): ManagerProfile
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $manager = $user->managerProfile;

        if ($manager === null || $manager->approval_status !== 'APPROVED') {
            abort(403, '승인된 매니저 프로필이 없습니다.');
        }

        return $manager;
    }

    private function ownedJob(string $jobId, ManagerProfile $manager): Job
    {
        $job = Job::findOrFail($jobId);

        if ($job->manager_id !== $manager->id) {
            abort(403, '이 공고에 대한 접근 권한이 없습니다.');
        }

        return $job;
    }

    private function ownedSite(string $siteId, ManagerProfile $manager): Site
    {
        $site = Site::findOrFail($siteId);

        if ($site->manager_id !== $manager->id) {
            abort(403, '이 현장에 대한 접근 권한이 없습니다.');
        }

        return $site;
    }

    // ─── Resource builder ───────────────────────────────────────────────────

    /**
     * Build the camelCase job resource array.
     *
     * @param  Job   $job
     * @param  bool  $includeShifts  When true, eager-loaded shifts are included.
     */
    private function jobResource(Job $job, bool $includeShifts = false): array
    {
        $imageKeys  = $job->image_s3_keys ?? [];
        $coverIdx   = $job->cover_image_idx ?? 0;
        $coverKey   = $imageKeys[$coverIdx] ?? null;
        $coverUrl   = $coverKey ? $this->s3->presignedUrl($coverKey) : null;
        $imageUrls  = array_map(fn (string $k) => $this->s3->presignedUrl($k), $imageKeys);

        // Application counts by status
        $appCounts = DB::table('app.job_applications')
            ->where('job_id', $job->id)
            ->selectRaw("status, COUNT(*) AS cnt")
            ->groupBy('status')
            ->pluck('cnt', 'status');

        $applicationCount = [
            'pending'  => (int) ($appCounts['PENDING']    ?? 0),
            'accepted' => (int) ($appCounts['ACCEPTED']   ?? 0),
            'rejected' => (int) ($appCounts['REJECTED']   ?? 0),
        ];

        // Shift count
        $shiftCount = $job->shifts()->count();

        // Trade name from ref table if trade_id present
        $tradeName = null;
        if ($job->trade_id) {
            $trade = DB::table('ref.construction_trades')->where('id', $job->trade_id)->first();
            $tradeName = $trade?->name_vi ?? null;
        }

        // Site name — eager-load if not already loaded
        $siteName = null;
        if ($job->relationLoaded('site')) {
            $siteName = $job->site?->name;
        } else {
            $site = Site::find($job->site_id);
            $siteName = $site?->name;
        }

        $resource = [
            'id'          => $job->id,
            'siteId'      => $job->site_id,
            'siteName'    => $siteName,
            'title'       => $job->title,
            'description' => $job->description,
            'tradeId'     => $job->trade_id,
            'tradeName'   => $tradeName,
            'workDate'    => $job->work_date?->toDateString(),
            'startTime'   => $job->start_time,
            'endTime'     => $job->end_time,
            'dailyWage'   => $job->daily_wage,
            'currency'    => $job->currency ?? 'VND',
            'benefits'    => $job->benefits ?? [],
            'requirements'=> $job->requirements ?? [],
            'slotsTotal'  => $job->slots_total,
            'slotsFilled' => $job->slots_filled,
            'status'      => $job->status,
            'slug'        => $job->slug,
            'expiresAt'   => $job->expires_at?->toIso8601String(),
            'publishedAt' => $job->published_at?->toIso8601String(),
            'coverImageUrl'     => $coverUrl,
            'imageUrls'         => array_values($imageUrls),
            'shiftCount'        => $shiftCount,
            'applicationCount'  => $applicationCount,
            'createdAt'   => $job->created_at?->toIso8601String(),
            'updatedAt'   => $job->updated_at?->toIso8601String(),
        ];

        if ($includeShifts) {
            $shifts = $job->shifts()
                ->orderBy('work_date')
                ->get()
                ->map(fn (JobShift $s) => [
                    'id'        => $s->id,
                    'jobId'     => $s->job_id,
                    'workDate'  => $s->work_date?->toDateString(),
                    'status'    => $s->status,
                    'createdAt' => $s->created_at?->toIso8601String(),
                ])->values();

            $resource['shifts'] = $shifts;
        }

        return $resource;
    }

    // ─── Routes ─────────────────────────────────────────────────────────────

    /**
     * GET /manager/sites/{siteId}/jobs
     * List jobs for a site, ordered by work_date desc, paginated 20.
     */
    public function index(Request $request, string $siteId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $this->ownedSite($siteId, $manager);

        $paginator = Job::where('site_id', $siteId)
            ->where('manager_id', $manager->id)
            ->orderBy('work_date', 'desc')
            ->paginate(20);

        $data = $paginator->getCollection()
            ->map(fn (Job $job) => $this->jobResource($job))
            ->values();

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
            'meta'       => [
                'total'    => $paginator->total(),
                'page'     => $paginator->currentPage(),
                'limit'    => $paginator->perPage(),
                'lastPage' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * POST /manager/sites/{siteId}/jobs
     * Create a new job posting under the given site.
     * Slug is generated from title + short uniqid suffix.
     * published_at is set to now().
     */
    public function store(StoreJobRequest $request, string $siteId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $this->ownedSite($siteId, $manager);

        $validated = $request->validated();
        $slug      = Str::slug($validated['title']) . '-' . substr(uniqid(), -6);

        $job = Job::create(array_merge($validated, [
            'site_id'      => $siteId,
            'manager_id'   => $manager->id,
            'slug'         => $slug,
            'published_at' => now(),
            'slots_filled' => 0,
            'status'       => 'OPEN',
        ]));

        return response()->json([
            'statusCode' => 201,
            'data'       => $this->jobResource($job),
        ], 201);
    }

    /**
     * GET /manager/jobs/{jobId}
     * Single job with shifts, application counts by status, and site name.
     */
    public function show(Request $request, string $jobId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $job     = $this->ownedJob($jobId, $manager);

        return response()->json([
            'statusCode' => 200,
            'data'       => $this->jobResource($job, includeShifts: true),
        ]);
    }

    /**
     * PUT /manager/jobs/{jobId}
     * Partial update. CANCELLED and COMPLETED jobs cannot be updated.
     */
    public function update(UpdateJobRequest $request, string $jobId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $job     = $this->ownedJob($jobId, $manager);

        if (in_array($job->status, ['CANCELLED', 'COMPLETED'], true)) {
            return response()->json([
                'statusCode' => 422,
                'message'    => '완료되거나 취소된 공고는 수정할 수 없습니다.',
            ], 422);
        }

        $job->update($request->validated());

        return response()->json([
            'statusCode' => 200,
            'data'       => $this->jobResource($job->fresh()),
        ]);
    }

    /**
     * PATCH /manager/jobs/{jobId}/status
     * Validate status transitions:
     *   OPEN   → FILLED, CANCELLED, COMPLETED
     *   FILLED → OPEN, CANCELLED
     *   CANCELLED → (none)
     *   COMPLETED → (none)
     */
    public function updateStatus(Request $request, string $jobId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $job     = $this->ownedJob($jobId, $manager);

        $request->validate([
            'status' => ['required', 'in:OPEN,FILLED,CANCELLED,COMPLETED'],
        ]);

        $newStatus = $request->input('status');
        $current   = $job->status;

        $allowedTransitions = [
            'OPEN'      => ['FILLED', 'CANCELLED', 'COMPLETED'],
            'FILLED'    => ['OPEN', 'CANCELLED'],
            'CANCELLED' => [],
            'COMPLETED' => [],
        ];

        if (in_array($current, ['CANCELLED', 'COMPLETED'], true)) {
            $label = $current === 'CANCELLED' ? '취소된' : '완료된';
            return response()->json([
                'statusCode' => 422,
                'message'    => "{$label} 공고는 상태를 변경할 수 없습니다.",
            ], 422);
        }

        $allowed = $allowedTransitions[$current] ?? [];
        if (!in_array($newStatus, $allowed, true)) {
            return response()->json([
                'statusCode' => 422,
                'message'    => "'{$current}' 상태에서 '{$newStatus}'(으)로 변경할 수 없습니다.",
            ], 422);
        }

        $job->update(['status' => $newStatus]);

        return response()->json([
            'statusCode' => 200,
            'data'       => $this->jobResource($job->fresh()),
        ]);
    }

    /**
     * DELETE /manager/jobs/{jobId}
     * Soft-delete by setting status=CANCELLED.
     * Allowed only if status is OPEN or FILLED and there are 0 ACCEPTED applications.
     */
    public function destroy(Request $request, string $jobId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $job     = $this->ownedJob($jobId, $manager);

        if (!in_array($job->status, ['OPEN', 'FILLED'], true)) {
            return response()->json([
                'statusCode' => 422,
                'message'    => '진행 중이지 않은 공고는 삭제할 수 없습니다.',
            ], 422);
        }

        $acceptedCount = DB::table('app.job_applications')
            ->where('job_id', $job->id)
            ->where('status', 'ACCEPTED')
            ->count();

        if ($acceptedCount > 0) {
            return response()->json([
                'statusCode' => 422,
                'message'    => '수락된 지원자가 있는 공고는 삭제할 수 없습니다.',
            ], 422);
        }

        $job->update(['status' => 'CANCELLED']);

        return response()->json([
            'statusCode' => 200,
            'data'       => ['message' => '공고가 취소되었습니다.'],
        ]);
    }

    /**
     * POST /manager/jobs/{jobId}/images
     * Upload a single image for a job, append to image_s3_keys.
     * Key prefix: jobs/{jobId}/{uuid}.{ext}
     */
    public function uploadImage(Request $request, string $jobId): JsonResponse
    {
        $manager = $this->resolvedManagerProfile($request);
        $job     = $this->ownedJob($jobId, $manager);

        $request->validate([
            'image' => ['required', 'file', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
        ]);

        $key  = $this->s3->upload($request->file('image'), "jobs/{$jobId}");
        $keys = $job->image_s3_keys ?? [];
        $keys[] = $key;

        $coverIdx = count($keys) === 1 ? 0 : $job->cover_image_idx;

        $job->update([
            'image_s3_keys'   => $keys,
            'cover_image_idx' => $coverIdx,
        ]);

        return response()->json([
            'statusCode' => 200,
            'data'       => $this->jobResource($job->fresh()),
        ]);
    }
}
