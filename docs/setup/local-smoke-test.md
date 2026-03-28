# GADA VN — Local Smoke Test Plan

Run these tests after a clean `pnpm setup` (or after `make up && make db`).
Every command is self-contained and runnable directly in a terminal.
Expected output is shown under each command.

**Prerequisites**: all three servers running in separate terminals:
```bash
# Terminal 1
cd apps/api && pnpm dev          # NestJS  → http://localhost:3001

# Terminal 2
cd apps/web-next && pnpm dev     # Next.js → http://localhost:3000

# Terminal 3
cd apps/admin-laravel && php artisan serve --port=8000  # Laravel → http://localhost:8000
```

---

## ST-01 — Service Boot

### ST-01-A: PostgreSQL health
```bash
docker exec gada-vn-postgres pg_isready -U gadaadmin -d gada_vn
```
**Expected**: `/var/run/postgresql:5432 - accepting connections`

### ST-01-B: Redis health
```bash
docker exec gada-vn-redis redis-cli ping
```
**Expected**: `PONG`

### ST-01-C: NestJS API health
```bash
curl -s http://localhost:3001/health | jq .
```
**Expected**:
```json
{ "status": "ok", "ts": "2026-..." }
```

### ST-01-D: Laravel admin health
```bash
curl -s http://localhost:8000/health | jq .
```
**Expected**:
```json
{ "status": "ok", "ts": "2026-..." }
```

### ST-01-E: Next.js web boot
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ko
```
**Expected**: `200`

---

## ST-02 — Database Connection

### ST-02-A: Schema presence
```bash
docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn -c "\dn" | grep -E "auth|app|ref|ops"
```
**Expected**: lines containing `auth`, `app`, `ref`, `ops`

### ST-02-B: Migrations applied
```bash
docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn \
  -c "SELECT filename FROM public.migrations ORDER BY applied_at DESC LIMIT 5;"
```
**Expected**: rows listing migration file names (e.g. `001_init.sql`)

### ST-02-C: Seed data present
```bash
docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn \
  -c "SELECT phone, role, status FROM auth.users ORDER BY role;"
```
**Expected**: 4 rows — ADMIN, MANAGER, WORKER, WORKER

### ST-02-D: NestJS can query DB
```bash
curl -s "http://localhost:3001/v1/public/jobs?page=1" | jq '.data | length'
```
**Expected**: a number ≥ 1 (the seeded dev job)

### ST-02-E: Laravel can query DB
```bash
curl -s "http://localhost:8000/v1/public/jobs" | jq '.data | length'
```
**Expected**: a number ≥ 1

---

## ST-03 — Redis Connection

### ST-03-A: Redis key write/read via Laravel
```bash
# Laravel uses Redis for sessions and cache.
# Trigger a public endpoint which warms the cache, then inspect Redis.
curl -s http://localhost:8000/v1/public/provinces > /dev/null
docker exec gada-vn-redis redis-cli keys "*" | head -10
```
**Expected**: one or more keys (Laravel cache entries)

### ST-03-B: Redis reachable from NestJS
```bash
# NestJS reads REDIS_URL from env. A successful server start implies connection.
# Verify directly:
docker exec gada-vn-redis redis-cli -e CLIENT LIST | grep -c "cmd="
```
**Expected**: number ≥ 1 (active client connections)

---

## ST-04 — Queue Worker

> **Architecture note**: this project does not currently have a dedicated BullMQ
> or Laravel Queue worker process. Contract generation and notifications are handled
> synchronously. See `local-known-issues.md` → KI-007 for details.

### ST-04-A: Verify no orphan queue jobs
```bash
docker exec gada-vn-redis redis-cli keys "bull:*"
```
**Expected**: `(empty array)` — no BullMQ queues registered

### ST-04-B: Verify Laravel queue is sync mode
```bash
grep QUEUE_CONNECTION apps/admin-laravel/.env
```
**Expected**: `QUEUE_CONNECTION=sync` or `QUEUE_CONNECTION=redis`
If redis: confirm `php artisan queue:work` is not required for basic flows.

---

## ST-05 — File Upload (S3 Presigned URL)

> **Prerequisite**: AWS credentials in `.env.local`. For local dev without real AWS,
> configure LocalStack (see `local-known-issues.md` → KI-008).
> If not configured, ST-05-B and beyond will fail with 403.

### ST-05-A: Request presigned URL (NestJS)
```bash
# Requires a valid Firebase ID token. Use the emulator token for the dev worker.
# Replace TOKEN with a real ID token from the Firebase emulator.
TOKEN="<dev-worker-firebase-id-token>"

