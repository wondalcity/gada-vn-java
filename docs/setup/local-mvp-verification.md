# GADA VN — Local MVP Verification Checklist

This checklist confirms the end-to-end MVP is functional on a local environment.
It is distinct from the smoke test plan (which provides raw curl commands):
this document uses a pass/fail table format for sign-off by a QA engineer.

**How to use**: work through each section top-to-bottom.
Mark each item ✅ PASS, ❌ FAIL, or ⚠️ PARTIAL (works with caveats).
A section is blocked if any of its **[REQUIRED]** items fail.

**Tester**: _____________ **Date**: _____________ **Environment**: local

---

## Section 1 — Infrastructure

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| I-01 | PostgreSQL container healthy (`pg_isready` returns `accepting connections`) | REQUIRED | | |
| I-02 | Redis container healthy (`redis-cli ping` returns `PONG`) | REQUIRED | | |
| I-03 | `auth`, `app`, `ref`, `ops` schemas present in DB | REQUIRED | | |
| I-04 | Migrations table exists with ≥1 row | REQUIRED | | |
| I-05 | Seed data: 4 users in `auth.users` (ADMIN, MANAGER, 2x WORKER) | REQUIRED | | |
| I-06 | Seed data: 1 OPEN job in `app.jobs` with future work_date | REQUIRED | | |
| I-07 | Seed data: 1 PENDING application in `app.job_applications` | REQUIRED | | |
| I-08 | Redis receives connections from at least one client | optional | | |

**Section 1 result**: PASS / FAIL / PARTIAL

---

## Section 2 — Service Boot

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| B-01 | `GET http://localhost:3001/health` returns `{"status":"ok"}` | REQUIRED | | |
| B-02 | `GET http://localhost:8000/health` returns `{"status":"ok"}` | REQUIRED | | |
| B-03 | `GET http://localhost:3000/ko` returns HTTP 200 | REQUIRED | | |
| B-04 | NestJS startup log shows no unhandled errors | REQUIRED | | |
| B-05 | Laravel startup log shows no PHP fatal errors | REQUIRED | | |
| B-06 | Next.js build log shows no compilation errors | REQUIRED | | |
| B-07 | CORS header present on NestJS API response for localhost:3000 | optional | | |

**Section 2 result**: PASS / FAIL / PARTIAL

---

## Section 3 — Firebase Auth

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| F-01 | Firebase Auth emulator running at localhost:9099 | REQUIRED | | |
| F-02 | Unauthenticated request to `GET /v1/me` (NestJS) returns 401 | REQUIRED | | |
| F-03 | Unauthenticated request to `GET /v1/me` (Laravel) returns 401 | REQUIRED | | |
| F-04 | Invalid token returns 401 on both services | REQUIRED | | |
| F-05 | Valid emulator token for worker returns user with `role: "WORKER"` | REQUIRED | | |
| F-06 | Valid emulator token for manager returns user with `role: "MANAGER"` | REQUIRED | | |
| F-07 | Valid emulator token for admin returns user with `role: "ADMIN"` | REQUIRED | | |
| F-08 | Worker token returns 403 on admin route (`GET /v1/admin/users`) | REQUIRED | | |
| F-09 | Manager token returns 403 on admin route | REQUIRED | | |
| F-10 | Worker token returns 403 on manager-only route | REQUIRED | | |
| F-11 | Token expiry: expired token rejected (test with forged exp in past) | optional | | |
| F-12 | SUSPENDED user status blocked — returns 403 (known bug: currently only DELETED is blocked) | REQUIRED | | `❌ KNOWN BUG — see KI-001` |

**Section 3 result**: PASS / FAIL / PARTIAL

---

