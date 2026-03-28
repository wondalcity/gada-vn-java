<?php

use App\Http\Controllers\Api\Auth\OtpController;
use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Auth\LogoutController;
use App\Http\Controllers\Api\Auth\FacebookAuthController;
use App\Http\Controllers\Api\Account\MeController;
use App\Http\Controllers\Api\Public\PublicJobController;
use App\Http\Controllers\Api\Public\PublicSiteController;
use App\Http\Controllers\Api\Public\PublicProvinceController;
use App\Http\Controllers\Api\Public\PublicTradeController;
use App\Http\Controllers\Api\Worker\WorkerProfileController;
use App\Http\Controllers\Api\Worker\WorkerIdDocumentController;
use App\Http\Controllers\Api\Worker\WorkerSignatureController;
use App\Http\Controllers\Api\Worker\WorkerExperienceController;
use App\Http\Controllers\Api\Worker\WorkerApplicationController;
use App\Http\Controllers\Api\Worker\WorkerAttendanceController;
use App\Http\Controllers\Api\Worker\WorkerHireController;
use App\Http\Controllers\Api\Worker\WorkerContractController;
use App\Http\Controllers\Api\Manager\ManagerRegistrationController;
use App\Http\Controllers\Api\Manager\ManagerSiteController;
use App\Http\Controllers\Api\Manager\ManagerJobController;
use App\Http\Controllers\Api\Manager\ManagerShiftController;
use App\Http\Controllers\Api\Manager\ManagerApplicationController;
use App\Http\Controllers\Api\Manager\ManagerHireController;
use App\Http\Controllers\Api\Manager\ManagerAttendanceController;
use App\Http\Controllers\Api\Manager\ManagerContractController;
use App\Http\Controllers\Api\Notifications\NotificationController;
use App\Http\Controllers\Api\Devices\DeviceController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AdminApprovalController;
use App\Http\Controllers\Api\Admin\AdminSiteController;
use App\Http\Controllers\Api\Admin\AdminJobController;
use App\Http\Controllers\Api\Admin\AdminAttendanceController;
use App\Http\Controllers\Api\Admin\AdminTranslationController;
use Illuminate\Support\Facades\Route;

// ─── Health check (no auth, no prefix) ────────────────────────────────────
// Used by ECS ALB target group health checks and local smoke tests.
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'ts'     => now()->toISOString(),
    ]);
});

