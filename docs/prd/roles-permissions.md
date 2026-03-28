# Roles & Permissions — GADA VN

**Version**: 0.1
**Status**: Draft
**Last updated**: 2026-03-20

---

## 1. Role Model

One Firebase account can hold multiple roles simultaneously. Roles are **not mutually exclusive**.

| Role | How acquired | Stored in |
|---|---|---|
| `worker` | Automatically granted on signup | `auth.users.role_flags` (bitmask) or separate boolean columns |
| `manager` | Requires business registration + admin approval | `app.manager_profiles.manager_status = 'approved'` |
| `platform_admin` | Manually set by super-admin | `auth.users.is_admin = true` |

**Implementation note**: Role flags stored as boolean columns, not a bitmask, for query simplicity:

```sql
-- auth.users
is_worker       BOOLEAN NOT NULL DEFAULT true,   -- all users are workers by default
is_manager      BOOLEAN NOT NULL DEFAULT false,  -- set true when manager_status → approved
is_admin        BOOLEAN NOT NULL DEFAULT false,  -- set manually by super-admin
```

---

## 2. Manager Approval State Machine

```
[Signup]
    │
    ▼
[Submit business registration]
    │
    ▼
manager_status = 'pending'
    │
    ├──[Admin: Approve]──▶ manager_status = 'approved'  →  is_manager = true
    │                        (Manager UI unlocked)
    │
    └──[Admin: Reject]───▶ manager_status = 'rejected'
                             (User notified; can resubmit)
```

- A user with `manager_status = 'approved'` can still use all worker features.
- A rejected user can re-submit a new business registration (creates new row; previous row archived).
- Revoking manager access: set `is_manager = false` + `manager_status = 'revoked'`.

---

## 3. Permission Table

Each row = one action. Columns = role required.

| Action | Worker | Manager (approved) | Platform Admin | Notes |
|---|---|---|---|---|
| **Auth** | | | | |
| Register (phone OTP) | ✓ | — | — | |
| Login (password / Facebook) | ✓ | ✓ | ✓ | |
| Logout | ✓ | ✓ | ✓ | |
| Delete own account | ✓ | ✓ | — | Admin must manually delete admin accounts |
| **Worker Profile** | | | | |
| View own profile | ✓ | ✓ | ✓ | |
| Edit own profile | ✓ | ✓ | — | Admin cannot edit user profiles |
| Upload ID documents | ✓ | ✓ | — | |
| Upload signature | ✓ | ✓ | — | |
| Add/edit experience | ✓ | ✓ | — | |
| View another worker's profile | ✗ | ✓ | ✓ | Manager sees profiles of own applicants only |
| **Jobs (Public)** | | | | |
| Browse job listing (public) | ∅ | ∅ | ∅ | No auth required; public SSR/SSG page |
| View job detail (public) | ∅ | ∅ | ∅ | No auth required |
| **Jobs (Authenticated)** | | | | |
| Apply to a job | ✓ | ✓ | ✗ | One application per worker per job |
| View own applications | ✓ | ✓ | ✗ | |
| Withdraw own application | ✓ | ✓ | ✗ | Only if status = `pending` |
| **Manager: Sites** | | | | |
| Create site | ✗ | ✓ | ✗ | |
| Edit own site | ✗ | ✓ | ✗ | |
| Close / archive own site | ✗ | ✓ | ✗ | |
| View any site (admin) | ✗ | ✗ | ✓ | |
| Deactivate any site (admin) | ✗ | ✗ | ✓ | |
| **Manager: Jobs** | | | | |
| Create job posting | ✗ | ✓ | ✗ | Must own the parent site |
| Edit own job posting | ✗ | ✓ | ✗ | Only if job status = `open` |
| Close own job posting | ✗ | ✓ | ✗ | |
| View any job (admin) | ✗ | ✗ | ✓ | |
| Close any job (admin) | ✗ | ✗ | ✓ | |
| **Manager: Applications** | | | | |
| View applicants for own job | ✗ | ✓ | ✗ | |
| Accept applicant | ✗ | ✓ | ✗ | Sets status = `accepted` |
| Reject applicant | ✗ | ✓ | ✗ | Sets status = `rejected` |
| **Manager: Attendance** | | | | |
| Record attendance | ✗ | ✓ | ✗ | Only for accepted workers on own job |
| Edit attendance (same day) | ✗ | ✓ | ✗ | |
| Edit attendance (past day) | ✗ | ✗ | ✓ | Admin-only correction |
| View attendance for own job | ✗ | ✓ | ✗ | |
| View any attendance (admin) | ✗ | ✗ | ✓ | |
| **Contracts** | | | | |
| Generate contract | ✗ | ✓ | ✗ | Triggered after `accepted` status |
| View own contract (worker) | ✓ | ✓ | ✗ | Worker sees contracts for their applications |
| Sign contract (worker) | ✓ | ✓ | ✗ | Requires stored signature |
| View contract for own job | ✗ | ✓ | ✗ | |
| View any contract (admin) | ✗ | ✗ | ✓ | |
| **Notifications** | | | | |
| Receive own notifications | ✓ | ✓ | ✗ | |
| Mark notification read | ✓ | ✓ | ✗ | |
| **Admin: Users** | | | | |
| List all users | ✗ | ✗ | ✓ | |
| Soft-delete user | ✗ | ✗ | ✓ | |
| **Admin: Manager Approval** | | | | |
| View pending registrations | ✗ | ✗ | ✓ | |
| Approve registration | ✗ | ✗ | ✓ | |
| Reject registration | ✗ | ✗ | ✓ | |
| Revoke manager status | ✗ | ✗ | ✓ | |
| **Admin: Translation** | | | | |
| Edit i18n strings (ko/vi/en) | ✗ | ✗ | ✓ | |

