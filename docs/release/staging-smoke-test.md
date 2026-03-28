# GADA VN — Staging Smoke Test Checklist

**Run after**: Every staging deployment
**Estimated time**: ~45 minutes
**Pre-condition**: `docs/release/staging-config-checklist.md` must be signed off first.

**Base URLs**:
```
WEB   = https://staging.gada.vn
API   = https://api.staging.gada.vn
ADMIN = https://admin.staging.gada.vn
CDN   = https://cdn.staging.gada.vn
```

> **URL note**: staging subdomains use `<service>.staging.gada.vn` pattern (not `<service>-staging.gada.vn`).
> All commands below use this scheme.

**Pass criteria**: All P0 checks must pass before QA testing begins. P1/P2 failures are logged as bugs.

---

## Legend
- `[ ]` — check not yet run
- `[x]` — PASS
- `[!]` — FAIL — log in the staging issue tracker with screenshot/curl output

---

## A. Infrastructure Health (5 min)

**Run these before touching any application UI.**

### A1. ECS services are running

```bash
aws ecs describe-services \
  --cluster gada-vn-staging-cluster \
  --services gada-vn-staging-api gada-vn-staging-web gada-vn-staging-admin \
  --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount,status:status}' \
  --region ap-southeast-1
```

- [ ] **P0** `gada-vn-staging-api` — `runningCount == desiredCount`, `status: ACTIVE`
- [ ] **P0** `gada-vn-staging-web` — `runningCount == desiredCount`, `status: ACTIVE`
- [ ] **P0** `gada-vn-staging-admin` — `runningCount == desiredCount`, `status: ACTIVE`

### A2. Service health endpoints

```bash
curl -sf https://api.staging.gada.vn/health | jq .
curl -sf https://admin.staging.gada.vn/health | jq .
curl -sf https://api.staging.gada.vn/v1/public/jobs | jq .statusCode
curl -I https://staging.gada.vn/ko
```

- [ ] **P0** `GET https://api.staging.gada.vn/health` → `{ "status": "ok", "ts": "..." }`
- [ ] **P0** `GET https://admin.staging.gada.vn/health` → `{ "status": "ok", "ts": "..." }`
- [ ] **P0** `GET https://api.staging.gada.vn/v1/public/jobs` → `{ statusCode: 200, data: { jobs: [...] } }`
- [ ] **P0** `GET https://staging.gada.vn/ko` → HTTP 200 (not 500, not redirect loop)
- [ ] **P0** `GET https://admin.staging.gada.vn` → HTTP 200 (admin login page renders)

### A3. HTTPS enforced

```bash
# HTTP must redirect to HTTPS
curl -s -o /dev/null -w "%{http_code}" http://api.staging.gada.vn/health
curl -s -o /dev/null -w "%{http_code}" http://staging.gada.vn/ko
```

- [ ] **P0** Both return `301` or `302` (not 200 — HTTP must not serve content directly)

### A4. CDN responds

```bash
curl -I https://cdn.staging.gada.vn 2>&1 | grep -E "HTTP|via|x-cache"
```

- [ ] **P0** Response contains `via: 1.1 CloudFront` header

### A5. Database connectivity

```bash
# Verify migration state — all 8 migrations should be applied
psql $STAGING_DB_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' ORDER BY table_name;"
```

- [ ] **P0** Tables present: `attendance_records`, `attendance_audits`, `construction_sites`, `contracts`, `job_applications`, `job_shifts`, `jobs`, `manager_profiles`, `worker_profiles`
- [ ] **P0** Tables present in `auth`: `users`, `user_roles`
- [ ] **P0** Tables present in `ref`: `construction_trades`, `vn_provinces`
- [ ] **P0** Tables present in `ops`: `audit_logs`, `fcm_tokens`, `notifications`

### A6. Reference data seeded

```bash
curl -s https://api.staging.gada.vn/v1/public/trades | jq '.data | length'
curl -s https://api.staging.gada.vn/v1/public/provinces | jq '.data | length'
```

- [ ] **P0** Trades endpoint returns ≥ 15 trades
- [ ] **P0** Provinces endpoint returns ≥ 15 provinces

### A7. Config safety checks

```bash
# Firebase emulator must NOT be active
curl -s https://api.staging.gada.vn/v1/me \
  -H "Authorization: Bearer emulator-test-token-123" | jq '.statusCode'
# Expected: 401 (not 200 — emulator tokens must be rejected)

# APP_DEBUG must be off — stack trace must not appear in error body
curl -s https://admin.staging.gada.vn/v1/nonexistent | jq 'has("exception")'
# Expected: false
```

