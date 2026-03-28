# API Summary — GADA VN

**Version**: 1.0.0
**Base URL**: `https://api.gada.vn/api/v1`
**Full spec**: `docs/api/api-spec.yaml` (OpenAPI 3.1.0)
**Last updated**: 2026-03-21

---

## Access Level Legend

| Symbol | Level | Condition |
|---|---|---|
| 🔓 | Public | No auth required |
| 🔐 | Authenticated | Valid Firebase ID token |
| 👷 | Worker | Authenticated (all users are workers) |
| 🏗️ | Manager | `user_roles.role = manager` + `status = active` |
| 🛡️ | Admin | `user_roles.role = admin` |

---

## Response Envelope

Every response — success or error — is wrapped:

```json
// Success (single object)
{ "statusCode": 200, "data": { ... } }

// Success (list)
{ "statusCode": 200, "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 85, "totalPages": 5 } }

// Error
{ "statusCode": 422, "message": "Validation failed", "errors": { "phone": ["The phone field is required."] } }
```

---

## Endpoint Reference

### Authentication

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/otp/send` | 🔓 | Send OTP to phone number. Rate limit: 5/phone/15min |
| POST | `/auth/otp/verify` | 🔓 | Verify OTP → returns Firebase custom token. `isNewUser` flag in response |
| POST | `/auth/register` | 🔐 | Complete registration (name, email, password) after first OTP login |
| POST | `/auth/login` | 🔓 | Email + password login → validates credentials, returns user record |
| POST | `/auth/social/facebook` | 🔓 | Facebook OAuth → receives Firebase ID token, upserts user |
| POST | `/auth/logout` | 🔐 | Revokes Firebase refresh token on all devices |

**Phone OTP flow**:
```
Client                          Server                      Firebase
  │── POST /auth/otp/send ──────▶│── Firebase Admin SMS ────▶│
  │                              │                           │
  │── POST /auth/otp/verify ────▶│── verify OTP ────────────▶│
  │◀── customToken ──────────────│◀── customToken ───────────│
  │
  │── signInWithCustomToken(customToken)  [client-side Firebase SDK]
  │◀── Firebase ID Token
  │
  │── POST /auth/register ──▶ (if isNewUser = true)
  │── All subsequent requests: Authorization: Bearer <ID Token>
```

---

### Account

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/me` | 🔐 | Current user with roles and manager status |
| PATCH | `/me/locale` | 🔐 | Set preferred language: `ko` \| `vi` \| `en` |
| DELETE | `/me/account` | 🔐 | Soft-delete own account. Body: `{ "confirmPhrase": "DELETE" }` |

---

### Worker Profile

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/worker/profile` | 👷 | Full profile with ID doc status and signature flag |
| PUT | `/worker/profile` | 👷 | Update profile fields |
| POST | `/worker/profile/id-documents` | 👷 | Upload ID document images (multipart, max 10 MB/file) |
| POST | `/worker/profile/signature` | 👷 | Upload drawn signature PNG (max 2 MB). Previous signature auto-archived |
| GET | `/worker/experiences` | 👷 | List own work experience entries |
| POST | `/worker/experiences` | 👷 | Add experience entry |
| PUT | `/worker/experiences/{id}` | 👷 | Update own experience entry |
| DELETE | `/worker/experiences/{id}` | 👷 | Delete own experience entry |

**Profile completeness gate**: Workers without a current signature cannot sign contracts. Redirect to `POST /worker/profile/signature` if missing.

---

### Manager Registration

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/manager/register` | 🔐 | Submit business registration (multipart with document upload) |
| GET | `/manager/registration/status` | 🔐 | Get current registration status and rejection reason if rejected |

**Re-submission rule**: After rejection, call `POST /manager/register` again — a new row is created; old row is archived (`is_current = false`).

---

### Public (No Auth Required)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/public/jobs` | 🔓 | Paginated open job list with province + trade + date filters |
| GET | `/public/jobs/{slug}` | 🔓 | Full job detail for SSR (includes requirements, benefits, site info) |
| GET | `/public/sites/{slug}` | 🔓 | Site detail with open jobs list |
| GET | `/public/provinces` | 🔓 | All 63 Vietnamese provinces (reference data) |
| GET | `/public/trades` | 🔓 | All construction trades (reference data) |

**Next.js usage**:
- `GET /public/jobs` → `getStaticProps` / ISR (revalidate 60s)
- `GET /public/jobs/{slug}` → `getServerSideProps` (SSR for freshness)
- `GET /public/provinces` → `getStaticProps` (revalidate 86400s)
- `Accept-Language` header sets response locale; `?locale=vi` overrides

