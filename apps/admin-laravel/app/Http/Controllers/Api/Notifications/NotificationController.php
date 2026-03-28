<?php

namespace App\Http\Controllers\Api\Notifications;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Notification endpoints.
 *
 * GET   /notifications         — paginated list for current user
 * PATCH /notifications/{id}/read — mark single as read
 * POST  /notifications/read-all  — mark all as read
 */
class NotificationController extends Controller
{
    /**
     * GET /notifications
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $limit   = min((int) $request->query('limit', 20), 100);
        $unread  = $request->boolean('unreadOnly');

        $query = DB::table('ops.notifications')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at');

        if ($unread) {
            $query->where('read', false);
        }

        $rows = $query->paginate($limit);

        return response()->json([
            'statusCode' => 200,
            'data'       => $rows->items(),
            'meta'       => [
                'total'       => $rows->total(),
                'page'        => $rows->currentPage(),
                'lastPage'    => $rows->lastPage(),
                'unreadCount' => DB::table('ops.notifications')
                    ->where('user_id', $user->id)
                    ->where('read', false)
                    ->count(),
            ],
        ]);
    }

    /**
     * PATCH /notifications/{id}/read
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $affected = DB::table('ops.notifications')
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->update(['read' => true, 'updated_at' => now()]);

        if ($affected === 0) {
            return response()->json(['statusCode' => 404, 'message' => 'Not found'], 404);
        }

        return response()->json(['statusCode' => 200, 'data' => ['success' => true]]);
    }

    /**
     * POST /notifications/read-all
     */
    public function markAllRead(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        DB::table('ops.notifications')
            ->where('user_id', $user->id)
            ->where('read', false)
            ->update(['read' => true, 'updated_at' => now()]);

        return response()->json(['statusCode' => 200, 'data' => ['success' => true]]);
    }
}