- [ ] **P0** Emulator token rejected (401, not 200)
- [ ] **P0** PHP stack traces absent from error responses (`APP_DEBUG=false`)

---

## B. Authentication Flows (8 min)

Uses Firebase staging project (`gada-vn-staging`). Test phone numbers must be pre-registered in Firebase Console with OTP `123456`.

### B1. Worker phone OTP login

**Test phone**: `+84900000001`

1. Open `https://staging.gada.vn/ko/login`
2. Enter `+84900000001`, tap "인증번호 받기"
3. Enter OTP from Firebase staging project (not emulator — real SMS)
4. Confirm redirect to worker home page

- [ ] **P0** OTP send button triggers request to `POST https://api.staging.gada.vn/v1/auth/otp/send` → `{ statusCode: 200 }`
- [ ] **P0** OTP verify sets `gada_session` cookie (visible in browser DevTools → Application → Cookies)
- [ ] **P0** Worker home page loads without 401 error

### B2. Manager phone OTP login

**Test phone**: `+84900000002`

1. Open `https://staging.gada.vn/ko/login`
2. Enter `+84900000002`, tap "인증번호 받기"
3. Enter OTP `123456`
4. Confirm redirect to manager home page (or approval-pending page if not yet approved)

- [ ] **P0** Login succeeds
- [ ] **P0** Manager routes accessible (not 403)

### B3. Suspended user is blocked

**Test phone** (fixture `worker-suspended`): create manually in Firebase staging console and set `status='SUSPENDED'` in `auth.users`

1. Log in as suspended worker
2. Attempt to access `/ko/worker` dashboard

- [ ] **P0** API returns 403 — **known bug KI-001**: currently only `DELETED` status is blocked; verify fix is deployed
- [ ] **P0** UI shows appropriate error (not 500 or blank page)

### B4. Session cookie persistence

1. Log in as worker-01
2. Close browser tab, reopen `https://staging.gada.vn`

- [ ] **P1** Session persists (not logged out) — cookie `max-age` should be 604800 (7 days) as per P0 fix

### B5. Admin panel login

1. Navigate to `https://admin.staging.gada.vn`
2. Enter admin panel password (from Secrets Manager: `gada-vn-staging/app/admin-panel-password`)

- [ ] **P0** Admin panel login succeeds
- [ ] **P0** Dashboard page renders with stats cards (no 500 error)

---

## C. Public Job Listing (5 min)

### C1. Job listing page

1. Open `https://staging.gada.vn/ko/jobs`
   (Note: `/ko` is required — root `/` redirects to `/ko` via next-intl middleware)

- [ ] **P0** Page renders with job cards visible (or empty-state message if no jobs seeded)
- [ ] **P0** No JavaScript console errors related to data fetching
- [ ] **P1** Province and trade filter dropdowns populated
- [ ] **P1** Page title and meta description set correctly (check `<head>`)

### C2. Province filter

1. Select "Hà Nội" from province dropdown

- [ ] **P0** URL updates to `/ko/jobs?province=ha-noi`
- [ ] **P0** Job list re-renders (or shows empty state)
- [ ] **P0** No 500 error

### C3. Job detail page

1. Click any job card
2. Observe job detail page

- [ ] **P0** Job detail page loads (HTTP 200)
- [ ] **P0** JSON-LD `<script type="application/ld+json">` present in page source
- [ ] **P1** Cover image renders (or gradient placeholder if no image)
- [ ] **P1** Related jobs section present with ≤ 4 jobs
- [ ] **P1** Site card shows site name and address

### C4. Public provinces page

1. Open `https://staging.gada.vn/ko/locations/ha-noi`

- [ ] **P0** Province page renders without 500 error
- [ ] **P1** Province-filtered job list appears

### C5. SEO meta tags

```bash
curl -s https://staging.gada.vn/ko/jobs | grep -E '<title>|og:title|og:description|canonical'
# Also verify NEXT_PUBLIC_SITE_URL is correctly set (no localhost in canonical):
curl -s https://staging.gada.vn/ko/jobs | grep canonical
```

- [ ] **P1** `<title>` tag present
- [ ] **P1** `og:title` and `og:description` present
- [ ] **P1** `<link rel="canonical">` present

---

## D. Worker Flows (8 min)

Log in as `worker-01` (phone `+84900000001`).

### D1. Worker profile

1. Navigate to profile page (`/ko/worker/profile`)