**Legend**: ✓ allowed · ✗ not allowed · ∅ no auth required · — not applicable

---

## 4. Resource Ownership Rules

These are enforced at the API (Laravel Policy) layer, not just middleware.

| Resource | Owner | Rule |
|---|---|---|
| `worker_profiles` | The user (`user_id`) | Read/write own only; manager can read applicants' profiles |
| `manager_profiles` | The user (`user_id`) | Read/write own only |
| `sites` | Manager (`manager_user_id`) | CRUD on own sites only |
| `jobs` | Manager (via site) | CRUD on jobs where `site.manager_user_id = current_user` |
| `applications` | Worker who applied | Worker: read/withdraw own. Manager: read/update status for jobs they own |
| `attendance` | Manager (via job) | Record for workers on jobs they own |
| `contracts` | System-generated | Worker: view + sign own. Manager: view for their jobs |
| `notifications` | The user | Read own only |

---

## 5. API Authentication Flow

```
Client                         Laravel API
  │                                │
  │  Firebase ID Token (1h TTL)    │
  ├──────── Authorization: Bearer ─▶│
  │                                │
  │                    ┌───────────┘
  │                    │ 1. Verify token via Firebase Admin SDK
  │                    │ 2. Extract firebase_uid
  │                    │ 3. Look up auth.users WHERE firebase_uid = ?
  │                    │ 4. Attach user + role flags to request
  │                    └───────────┐
  │                                │
  │◀──────── Response ─────────────┤
```

- If `firebase_uid` not in `auth.users` → auto-create user record (first login).
- If user `is_admin = false` and route requires admin → 403.
- If user `is_manager = false` and route requires manager → 403.
- Middleware class: `App\Http\Middleware\FirebaseAuth`.
- Policy classes: `SitePolicy`, `JobPolicy`, `ApplicationPolicy`, `ContractPolicy`, `AttendancePolicy`.

---

## 6. Role Transitions Reference

| Event | Before | After | Side effects |
|---|---|---|---|
| User signs up | — | `is_worker = true` | Create `worker_profiles` row (empty) |
| Submit business registration | `is_manager = false` | `manager_status = pending` | Notify admin queue |
| Admin approves | `manager_status = pending` | `manager_status = approved`, `is_manager = true` | Push notification to user |
| Admin rejects | `manager_status = pending` | `manager_status = rejected` | Push notification with rejection note |
| Admin revokes manager | `is_manager = true` | `is_manager = false`, `manager_status = revoked` | Existing sites/jobs remain; no new ones allowed |
| User re-submits after rejection | `manager_status = rejected` | `manager_status = pending` (new row) | Old row archived |
