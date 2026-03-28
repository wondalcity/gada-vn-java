# GADA VN — Laravel Architecture

## 1. Overview

A single Laravel 11 application at `apps/admin-laravel/` serves two distinct surfaces from one codebase:

- **REST API** — `/api/v1/*` consumed by the Expo mobile app and Next.js web frontend
- **Admin panel** — `/admin/*` server-rendered Blade + Alpine.js portal for the ops team

The dual-purpose design is intentional. Both surfaces share Eloquent models, service classes, and Gate policies — eliminating the duplication that would arise from a separate API microservice. There is no code boundary between them; a `Site` model, a `SitePolicy`, or an `ApplicationService` is used identically by an API controller and an admin Blade controller.

**Runtime:** PHP 8.2+, Laravel 11, Pest for testing.

---

## 2. Directory Structure

```
apps/admin-laravel/
├── app/
│   ├── Console/
│   │   └── Commands/              # Artisan commands (seed translations, clean expired tokens)
│   ├── Exceptions/
│   │   └── Handler.php            # JSON error envelope for API; HTML error pages for admin
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/               # REST API controllers — thin, delegate to services
│   │   │   │   ├── Auth/          # OtpController, LoginController, RegisterController,
│   │   │   │   │                  # LogoutController, FacebookAuthController
│   │   │   │   ├── Public/        # PublicJobController, PublicSiteController,
│   │   │   │   │                  # PublicProvinceController, PublicTradeController
│   │   │   │   ├── Account/       # MeController
│   │   │   │   ├── Worker/        # WorkerProfileController, WorkerIdDocumentController,
│   │   │   │   │                  # WorkerSignatureController, WorkerExperienceController,
│   │   │   │   │                  # WorkerApplicationController, WorkerHireController,
│   │   │   │   │                  # WorkerContractController
│   │   │   │   ├── Manager/       # ManagerRegistrationController, ManagerSiteController,
│   │   │   │   │                  # ManagerJobController, ManagerShiftController,
│   │   │   │   │                  # ManagerApplicationController, ManagerHireController,
│   │   │   │   │                  # ManagerAttendanceController, ManagerContractController
│   │   │   │   ├── Notifications/ # NotificationController
│   │   │   │   ├── Devices/       # DeviceController
│   │   │   │   └── Admin/         # AdminUserController, AdminApprovalController,
│   │   │   │                      # AdminSiteController, AdminJobController,
│   │   │   │                      # AdminAttendanceController, AdminTranslationController
│   │   │   └── Admin/             # Web admin panel controllers (Blade)
│   │   │       ├── AuthController.php
│   │   │       ├── DashboardController.php
│   │   │       ├── ManagerApprovalController.php
│   │   │       ├── UserController.php
│   │   │       ├── SiteController.php
│   │   │       ├── JobController.php
│   │   │       ├── AttendanceController.php
│   │   │       ├── TranslationController.php
│   │   │       └── AuditLogController.php
│   │   ├── Middleware/
│   │   │   ├── FirebaseAuthMiddleware.php   # Verifies Firebase ID token, loads user
│   │   │   ├── RoleMiddleware.php           # Checks auth.user_roles
│   │   │   ├── AdminSessionMiddleware.php   # Session-based auth for admin panel
│   │   │   └── SetLocaleMiddleware.php      # Accept-Language + ?locale= + user preference
│   │   ├── Requests/                        # FormRequest classes for validation
│   │   │   ├── Auth/
│   │   │   ├── Worker/
│   │   │   ├── Manager/
│   │   │   └── Admin/
│   │   └── Resources/                       # API response transformers
│   │       ├── JobResource.php
│   │       ├── ApplicationResource.php
│   │       └── ...
│   ├── Models/                              # Eloquent models (schema-prefixed tables)
│   │   ├── User.php                         # auth.users — hasRole(), isManager(), isAdmin()
│   │   ├── UserRole.php                     # auth.user_roles
│   │   ├── ManagerProfile.php               # app.manager_profiles
│   │   ├── Site.php                         # app.sites
│   │   ├── Job.php                          # app.jobs
│   │   ├── JobShift.php                     # app.job_shifts
│   │   ├── JobApplication.php               # app.job_applications
│   │   ├── Hire.php                         # app.hires
│   │   ├── AttendanceRecord.php             # app.attendance_records
│   │   ├── EmploymentContract.php           # app.employment_contracts
│   │   ├── WorkerProfile.php                # app.worker_profiles
│   │   ├── IdDocument.php                   # app.id_documents
│   │   ├── WorkExperience.php               # app.work_experiences
│   │   ├── Notification.php                 # ops.notifications
│   │   ├── FcmToken.php                     # ops.fcm_tokens
│   │   ├── AdminApproval.php                # ops.admin_approvals
│   │   ├── Province.php                     # ref.provinces
│   │   └── Trade.php                        # ref.construction_trades
│   ├── Services/                            # Business logic layer
│   │   ├── Auth/
│   │   │   ├── OtpService.php               # Firebase Admin SMS OTP
│   │   │   ├── FirebaseTokenService.php     # Token verification + custom token
│   │   │   └── UserSessionService.php       # Login/logout/register logic
│   │   ├── Worker/
│   │   │   ├── WorkerProfileService.php
│   │   │   ├── IdDocumentService.php        # S3 upload + presigned URL generation
│   │   │   └── SignatureService.php         # S3 upload, archive previous
│   │   ├── Manager/
│   │   │   ├── ManagerRegistrationService.php  # Submission + re-submission logic
│   │   │   ├── SiteService.php
│   │   │   ├── JobService.php
│   │   │   └── AttendanceService.php           # Bulk upsert + wage calculation
│   │   ├── Application/
│   │   │   └── ApplicationService.php          # Apply, accept (→ hire), reject, withdraw
│   │   ├── Contract/
│   │   │   └── ContractService.php             # PDF generation trigger, sign, void
│   │   ├── Notification/
│   │   │   ├── NotificationService.php         # Create ops.notifications
│   │   │   └── FcmService.php                  # Firebase Cloud Messaging push
│   │   ├── Storage/
│   │   │   └── S3Service.php                   # Upload, presigned URL (15min TTL)
│   │   ├── Translation/
│   │   │   └── TranslationService.php          # Read/write ops.translations
│   │   └── Admin/
│   │       ├── AdminApprovalService.php        # Approve/reject manager, grant role
│   │       └── AuditLogService.php
│   ├── Repositories/                       # Data access layer (raw SQL via DB facade)
│   │   ├── UserRepository.php
│   │   ├── SiteRepository.php
│   │   ├── JobRepository.php
│   │   ├── ApplicationRepository.php
│   │   ├── HireRepository.php
│   │   ├── AttendanceRepository.php
│   │   ├── ContractRepository.php
│   │   └── NotificationRepository.php
│   ├── Policies/                           # Laravel Gate policies
│   │   ├── SitePolicy.php
│   │   ├── JobPolicy.php
│   │   ├── ApplicationPolicy.php
│   │   ├── HirePolicy.php
│   │   ├── AttendancePolicy.php
│   │   ├── ContractPolicy.php
│   │   └── NotificationPolicy.php
│   ├── Jobs/                               # Laravel queued jobs
│   │   ├── GenerateContractJob.php         # PDF generation after hire accepted
│   │   ├── SendFcmNotificationJob.php      # FCM push delivery
│   │   └── SendOtpJob.php                  # Firebase Admin SMS (if async)
│   ├── Observers/                          # Eloquent observers → audit log
│   │   └── AuditLogObserver.php            # Fires on created/updated/deleted
│   └── Providers/
│       ├── AppServiceProvider.php
│       └── AuthServiceProvider.php         # Policy registration
├── bootstrap/
│   └── app.php                             # Middleware aliases, exception handler
├── config/
│   ├── firebase.php                        # Firebase project config
│   ├── gada.php                            # App-specific: super_admin_emails, locale settings
│   └── ...
├── database/
│   └── migrations/                         # Schema migrations (match database-schema.md DDL)
├── resources/
│   ├── views/
│   │   ├── admin/
│   │   │   ├── layouts/
│   │   │   │   ├── app.blade.php           # Admin shell: sidebar + topbar + content slot
│   │   │   │   └── auth.blade.php          # Login page layout
│   │   │   ├── dashboard/
│   │   │   │   └── index.blade.php
│   │   │   ├── approvals/
│   │   │   │   ├── index.blade.php         # Queue table
│   │   │   │   └── show.blade.php          # Detail + approve/reject
│   │   │   ├── users/
│   │   │   │   ├── index.blade.php
│   │   │   │   └── show.blade.php
│   │   │   ├── sites/
│   │   │   │   ├── index.blade.php
│   │   │   │   └── show.blade.php
│   │   │   ├── jobs/
│   │   │   │   ├── index.blade.php
│   │   │   │   └── show.blade.php
│   │   │   ├── translations/
│   │   │   │   └── index.blade.php
│   │   │   └── audit-logs/
│   │   │       └── index.blade.php
│   │   └── components/                     # Blade components
│   │       └── admin/
│   │           ├── stat-card.blade.php
│   │           ├── data-table.blade.php
│   │           ├── badge.blade.php
│   │           ├── confirm-modal.blade.php
│   │           └── filter-bar.blade.php
│   └── css/
│       └── admin.css                       # Tailwind CSS (admin only)
├── routes/
│   ├── api.php                             # All /api/v1/* routes
│   ├── web.php                             # Admin panel /admin/* routes + admin auth
│   └── channels.php
├── tests/
│   ├── Feature/
│   │   ├── Api/
│   │   └── Admin/
│   └── Unit/
│       ├── Services/
│       └── Policies/
└── composer.json
```