---

### Sites (Manager)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/manager/sites` | 🏗️ | List own sites (filter by status) |
| POST | `/manager/sites` | 🏗️ | Create site (generates slug automatically) |
| GET | `/manager/sites/{siteId}` | 🏗️ | Site detail (own only) |
| PUT | `/manager/sites/{siteId}` | 🏗️ | Update site info |
| PATCH | `/manager/sites/{siteId}/status` | 🏗️ | Transition status: `draft→active`, `active→closed`, `closed→archived` |
| POST | `/manager/sites/{siteId}/images` | 🏗️ | Upload site gallery image (max 8 images per site) |

---

### Jobs (Manager + Worker)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/manager/sites/{siteId}/jobs` | 🏗️ | List jobs under a site |
| POST | `/manager/sites/{siteId}/jobs` | 🏗️ | Create job posting (supports multilingual: `title_ko`, `title_vi`, `title_en`) |
| GET | `/manager/jobs/{jobId}` | 🏗️ | Job detail with applicant stats |
| PUT | `/manager/jobs/{jobId}` | 🏗️ | Update job (only when `status = draft` or `open`) |
| PATCH | `/manager/jobs/{jobId}/status` | 🏗️ | Transition: `draft→open`, `open→closed` |
| GET | `/manager/jobs/{jobId}/shifts` | 🏗️ | List job shifts (also accessible by hired workers) |
| POST | `/manager/jobs/{jobId}/shifts` | 🏗️ | Create a specific work-day shift |

**Jobs vs Shifts**:
- **Job** = the posting (role, headcount, wage, date range)
- **Shift** = a specific calendar day within that job (can override headcount/times)
- Attendance links to a shift if one exists for that date; otherwise links to job dates directly

---

### Applications

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/jobs/{jobId}/apply` | 👷 | Apply to a job. One per worker per job. Job must be `open` |
| GET | `/worker/applications` | 👷 | Own application list (filter by status) |
| DELETE | `/worker/applications/{id}` | 👷 | Withdraw application (only if `status = pending`) |
| GET | `/manager/jobs/{jobId}/applications` | 🏗️ | Applicant list for a job (own job only) |
| PATCH | `/manager/applications/{id}/accept` | 🏗️ | Accept applicant → creates hire + queues contract generation |
| PATCH | `/manager/applications/{id}/reject` | 🏗️ | Reject applicant |

**Application status machine**:
```
pending ──[accept]──▶ accepted ──▶ hire created
        ──[reject]──▶ rejected
        ──[worker withdraws]──▶ withdrawn   (pending only)
        ──[job closes]────────▶ expired
```

---

### Hires

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/worker/hires` | 👷 | Own hire list with contract status |
| GET | `/manager/hires` | 🏗️ | Hire list for manager's jobs (filter by jobId, status) |
| PATCH | `/manager/hires/{id}/cancel` | 🏗️ | Cancel an active hire (reason required). Worker notified |

---

### Attendance

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/manager/jobs/{jobId}/attendance?date=YYYY-MM-DD` | 🏗️ | All hired workers + attendance status for a date |
| PUT | `/manager/jobs/{jobId}/attendance` | 🏗️ | Bulk upsert attendance records for a date |

**Attendance upsert rules**:
- Same-day: manager can create and overwrite freely
- Past-day correction: admin only (`PATCH /admin/attendance/{id}` — see RBAC model)
- `hoursWorked` is used for `wage_amount` calculation when present; falls back to daily rate
- FCM notification sent to each worker on record

---

### Contracts

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/worker/contracts/{id}` | 👷 | Contract detail + presigned PDF URL (15min TTL) |
| POST | `/worker/contracts/{id}/sign` | 👷 | Worker signs contract. Requires signature on file |
| GET | `/manager/contracts/{id}` | 🏗️ | Contract detail for manager (own job) |

**Contract lifecycle**:
```
[hire accepted]
      │
      ▼ Laravel queued job: GenerateContractJob
      │
contract: pending ──[worker signs]──▶ worker_signed ──[manager signs, post-MVP]──▶ fully_signed
                  ──[admin voids]───▶ voided
```
For MVP: `worker_signed` is the effective final state. Manager countersign is post-MVP.

---