## Section 4 — Public Web (Next.js)

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| P-01 | `/ko` renders job listing page with ≥1 job card | REQUIRED | | |
| P-02 | `/ko/jobs/dev-concrete-hanoi-001` renders job detail with wage 500,000 VND | REQUIRED | | |
| P-03 | Job listing page shows province filter | optional | | |
| P-04 | Job listing page shows trade filter | optional | | |
| P-05 | Pagination present when > page size jobs exist | optional | | |
| P-06 | `/ko/jobs/dev-concrete-hanoi-001` shows site name and address | REQUIRED | | |
| P-07 | No Next.js console errors on any public page | REQUIRED | | |
| P-08 | `robots.txt` accessible at `/robots.txt` | optional | | |
| P-09 | `sitemap.xml` accessible at `/sitemap.xml` | optional | | |
| P-10 | Page loads without NEXT_PUBLIC_GOOGLE_MAPS_API_KEY set (no crash) | optional | | |

**Section 4 result**: PASS / FAIL / PARTIAL

---

## Section 5 — Facebook Login

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| FB-01 | Facebook login button visible on auth page | REQUIRED | | |
| FB-02 | Clicking button opens Firebase/Facebook OAuth popup | REQUIRED | | |
| FB-03 | Completing Facebook OAuth returns user to app with session | REQUIRED | | |
| FB-04 | Backend `POST /v1/auth/social/facebook` accepts valid Firebase idToken | REQUIRED | | |
| FB-05 | New Facebook user created in `auth.users` with email populated | REQUIRED | | |
| FB-06 | Returning Facebook user matches existing account (no duplicate) | REQUIRED | | |
| FB-07 | `isNewUser: true` returned on first login, `false` on subsequent | optional | | |
| FB-08 | Session persists across page refresh | REQUIRED | | |

> **Setup note**: Facebook OAuth requires a Facebook Developer App with
> `http://localhost:3000` added as a valid OAuth redirect URI.
> If not configured, FB-02 will fail. See `local-known-issues.md` → KI-009.

**Section 5 result**: PASS / FAIL / PARTIAL

---

## Section 6 — Google Maps / Address

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| G-01 | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set in `apps/web-next/.env.local` | REQUIRED | | |
| G-02 | Maps JavaScript API loads without 403/RefererNotAllowedMapError | REQUIRED | | |
| G-03 | Address autocomplete works in Manager site creation form | REQUIRED | | |
| G-04 | Selecting an autocomplete suggestion populates lat/lng fields | REQUIRED | | |
| G-05 | Address autocomplete works in Worker profile address step | REQUIRED | | |
| G-06 | Site saved with non-null `lat` and `lng` values | REQUIRED | | |
| G-07 | Without API key: address input renders as plain text (no blank screen) | optional | | |

**Section 6 result**: PASS / FAIL / PARTIAL

---

## Section 7 — File Upload (S3)

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| S-01 | `POST /v1/files/presigned-url` returns a URL with < 300 s expiry | REQUIRED | | |
| S-02 | `PUT` to presigned URL with test file returns HTTP 200 | REQUIRED | | |
| S-03 | `POST /v1/files/confirm` registers file and returns access URL | REQUIRED | | |
| S-04 | Worker can upload ID document via `/v1/worker/profile/id-documents` | REQUIRED | | |
| S-05 | Worker can upload signature via `/v1/worker/profile/signature` | REQUIRED | | |
| S-06 | Manager can upload site image via `/v1/manager/sites/{id}/images` | REQUIRED | | |
| S-07 | Manager can upload job image via `/v1/manager/jobs/{id}/images` | optional | | |
| S-08 | Uploaded files not publicly accessible without presigned URL (bucket is private) | REQUIRED | | |
| S-09 | CDN URL returned when `CDN_BASE_URL` is set | optional | | |

> **Local note**: requires real AWS credentials or LocalStack.
> See `local-known-issues.md` → KI-008.

**Section 7 result**: PASS / FAIL / PARTIAL

---