curl -s -X POST http://localhost:3001/v1/files/presigned-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folder":"id-documents","filename":"test.jpg","contentType":"image/jpeg"}' \
  | jq '{url: .data.url, key: .data.key}'
```
**Expected**:
```json
{
  "url": "https://gada-vn-local-uploads.s3.ap-southeast-1.amazonaws.com/...",
  "key": "id-documents/<userId>/<uuid>.jpg"
}
```

### ST-05-B: Upload to presigned URL
```bash
PRESIGNED_URL="<url from ST-05-A>"

curl -s -X PUT "$PRESIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/dev/urandom \
  --max-time 5 \
  -o /dev/null -w "%{http_code}"
```
**Expected**: `200`

### ST-05-C: Confirm upload
```bash
KEY="<key from ST-05-A>"

curl -s -X POST http://localhost:3001/v1/files/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$KEY\",\"type\":\"ID_DOCUMENT\"}" \
  | jq '.data.url'
```
**Expected**: a presigned GET URL or CDN URL for the uploaded file

---

## ST-06 — Firebase Auth Integration

### ST-06-A: Unauthenticated request rejected
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/v1/me
```
**Expected**: `401`

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/v1/me
```
**Expected**: `401`

### ST-06-B: Invalid token rejected
```bash
curl -s -X GET http://localhost:3001/v1/me \
  -H "Authorization: Bearer invalid.token.here" \
  | jq '.statusCode'
```
**Expected**: `401`

### ST-06-C: Valid emulator token accepted
> Obtain a token from the Firebase Auth emulator UI at http://localhost:4000
> or by calling `signInWithPhoneNumber` in the mobile/web app.

```bash
TOKEN="<valid firebase id token from emulator>"

curl -s http://localhost:3001/v1/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{id: .data.id, role: .data.role, phone: .data.phone}'
```
**Expected**:
```json
{ "id": "...", "role": "WORKER", "phone": "+84900000001" }
```

### ST-06-D: Role middleware — worker cannot access admin route
```bash
curl -s -X GET http://localhost:8000/v1/admin/users \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  | jq '.statusCode'
```
**Expected**: `403`

### ST-06-E: Role middleware — manager cannot access admin route
```bash
curl -s -X GET http://localhost:8000/v1/admin/users \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '.statusCode'
```
**Expected**: `403`

---

## ST-07 — Facebook Login Integration

### ST-07-A: Endpoint exists and rejects missing token
```bash
curl -s -X POST http://localhost:8000/v1/auth/social/facebook \
  -H "Content-Type: application/json" \
  -d '{}' \
  | jq '.statusCode'
```
**Expected**: `422` or `400` (validation error — missing idToken field)

### ST-07-B: Full Facebook flow (manual — requires browser)
1. Open `http://localhost:3000/ko` in a browser
2. Click **Login** → **Continue with Facebook**
3. Confirm Facebook OAuth popup opens
4. Complete Facebook login
5. Confirm redirect back to app with session established
6. Verify: `GET http://localhost:3001/v1/me` returns user with email from Facebook

> **Note**: Requires a Facebook Developer App configured with `localhost:3000`
> as an allowed OAuth origin. See `local-known-issues.md` → KI-009 for setup.

### ST-07-C: Firebase verifies Facebook credential (backend validation)
```bash
# After ST-07-B succeeds, the session cookie `gada_session` holds the Firebase ID token.
# Manually extract and test:
FB_TOKEN="<id token from facebook login>"

curl -s -X POST http://localhost:8000/v1/auth/social/facebook \
  -H "Content-Type: application/json" \
  -d "{\"idToken\":\"$FB_TOKEN\"}" \
  | jq '{isNewUser: .data.isNewUser, role: .data.user.role}'
```
**Expected**: `{ "isNewUser": false, "role": "WORKER" }` (or MANAGER)