---

## 3. API Route Architecture

All API routes live under the `v1` prefix with the `locale` middleware applied globally. The nesting mirrors the role hierarchy.

```php
Route::prefix('v1')->middleware('locale')->group(function () {

    // Public (no auth required)
    Route::post('/auth/otp/send', ...)        // throttle:otp
    Route::post('/auth/otp/verify', ...)
    Route::post('/auth/register', ...)        // firebase.auth (creates user on first call)
    Route::post('/auth/login', ...)
    Route::post('/auth/social/facebook', ...)

    Route::prefix('public')->group(...)       // jobs, sites, provinces, trades

    // Authenticated (firebase.auth middleware verifies Bearer token)
    Route::middleware('firebase.auth')->group(function () {
        Route::post('/auth/logout', ...)

        // Account — any authenticated user
        Route::get('/me', ...)
        Route::patch('/me/locale', ...)
        Route::delete('/me/account', ...)

        // Worker — any authenticated user (worker role is auto-granted on register)
        Route::prefix('worker')->group(...)

        // Shared apply endpoint
        Route::post('/jobs/{jobId}/apply', ...)

        // Manager registration — any user can submit
        Route::post('/manager/register', ...)
        Route::get('/manager/registration/status', ...)

        // Manager features — requires role:manager
        Route::middleware('role:manager')->prefix('manager')->group(...)

        // Notifications + devices — any authenticated user
        Route::prefix('notifications')->group(...)
        Route::put('/devices/fcm-token', ...)
        Route::delete('/devices/fcm-token', ...)

        // Admin features — requires role:admin
        Route::middleware('role:admin')->prefix('admin')->group(...)
    });
});
```

