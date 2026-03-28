# RBAC Model — GADA VN

**Version**: 0.1
**Last updated**: 2026-03-21
**Implementation**: Laravel Gates + Policies (`apps/admin-laravel/app/Policies/`)

---

## 1. Role Definitions

| Role | Source of grant | DB location | Condition to activate |
|---|---|---|---|
| `worker` | System — auto on signup | `auth.user_roles` | Always active for all users |
| `manager` | Admin approval | `auth.user_roles` | Requires `manager_profiles.approval_status = 'approved'` |
| `admin` | Manual — super-admin sets | `auth.user_roles` | Set directly on `auth.user_roles` |
| `super_admin` | Env config | `.env` (`SUPER_ADMIN_EMAILS`) | Not stored in DB; checked by email match |

**One Firebase account can hold `worker` + `manager` simultaneously.**
Roles are additive — a manager retains all worker capabilities.

### Role Hierarchy (additive)
```
super_admin
    └── admin
            └── manager
                    └── worker
```

---

## 2. How Roles Are Checked in Laravel

### 2.1 Middleware Stack

```
Request
    │
    ▼
FirebaseAuthMiddleware          ← verifies Firebase ID token, loads auth.users
    │
    ▼
RoleMiddleware('manager')       ← checks auth.user_roles for active role
    │                              (or AdminMiddleware for admin routes)
    ▼
Controller → Policy::method()   ← checks resource ownership
```

### 2.2 Role Resolution (PHP)

```php
// app/Models/User.php
public function hasRole(string $role): bool
{
    return $this->roles()
        ->where('role', $role)
        ->where('status', 'active')
        ->whereNull('revoked_at')
        ->exists();
}

public function isWorker(): bool   { return $this->hasRole('worker'); }
public function isManager(): bool  { return $this->hasRole('manager'); }
public function isAdmin(): bool    { return $this->hasRole('admin') || $this->isSuperAdmin(); }
public function isSuperAdmin(): bool {
    return in_array($this->email, explode(',', config('app.super_admin_emails')));
}
```