Route::prefix('v1')->middleware('locale')->group(function () {

    // ─── Public (no auth) ─────────────────────────────────────────────
    Route::post('/auth/otp/send',        [OtpController::class, 'send'])->middleware('throttle:otp');
    Route::post('/auth/otp/verify',      [OtpController::class, 'verify']);
    Route::post('/auth/register',        [RegisterController::class, 'store'])->middleware('firebase.auth');
    Route::post('/auth/login',           [LoginController::class, 'store']);
    Route::post('/auth/social/facebook', [FacebookAuthController::class, 'store']);

    Route::prefix('public')->group(function () {
        Route::get('/jobs',          [PublicJobController::class, 'index']);
        Route::get('/jobs/{slug}',   [PublicJobController::class, 'show']);
        Route::get('/sites/{slug}',  [PublicSiteController::class, 'show']);
        Route::get('/provinces',     [PublicProvinceController::class, 'index']);
        Route::get('/trades',        [PublicTradeController::class, 'index']);
    });

    // ─── Authenticated ─────────────────────────────────────────────────
    Route::middleware('firebase.auth')->group(function () {
        Route::post('/auth/logout', [LogoutController::class, 'store']);

        // Account
        Route::get('/me',            [MeController::class, 'show']);
        Route::patch('/me/locale',   [MeController::class, 'updateLocale']);
        Route::delete('/me/account', [MeController::class, 'destroy']);

        // Worker (all authenticated users)
        Route::prefix('worker')->group(function () {
            Route::get('/profile',                    [WorkerProfileController::class, 'show']);
            Route::put('/profile',                    [WorkerProfileController::class, 'update']);
            Route::post('/profile/id-documents',      [WorkerIdDocumentController::class, 'store']);
            Route::post('/profile/signature',         [WorkerSignatureController::class, 'store']);
            Route::post('/profile/trade-skills',      [WorkerProfileController::class, 'updateTradeSkills']);
            Route::get('/experiences',                [WorkerExperienceController::class, 'index']);
            Route::post('/experiences',               [WorkerExperienceController::class, 'store']);
            Route::put('/experiences/{id}',           [WorkerExperienceController::class, 'update']);
            Route::delete('/experiences/{id}',        [WorkerExperienceController::class, 'destroy']);
            Route::get('/applications',               [WorkerApplicationController::class, 'index']);
            Route::delete('/applications/{id}',       [WorkerApplicationController::class, 'destroy']);
            Route::get('/attendance',                 [WorkerAttendanceController::class, 'index']);
            Route::get('/hires',                      [WorkerHireController::class, 'index']);
            Route::get('/contracts/{id}',             [WorkerContractController::class, 'show']);
            Route::post('/contracts/{id}/sign',       [WorkerContractController::class, 'sign']);
        });

        // Shared job apply (any authenticated user)
        Route::post('/jobs/{jobId}/apply', [WorkerApplicationController::class, 'store']);

        // Manager registration (any authenticated user can apply)
        Route::post('/manager/register',           [ManagerRegistrationController::class, 'store']);
        Route::get('/manager/registration/status', [ManagerRegistrationController::class, 'status']);

        // Manager features (role:manager)
        Route::middleware('role:manager')->prefix('manager')->group(function () {
            Route::get('/sites',                              [ManagerSiteController::class, 'index']);
            Route::post('/sites',                             [ManagerSiteController::class, 'store']);
            Route::get('/sites/{siteId}',                     [ManagerSiteController::class, 'show']);
            Route::put('/sites/{siteId}',                     [ManagerSiteController::class, 'update']);
            Route::patch('/sites/{siteId}/status',            [ManagerSiteController::class, 'updateStatus']);
            Route::post('/sites/{siteId}/images',             [ManagerSiteController::class, 'uploadImage']);
            Route::get('/sites/{siteId}/jobs',                [ManagerJobController::class, 'index']);
            Route::post('/sites/{siteId}/jobs',               [ManagerJobController::class, 'store']);
            Route::get('/jobs/{jobId}',                       [ManagerJobController::class, 'show']);
            Route::put('/jobs/{jobId}',                       [ManagerJobController::class, 'update']);
            Route::patch('/jobs/{jobId}/status',              [ManagerJobController::class, 'updateStatus']);
            Route::delete('/sites/{siteId}',                    [ManagerSiteController::class, 'destroy']);
            Route::get('/jobs/{jobId}/shifts',                [ManagerShiftController::class, 'index']);
            Route::post('/jobs/{jobId}/shifts',               [ManagerShiftController::class, 'store']);
            Route::post('/jobs/{jobId}/images',               [ManagerJobController::class, 'uploadImage']);
            Route::delete('/jobs/{jobId}',                    [ManagerJobController::class, 'destroy']);
            Route::patch('/shifts/{shiftId}/cancel',          [ManagerShiftController::class, 'cancel']);
            Route::get('/jobs/{jobId}/applications',                   [ManagerApplicationController::class, 'index']);
            Route::post('/jobs/{jobId}/applications/bulk-accept',      [ManagerApplicationController::class, 'bulkAccept']);
            Route::patch('/applications/{id}/accept',                  [ManagerApplicationController::class, 'accept']);
            Route::patch('/applications/{id}/reject',                  [ManagerApplicationController::class, 'reject']);
            Route::get('/hires',                                       [ManagerHireController::class, 'index']);
            Route::patch('/hires/{id}/cancel',                         [ManagerApplicationController::class, 'cancelHire']);
            Route::get('/jobs/{jobId}/attendance',                              [ManagerAttendanceController::class, 'index']);
            Route::put('/jobs/{jobId}/attendance',                              [ManagerAttendanceController::class, 'upsert']);
            Route::get('/jobs/{jobId}/attendance/{attendanceId}/audit',         [ManagerAttendanceController::class, 'auditHistory']);
            Route::post('/applications/{applicationId}/contract',  [ManagerContractController::class, 'generate']);
            Route::get('/contracts/{id}',                          [ManagerContractController::class, 'show']);
            Route::post('/contracts/{id}/sign',                    [ManagerContractController::class, 'sign']);
        });

        // Notifications and devices (all authenticated)
        Route::prefix('notifications')->group(function () {
            Route::get('/',              [NotificationController::class, 'index']);
            Route::patch('/{id}/read',   [NotificationController::class, 'markRead']);
            Route::post('/read-all',     [NotificationController::class, 'markAllRead']);
        });
        Route::put('/devices/fcm-token',    [DeviceController::class, 'upsert']);
        Route::delete('/devices/fcm-token', [DeviceController::class, 'destroy']);

        // Admin (role:admin)
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            Route::get('/manager-approvals',                [AdminApprovalController::class, 'index']);
            Route::get('/manager-approvals/{id}',           [AdminApprovalController::class, 'show']);
            Route::patch('/manager-approvals/{id}/approve', [AdminApprovalController::class, 'approve']);
            Route::patch('/manager-approvals/{id}/reject',  [AdminApprovalController::class, 'reject']);
            Route::get('/users',                            [AdminUserController::class, 'index']);
            Route::get('/users/{id}',                       [AdminUserController::class, 'show']);
            Route::delete('/users/{id}',                    [AdminUserController::class, 'destroy']);
            Route::patch('/sites/{id}/deactivate',          [AdminSiteController::class, 'deactivate']);
            Route::patch('/jobs/{id}/close',                [AdminJobController::class, 'close']);
            Route::patch('/attendance/{id}',                [AdminAttendanceController::class, 'update']);
            Route::get('/translations',                     [AdminTranslationController::class, 'index']);
            Route::put('/translations',                     [AdminTranslationController::class, 'batchUpdate']);
        });
    });
});
