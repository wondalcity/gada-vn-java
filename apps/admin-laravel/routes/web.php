<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ManagerApprovalController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\SiteController;
use App\Http\Controllers\Admin\JobController;
use App\Http\Controllers\Admin\TranslationController;
use App\Http\Controllers\Admin\AuditLogController;
use Illuminate\Support\Facades\Route;

// Admin panel — session auth, always Korean UI
Route::prefix('admin')->middleware(['web'])->group(function () {
    // Login (unauthenticated)
    Route::get('/login',   [App\Http\Controllers\Admin\AuthController::class, 'showLogin'])->name('admin.login');
    Route::post('/login',  [App\Http\Controllers\Admin\AuthController::class, 'login'])->name('admin.login.store');
    Route::post('/logout', [App\Http\Controllers\Admin\AuthController::class, 'logout'])->name('admin.logout');

    // Protected
    Route::middleware('admin.session')->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('admin.dashboard');

        Route::prefix('approvals')->name('admin.approvals.')->group(function () {
            Route::get('/',              [ManagerApprovalController::class, 'index'])->name('index');
            Route::get('/{id}',          [ManagerApprovalController::class, 'show'])->name('show');
            Route::post('/{id}/approve', [ManagerApprovalController::class, 'approve'])->name('approve');
            Route::post('/{id}/reject',  [ManagerApprovalController::class, 'reject'])->name('reject');
        });

        Route::prefix('users')->name('admin.users.')->group(function () {
            Route::get('/',                  [UserController::class, 'index'])->name('index');
            Route::get('/{id}',              [UserController::class, 'show'])->name('show');
            Route::post('/{id}/suspend',     [UserController::class, 'suspend'])->name('suspend');
            Route::post('/{id}/activate',    [UserController::class, 'activate'])->name('activate');
            Route::delete('/{id}',           [UserController::class, 'destroy'])->name('destroy');
        });

        Route::prefix('sites')->name('admin.sites.')->group(function () {
            Route::get('/',                   [SiteController::class, 'index'])->name('index');
            Route::get('/{id}',               [SiteController::class, 'show'])->name('show');
            Route::post('/{id}/deactivate',   [SiteController::class, 'deactivate'])->name('deactivate');
        });

        Route::prefix('jobs')->name('admin.jobs.')->group(function () {
            Route::get('/',              [JobController::class, 'index'])->name('index');
            Route::get('/{id}',          [JobController::class, 'show'])->name('show');
            Route::post('/{id}/close',   [JobController::class, 'close'])->name('close');
        });

        Route::resource('translations', TranslationController::class)->only(['index', 'update']);
        Route::get('audit-logs', [AuditLogController::class, 'index'])->name('admin.audit-logs.index');
    });
});
