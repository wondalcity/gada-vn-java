<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Http\Requests\Worker\UpdateWorkerProfileRequest;
use App\Http\Resources\WorkerProfileResource;
use App\Models\WorkerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Handles the authenticated worker's own profile.
 *
 * GET  /worker/profile — retrieve (or lazily create) the profile
 * PUT  /worker/profile — update profile fields, recompute profile_complete, sync user name
 */
class WorkerProfileController extends Controller
{
    /**
     * GET /worker/profile
     * Returns the current user's worker profile, creating it if it doesn't exist yet.
     * S3 keys are replaced with presigned URLs inside WorkerProfileResource.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $profile = WorkerProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['profile_complete' => false, 'id_verified' => false]
        );

        return response()->json([
            'statusCode' => 200,
            'data'       => new WorkerProfileResource($profile),
        ]);
    }

    /**
     * PUT /worker/profile
     * Validates and persists profile fields.
     * Marks profile_complete=true when full_name, date_of_birth, and gender are all set.
     * Syncs user.name from full_name so the JWT display name stays current.
     *
     * @throws ValidationException
     */
    public function update(UpdateWorkerProfileRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $profile = WorkerProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['profile_complete' => false, 'id_verified' => false]
        );

        $validated = $request->validated();

        // Determine profile completeness: all three core fields must be non-empty
        $fullName    = $validated['full_name']     ?? $profile->full_name;
        $dob         = $validated['date_of_birth'] ?? $profile->date_of_birth;
        $gender      = $validated['gender']        ?? $profile->gender;

        $validated['profile_complete'] = filled($fullName) && filled($dob) && filled($gender);

        // When terms_accepted transitions from false to true, stamp the timestamp
        if (isset($validated['terms_accepted']) && $validated['terms_accepted'] && !$profile->terms_accepted) {
            $validated['terms_accepted_at'] = now();
        }

        $profile->update($validated);

        // Keep auth.users.name in sync so the JWT display name matches the profile
        if (filled($fullName) && $user->name !== $fullName) {
            $user->update(['name' => $fullName]);
        }

        return response()->json([
            'statusCode' => 200,
            'data'       => new WorkerProfileResource($profile->fresh()),
        ]);
    }

    /**
     * POST /worker/profile/trade-skills
     * Replaces the worker's trade skill set atomically.
     * Accepts up to 10 trade/years pairs; deletes existing rows then inserts the new set.
     *
     * @throws ValidationException
     */
    public function updateTradeSkills(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validate([
            'tradeSkills'             => ['required', 'array', 'max:10'],
            'tradeSkills.*.tradeId'   => ['required', 'integer'],
            'tradeSkills.*.years'     => ['required', 'integer', 'min:0', 'max:50'],
        ]);

        $profile = WorkerProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['profile_complete' => false, 'id_verified' => false]
        );

        $tradeSkills = DB::transaction(function () use ($profile, $validated) {
            DB::table('app.worker_trade_skills')
                ->where('worker_profile_id', $profile->id)
                ->delete();

            $rows = [];
            foreach ($validated['tradeSkills'] as $skill) {
                DB::table('app.worker_trade_skills')->insert([
                    'worker_profile_id' => $profile->id,
                    'trade_id'          => $skill['tradeId'],
                    'years'             => $skill['years'],
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
                $rows[] = [
                    'tradeId' => $skill['tradeId'],
                    'years'   => $skill['years'],
                ];
            }

            return $rows;
        });

        return response()->json([
            'statusCode' => 200,
            'data'       => ['tradeSkills' => $tradeSkills],
        ]);
    }
}
