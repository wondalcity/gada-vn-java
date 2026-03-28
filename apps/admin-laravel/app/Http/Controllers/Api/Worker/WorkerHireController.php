<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Contract;
use App\Models\WorkerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Worker-facing "hires" — ACCEPTED or CONTRACTED applications.
 *
 * GET /worker/hires
 */
class WorkerHireController extends Controller
{
    /**
     * GET /worker/hires
     * Returns applications where status IN ('ACCEPTED', 'CONTRACTED').
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $workerProfile = WorkerProfile::where('user_id', $user->id)->first();

        if (!$workerProfile) {
            return response()->json([
                'statusCode' => 200,
                'data'       => [],
            ]);
        }

        $hires = Application::where('worker_id', $workerProfile->id)
            ->whereIn('status', ['ACCEPTED', 'CONTRACTED'])
            ->with(['job' => fn($q) => $q->with(['site', 'manager'])])
            ->orderBy('reviewed_at', 'desc')
            ->get();

        $hireIds   = $hires->pluck('id');
        $contracts = Contract::whereIn('application_id', $hireIds)
            ->get()
            ->keyBy('application_id');

        $data = $hires->map(function (Application $app) use ($contracts) {
            $job     = $app->job;
            $site    = $job?->site;
            $manager = $job?->manager;

            return [
                'id'             => $app->id,
                'jobId'          => $app->job_id,
                'jobTitle'       => $job?->title,
                'siteName'       => $site?->name,
                'workDate'       => $job?->work_date?->toDateString(),
                'dailyWage'      => $job?->daily_wage,
                'startTime'      => $job?->start_time,
                'endTime'        => $job?->end_time,
                'managerName'    => $manager?->representative_name,
                'managerPhone'   => $manager?->contact_phone,
                'status'         => $app->status,
                'reviewedAt'     => $app->reviewed_at,
                'contractId'     => $contracts[$app->id]->id ?? null,
            ];
        });

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
        ]);
    }
}