## Section 8 — Queue Worker

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| Q-01 | No queue worker required for contract generation (synchronous) | REQUIRED | | |
| Q-02 | No queue worker required for notifications (FCM direct send) | REQUIRED | | |
| Q-03 | No orphan jobs stuck in Redis BullMQ queues | optional | | |
| Q-04 | Laravel `QUEUE_CONNECTION=sync` confirmed in `.env` | REQUIRED | | |

**Section 8 result**: PASS / FAIL / PARTIAL

---

## Section 9 — Worker Core Flow

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| WF-01 | Worker can view public job listing | REQUIRED | | |
| WF-02 | Worker can view job detail by slug | REQUIRED | | |
| WF-03 | Worker can apply to a job (returns PENDING application) | REQUIRED | | |
| WF-04 | Worker cannot apply twice to same job (returns 409 or 422) | REQUIRED | | |
| WF-05 | Worker can view own applications list | REQUIRED | | |
| WF-06 | Worker can view own profile | REQUIRED | | |
| WF-07 | Worker can update profile (name, DOB, trade) | REQUIRED | | |
| WF-08 | Worker profile `profileComplete` becomes `true` after all required fields set | REQUIRED | | |
| WF-09 | Worker can view attendance records | REQUIRED | | |
| WF-10 | Worker can cancel own PENDING application | optional | | |
| WF-11 | Worker can view hire records | REQUIRED | | |
| WF-12 | Worker can view and sign contract | REQUIRED | | |

**Section 9 result**: PASS / FAIL / PARTIAL

---

## Section 10 — Manager Approval Flow

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| MA-01 | Any authenticated user can register as manager candidate | REQUIRED | | |
| MA-02 | Newly registered manager has `approvalStatus: PENDING` | REQUIRED | | |
| MA-03 | Pending manager user CANNOT access manager-only routes | REQUIRED | | |
| MA-04 | Admin can view list of pending manager approvals | REQUIRED | | |
| MA-05 | Admin can view individual manager registration detail | REQUIRED | | |
| MA-06 | Admin can approve a manager registration | REQUIRED | | |
| MA-07 | After approval, manager user CAN access manager-only routes | REQUIRED | | |
| MA-08 | Admin can reject a manager registration with reason | REQUIRED | | |
| MA-09 | Admin can view all users | REQUIRED | | |
| MA-10 | Admin can delete a user | optional | | |
| MA-11 | Approved manager appears in approved state immediately (no cache delay) | REQUIRED | | |

**Section 10 result**: PASS / FAIL / PARTIAL

---

## Section 11 — Site and Job Creation

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| SJ-01 | Approved manager can list own sites | REQUIRED | | |
| SJ-02 | Approved manager can create a new site | REQUIRED | | |
| SJ-03 | Created site appears in manager's site list immediately | REQUIRED | | |
| SJ-04 | Manager can update site details | REQUIRED | | |
| SJ-05 | Manager can change site status (ACTIVE ↔ INACTIVE) | optional | | |
| SJ-06 | Manager can create a job on a site | REQUIRED | | |
| SJ-07 | Created job has `status: OPEN` and a generated slug | REQUIRED | | |
| SJ-08 | Created job appears in public job listing | REQUIRED | | |
| SJ-09 | Manager can update job details | REQUIRED | | |
| SJ-10 | Manager can close a job (`PATCH /jobs/{id}/status`) | optional | | |
| SJ-11 | Manager can delete a job with no accepted applications | optional | | |
| SJ-12 | Unapproved manager cannot create sites or jobs (403) | REQUIRED | | |

**Section 11 result**: PASS / FAIL / PARTIAL

---

## Section 12 — Application and Hiring

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| AH-01 | Manager can list applications for a job | REQUIRED | | |
| AH-02 | Manager can accept a single application | REQUIRED | | |
| AH-03 | Accepted application creates a hire record | REQUIRED | | |
| AH-04 | Manager can reject an application with reason | REQUIRED | | |
| AH-05 | Manager can bulk-accept multiple applications | REQUIRED | | |
| AH-06 | Manager can cancel a hire | optional | | |
| AH-07 | Accepting application beyond `slotsTotal` is blocked (returns 422) | REQUIRED | | |
| AH-08 | `slotsTotal` and `slotsFilled` counts update correctly after accept | REQUIRED | | |
| AH-09 | Manager can view full list of hires across all jobs | REQUIRED | | |
| AH-10 | Worker is notified (FCM push) when application accepted | optional | | |