### 2.3 Route Middleware Registration

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'firebase.auth' => FirebaseAuthMiddleware::class,
        'role'          => RoleMiddleware::class,
    ]);
})
```

```php
// routes/api.php
Route::middleware(['firebase.auth'])->group(function () {
    // All authenticated users
    Route::get('/worker/profile', [WorkerProfileController::class, 'show']);

    Route::middleware(['role:manager'])->group(function () {
        Route::post('/manager/sites', [SiteController::class, 'store']);
    });

    Route::middleware(['role:admin'])->group(function () {
        Route::get('/admin/manager-approvals', [AdminApprovalController::class, 'index']);
    });
});
```

---

## 3. Permission Matrix

Legend: **✓** allowed · **✗** denied · **∅** no auth required · **own** owner only · **→** condition noted

### 3.1 Authentication

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Login (phone OTP / password / Facebook) | ✓ | ✓ | ✓ | |
| Refresh session | ✓ | ✓ | ✓ | Firebase handles |
| Logout (all devices) | ✓ | ✓ | ✓ | |
| Delete own account | ✓ | ✓ | ✗ | Admin accounts deleted manually |

### 3.2 Worker Profile

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Read own profile | ✓ | ✓ | ✓ | |
| Update own profile | ✓ | ✓ | ✗ | |
| Upload own ID document | ✓ | ✓ | ✗ | |
| Upload own signature | ✓ | ✓ | ✗ | |
| Add / edit own experience | ✓ | ✓ | ✗ | |
| Read another worker's profile | ✗ | own→applicants | ✓ | Manager: applicants to own jobs only |
| Verify ID document | ✗ | ✗ | ✓ | Post-MVP; auto-verify phase 2 |

### 3.3 Manager Profile

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Submit business registration | ✓ | ✓ | ✗ | Any user can apply to become manager |
| View own registration status | ✓ | ✓ | ✗ | |
| Edit registration (if rejected) | ✓ | ✓ | ✗ | Re-submit creates new row |
| View any registration | ✗ | ✗ | ✓ | |

### 3.4 Public Job Discovery

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Browse job list (public) | ∅ | ∅ | ∅ | SSG/SSR — no auth |
| View job detail (public) | ∅ | ∅ | ∅ | |
| View site detail (public) | ∅ | ∅ | ∅ | |

### 3.5 Sites

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Create site | ✗ | ✓ | ✗ | |
| View own sites | ✗ | ✓ | ✓ | |
| Update own site | ✗ | own | ✗ | `SitePolicy::update` checks `manager_user_id` |
| Close own site | ✗ | own | ✓ | |
| Archive own site | ✗ | own | ✓ | |
| View any site (admin) | ✗ | ✗ | ✓ | |
| Deactivate any site | ✗ | ✗ | ✓ | |
| Delete site (soft) | ✗ | ✗ | ✓ | Managers cannot delete |

### 3.6 Jobs

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Create job (under own site) | ✗ | own-site | ✗ | |
| Update job | ✗ | own | ✗ | Only if `status = 'open'` |
| Close job | ✗ | own | ✓ | |
| View job list of own site | ✗ | own | ✓ | |
| View any job (admin) | ✗ | ✗ | ✓ | |

### 3.7 Job Shifts

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Create / edit shifts | ✗ | own-job | ✗ | |
| Cancel a shift | ✗ | own-job | ✓ | |
| View shifts | ✓→hired | own-job | ✓ | Worker: only for jobs they are hired for |

### 3.8 Job Applications

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Apply to job | ✓ | ✓ | ✗ | One application per worker per job |
| Withdraw own application | ✓ | ✓ | ✗ | Only if `status = 'pending'` |
| View own applications | ✓ | ✓ | ✗ | |
| View applicants to own job | ✗ | own-job | ✓ | |
| Accept application | ✗ | own-job | ✗ | Triggers hire creation |
| Reject application | ✗ | own-job | ✗ | |

### 3.9 Hires

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| View own hire records | ✓ | ✓ | ✓ | |
| Cancel hire | ✗ | own-job | ✓ | |
| Mark hire complete | ✗ | own-job | ✓ | |
| View any hire (admin) | ✗ | ✗ | ✓ | |

### 3.10 Attendance

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Record attendance (today) | ✗ | own-job | ✗ | |
| Edit attendance (same day) | ✗ | own-job | ✗ | |
| Edit attendance (past day) | ✗ | ✗ | ✓ | Admin correction only |
| View own attendance history | ✓ | ✓ | ✓ | |
| View attendance for own job | ✗ | own-job | ✓ | |
| View any attendance (admin) | ✗ | ✗ | ✓ | |

### 3.11 Contracts

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Generate contract | ✗ | own-job | ✗ | Auto-triggered on hire |
| View own contract | ✓ | ✓ | ✓ | |
| Sign contract (worker) | own | own→as-worker | ✗ | Requires signature on file |
| View contract for own job | ✗ | own-job | ✓ | |
| Void contract | ✗ | ✗ | ✓ | |
| View any contract (admin) | ✗ | ✗ | ✓ | |

### 3.12 Notifications

| Action | Worker | Manager | Admin | Notes |
|---|---|---|---|---|
| Read own notifications | ✓ | ✓ | ✗ | |
| Mark notification read | ✓ | ✓ | ✗ | |
| Send notification (system) | ✗ | ✗ | ✗ | Internal only — no user action |

### 3.13 Admin Operations

| Action | Worker | Manager | Admin | Super Admin |
|---|---|---|---|---|
| List all users | ✗ | ✗ | ✓ | ✓ |
| Soft-delete user | ✗ | ✗ | ✓ | ✓ |
| View pending manager approvals | ✗ | ✗ | ✓ | ✓ |
| Approve / reject manager | ✗ | ✗ | ✓ | ✓ |
| Revoke manager status | ✗ | ✗ | ✓ | ✓ |
| Edit i18n translations | ✗ | ✗ | ✓ | ✓ |
| View audit logs | ✗ | ✗ | ✓ | ✓ |
| Manage admin accounts | ✗ | ✗ | ✗ | ✓ |

---

## 4. Ownership Policy Implementation (Laravel)

Each resource policy checks ownership before checking role.

```php
// app/Policies/SitePolicy.php
class SitePolicy
{
    public function update(User $user, Site $site): bool
    {
        return $user->isManager()
            && $site->manager_user_id === $user->id;
    }

    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }
}

// app/Policies/JobPolicy.php
class JobPolicy
{
    public function update(User $user, Job $job): bool
    {
        return $user->isManager()
            && $job->site->manager_user_id === $user->id
            && $job->status === 'open';
    }
}

// app/Policies/AttendancePolicy.php
class AttendancePolicy
{
    public function create(User $user, Hire $hire): bool
    {
        if ($user->isAdmin()) return true;

        return $user->isManager()
            && $hire->manager_user_id === $user->id
            && $hire->job->attendance_date_is_today_or_future();
    }

    public function updatePast(User $user): bool
    {
        return $user->isAdmin();
    }
}
```

---

## 5. Manager Approval State Machine

```
                   [User: submit registration]
                            │
                            ▼
                    ┌──── PENDING ────┐
                    │                 │
         [Admin: approve]     [Admin: reject]
                    │                 │
                    ▼                 ▼
                APPROVED           REJECTED
                    │                 │
         [Admin: revoke]    [User: re-submit → new row]
                    │                 │
                    ▼                 ▼
                 REVOKED           PENDING (new manager_profiles row)
