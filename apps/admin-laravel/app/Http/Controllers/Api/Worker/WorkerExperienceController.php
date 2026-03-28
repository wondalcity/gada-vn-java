<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Models\WorkerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Worker work experience endpoints.
 *
 * GET    /worker/experiences        — list own experiences
 * POST   /worker/experiences        — add experience
 * PUT    /worker/experiences/{id}   — update experience
 * DELETE /worker/experiences/{id}   — delete experience
 */
class WorkerExperienceController extends Controller
{
    /**
     * GET /worker/experiences
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $workerProfile = WorkerProfile::where('user_id', $user->id)->first();
        if (!$workerProfile) {
            return response()->json(['statusCode' => 200, 'data' => []]);
        }

        $rows = DB::table('app.worker_experiences')
            ->where('worker_id', $workerProfile->id)
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json([
            'statusCode' => 200,
            'data'       => $rows,
        ]);
    }

    /**
     * POST /worker/experiences
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:200',
            'role'         => 'required|string|max:200',
            'start_date'   => 'required|date',
            'end_date'     => 'nullable|date|after_or_equal:start_date',
            'description'  => 'nullable|string|max:1000',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $workerProfile = WorkerProfile::where('user_id', $user->id)->firstOrFail();

        $id = (string) Str::uuid();
        DB::table('app.worker_experiences')->insert([
            'id'           => $id,
            'worker_id'    => $workerProfile->id,
            'company_name' => $data['company_name'],
            'role'         => $data['role'],
            'start_date'   => $data['start_date'],
            'end_date'     => $data['end_date'] ?? null,
            'description'  => $data['description'] ?? null,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $row = DB::table('app.worker_experiences')->where('id', $id)->first();

        return response()->json(['statusCode' => 201, 'data' => $row], 201);
    }

    /**
     * PUT /worker/experiences/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'company_name' => 'sometimes|string|max:200',
            'role'         => 'sometimes|string|max:200',
            'start_date'   => 'sometimes|date',
            'end_date'     => 'nullable|date',
            'description'  => 'nullable|string|max:1000',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $workerProfile = WorkerProfile::where('user_id', $user->id)->firstOrFail();

        $affected = DB::table('app.worker_experiences')
            ->where('id', $id)
            ->where('worker_id', $workerProfile->id)
            ->update(array_merge($data, ['updated_at' => now()]));

        if ($affected === 0) {
            return response()->json(['statusCode' => 404, 'message' => 'Not found'], 404);
        }

        $row = DB::table('app.worker_experiences')->where('id', $id)->first();

        return response()->json(['statusCode' => 200, 'data' => $row]);
    }

    /**
     * DELETE /worker/experiences/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $workerProfile = WorkerProfile::where('user_id', $user->id)->firstOrFail();

        $affected = DB::table('app.worker_experiences')
            ->where('id', $id)
            ->where('worker_id', $workerProfile->id)
            ->delete();

        if ($affected === 0) {
            return response()->json(['statusCode' => 404, 'message' => 'Not found'], 404);
        }

        return response()->json(null, 204);
    }
}
