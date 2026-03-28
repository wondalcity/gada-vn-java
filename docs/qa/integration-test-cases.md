# GADA VN — Integration Test Cases
**Date**: 2026-03-21
**Scope**: API contract, middleware, DB constraints, state machines, ownership guards
**Tool**: Pest (Laravel), Supertest (NestJS if applicable)
**Environment**: In-memory test DB (PostgreSQL, migrated from scratch per suite)

---

## Test Case Conventions

| Field | Description |
|-------|-------------|
| `TC-INT-XXX` | Test case ID |
| **Setup** | DB state before request |
| **Request** | HTTP method, URL, headers, body |
| **Assert** | Expected HTTP status + response body shape + DB state |
| **Priority** | P0 = auth/security, P1 = business logic, P2 = edge case |

All requests use `Authorization: Bearer {firebase_id_token}` unless otherwise stated.
Test tokens are generated from Firebase Auth Emulator or via a test-token-factory helper.

---

## Suite INT-AUTH — Authentication Middleware

### TC-INT-001 — Missing Authorization header returns 401
**Priority**: P0

**Request**:
```
GET /api/v1/worker/profile
(no Authorization header)
```

**Assert**:
- HTTP `401`
- Body: `{ statusCode: 401, message: "Unauthenticated." }`

---

### TC-INT-002 — Expired Firebase token returns 401
**Priority**: P0

**Request**:
```
GET /api/v1/worker/profile
Authorization: Bearer {expired_token_fixture}
```

**Assert**:
- HTTP `401`
- Body contains `message` referencing token expiry

---

### TC-INT-003 — Valid token creates user_roles row on first request
**Priority**: P0
**Setup**: User `firebase_uid = "uid_test_001"` exists in `auth.users` with `role = "worker"`. No row in `auth.user_roles` for this user.

**Request**:
```
GET /api/v1/worker/profile
Authorization: Bearer {valid_token_for_uid_test_001}
```

**Assert**:
- HTTP `200`
- `auth.user_roles` now contains row `(user_id, role='worker', status='active')`
- `insertOrIgnore` did not throw (migration 007 in place)

---

### TC-INT-004 — SUSPENDED user returns 403
**Priority**: P0
**Setup**: User status = `'SUSPENDED'`

**Request**:
```
GET /api/v1/worker/profile
Authorization: Bearer {valid_token_for_suspended_user}
```

**Assert**:
- HTTP `403`
- Body: `{ statusCode: 403, message: "Account suspended." }` (or equivalent)

---

### TC-INT-005 — Role middleware blocks worker from manager route
**Priority**: P0
**Setup**: User has `auth.user_roles` row with `role = 'worker'` only

**Request**:
```
GET /api/v1/manager/sites
Authorization: Bearer {worker_token}
```

**Assert**:
- HTTP `403`
- Body: `{ statusCode: 403, message: "Forbidden." }`

---

### TC-INT-006 — Role middleware allows manager on manager route
**Priority**: P0
**Setup**: User has `auth.user_roles` row with `role = 'manager'`, `status = 'active'`

**Request**:
```
GET /api/v1/manager/sites
Authorization: Bearer {manager_token}
```

**Assert**:
- HTTP `200`
- Body: `{ statusCode: 200, data: [...] }`

---

### TC-INT-007 — Admin route blocked for non-admin
**Priority**: P0
**Setup**: Manager user (no admin role)

**Request**:
```
GET /api/v1/admin/users
Authorization: Bearer {manager_token}
```

**Assert**:
- HTTP `403`

---

## Suite INT-WORKER — Worker Profile

### TC-INT-010 — Create worker profile auto-created on first GET
**Priority**: P1
**Setup**: User exists with no `app.worker_profiles` row

**Request**:
```
GET /api/v1/worker/profile
```

**Assert**:
- HTTP `200`
- Body `data.user_id` matches auth user
- `app.worker_profiles` row created with `profile_complete = false`

---

### TC-INT-011 — Worker profile update — valid payload
**Priority**: P1

**Request**:
```
PUT /api/v1/worker/profile
Body: {
  "full_name": "Trần Thị B",
  "date_of_birth": "1998-04-22",
  "gender": "female",
  "current_province": "hanoi",
  "primary_trade_id": 5
}
```

