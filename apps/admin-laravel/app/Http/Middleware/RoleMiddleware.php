<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (!$user || !$user->hasRole($role)) {
            return response()->json(['statusCode' => 403, 'message' => 'Forbidden.'], 403);
        }

        return $next($request);
    }
}