**Endpoint count by group:**

| Group | Count |
|---|---|
| Auth (public) | 5 |
| Public browse | 5 |
| Account | 3 |
| Worker | 14 |
| Manager | 20 |
| Notifications | 3 |
| Devices | 2 |
| Admin | 13 |
| **Total** | **55** |

---

## 4. Middleware Stack

### `FirebaseAuthMiddleware` (alias: `firebase.auth`)

1. Extracts `Bearer {token}` from `Authorization` header. Returns 401 if absent.
2. Calls `FirebaseTokenService::verifyIdToken()` — delegates to `kreait/laravel-firebase`. Returns 401 on any verification failure.
3. Looks up `auth.users` by `firebase_uid`. If not found, creates the user via `firstOrCreate()` and inserts a `worker` role into `auth.user_roles` (auto-grant).
4. Returns 401 if `user.status = 'deleted'`.
5. Calls `DB::statement("SET app.current_user_id = ?", [$user->id])` — sets a PostgreSQL session variable that RLS policies read via `current_setting('app.current_user_id')`.
6. Calls `$user->loadMissing('roles')` and attaches the user to the request via `$request->setUserResolver()`.

### `RoleMiddleware` (alias: `role`)

Accepts a `$role` parameter from the route definition (e.g., `middleware('role:manager')`).