**Assert**:
- HTTP `200`
- `app.worker_profiles.full_name = "Trần Thị B"`
- `app.worker_profiles.primary_trade_id = 5`

---

### TC-INT-012 — Trade skills upsert
**Priority**: P1

**Request**:
```
POST /api/v1/worker/profile/trade-skills
Body: {
  "skills": [
    { "trade_id": 5, "years": 3 },
    { "trade_id": 12, "years": 1 }
  ]
}
```

**Assert**:
- HTTP `200`
- `app.worker_trade_skills` contains 2 rows for this worker
- Re-posting with same `trade_id` upserts (no duplicate key error)

---

## Suite INT-MANAGER — Manager Registration and Approval

### TC-INT-020 — Manager registration creates profile with PENDING status
**Priority**: P0

**Request**:
```
POST /api/v1/manager/register
Body: {
  "business_type": "INDIVIDUAL",
  "representative_name": "Lee Sungmin",
  "representative_dob": "1985-07-20",
  "representative_gender": "male",
  "contact_phone": "+82101239999",
  "contact_address": "Busan, Korea",
  "terms_accepted": true,
  "privacy_accepted": true
}
```

**Assert**:
- HTTP `201`
- `app.manager_profiles.approval_status = 'PENDING'`
- `GET /manager/registration/status` returns `{ status: "PENDING" }`

---

### TC-INT-021 — Double registration returns 409
**Priority**: P1
**Setup**: Manager profile already exists for this user

**Request**:
```
POST /api/v1/manager/register
(same payload)
```

**Assert**:
- HTTP `409` or `422`
- No second `app.manager_profiles` row created

---

### TC-INT-022 — Admin approve grants manager role
**Priority**: P0
**Setup**: Pending manager profile; admin token available

**Request**:
```
PATCH /api/v1/admin/manager-approvals/{id}/approve
Authorization: Bearer {admin_token}
Body: {}
```

**Assert**:
- HTTP `200`
- `app.manager_profiles.approval_status = 'APPROVED'`
- `app.manager_profiles.approved_at` is a valid timestamp
- `auth.user_roles` row inserted with `(user_id, role='manager', status='active')`
- `ops.notifications` row created for the manager user (approval notification)

---

### TC-INT-023 — Admin reject with reason
**Priority**: P1

**Request**:
```
PATCH /api/v1/admin/manager-approvals/{id}/reject
Authorization: Bearer {admin_token}
Body: { "reason": "Business registration invalid" }
```

**Assert**:
- HTTP `200`
- `app.manager_profiles.approval_status = 'REJECTED'`
- `app.manager_profiles.rejection_reason = "Business registration invalid"`
- `auth.user_roles`: no manager role inserted

---

## Suite INT-SITE — Site Management

### TC-INT-030 — Create site
**Priority**: P1

**Request**:
```
POST /api/v1/manager/sites
Authorization: Bearer {manager_token}
Body: {
  "name": "Hanoi Office Tower",
  "address": "123 Ba Dinh, Hanoi",
  "province": "hanoi",
  "site_type": "COMMERCIAL",
  "lat": 21.0285,
  "lng": 105.8542
}
```

**Assert**:
- HTTP `201`
- `app.construction_sites.manager_id` = auth user's manager profile ID
- `app.construction_sites.status = 'ACTIVE'`
- `app.construction_sites.location` (PostGIS) populated via trigger
- `slug` is non-null

---

### TC-INT-031 — Manager cannot access another manager's site
**Priority**: P0
**Setup**: Site owned by manager_B

**Request**:
```
GET /api/v1/manager/sites/{site_B_id}
Authorization: Bearer {manager_A_token}
```

**Assert**:
- HTTP `403` or `404`

---

### TC-INT-032 — Site status change
**Priority**: P1

**Request**:
```
PATCH /api/v1/manager/sites/{siteId}/status
Body: { "status": "PAUSED" }
```

**Assert**:
- HTTP `200`
- `app.construction_sites.status = 'PAUSED'`

---

### TC-INT-033 — Invalid site status rejected
**Priority**: P2

**Request**:
```
PATCH /api/v1/manager/sites/{siteId}/status
Body: { "status": "DELETED" }
```