- [ ] **P0** Profile page renders
- [ ] **P0** Worker profile data loads (name, phone, trade)

### D2. Job application

1. Find an OPEN job (manager-approved fixture should have created one)
2. Click "지원하기" (Apply)

- [ ] **P0** Application submits successfully → status shows "검토중" (PENDING)
- [ ] **P0** Duplicate application rejected: apply to same job again → error message shown

### D3. Worker application list

1. Navigate to `/ko/worker/applications`

- [ ] **P0** Applications list renders with applied job
- [ ] **P0** Application status badge displayed

### D4. Worker contract view (requires accepted application)

1. After hire acceptance by manager, navigate to `/ko/worker/contracts`
2. Open contract detail

- [ ] **P0** Contract renders with worker and manager party information
- [ ] **P0** Worker signature pad is functional (draw a signature)
- [ ] **P0** Signature submits (`POST /api/v1/worker/contracts/{id}/sign`) → contract advances to `PENDING_MANAGER_SIGN`
- [ ] **P0** Worker response does **not** contain `manager_sig_url` (SEC-P0-04 fix verification)

### D5. ID document upload

1. Navigate to `/ko/worker/profile/id-upload`
2. Upload a test image file

- [ ] **P0** Upload succeeds (no 500 error)
- [ ] **P0** File size > 10MB rejected with validation error (SEC-P1-04 fix)

---

## E. Manager Flows (8 min)

Log in as an approved manager. Create one via the approval flow (Section F2) if no approved staging fixture exists yet.

### E1. Manager dashboard

1. Navigate to `/ko/manager`

- [ ] **P0** Manager home page renders
- [ ] **P0** Approved manager (not pending) can access manager routes

### E2. Site management

1. Navigate to `/ko/manager/sites`
2. Verify the seeded site appears

- [ ] **P0** Site list renders
- [ ] **P0** Site detail page accessible

### E3. Job management

1. Navigate to the seeded site, view jobs
2. Create a new job (title, trade, work date, daily wage, slots)

- [ ] **P0** Job creation form submits successfully
- [ ] **P0** New job appears in job list with status `OPEN`
- [ ] **P1** Job appears on public listing (`/ko/jobs`) after creation

### E4. Applicant list

1. Open a job with at least one applicant (use worker-01 fixture who applied in D2)
2. Navigate to `/ko/manager/jobs/{id}/applicants`

- [ ] **P0** Applicant list renders (no blank page)
- [ ] **P0** Worker name and status visible
- [ ] **P1** Tabs (전체/검토중/합격/불합격) switch applicant view

### E5. Accept application

1. Click "합격" (Accept) on worker-01's application

- [ ] **P0** Accept button triggers `PATCH /manager/applications/{id}/accept` → status changes to `ACCEPTED`
- [ ] **P0** Slot count in header updates (slots_filled increments)

### E6. Bulk accept (if ≥ 2 pending applicants)

1. Select multiple pending applicants
2. Click "일괄 합격" (Bulk Accept)

- [ ] **P0** All selected applicants → `ACCEPTED` in one operation
- [ ] **P1** Job status changes to `FILLED` when at capacity

### E7. Contract generation

1. After accepting an applicant, trigger contract generation
2. Navigate to `/ko/manager/contracts/{id}`

- [ ] **P0** Contract HTML renders correctly
- [ ] **P0** Manager signature pad works
- [ ] **P0** After manager signs → contract status `FULLY_SIGNED`
- [ ] **P0** Manager response includes `worker_sig_url` and `manager_sig_url`

---

## F. Admin Panel (5 min)

Log in as admin (see Step B5).

### F1. Dashboard

- [ ] **P0** Dashboard loads with stats cards
- [ ] **P0** No database query errors in CloudWatch logs (`/ecs/gada-vn-staging/api`)
- [ ] **P1** User growth chart renders
- [ ] **P1** Pending approvals list shows manager-pending fixture

### F2. Manager approval

1. Find `manager-pending` account in pending approvals
2. Click Approve

- [ ] **P0** Approval succeeds → manager status changes to `APPROVED`
- [ ] **P0** Approve button triggers status change in DB
- [ ] **P1** Approved manager can now access manager-role API endpoints

### F3. User management

1. Search for a user by phone number

- [ ] **P0** User appears in search results
- [ ] **P1** User detail view loads

---

## G. Mobile App (5 min)

Install the EAS preview build on a test device.

### G1. App launch