Checks `$user->hasRole($role)`, which queries the eagerly-loaded `roles` relationship filtered to `status=active AND revoked_at IS NULL`. Returns 403 if the check fails.

### `AdminSessionMiddleware`

Standard Laravel session auth using the `auth:admin` guard. Admin users authenticate via username/password on `/admin/login` — entirely separate from Firebase. Admin sessions are Redis-backed with a 120-minute lifetime.

### `SetLocaleMiddleware` (alias: `locale`)

Resolves locale in priority order:

1. `?locale=` query parameter — accepted on public endpoints (no auth required)
2. Authenticated user's stored `locale` column
3. `Accept-Language` header via `$request->getPreferredLanguage(['ko', 'vi', 'en'])`
4. Default: `ko`

Calls `App::setLocale($locale)`. Subsequent `__()` calls and `TranslationService` lookups use this value.

---

## 5. Repository Pattern

Controllers call Services. Services call Repositories. Repositories issue raw SQL via Laravel's `DB` facade.

**Why raw SQL in repositories:** The PostgreSQL schema is multi-schema (`auth`, `app`, `ref`, `ops`). Complex Eloquent query chains across schema-prefixed tables produce brittle query builder expressions. Raw SQL is explicit, reviewable, and maps 1:1 to the DDL in `database-schema.md`.

**Repository conventions:**

```php
// Table name is always fully schema-qualified
class SiteRepository
{
    private const TABLE = 'app.sites';

    public function findById(int $id): ?object
    {
        return DB::table(self::TABLE)->find($id);
    }

    public function findBySlug(string $slug): ?object
    {
        return DB::table(self::TABLE)->where('slug', $slug)->first();
    }

    public function create(array $data): int
    {
        return DB::table(self::TABLE)->insertGetId($data + [
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function update(int $id, array $data): void
    {
        DB::table(self::TABLE)->where('id', $id)->update($data + ['updated_at' => now()]);
    }

    /**
     * Paginate sites for a given manager.
     */
    public function paginate(int $managerId, string $status, int $page, int $limit): object
    {
        $query = DB::table(self::TABLE . ' as s')
            ->join('ref.provinces as p', 'p.id', '=', 's.province_id')
            ->where('s.manager_user_id', $managerId)
            ->where('s.status', $status)
            ->select('s.*', 'p.name_ko as province_name_ko', 'p.name_vi as province_name_vi');

        $total  = $query->count();
        $items  = $query->forPage($page, $limit)->get();

        return (object) ['items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit];
    }
}
```

**Transaction helper:** `DB::transaction(fn () => ...)` — used in `ApplicationService::accept()` to atomically update the application, insert the hire record, and dispatch the contract job.

---

## 6. Service Layer Responsibilities

Services own all business logic. Controllers only validate input, call one service method, and return the response.

### `ApplicationService`

- `apply(Job $job, User $worker)` — validates job is open, checks worker is not already hired, inserts `app.job_applications`
- `accept(JobApplication $app)` — validates `status=pending`; in a transaction: updates application to `accepted`, inserts `app.hires`, dispatches `GenerateContractJob`, sends `application_status` notification to worker
- `reject(JobApplication $app, string $reason)` — validates `status=pending`, updates to `rejected`, stores reason, sends notification
- `withdraw(JobApplication $app, User $worker)` — validates ownership and `status=pending`, updates to `withdrawn`

### `AttendanceService`

- `bulkUpsert(Job $job, string $date, array $records)` — validates that past-date corrections require admin role (enforced via `AttendancePolicy::correctPast`), upserts each record into `app.attendance_records`, calculates wages based on `job.daily_wage_vnd`, sends per-worker FCM notification

### `ContractService`

- `sign(EmploymentContract $contract, User $worker)` — validates `status=pending`, checks worker has a current signature on file (`app.worker_profiles.signature_s3_key IS NOT NULL`), updates `status=worker_signed`
- `void(EmploymentContract $contract)` — admin only, updates `status=void`