**Assert**:
- HTTP `422`
- Validation error on `status` field

---

## Suite INT-JOB — Job Posting

### TC-INT-040 — Create job for site
**Priority**: P1

**Request**:
```
POST /api/v1/manager/sites/{siteId}/jobs
Body: {
  "title": "철근 작업",
  "trade_id": 5,
  "work_date": "2026-04-01",
  "start_time": "08:00",
  "end_time": "17:00",
  "daily_wage": 350000,
  "slots_total": 3,
  "description": "강도 높은 작업"
}
```

**Assert**:
- HTTP `201`
- `app.jobs.status = 'OPEN'`
- `app.jobs.slots_filled = 0`
- `app.jobs.slug` non-null and unique
- `app.jobs.daily_wage` stored as exact integer (no float)

---

### TC-INT-041 — Past work_date rejected
**Priority**: P1

**Request**:
```
POST /api/v1/manager/sites/{siteId}/jobs
Body: { "work_date": "2024-01-01", ... }
```

**Assert**:
- HTTP `422`
- Error on `work_date` field

---

### TC-INT-042 — Job appears in public listing
**Priority**: P1
**Setup**: Published job exists

**Request**:
```
GET /api/v1/public/jobs
(no auth)
```

**Assert**:
- HTTP `200`
- Job included in `data` array
- Response contains `slug`, `title`, `daily_wage`, `work_date`, `province`
- No internal IDs or sensitive manager data exposed beyond intended fields

---

### TC-INT-043 — Job detail by slug
**Priority**: P1

**Request**:
```
GET /api/v1/public/jobs/{slug}
```

**Assert**:
- HTTP `200`
- Returns full job fields + site name + trade name
- `daily_wage` is integer (VND)
- `work_date` is ISO date string

---

### TC-INT-044 — Non-existent slug returns 404
**Priority**: P2

**Request**:
```
GET /api/v1/public/jobs/this-slug-does-not-exist
```

**Assert**:
- HTTP `404`

---

## Suite INT-APPLY — Job Application

### TC-INT-050 — Worker applies to open job
**Priority**: P0

**Request**:
```
POST /api/v1/jobs/{jobId}/apply
Authorization: Bearer {worker_token}
```

**Assert**:
- HTTP `201`
- `app.job_applications.status = 'PENDING'`
- `app.job_applications.worker_id` = worker profile ID
- DB unique constraint `(job_id, worker_id)` not violated

---

### TC-INT-051 — Duplicate application returns 409
**Priority**: P0
**Setup**: Worker already has PENDING application for job

**Request**:
```
POST /api/v1/jobs/{jobId}/apply
```

**Assert**:
- HTTP `409`
- Body: `{ statusCode: 409, message: "Already applied." }` or equivalent
- Only one row in `app.job_applications` for this (job_id, worker_id)

---

### TC-INT-052 — Applying to FILLED job returns 422
**Priority**: P0
**Setup**: Job with `status = 'FILLED'`

**Request**:
```
POST /api/v1/jobs/{jobId}/apply
```

**Assert**:
- HTTP `422`
- Error: job is not accepting applications

---

### TC-INT-053 — Worker withdraws PENDING application
**Priority**: P1

**Request**:
```
DELETE /api/v1/worker/applications/{applicationId}
```

**Assert**:
- HTTP `200`
- `app.job_applications.status = 'WITHDRAWN'`

---

### TC-INT-054 — Worker cannot withdraw ACCEPTED application
**Priority**: P1
**Setup**: Application `status = 'ACCEPTED'`

**Request**:
```
DELETE /api/v1/worker/applications/{applicationId}
```

**Assert**:
- HTTP `422`
- Error: cannot withdraw accepted application
- Status unchanged

---

### TC-INT-055 — Worker cannot apply to own manager's job
**Priority**: P1
**Setup**: User has both worker and manager roles; job posted by own manager profile
*(GAP-API-09 — not yet implemented; this test should FAIL until fixed)*

**Request**:
```
POST /api/v1/jobs/{own_job_id}/apply
```

**Assert**:
- HTTP `422`
- Error: "매니저는 자신의 공고에 지원할 수 없습니다"
- *(Currently returns 201 — known gap)*

