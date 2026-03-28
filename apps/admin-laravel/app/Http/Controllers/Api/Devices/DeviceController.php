<?php

namespace App\Http\Controllers\Api\Devices;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Manages FCM device tokens for push notifications.
 * PUT    /api/v1/devices/fcm-token — register/refresh token on app launch
 * DELETE /api/v1/devices/fcm-token — remove token on logout
 */
class DeviceController extends Controller
{
    /**
     * PUT /api/v1/devices/fcm-token
     *
     * Called on every app launch to ensure the FCM token is current.
     * Uses upsert to handle token refresh (Firebase rotates tokens periodically).
     */
    public function upsert(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required', 'string'],
            'platform' => ['nullable', Rule::in(['android', 'ios', 'web'])],
        ]);

        \DB::table('ops.fcm_tokens')->upsert(
            [
                'user_id'    => $request->user()->id,
                'token'      => $request->input('token'),
                'platform'   => $request->input('platform', 'android'),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            ['user_id', 'token'],         // unique key
            ['platform', 'updated_at'],   // update on conflict
        );

        return response()->json([
            'statusCode' => 200,
            'data' => ['message' => 'FCM token registered.'],
        ]);
    }

    /**
     * DELETE /api/v1/devices/fcm-token
     *
     * Called on logout to stop receiving push notifications on this device.
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
        ]);

        \DB::table('ops.fcm_tokens')
            ->where('user_id', $request->user()->id)
            ->where('token', $request->input('token'))
            ->delete();

        return response()->json([
            'statusCode' => 200,
            'data' => ['message' => 'FCM token removed.'],
        ]);
    }
}
