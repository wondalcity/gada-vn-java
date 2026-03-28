<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Site;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin site management endpoints.
 *
 * PATCH /admin/sites/{id}/deactivate — set status=INACTIVE and cancel all OPEN jobs
 */
class AdminSiteController extends Controller
{
    /**
     * PATCH /admin/sites/{id}/deactivate
     * Sets the site's status to INACTIVE and cancels all OPEN jobs belonging to it.
     * Returns the site ID, new status, and the number of jobs cancelled.
     */
    public function deactivate(Request $request, string $id): JsonResponse
    {
        $site = Site::findOrFail($id);

        if ($site->status === 'INACTIVE') {
            return response()->json([
                'statusCode' => 422,
                'message'    => 'Site is already inactive.',
            ], 422);
        }

        $cancelledJobs = DB::transaction(function () use ($site) {
            // Cancel all OPEN jobs for this site
            $affected = DB::table('app.jobs')
                ->where('site_id', $site->id)
                ->where('status', 'OPEN')
                ->update([
                    'status'     => 'CANCELLED',
                    'updated_at' => now(),
                ]);

            // Deactivate the site
            $site->update(['status' => 'INACTIVE']);

            return $affected;
        });

        return response()->json([
            'statusCode' => 200,
            'data'       => [
                'id'            => $site->id,
                'status'        => 'INACTIVE',
                'cancelledJobs' => (int) $cancelledJobs,
            ],
        ]);
    }
}