---

## ST-08 — Google Maps / Address Autocomplete

> Google Maps is used for address autocomplete in two forms:
> - Manager site creation (`SiteForm.tsx`)
> - Worker profile address step (`AddressStep.tsx`)
>
> Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to be set.
> Without a key the input renders but autocomplete is disabled.

### ST-08-A: Maps script loads (manual — browser DevTools)
1. Open `http://localhost:3000/ko/manager/sites/new` (logged in as manager)
2. Open DevTools → Network tab → filter by `maps.googleapis.com`
3. Confirm the Maps JavaScript API script loads with status 200
4. **Expected**: request to `maps.googleapis.com/maps/api/js?key=...&libraries=places`

### ST-08-B: Autocomplete works (manual)
1. On the site creation form, click the **Address** field
2. Type `123 Lê Duẩn`
3. **Expected**: dropdown of address suggestions appears
4. Select a suggestion
5. **Expected**: Latitude/Longitude fields auto-populate

### ST-08-C: Coordinates stored (API validation)
```bash
# After submitting site creation form, check the created site:
curl -s http://localhost:8000/v1/manager/sites \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '.data[0] | {name, lat, lng}'
```
**Expected**: `lat` and `lng` are non-null floating-point values

### ST-08-D: No API key — graceful degradation
```bash
# Temporarily unset the key:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="" pnpm --filter=@gada-vn/web dev
```
1. Open site creation form
2. **Expected**: address input renders as plain text input (no crash, no blank screen)
3. Coordinates fields remain empty (user must enter manually)

---

## ST-09 — Worker Core Flow

Seed worker: phone `+84900000001`, OTP `123456` (emulator)

### ST-09-A: Public job listing
```bash
curl -s "http://localhost:3001/v1/public/jobs?page=1" \
  | jq '.data.jobs[] | {title: .title, slug: .slug, status: .status}'
```
**Expected**: contains the seeded dev job with `status: "OPEN"`

### ST-09-B: Public job detail by slug
```bash
curl -s "http://localhost:3001/v1/public/jobs/dev-concrete-hanoi-001" \
  | jq '{title: .data.title, dailyWage: .data.dailyWage, slotsTotal: .data.slotsTotal}'
```
**Expected**:
```json
{ "title": "콘크리트 타설 작업 (Dev Job)", "dailyWage": 500000, "slotsTotal": 3 }
```

### ST-09-C: Worker applies to job
```bash
JOB_ID="00000000-0000-0000-0000-000000000040"

curl -s -X POST "http://localhost:3001/v1/jobs/$JOB_ID/apply" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  | jq '{applicationId: .data.id, status: .data.status}'
```
**Expected**: `{ "applicationId": "...", "status": "PENDING" }`
> Worker 1 already has a seeded application; use worker 2 token (`+84900000002`) to test a fresh apply.

### ST-09-D: Worker views applications
```bash
curl -s http://localhost:3001/v1/worker/applications \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  | jq '.data[] | {jobTitle: .job.title, status}'
```
**Expected**: at least one application with `status: "PENDING"`

### ST-09-E: Worker views profile
```bash
curl -s http://localhost:3001/v1/worker/profile \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  | jq '{fullName: .data.fullName, profileComplete: .data.profileComplete}'
```
**Expected**: `{ "fullName": "Nguyễn Văn An", "profileComplete": true }`

---

## ST-10 — Manager Approval Flow

Seed admin: phone `+82100000001`, OTP `123456` (emulator)
Seed manager: phone `+82100000002`, OTP `123456` (emulator)

### ST-10-A: Admin views pending approvals
```bash
curl -s http://localhost:8000/v1/admin/manager-approvals \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data | length'
```
**Expected**: 0 (seeded manager is already APPROVED)
> To test the approval flow: register a new manager via `POST /v1/manager/register`.