---

## Suite INT-HIRE — Application Acceptance

### TC-INT-060 — Manager accepts application, slots_filled increments
**Priority**: P0
**Setup**: Job `slots_total = 3`, `slots_filled = 0`; PENDING application exists

**Request**:
```
PATCH /api/v1/manager/applications/{applicationId}/accept
Authorization: Bearer {manager_token}
```

**Assert**:
- HTTP `200`
- `app.job_applications.status = 'ACCEPTED'`
- `app.jobs.slots_filled = 1`

---

### TC-INT-061 — Accepting final slot sets job status to FILLED
**Priority**: P0
**Setup**: Job `slots_total = 1`, `slots_filled = 0`; 1 PENDING application

**Request**:
```
PATCH /api/v1/manager/applications/{applicationId}/accept
```

**Assert**:
- HTTP `200`
- `app.jobs.slots_filled = 1`
- `app.jobs.status = 'FILLED'`

---

### TC-INT-062 — Accepting beyond slot limit returns 422
**Priority**: P0
**Setup**: Job `slots_total = 1`, `slots_filled = 1` (FILLED); second PENDING application

**Request**:
```
PATCH /api/v1/manager/applications/{secondApplicationId}/accept
```

**Assert**:
- HTTP `422`
- Error references slot limit
- Second application status unchanged

---

### TC-INT-063 — Manager rejects application
**Priority**: P1

**Request**:
```
PATCH /api/v1/manager/applications/{applicationId}/reject
Body: { "notes": "경험 부족" }
```

**Assert**:
- HTTP `200`
- `app.job_applications.status = 'REJECTED'`
- `app.job_applications.notes = "경험 부족"`

---

### TC-INT-064 — Manager cannot accept application for another manager's job
**Priority**: P0
**Setup**: Application belongs to a job owned by Manager B

**Request**:
```
PATCH /api/v1/manager/applications/{applicationId}/accept
Authorization: Bearer {manager_A_token}
```

**Assert**:
- HTTP `403`

---

### TC-INT-065 — Cancel hire decrements slots_filled
**Priority**: P1
**Setup**: Application ACCEPTED; `slots_filled = 2`

**Request**:
```
PATCH /api/v1/manager/hires/{hireId}/cancel
```

**Assert**:
- HTTP `200`
- `app.jobs.slots_filled = 1`

---

## Suite INT-CONTRACT — Contract State Machine

### TC-INT-070 — Generate contract for ACCEPTED application
**Priority**: P0
**Setup**: Application `status = 'ACCEPTED'`

**Request**:
```
POST /api/v1/manager/applications/{applicationId}/contract
Authorization: Bearer {manager_token}
```

**Assert**:
- HTTP `201`
- `app.contracts.status = 'PENDING_WORKER_SIGN'`
- `app.contracts.contract_pdf_s3_key` non-null
- `app.contracts.contract_html` contains worker name, manager name, trade, date, wage
- S3 key format: `contracts/{uuid}/contract.html`

---

### TC-INT-071 — Generate contract for non-ACCEPTED application returns 422
**Priority**: P0
**Setup**: Application `status = 'PENDING'`

**Request**:
```
POST /api/v1/manager/applications/{applicationId}/contract
```

**Assert**:
- HTTP `422`

---

### TC-INT-072 — Duplicate contract generation returns 409
**Priority**: P0
**Setup**: Contract already exists for application

**Request**:
```
POST /api/v1/manager/applications/{applicationId}/contract
```

**Assert**:
- HTTP `409`

---

### TC-INT-073 — Worker signs contract — state advances
**Priority**: P0
**Setup**: Contract `status = 'PENDING_WORKER_SIGN'`

**Request**:
```
POST /api/v1/worker/contracts/{contractId}/sign
Body: {
  "signature_data_url": "data:image/svg+xml;base64,PHN2ZyB2aWV3..."
}
```

**Assert**:
- HTTP `200`
- `app.contracts.status = 'PENDING_MANAGER_SIGN'`
- `app.contracts.worker_signed_at` non-null
- `app.contracts.worker_signature_s3_key` = `contract-signatures/{uuid}/worker.svg`
- `app.contracts.worker_signed_ip` = request IP

---