```

**DB side effects per transition:**

| Transition | DB writes |
|---|---|
| User submits | INSERT `app.manager_profiles` (`status=pending`) + INSERT `ops.admin_approvals` |
| Admin approves | UPDATE `app.manager_profiles` (`status=approved`) + INSERT `auth.user_roles` (`role=manager`) + INSERT `ops.notifications` + INSERT `ops.audit_logs` |
| Admin rejects | UPDATE `app.manager_profiles` (`status=rejected`) + UPDATE `ops.admin_approvals` + INSERT `ops.notifications` + INSERT `ops.audit_logs` |
| Admin revokes | UPDATE `app.manager_profiles` (`status=revoked`) + UPDATE `auth.user_roles` (`revoked_at=NOW()`) + INSERT `ops.notifications` + INSERT `ops.audit_logs` |
| User re-submits | UPDATE old profile (`is_current=false`) + INSERT new `app.manager_profiles` + INSERT `ops.admin_approvals` |

---

## 6. Row-Level Security (PostgreSQL RLS)

RLS is applied to tables where tenant isolation is critical. Laravel still enforces ownership via Policies, but RLS is a defense-in-depth layer.

```sql
-- Enable RLS on core tables
ALTER TABLE app.sites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.hires            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.employment_contracts ENABLE ROW LEVEL SECURITY;

-- Helper: current authenticated user ID (set by Laravel at connection time)
CREATE OR REPLACE FUNCTION auth.current_user_id() RETURNS UUID AS $$
    SELECT current_setting('app.current_user_id', true)::UUID;
$$ LANGUAGE SQL STABLE;

-- Sites: manager sees own; worker has no direct RLS (reads via join)
CREATE POLICY sites_manager_policy ON app.sites
    USING (manager_user_id = auth.current_user_id());

-- Jobs: any authenticated user can SELECT (public browse);
--       INSERT/UPDATE/DELETE restricted to site owner
CREATE POLICY jobs_select_policy ON app.jobs FOR SELECT USING (TRUE);
CREATE POLICY jobs_write_policy  ON app.jobs FOR ALL
    USING (site_id IN (
        SELECT id FROM app.sites WHERE manager_user_id = auth.current_user_id()
    ));

-- Applications: worker sees own; manager sees for own jobs
CREATE POLICY applications_worker_policy ON app.job_applications
    USING (worker_user_id = auth.current_user_id());

CREATE POLICY applications_manager_policy ON app.job_applications
    USING (job_id IN (
        SELECT j.id FROM app.jobs j
        JOIN app.sites s ON s.id = j.site_id
        WHERE s.manager_user_id = auth.current_user_id()
    ));
```

**Admin bypass**: Admin connections use a dedicated DB role with `BYPASSRLS`.

---

## 7. API Authentication Flow

```
Client                    Laravel                         PostgreSQL
  │                          │                                 │
  │  Bearer: <Firebase JWT>  │                                 │
  ├─────────────────────────▶│                                 │
  │                          │  verify(jwt) via Firebase Admin │
  │                          │  extract firebase_uid           │
  │                          │                                 │
  │                          │  SELECT * FROM auth.users       │
  │                          │  WHERE firebase_uid = ?         │
  │                          ├────────────────────────────────▶│
  │                          │◀────────────────────────────────┤
  │                          │                                 │
  │                          │  SET app.current_user_id = ?    │  ← enables RLS
  │                          ├────────────────────────────────▶│
  │                          │                                 │
  │                          │  load user_roles                │
  │                          │  attach to $request->user()     │
  │                          │                                 │
  │                          │  Policy::authorize()            │
  │                          │  (ownership check)              │
  │                          │                                 │
  │◀─────────────────────────┤                                 │
  │  Response                │                                 │
```

**First-login upsert**: If `firebase_uid` not found → INSERT `auth.users` + INSERT `auth.user_roles` (worker).

---

## 8. Security Constraints Summary

| Rule | Enforcement layer |
|---|---|
| Firebase token required on all private routes | `FirebaseAuthMiddleware` |
| Role check before any manager/admin action | `RoleMiddleware` + Laravel Gate |
| Resource ownership checked before mutation | Laravel Policy |
| Manager features locked until approved | `hasRole('manager')` checks `user_roles.status = 'active'` |
| Past attendance editable only by admin | `AttendancePolicy::updatePast()` |
| Contracts voided only by admin | `ContractPolicy::void()` |
| Admin accounts not self-deletable | Explicit check in `UserPolicy::delete()` |
| All mutations logged | `AuditLogObserver` on Eloquent models |
| Encrypted fields: ID numbers, bank accounts | AES-256-GCM at application layer before DB write |
| S3 assets accessed via presigned URLs | Laravel controller generates URLs; never stored |