- [ ] **P0** App starts without crash (check Expo crash reporter)
- [ ] **P0** Splash screen shows (GADA VN logo, orange `#FF6B2C` background)

### G2. Phone OTP login

1. Enter `+84900000001`, request OTP
2. Enter `123456`

- [ ] **P0** Login succeeds
- [ ] **P0** Worker home tab accessible
- [ ] **P0** No "network error" — confirms `EXPO_PUBLIC_API_URL` points to `api.staging.gada.vn`
- [ ] **P0** OTP is a real SMS (not emulator `123456`) — Firebase staging project uses real Firebase Auth

### G3. Job browsing

1. Open Jobs tab
2. Browse job listing

- [ ] **P0** Jobs load from staging API (not empty, not production data)
- [ ] **P1** Province/trade filter works

### G4. Push notifications (FCM)

1. Trigger an event that sends a notification (e.g. application accepted)

- [ ] **P1** FCM notification received on test device
- [ ] **P1** Notification routes to correct screen on tap

---

## H. Language Switching (3 min)

### H1. Korean → Vietnamese

1. On job listing page, switch locale to Vietnamese (`/vi/jobs`)

- [ ] **P1** Page renders in Vietnamese (no Korean hardcoded strings)
- [ ] **P1** Job trade names show Vietnamese: "Bê tông", "Cốt thép", etc.

### H2. Vietnamese → English

1. Switch to `/en/jobs`

- [ ] **P2** Page renders in English
- [ ] **P2** Province names in English: "Hanoi", "Ho Chi Minh City"

---

## I. S3 and CDN (3 min)

### I1. Image delivery

1. Open a job with a cover image
2. Check image URL in browser DevTools → Network

- [ ] **P1** Image URL domain is `cdn-staging.gada.vn` or `*.cloudfront.net` (not `s3.amazonaws.com` directly)
- [ ] **P1** Image loads successfully (no 403 or 404)

### I2. S3 bucket isolation

```bash
# Request a presigned URL and verify bucket name
STAGING_TOKEN="<staging-firebase-id-token>"
curl -s -X POST "https://api.staging.gada.vn/v1/files/presigned-url" \
  -H "Authorization: Bearer $STAGING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folder":"id-documents","filename":"test.jpg","contentType":"image/jpeg"}' \
  | jq '.data.url' | grep "gada-vn-staging-uploads" && echo "✅ correct bucket" || echo "❌ wrong bucket"
```

- [ ] **P0** Presigned URLs reference `gada-vn-staging-uploads` bucket (not production bucket)
- [ ] **P0** Presigned URL domain is `gada-vn-staging-uploads.s3.ap-southeast-1.amazonaws.com` (not LocalStack localhost)

### I3. Contract download

1. Download a fully-signed contract

- [ ] **P1** Download link works (presigned URL resolves)
- [ ] **P1** Downloaded HTML is readable contract document

---

## J. Security Spot Checks (3 min)

Quick verification of P0 security fixes (from `docs/qa/security-fix-list.md`).

### J1. Suspended user blocked (SEC-P0-01)

```bash
# Login with suspended worker's Firebase token, then call a protected endpoint
curl -H "Authorization: Bearer $SUSPENDED_TOKEN" \
     https://api.staging.gada.vn/v1/worker/profile
```

- [ ] **P0** Returns HTTP 403, not 200

### J2. OTP verify rate limit (SEC-P0-02)

```bash
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://admin.staging.gada.vn/v1/auth/otp/verify \
    -d '{"phone":"+84900000001","otp":"000000"}'
done
```

- [ ] **P0** Requests 11+ return HTTP 429 (Too Many Requests)

### J3. Signature validation (SEC-P0-03)

```bash
# Large payload should be rejected
LARGE_PAYLOAD=$(python3 -c "print('data:image/png;base64,' + 'A'*3000000)")
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://admin.staging.gada.vn/v1/worker/contracts/$CONTRACT_ID/sign \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"signatureDataUrl\": \"$LARGE_PAYLOAD\"}"
```

- [ ] **P0** Returns HTTP 422 (validation error), not 200 or 500

### J4. Manager signature URL not in worker response (SEC-P0-04)

```bash
curl -s -H "Authorization: Bearer $WORKER_TOKEN" \
  https://admin.staging.gada.vn/v1/worker/contracts/$CONTRACT_ID | jq 'has("manager_sig_url")'
```

- [ ] **P0** Returns `false` — `manager_sig_url` must not be present in worker response

---

## K. Performance Spot Checks (2 min)

Quick sanity check — not a full performance test.