### ST-10-B: Register a new test manager
```bash
curl -s -X POST http://localhost:8000/v1/manager/register \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "INDIVIDUAL",
    "companyName": "Test Corp",
    "representativeName": "Test Person",
    "representativeDob": "1985-01-01",
    "contactPhone": "+84901000099",
    "contactAddress": "123 Test St",
    "province": "HCM",
    "termsAccepted": true,
    "privacyAccepted": true
  }' | jq '{id: .data.id, approvalStatus: .data.approvalStatus}'
```
**Expected**: `{ "approvalStatus": "PENDING" }`

### ST-10-C: Admin approves manager
```bash
APPROVAL_ID="<id from ST-10-B>"

curl -s -X PATCH \
  "http://localhost:8000/v1/admin/manager-approvals/$APPROVAL_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data.approvalStatus'
```
**Expected**: `"APPROVED"`

### ST-10-D: Admin rejects manager (alternative path)
```bash
# Register another test manager first, then:
curl -s -X PATCH \
  "http://localhost:8000/v1/admin/manager-approvals/$ANOTHER_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Incomplete business documentation"}' \
  | jq '.data.approvalStatus'
```
**Expected**: `"REJECTED"`

---

## ST-11 — Site and Job Creation

Seed manager token: phone `+82100000002`, OTP `123456` (emulator)
Seed site ID: `00000000-0000-0000-0000-000000000030`

### ST-11-A: Manager lists sites
```bash
curl -s http://localhost:8000/v1/manager/sites \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '.data[] | {id, name, status}'
```
**Expected**: contains seeded site `Dự án Chung cư Hà Nội (Dev)` with `status: "ACTIVE"`

### ST-11-B: Create a new site
```bash
curl -s -X POST http://localhost:8000/v1/manager/sites \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Site (Smoke)",
    "address": "456 Nguyễn Huệ, Quận 1",
    "province": "HCM",
    "district": "Quận 1",
    "lat": 10.7731,
    "lng": 106.7030,
    "siteType": "COMMERCIAL"
  }' | jq '{id: .data.id, name: .data.name}'
```
**Expected**: new site returned with generated `id`

### ST-11-C: Create a job on existing site
```bash
SITE_ID="00000000-0000-0000-0000-000000000030"

curl -s -X POST "http://localhost:8000/v1/manager/sites/$SITE_ID/jobs" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Thợ hàn (Smoke Test)",
    "description": "Công việc hàn khung thép tầng 5.",
    "tradeCode": "STEEL",
    "workDate": "2026-04-01",
    "startTime": "07:00",
    "endTime": "17:00",
    "dailyWage": 450000,
    "currency": "VND",
    "slotsTotal": 2,
    "benefits": {"meals": true, "transport": false, "accommodation": false, "insurance": false},
    "requirements": {"experience_months": 6}
  }' | jq '{id: .data.id, status: .data.status, slug: .data.slug}'
```
**Expected**: `{ "status": "OPEN", "slug": "..." }`

### ST-11-D: Manager lists jobs for site
```bash
curl -s "http://localhost:8000/v1/manager/sites/$SITE_ID/jobs" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '[.data[] | {title, status}]'
```
**Expected**: array including the seeded dev job and ST-11-C job

### ST-11-E: Job appears in public listing
```bash
SLUG="<slug from ST-11-C>"
curl -s "http://localhost:3001/v1/public/jobs/$SLUG" | jq '.data.status'
```
**Expected**: `"OPEN"`

---

## ST-12 — Application and Hiring

Seeded application ID: `00000000-0000-0000-0000-000000000050` (worker 1 → dev job, PENDING)

### ST-12-A: Manager views applications for seeded job
```bash
JOB_ID="00000000-0000-0000-0000-000000000040"

curl -s "http://localhost:8000/v1/manager/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '.data[] | {id, workerName: .worker.fullName, status}'
```
**Expected**: contains the seeded PENDING application for Nguyễn Văn An