### TC-INT-074 — Worker sign with PNG data URL also works
**Priority**: P1

**Request**:
```
POST /api/v1/worker/contracts/{contractId}/sign
Body: {
  "signature_data_url": "data:image/png;base64,iVBORw0KGgo..."
}
```

**Assert**:
- HTTP `200`
- `worker_signature_s3_key` ends in `.png`

---

### TC-INT-075 — Worker cannot sign contract in wrong state
**Priority**: P0
**Setup**: Contract `status = 'PENDING_MANAGER_SIGN'` (worker already signed)

**Request**:
```
POST /api/v1/worker/contracts/{contractId}/sign
```

**Assert**:
- HTTP `422`
- Error: "Contract is not awaiting worker signature."

---

### TC-INT-076 — Worker cannot sign another worker's contract
**Priority**: P0
**Setup**: Contract belongs to worker B

**Request**:
```
POST /api/v1/worker/contracts/{contractId_of_worker_B}/sign
Authorization: Bearer {worker_A_token}
```

**Assert**:
- HTTP `403`

---

### TC-INT-077 — Manager signs contract — fully signed
**Priority**: P0
**Setup**: Contract `status = 'PENDING_MANAGER_SIGN'`

**Request**:
```
POST /api/v1/manager/contracts/{contractId}/sign
Body: {
  "signature_data_url": "data:image/png;base64,iVBORw0KGgo..."
}
```

**Assert**:
- HTTP `200`
- `app.contracts.status = 'FULLY_SIGNED'`
- `app.contracts.manager_signed_at` non-null
- `app.contracts.manager_signature_s3_key` = `contract-signatures/{uuid}/manager.png`
- `app.job_applications.status = 'CONTRACTED'`

---

### TC-INT-078 — Invalid signature_data_url format returns 422
**Priority**: P1

**Request**:
```
POST /api/v1/worker/contracts/{contractId}/sign
Body: { "signature_data_url": "<svg>raw svg without data URL prefix</svg>" }
```

**Assert**:
- HTTP `422` or `500`
- RuntimeException from `mimeTypeFromDataUrl()` caught by handler
- No partial S3 upload

---

### TC-INT-079 — Worker can view contract by application_id lookup
**Priority**: P1
**Setup**: Contract exists; worker knows application ID but not contract UUID

**Request**:
```
GET /api/v1/worker/contracts/{applicationId}
```

**Assert**:
- HTTP `200`
- Returns contract data (controller accepts both contract UUID and application UUID)

---

## Suite INT-ATTENDANCE — Attendance Records

### TC-INT-080 — Manager upserts attendance — new record
**Priority**: P0

**Request**:
```
PUT /api/v1/manager/jobs/{jobId}/attendance
Body: {
  "records": [
    {
      "worker_id": "{workerId}",
      "work_date": "2026-04-01",
      "status": "ATTENDED",
      "check_in_time": "08:05",
      "check_out_time": "17:10",
      "hours_worked": 9.08
    }
  ]
}
```

**Assert**:
- HTTP `200`
- `app.attendance_records` row created
- `marked_by` = manager's user_id
- `marked_at` timestamp set

---

### TC-INT-081 — Upsert updates existing record — audit row created
**Priority**: P0
**Setup**: Attendance record already exists with `status = 'ABSENT'`

**Request**:
```
PUT /api/v1/manager/jobs/{jobId}/attendance
Body: { records: [{ worker_id, work_date, status: "ATTENDED", check_in_time: "08:00", hours_worked: 9 }] }
```

**Assert**:
- HTTP `200`
- `app.attendance_records.status = 'ATTENDED'`
- `app.attendance_audits` row created:
  - `old_status = 'ABSENT'`, `new_status = 'ATTENDED'`
  - `changed_by` set

---

### TC-INT-082 — Duplicate (job, worker, work_date) handled by UPSERT
**Priority**: P0
**Setup**: Attendance record exists

**Request**:
```
PUT /api/v1/manager/jobs/{jobId}/attendance
Body: same (job_id, worker_id, work_date)
```

**Assert**:
- HTTP `200` (not 409)
- Only one row in `app.attendance_records` for the combination
- UNIQUE constraint not violated (ON CONFLICT UPDATE)

---

