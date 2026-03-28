<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Auth\FirebaseTokenService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class FirebaseAuthMiddleware
{
    public function __construct(private FirebaseTokenService $firebase) {}

    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = $request->header('Authorization', '');

        if (!str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['statusCode' => 401, 'message' => 'Unauthenticated.'], 401);
        }

        $idToken = substr($authHeader, 7);

        try {
            $firebaseUid = $this->firebase->verifyIdToken($idToken);
        } catch (\Throwable $e) {
            return response()->json(['statusCode' => 401, 'message' => 'Invalid or expired token.'], 401);
        }

        $user = User::where('firebase_uid', $firebaseUid)->first();

        if (!$user) {
            // First-time login: upsert user
            $user = User::firstOrCreate(
                ['firebase_uid' => $firebaseUid],
                ['locale' => 'ko', 'status' => 'active'],
            );
            // Grant worker role automatically
            DB::table('auth.user_roles')->insertOrIgnore([
                'user_id' => $user->id,
                'role'    => 'worker',
                'status'  => 'active',
            ]);
        }

        if ($user->status === 'deleted') {
            return response()->json(['statusCode' => 401, 'message' => 'Account has been deactivated.'], 401);
        }

        // Enable PostgreSQL RLS for this connection
        DB::statement("SET app.current_user_id = ?", [$user->id]);

        // Load roles
        $user->loadMissing('roles');
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