### ST-12-B: Manager accepts application
```bash
APP_ID="00000000-0000-0000-0000-000000000050"

curl -s -X PATCH "http://localhost:8000/v1/manager/applications/$APP_ID/accept" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '{id: .data.id, status: .data.status}'
```
**Expected**: `{ "status": "ACCEPTED" }`

### ST-12-C: Hire record created
```bash
curl -s http://localhost:8000/v1/manager/hires \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '.data[] | {workerName: .worker.fullName, jobTitle: .job.title}'
```
**Expected**: Nguyễn Văn An listed as hired for the dev job

### ST-12-D: Manager rejects a different application (create one first)
```bash
# Apply as worker 2 (+84900000002) then reject:
curl -s -X POST "http://localhost:3001/v1/jobs/$JOB_ID/apply" \
  -H "Authorization: Bearer $WORKER2_TOKEN" \
  | jq '.data.id'
# Then:
APP2_ID="<id from above>"
curl -s -X PATCH "http://localhost:8000/v1/manager/applications/$APP2_ID/reject" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '.data.status'
```
**Expected**: `"REJECTED"`

### ST-12-E: Bulk accept
```bash
# Apply as worker 2 (fresh), then bulk accept:
curl -s -X POST "http://localhost:8000/v1/manager/jobs/$JOB_ID/applications/bulk-accept" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"applicationIds\":[\"$APP2_ID\"]}" \
  | jq '.data.accepted'
```
**Expected**: `1`

---

## ST-13 — Contract Generation

> **Prerequisite**: ST-12-B must pass (application in ACCEPTED state).
> **Prerequisite**: S3 must be reachable (real AWS or LocalStack).

### ST-13-A: Manager generates contract
```bash
APP_ID="00000000-0000-0000-0000-000000000050"

curl -s -X POST \
  "http://localhost:8000/v1/manager/applications/$APP_ID/contract" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '{id: .data.id, status: .data.status}'
```
**Expected**: `{ "status": "PENDING_WORKER_SIGN" }`

### ST-13-B: Manager views contract
```bash
CONTRACT_ID="<id from ST-13-A>"

curl -s "http://localhost:8000/v1/manager/contracts/$CONTRACT_ID" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '{id: .data.id, status: .data.status, downloadUrl: (.data.downloadUrl | .[0:60])}'
```
**Expected**: `downloadUrl` is a non-null presigned S3 URL beginning with `https://`

### ST-13-C: Worker signs contract
```bash
# Base64 encode a minimal 1x1 white PNG as signature placeholder
SIGNATURE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="

curl -s -X POST \
  "http://localhost:8000/v1/worker/contracts/$CONTRACT_ID/sign" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"signatureDataUrl\":\"$SIGNATURE\"}" \
  | jq '.data.status'
```
**Expected**: `"PENDING_MANAGER_SIGN"`

### ST-13-D: Manager signs contract
```bash
curl -s -X POST \
  "http://localhost:8000/v1/manager/contracts/$CONTRACT_ID/sign" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"signatureDataUrl\":\"$SIGNATURE\"}" \
  | jq '.data.status'
```
**Expected**: `"FULLY_SIGNED"`

### ST-13-E: Application status updated after full signing
```bash
curl -s \
  "http://localhost:8000/v1/manager/jobs/$JOB_ID/applications" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '.data[] | select(.id == "'$APP_ID'") | .status'
```
**Expected**: `"CONTRACTED"`

---

## ST-14 — Attendance Update

> **Prerequisite**: at least one hire record exists for the dev job (ST-12-B).

### ST-14-A: Manager views attendance roster
```bash
JOB_ID="00000000-0000-0000-0000-000000000040"
WORK_DATE="$(date -v+7d +%Y-%m-%d 2>/dev/null || date -d '+7 days' +%Y-%m-%d)"

curl -s \
  "http://localhost:8000/v1/manager/jobs/$JOB_ID/attendance?date=$WORK_DATE" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '{workDate: .data.workDate, rosterCount: (.data.roster | length)}'
```
**Expected**: `rosterCount` ≥ 1 (seeded worker listed)