### TC-INT-083 — Worker cannot write attendance
**Priority**: P0

**Request**:
```
PUT /api/v1/manager/jobs/{jobId}/attendance
Authorization: Bearer {worker_token}
```

**Assert**:
- HTTP `403`

---

### TC-INT-084 — Admin can override attendance
**Priority**: P1

**Request**:
```
PATCH /api/v1/admin/attendance/{attendanceId}
Authorization: Bearer {admin_token}
Body: { "status": "HALF_DAY", "hours_worked": 4, "reason": "Admin correction" }
```

**Assert**:
- HTTP `200`
- Record updated
- `app.attendance_audits` row with `changed_by` = admin user_id

---

### TC-INT-085 — Invalid status value rejected
**Priority**: P1

**Request**:
```
PUT /api/v1/manager/jobs/{jobId}/attendance
Body: { records: [{ status: "LATE" }] }
```

**Assert**:
- HTTP `422`
- Validation error on `status`

---

## Suite INT-PUBLIC — Public API

### TC-INT-090 — Public jobs no auth required
**Priority**: P0

**Request**:
```
GET /api/v1/public/jobs
(no Authorization header)
```

**Assert**:
- HTTP `200`
- Only `status = 'OPEN'` jobs returned
- No CANCELLED or COMPLETED jobs in response

---

### TC-INT-091 — Public jobs filter by province
**Priority**: P1

**Request**:
```
GET /api/v1/public/jobs?province=hanoi
```

**Assert**:
- HTTP `200`
- All returned jobs have province matching `hanoi`

---

### TC-INT-092 — Public jobs pagination
**Priority**: P1

**Request**:
```
GET /api/v1/public/jobs?page=1&per_page=5
```

**Assert**:
- HTTP `200`
- `meta.total` present
- `meta.page = 1`
- `data.length <= 5`

---

### TC-INT-093 — Provinces list
**Priority**: P1

**Request**:
```
GET /api/v1/public/provinces
```

**Assert**:
- HTTP `200`
- Returns 63 provinces (Vietnam)
- Each item has `code`, `name_vi`, `name_en`

---

## Suite INT-DB — Database Constraints and Integrity

### TC-INT-100 — auth.users unique firebase_uid
**Priority**: P0

**Setup**: User with `firebase_uid = 'uid_test'` exists
**Action**: INSERT second row with same `firebase_uid`
**Assert**: PostgreSQL raises `unique_violation` (23505)

---

### TC-INT-101 — app.jobs slots constraint — filled cannot exceed total
**Priority**: P0

**Action**: `UPDATE app.jobs SET slots_filled = 5 WHERE slots_total = 3`
**Assert**: PostgreSQL raises `check_violation` (23514) — CHECK constraint `slots_filled <= slots_total`

---

### TC-INT-102 — app.job_applications unique (job_id, worker_id)
**Priority**: P0
**Setup**: One PENDING application for (job_A, worker_A)
**Action**: INSERT second application for same (job_A, worker_A)
**Assert**: `unique_violation` raised

---

### TC-INT-103 — app.attendance_records unique (job_id, worker_id, work_date)
**Priority**: P0
**Action**: Direct INSERT of duplicate attendance row
**Assert**: `unique_violation` raised

---

### TC-INT-104 — auth.users CASCADE DELETE removes user_roles
**Priority**: P1
**Setup**: User with user_roles row
**Action**: DELETE from `auth.users WHERE id = {user_id}`
**Assert**: `auth.user_roles` row also deleted (ON DELETE CASCADE)

---

### TC-INT-105 — Money stored as integer NUMERIC(12,0) — no float drift
**Priority**: P0
**Action**: INSERT job with `daily_wage = 350000.7` (decimal)
**Assert**: Stored as `350000` (NUMERIC truncation) OR validation rejects the decimal input

---

### TC-INT-106 — PostGIS trigger populates location from lat/lng
**Priority**: P1
**Action**: INSERT site with `lat = 21.0285, lng = 105.8542`
**Assert**:
- `ST_X(location::geometry) ≈ 105.8542`
- `ST_Y(location::geometry) ≈ 21.0285`
- `ST_SRID(location) = 4326`

---

