<?php

namespace App\Http\Controllers\Api\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Account management endpoints for the authenticated user.
 *
 * All routes require: Authorization: Bearer <Firebase ID Token>
 * FirebaseAuthMiddleware injects $request->user() automatically.
 */
class MeController extends Controller
{
    /**
     * GET /api/v1/me
     *
     * Returns the current user's full profile including:
     * - Basic info (name, phone, email, locale)
     * - Role flags (isWorker, isManager, isAdmin)
     * - Manager registration status (null | pending | approved | rejected | revoked)
     * - Full role list with grant/revoke timestamps
     *
     * Frontend uses this on app launch to decide which features to show.
     * isManager = false means manager features are locked (button disabled, route redirects).
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('roles', 'managerProfile');

        return response()->json([
            'statusCode' => 200,
            'data' => new UserResource($user),
        ]);
    }

    /**
     * PATCH /api/v1/me/locale
     *
     * Set the user's preferred language.
     * All subsequent API responses (job titles, notification text) use this locale.
     * Capacitor app stores locale in @capacitor/preferences and updates here on change.
     */
    public function updateLocale(Request $request): JsonResponse
    {
        $request->validate([
            'locale' => ['required', Rule::in(config('gada.locales', ['ko', 'vi', 'en']))],
        ]);

        $request->user()->update(['locale' => $request->validated('locale')]);

        return response()->json([
            'statusCode' => 200,
            'data' => ['locale' => $request->validated('locale')],
        ]);
    }

    /**
     * DELETE /api/v1/me/account
     *
     * Soft-deletes the user's own account.
     * Requires confirmation phrase to prevent accidental deletion.
     *
     * After deletion:
     * - user.status = 'deleted'
     * - Firebase auth is disabled (user cannot sign in)
     * - All active FCM tokens removed
     * - Data retained for legal compliance (contracts, attendance records)
     *
     * Note: Admin accounts cannot self-delete (enforced here).
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'confirmPhrase' => ['required', 'string', Rule::in(['DELETE'])],
        ]);

        $user = $request->user();

        // Admin accounts cannot be self-deleted
        if ($user->isAdmin()) {
            return response()->json([
                'statusCode' => 403,
                'message'    => 'Admin accounts cannot be self-deleted. Contact a super admin.',
            ], 403);
        }

        // Soft delete
        $user->update(['status' => 'deleted']);

        // Remove FCM tokens
        \DB::table('ops.fcm_tokens')->where('user_id', $user->id)->delete();

        // Disable Firebase account (prevents sign-in)
        try {
            app(\Kreait\Firebase\Contract\Auth::class)->disableUser($user->firebase_uid);
        } catch (\Throwable $e) {
            \Log::warning("Failed to disable Firebase user {$user->firebase_uid}: " . $e->getMessage());
        }

        return response()->json([
            'statusCode' => 200,
            'data' => ['message' => 'Account deleted successfully.'],
        ]);
    }
}