### ST-14-B: Mark worker as attended
```bash
WORKER_ID="00000000-0000-0000-0000-000000000020"

curl -s -X PUT \
  "http://localhost:8000/v1/manager/jobs/$JOB_ID/attendance" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"workDate\": \"$WORK_DATE\",
    \"records\": [{
      \"workerId\": \"$WORKER_ID\",
      \"status\": \"ATTENDED\",
      \"checkInTime\": \"07:05\",
      \"checkOutTime\": \"17:10\",
      \"hoursWorked\": 10.0
    }]
  }" | jq '.data[0] | {status, checkInTime}'
```
**Expected**: `{ "status": "ATTENDED", "checkInTime": "07:05" }`

### ST-14-C: Mark worker as absent
```bash
curl -s -X PUT \
  "http://localhost:8000/v1/manager/jobs/$JOB_ID/attendance" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"workDate\": \"$WORK_DATE\",
    \"records\": [{
      \"workerId\": \"$WORKER_ID\",
      \"status\": \"ABSENT\",
      \"reason\": \"Personal emergency\"
    }]
  }" | jq '.data[0].status'
```
**Expected**: `"ABSENT"`

### ST-14-D: Attendance audit trail
```bash
# Get the attendanceId from ST-14-B response, then:
ATTENDANCE_ID="<id from ST-14-B>"

curl -s \
  "http://localhost:8000/v1/manager/jobs/$JOB_ID/attendance/$ATTENDANCE_ID/audit" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  | jq '[.data[] | {status: .newStatus, changedAt}]'
```
**Expected**: array of 2+ entries showing the ATTENDED → ABSENT change

### ST-14-E: Worker views own attendance
```bash
curl -s http://localhost:8000/v1/worker/attendance \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  | jq '.data[] | {jobTitle: .job.title, status, workDate}'
```
**Expected**: attendance record for the dev job

---

## ST-15 — End-to-End Web Flows (Browser)

Run these manually in Chrome/Safari with DevTools open. Check Console for errors.

| # | Steps | Pass Criteria |
|---|-------|---------------|
| W-01 | Open `http://localhost:3000/ko` | Page loads, job cards visible, no console errors |
| W-02 | Click job card → job detail page | Detail page renders with wage, benefits, requirements |
| W-03 | Click **Apply** without login | Redirected to login page |
| W-04 | Login with phone `+84900000001` + OTP `123456` (emulator) | Session cookie `gada_session` set, redirected back |
| W-05 | Click **Apply** when logged in | Application submitted, button changes to "Applied" |
| W-06 | Login as manager (`+82100000002`) → Manager dashboard | Sites and jobs listed |
| W-07 | Open job → Applications tab | Pending application from worker visible |
| W-08 | Accept application | Status changes to ACCEPTED inline |
| W-09 | Generate contract | Contract created, status shows PENDING_WORKER_SIGN |
| W-10 | Sign as manager → sign as worker | Final status FULLY_SIGNED |
| W-11 | Open attendance page for dev job on work date | Roster visible, worker name listed |
| W-12 | Mark attendance ATTENDED → save | Row updates without page reload |

---

## Quick Reference — Seed IDs

| Entity | ID |
|--------|----|
| Admin user | `00000000-0000-0000-0000-000000000001` |
| Manager user | `00000000-0000-0000-0000-000000000002` |
| Worker 1 (Nguyễn Văn An) | `00000000-0000-0000-0000-000000000003` |
| Worker 2 (Trần Thị Bình) | `00000000-0000-0000-0000-000000000004` |
| Manager profile | `00000000-0000-0000-0000-000000000010` |
| Worker 1 profile | `00000000-0000-0000-0000-000000000020` |
| Construction site | `00000000-0000-0000-0000-000000000030` |
| Dev job | `00000000-0000-0000-0000-000000000040` |
| Worker 1 application | `00000000-0000-0000-0000-000000000050` |

| Role | Phone | OTP |
|------|-------|-----|
| Admin | `+82100000001` | `123456` |
| Manager | `+82100000002` | `123456` |
| Worker 1 | `+84900000001` | `123456` |
| Worker 2 | `+84900000002` | `123456` |