### `AdminApprovalService`

- `approve(int $approvalId, int $adminUserId)` — loads `ops.admin_approvals`, updates `app.manager_profiles.status=approved`, inserts `auth.user_roles` record with `role=manager`, sends FCM notification to the manager, writes audit log
- `reject(int $approvalId, string $reason, int $adminUserId)` — updates approval and profile to `rejected`, stores reason, sends notification

### `S3Service`

- `upload(UploadedFile $file, string $prefix): string` — uploads to S3 bucket, returns bare key (e.g., `id-documents/uuid.jpg`). The key is stored in DB; full URLs are never persisted.
- `presignedUrl(string $key, int $ttlSeconds = 900): string` — generates a presigned GET URL valid for 15 minutes (default). All file access goes through presigned URLs.

### `TranslationService`

- `get(string $key, string $locale): string` — queries `ops.translations`, falls back through `['ko']` chain, returns raw key if all fail
- `batchUpdate(array $translations): void` — upserts multiple key/locale/value triples

---

## 7. Queue Jobs

All jobs implement `ShouldQueue` and are dispatched to the Redis queue (`QUEUE_CONNECTION=redis`).

### `GenerateContractJob`

Dispatched by `ApplicationService::accept()` after a hire record is created.

- **Input:** `int $hireId`
- **Behaviour (MVP stub):** inserts `app.employment_contracts` with `status=pending`. Phase 2 will call a PDF generation service and update to `status=ready`.
- Sends `contract_ready` FCM notification to the worker.
- `$tries = 3`, `$backoff = [60, 300, 900]`

### `SendFcmNotificationJob`

Wraps Firebase Admin SDK `sendToDevice()`.

- On `messaging/registration-token-not-registered` error: removes the stale token from `ops.fcm_tokens`.
- `$tries = 3`, `$backoff = [60, 300, 900]`

### `SendOtpJob`

Optionally dispatched from `OtpService` when SMS delivery should be async. Calls Firebase Admin SDK to trigger SMS via phone auth.

---

## 8. Admin Panel Architecture

The admin panel is a server-rendered Blade application. There is no SPA.

- **Route prefix:** `/admin`
- **Auth guard:** `auth:admin` — Laravel's built-in session authentication, separate from Firebase. Admin users exist in a dedicated table (`auth.admin_users` or reuse `auth.users` with `isAdmin()` check).
- **Middleware group:** `['web', 'auth:admin']` (all protected routes)
- **Blade + Alpine.js:** page interactions (confirm modals, tab switches, inline editing) handled with Alpine.js `x-data` / `x-show` / `@click`. No Vue, React, or Livewire.
- **Tailwind CSS:** compiled into `resources/css/admin.css` (separate from any frontend build)
- **Pagination:** Laravel's `LengthAwarePaginator` — rendered with `$items->links()`
- **Flash messages:** `session()->flash('success', '...')` on redirect; Blade reads `session('success')` and displays a dismissible toast
- **Destructive actions:** always routed through an Alpine.js confirm modal — never `window.confirm()`
- **Filters:** `<form method="GET">` submits preserve state in URL query params; filter bar auto-submits on `@change`

---

## 9. Multilingual Configuration

### Config

`config/gada.php` defines:

```php
'locales'        => ['ko', 'vi', 'en'],
'default_locale' => 'ko',
'fallback_chain' => ['ko'],
```

### Runtime locale

`SetLocaleMiddleware` calls `App::setLocale($locale)` on every request. All subsequent `__()` calls and service-layer translation lookups use the resolved locale.

### DB translations

Text displayed to end users (job titles, site names, trade names, notification bodies) is stored with per-locale columns (`name_ko`, `name_vi`, `name_en`) or in `ops.translations` (key/locale/value rows for dynamic content).

`TranslationService::get(string $key, string $locale): string`:
1. Query `ops.translations` for `key + locale`
2. If not found, try `ko`
3. If still not found, return raw key

### Notification locale

Notification body is always generated in the **recipient's** stored locale, not the sender's current locale. `NotificationService::send()` loads the recipient user's locale before rendering the message body.

