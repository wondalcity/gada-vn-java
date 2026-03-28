<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Job;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin job management endpoints.
 *
 * PATCH /admin/jobs/{id}/close — forcefully cancel a job regardless of current status
 */
class AdminJobController extends Controller
{
    /**
     * PATCH /admin/jobs/{id}/close
     * Sets the job status to CANCELLED.
     * Admin can close any job regardless of its current status or ownership.
     */
    public function close(Request $request, string $id): JsonResponse
    {
        $job = Job::findOrFail($id);

        if ($job->status === 'CANCELLED') {
            return response()->json([
                'statusCode' => 422,
                'message'    => 'Job is already cancelled.',
            ], 422);
        }

        $job->update(['status' => 'CANCELLED']);

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'id'     => $job->id,
                'status' => 'CANCELLED',
            ],
        ]);
    }
}