### K1. Public listing response time

```bash
time curl -s https://api.staging.gada.vn/v1/public/jobs > /dev/null
```

- [ ] **P1** Response time < 500ms (should be ~80ms after PERF-P0-01/02 fixes applied)
- [ ] If > 1000ms: check CloudWatch logs for N+1 query pattern

### K2. Admin dashboard load time

1. Load `https://admin.staging.gada.vn` → Dashboard page
2. Open browser DevTools → Network → reload

- [ ] **P1** Total load time < 3 seconds
- [ ] **P1** No individual XHR request takes > 2 seconds

---

---

## L. Rollback Procedure

Use when any P0 check fails and cannot be fixed forward within 30 minutes.

### Step 1 — Identify last known good image

```bash
# Find the git SHA of the last successful staging deploy:
aws ecr describe-images \
  --repository-name gada-vn-staging/api \
  --region ap-southeast-1 \
  --query 'sort_by(imageDetails, &imagePushedAt)[-5:].imageTags[]' \
  --output text

GOOD_TAG="<sha-of-last-good-deploy>"
```

### Step 2 — Roll ECS services back to previous image

```bash
REGION="ap-southeast-1"
CLUSTER="gada-vn-staging-cluster"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

for service in api web admin; do
  FAMILY="gada-vn-staging-${service}"
  IMAGE="${ECR}/gada-vn-staging/${service}:${GOOD_TAG}"

  CURRENT_DEF=$(aws ecs describe-task-definition \
    --task-definition "$FAMILY" --query 'taskDefinition' --output json)

  NEW_DEF=$(echo "$CURRENT_DEF" | \
    jq --arg img "$IMAGE" '.containerDefinitions[0].image = $img' | \
    jq 'del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)')

  NEW_ARN=$(aws ecs register-task-definition \
    --cli-input-json "$NEW_DEF" \
    --query 'taskDefinition.taskDefinitionArn' --output text)

  aws ecs update-service \
    --cluster "$CLUSTER" --service "$FAMILY" \
    --task-definition "$NEW_ARN" --region "$REGION"

  echo "Rollback initiated: $service → $NEW_ARN"
done
```

### Step 3 — Wait for rollback stability

```bash
for service in api web admin; do
  aws ecs wait services-stable \
    --cluster gada-vn-staging-cluster \
    --services "gada-vn-staging-${service}" \
    --region ap-southeast-1
  echo "$service stable"
done
```

### Step 4 — Re-run Phase A health checks

```bash
curl -s https://api.staging.gada.vn/health | jq .
curl -s https://admin.staging.gada.vn/health | jq .
curl -s -o /dev/null -w "%{http_code}" https://staging.gada.vn/ko
```

### Step 5 — If DB migration caused the failure

If even the previous image fails because of an incompatible migration, restore RDS:

```bash
# Point-in-time restore to before the bad deploy:
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier gada-vn-staging-db \
  --target-db-instance-identifier gada-vn-staging-db-restored \
  --restore-time "<ISO8601 timestamp — before the bad deploy>" \
  --region ap-southeast-1
```

Then update `DB_HOST` in the API and admin ECS task definitions to point to the restored instance.

---

## Post-Test Sign-Off

| Section | Tester | Pass/Fail | Notes |
|---------|--------|-----------|-------|
| A. Infrastructure Health | | | |
| B. Authentication | | | |
| C. Public Job Listing | | | |
| D. Worker Flows | | | |
| E. Manager Flows | | | |
| F. Admin Panel | | | |
| G. Mobile App | | | |
| H. Language Switching | | | |
| I. S3 and CDN | | | |
| J. Security Spot Checks | | | |
| K. Performance Spot Checks | | | |

**Deploy commit SHA**: _____________ **ECS task revision (api)**: _____________

**Overall result**: ⬜ PASS — all P0 checks pass, staging is ready for QA
**Signed off by**: _________________________
**Date**: _________________________

---

## Failure Response

If any **P0 check fails**:
1. Do not proceed with QA testing
2. Check CloudWatch logs: `/ecs/gada-vn-staging/api`, `/ecs/gada-vn-staging/web`
3. Roll back via ECS task definition revision (see **Section L — Rollback Procedure** above)
4. File a blocking issue with log output and failing check reference

If a **P1 check fails**:
1. File a bug with priority P1
2. QA can proceed but must note the open issue
3. Fix must land before production release

If a **P2 check fails**:
1. File a bug with priority P2
2. QA proceeds normally
3. Fix can land after production release