**Section 12 result**: PASS / FAIL / PARTIAL

---

## Section 13 — Contract Generation

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| CG-01 | Manager can generate contract from ACCEPTED application | REQUIRED | | |
| CG-02 | Contract is uploaded to S3 (`contracts/{id}/contract.html`) | REQUIRED | | |
| CG-03 | Generated contract has `status: PENDING_WORKER_SIGN` | REQUIRED | | |
| CG-04 | Manager can view contract with presigned download URL | REQUIRED | | |
| CG-05 | Worker can view own contract | REQUIRED | | |
| CG-06 | Worker can sign contract with base64 PNG signature | REQUIRED | | |
| CG-07 | After worker signs: status becomes `PENDING_MANAGER_SIGN` | REQUIRED | | |
| CG-08 | Signature image uploaded to S3 (`contract-signatures/{id}/worker.png`) | REQUIRED | | |
| CG-09 | Manager can sign contract | REQUIRED | | |
| CG-10 | After manager signs: status becomes `FULLY_SIGNED` | REQUIRED | | |
| CG-11 | Application status updated to `CONTRACTED` after full signing | REQUIRED | | |
| CG-12 | Contract HTML is regenerated with both signature images embedded | optional | | |
| CG-13 | Cannot generate contract for PENDING (not yet accepted) application | REQUIRED | | |
| CG-14 | Cannot generate duplicate contract for same application | REQUIRED | | |

**Section 13 result**: PASS / FAIL / PARTIAL

---

## Section 14 — Attendance Update

| ID | Check | Req | Result | Notes |
|----|-------|-----|--------|-------|
| AT-01 | Manager can view attendance roster for a job on a work date | REQUIRED | | |
| AT-02 | Roster contains all hired workers for that job | REQUIRED | | |
| AT-03 | Manager can mark worker as ATTENDED with check-in/out times | REQUIRED | | |
| AT-04 | Manager can mark worker as ABSENT with reason | REQUIRED | | |
| AT-05 | Manager can mark worker as HALF_DAY | optional | | |
| AT-06 | Batch upsert updates multiple workers in one request | REQUIRED | | |
| AT-07 | Audit trail created on every attendance update | REQUIRED | | |
| AT-08 | Audit trail shows previous and new status | REQUIRED | | |
| AT-09 | Worker can view own attendance records | REQUIRED | | |
| AT-10 | Admin can update any attendance record | optional | | |
| AT-11 | Attendance cannot be marked for a date before the job's work_date | optional | | |

**Section 14 result**: PASS / FAIL / PARTIAL

---

## Sign-Off

| Section | Result | Blocker? | Notes |
|---------|--------|----------|-------|
| 1 — Infrastructure | | | |
| 2 — Service Boot | | | |
| 3 — Firebase Auth | | | |
| 4 — Public Web | | | |
| 5 — Facebook Login | | | |
| 6 — Google Maps | | | |
| 7 — File Upload | | | |
| 8 — Queue Worker | | | |
| 9 — Worker Core Flow | | | |
| 10 — Manager Approval | | | |
| 11 — Site/Job Creation | | | |
| 12 — Application/Hiring | | | |
| 13 — Contract Generation | | | |
| 14 — Attendance Update | | | |

**Overall verdict**: ☐ PASS — ready for staging  ☐ FAIL — blockers present  ☐ PARTIAL — proceed with caveats

**Signed off by**: _____________  **Date**: _____________

**Outstanding blockers** (reference `local-known-issues.md` KI IDs):
-
-