### TC-INT-107 — TIMESTAMPTZ stored as UTC
**Priority**: P1
**Action**: INSERT record from a client in `Asia/Ho_Chi_Minh` timezone (UTC+7)
**Assert**: `created_at` stored in UTC (offset `+00`)

---

### TC-INT-108 — auth.users status constraint includes DELETED (migration 008)
**Priority**: P0
**Action**: `UPDATE auth.users SET status = 'DELETED'`
**Assert**: No constraint violation (migration 008 applied)

---

### TC-INT-109 — auth.user_roles table exists (migration 007)
**Priority**: P0
**Action**: `SELECT 1 FROM auth.user_roles LIMIT 1`
**Assert**: Query succeeds (table exists, no `relation does not exist` error)

---

## Suite INT-SEO — SSR/SSG API Behavior

### TC-INT-110 — generateStaticParams returns all province codes
**Priority**: P1
**Setup**: 63 provinces in `ref.vn_provinces`

**Action**: Call `fetchProvinces()` from web-next static params function
**Assert**:
- Returns array of 63 items
- Each item has `province` key matching slug format

---

### TC-INT-111 — fetchPublicJobBySlug returns null for missing slug
**Priority**: P1

**Action**: `fetchPublicJobBySlug('nonexistent-slug')`
**Assert**: Returns `null` (no uncaught exception)
- Page component handles null with `notFound()` call

---

### TC-INT-112 — JSON-LD generation from job data
**Priority**: P1
**Setup**: Job with all fields populated

**Action**: Inspect page source of `/ko/jobs/{slug}`
**Assert**:
- `baseSalary.value` is a number (not a string)
- `datePosted` is ISO 8601 format
- `jobLocation` contains `addressCountry: "VN"`

---

## Suite INT-NOTIFY — Notifications

### TC-INT-120 — Notification created on application accept
**Priority**: P1
**Setup**: Worker has PENDING application

**Action**:
```
PATCH /api/v1/manager/applications/{id}/accept
```

**Assert**:
- `ops.notifications` row created for worker's `user_id`
- `type` indicates acceptance event
- `read = false`

---

### TC-INT-121 — Marking notification as read
**Priority**: P2

**Request**:
```
PATCH /api/v1/notifications/{notificationId}/read
Authorization: Bearer {worker_token}
```

**Assert**:
- HTTP `200`
- `ops.notifications.read = true`

---

### TC-INT-122 — Worker cannot read another user's notification
**Priority**: P0
**Setup**: Notification belongs to different user

**Request**:
```
PATCH /api/v1/notifications/{other_user_notification_id}/read
```

**Assert**:
- HTTP `403` or `404`

---

## Test Execution Matrix

| Suite | Test Count | Est. Time | Run In CI |
|-------|-----------|-----------|-----------|
| INT-AUTH | 7 | 30s | Yes (P0) |
| INT-WORKER | 3 | 15s | Yes |
| INT-MANAGER | 4 | 20s | Yes (P0) |
| INT-SITE | 4 | 15s | Yes |
| INT-JOB | 5 | 20s | Yes |
| INT-APPLY | 6 | 25s | Yes (P0) |
| INT-HIRE | 6 | 25s | Yes (P0) |
| INT-CONTRACT | 10 | 40s | Yes (P0) |
| INT-ATTENDANCE | 6 | 25s | Yes |
| INT-PUBLIC | 4 | 15s | Yes |
| INT-DB | 10 | 20s | Yes (P0) |
| INT-SEO | 3 | 10s | Yes |
| INT-NOTIFY | 3 | 10s | Optional |
| **Total** | **71** | **~5 min** | — |

---

## Known Failing Tests (Pre-Fix)

These tests will fail on the current codebase before P1 fixes are applied:

| TC | Reason | Fix Required |
|----|--------|-------------|
| TC-INT-055 | Manager self-application not blocked | GAP-API-09 |
| TC-INT-078 | Raw SVG (non-data-URL) now rejects correctly ✅ | P0-04 done |
| TC-E2E-088 | sitemap.xml not yet implemented | GAP-WEB-06 (P1) |
| TC-INT-109 | user_roles table now exists ✅ | P0-01 done |
| TC-INT-108 | DELETED status now allowed ✅ | P0-02 done |