### Notifications

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/notifications` | 🔐 | List notifications (`?unreadOnly=true`). Includes `meta.unreadCount` |
| PATCH | `/notifications/{id}/read` | 🔐 | Mark single notification as read |
| POST | `/notifications/read-all` | 🔐 | Mark all as read. Returns `{ updatedCount }` |

**Notification types**:

| Type | Triggered by | Recipient |
|---|---|---|
| `application_status` | Manager accepts/rejects | Worker |
| `contract_ready` | Contract PDF generated | Worker |
| `attendance_recorded` | Manager records attendance | Worker |
| `manager_approved` | Admin approves registration | Manager-applicant |
| `manager_rejected` | Admin rejects registration | Manager-applicant |
| `hire_cancelled` | Manager cancels hire | Worker |

---

### Devices

| Method | Path | Access | Description |
|---|---|---|---|
| PUT | `/devices/fcm-token` | 🔐 | Register/refresh FCM token. Call on app launch |
| DELETE | `/devices/fcm-token` | 🔐 | Remove token on logout |

---

### Admin

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/admin/manager-approvals` | 🛡️ | Approval queue (filter: `pending` \| `approved` \| `rejected`) |
| GET | `/admin/manager-approvals/{id}` | 🛡️ | Approval detail with presigned document URL |
| PATCH | `/admin/manager-approvals/{id}/approve` | 🛡️ | Approve → grants manager role, sends FCM |
| PATCH | `/admin/manager-approvals/{id}/reject` | 🛡️ | Reject with reason (required) → sends FCM |
| GET | `/admin/users` | 🛡️ | User list (search by name/email/phone; filter by role) |
| GET | `/admin/users/{id}` | 🛡️ | User detail with roles and activity |
| DELETE | `/admin/users/{id}` | 🛡️ | Soft-delete user (reason required). Disables Firebase account |
| PATCH | `/admin/sites/{id}/deactivate` | 🛡️ | Force-deactivate any site |
| PATCH | `/admin/jobs/{id}/close` | 🛡️ | Force-close any job |
| GET | `/admin/translations` | 🛡️ | All i18n strings (filter by locale or search key) |
| PUT | `/admin/translations` | 🛡️ | Batch update i18n strings |

---

## Error Codes Reference

| HTTP | Meaning | Common causes |
|---|---|---|
| 400 | Bad request | Invalid OTP, malformed input |
| 401 | Unauthenticated | Missing, expired, or invalid Firebase token |
| 403 | Forbidden | Wrong role, not resource owner |
| 404 | Not found | Resource doesn't exist or is soft-deleted |
| 409 | Conflict | Already applied, job full, invalid status transition, duplicate registration |
| 413 | Payload too large | File exceeds 10 MB limit |
| 422 | Unprocessable entity | Validation failed (field errors in `errors` object) |
| 429 | Too many requests | OTP rate limit, login attempt lockout |
| 500 | Server error | Unhandled exception; logged to ops.audit_logs |

---

## Key Business Rules Enforced at API Layer

| Rule | Endpoint | HTTP code |
|---|---|---|
| One application per worker per job | `POST /jobs/{jobId}/apply` | 409 |
| Job must be `open` to accept applications | `POST /jobs/{jobId}/apply` | 422 |
| Withdraw only if `status = pending` | `DELETE /worker/applications/{id}` | 409 |
| Hire created only from `accepted` application | Internal | — |
| Contract signing requires signature on file | `POST /worker/contracts/{id}/sign` | 422 |
| Contract already signed cannot be re-signed | `POST /worker/contracts/{id}/sign` | 409 |
| Past-day attendance editable by admin only | `PUT /manager/jobs/{jobId}/attendance` | 403 |
| Manager features gated by approval status | All `/manager/*` routes | 403 |
| Rejection reason required for reject actions | `/manager/applications/{id}/reject`, `/admin/manager-approvals/{id}/reject` | 422 |
| Re-submission creates new row, archives old | `POST /manager/register` | 201 |

---

## Multilingual Behaviour

- All text responses use the **requesting user's `locale`** (stored in `auth.users.locale`)
- Override per-request: `?locale=vi` query param (public endpoints only)
- Fallback chain: `requested locale → ko → raw key`
- Notification title/body delivered in the **recipient's locale**, not the sender's
- `POST /manager/sites/{siteId}/jobs` accepts `titleKo`, `titleVi`, `titleEn` — `titleKo` is always required

---

## File Upload Limits

| Upload type | Endpoint | Max size | Formats |
|---|---|---|---|
| ID document (front/back) | `/worker/profile/id-documents` | 10 MB | JPEG, PNG |
| Signature | `/worker/profile/signature` | 2 MB | PNG only |
| Business registration doc | `/manager/register` | 10 MB | PDF, JPEG, PNG |
| Site image | `/manager/sites/{id}/images` | 10 MB | JPEG, PNG |

All files are stored in S3 with bare keys. Access is via presigned URLs (15-minute TTL). URLs are never stored in the database.