### Admin panel locale

The admin panel UI is always in Korean. `SetLocaleMiddleware` is not applied to `/admin/*` routes; the admin guard uses a hardcoded `ko` locale.

---

## 10. Audit Logging

`AuditLogObserver` is registered in `AppServiceProvider` on the following models:

- `Site`, `Job`, `JobApplication`, `Hire`, `EmploymentContract`, `ManagerProfile`, `UserRole`

**Events handled:** `created`, `updated`, `deleted`

**Write target:** `ops.audit_logs` table, inserted synchronously via `DB::table('ops.audit_logs')->insert(...)` (not queued — must be within the same transaction as the triggering operation).

**Columns written:**

| Column | Source |
|---|---|
| `user_id` | `Request::user()?->id` |
| `action` | `'created'`, `'updated'`, or `'deleted'` |
| `entity_type` | `class_basename($model)` |
| `entity_id` | `$model->getKey()` |
| `old_values` | `$model->getOriginal()` JSON (null on created) |
| `new_values` | `$model->getChanges()` JSON (null on deleted) |
| `ip_address` | `Request::ip()` |

---

## 11. Error Handling

All exception rendering is configured in `bootstrap/app.php` via `->withExceptions()`.

**API requests** (`$request->expectsJson()` is true):

| Exception | HTTP status | Response body |
|---|---|---|
| `AuthorizationException` | 403 | `{ statusCode: 403, message: "Forbidden." }` |
| `ModelNotFoundException` | 404 | `{ statusCode: 404, message: "Not found." }` |
| `ValidationException` | 422 | `{ statusCode: 422, message: "Validation failed.", errors: { field: [...] } }` |
| `ThrottleRequestsException` | 429 | `{ statusCode: 429, message: "Too Many Requests." }` |
| Any other `\Throwable` | 500 | `{ statusCode: 500, message: "Server error." }` |

**Admin panel requests:** standard Laravel HTML error pages (not JSON).

---

## 12. Testing Strategy

- **Test framework:** Pest 2.x with `pestphp/pest-plugin-laravel`
- **Database:** `RefreshDatabase` trait with PostgreSQL (not SQLite — schema-prefixed tables `auth.*`, `app.*`, `ref.*`, `ops.*` require real PostgreSQL)
- **Firebase mocking:** `FirebaseTokenService` is mocked in feature tests via `$this->mock(FirebaseTokenService::class, fn ($mock) => $mock->shouldReceive('verifyIdToken')->andReturn('fake-uid'))`
- **Feature tests** (`tests/Feature/Api/` and `tests/Feature/Admin/`): hit real routes, assert HTTP status and JSON/HTML response shape
- **Unit tests** (`tests/Unit/Services/` and `tests/Unit/Policies/`): instantiate service/policy classes directly, mock all dependencies

**Test factories:**

- `UserFactory`, `SiteFactory`, `JobFactory`, `JobApplicationFactory`, `HireFactory`, `ManagerProfileFactory`
- Each factory sets schema-qualified `$table` to match the model

---

## 13. Key `composer.json` Dependencies

```json
{
  "require": {
    "php": "^8.2",
    "laravel/framework": "^11.0",
    "laravel/tinker": "^2.9",
    "kreait/laravel-firebase": "^5.0",
    "aws/aws-sdk-php": "^3.300",
    "league/flysystem-aws-s3-v3": "^3.0"
  },
  "require-dev": {
    "fakerphp/faker": "^1.23",
    "laravel/pint": "^1.13",
    "laravel/sail": "^1.26",
    "mockery/mockery": "^1.6",
    "nunomaduro/collision": "^8.0",
    "pestphp/pest": "^2.34",
    "pestphp/pest-plugin-laravel": "^2.4"
  }
}
```

**Notable absences:**

- No `laravel/passport` or `laravel/sanctum` — Firebase handles all API authentication
- No `spatie/laravel-permission` — role checks are done via raw `auth.user_roles` queries to keep the schema explicit and auditable
- No `barryvdh/laravel-dompdf` at scaffold time — PDF generation is a Phase 2 concern; `GenerateContractJob` is stubbed
