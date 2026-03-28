<?php

use App\Http\Middleware\FirebaseAuthMiddleware;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\SetLocaleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web:      __DIR__.'/../routes/web.php',
        api:      __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health:   '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'firebase.auth'  => FirebaseAuthMiddleware::class,
            'role'           => RoleMiddleware::class,
            'locale'         => SetLocaleMiddleware::class,
            'admin.session'  => \App\Http\Middleware\AdminSessionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json(['statusCode' => 403, 'message' => 'Forbidden.'], 403);
            }
        });
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json(['statusCode' => 404, 'message' => 'Not found.'], 404);
            }
        });
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'statusCode' => 422,
                    'message'    => 'Validation failed.',
                    'errors'     => $e->errors(),
                ], 422);
            }
        });
    })
    ->create();
