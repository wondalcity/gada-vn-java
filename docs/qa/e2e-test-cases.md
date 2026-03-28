# GADA VN — End-to-End Test Cases
**Date**: 2026-03-21
**Scope**: MVP flows across Web (Next.js), Mobile (Expo), and Admin (Laravel Blade)
**Tool**: Playwright (web), Maestro (mobile)
**Environment**: Staging — `https://staging.gada.vn`

---

## Test Case Conventions

| Field | Description |
|-------|-------------|
| `TC-E2E-XXX` | Test case ID |
| **Pre** | Preconditions (data or state required) |
| **Steps** | Numbered action sequence |
| **Assert** | Verifiable outcome |
| **Priority** | P0 = smoke, P1 = regression, P2 = edge case |

Status values in steps mirror DB CHECK constraints:
`PENDING → ACCEPTED → CONTRACTED` (applications)
`PENDING_WORKER_SIGN → PENDING_MANAGER_SIGN → FULLY_SIGNED` (contracts)
`PENDING → ATTENDED / ABSENT / HALF_DAY` (attendance)

---

## Suite 1 — Worker Signup / Login

### TC-E2E-001 — Worker phone OTP registration (happy path)
**Priority**: P0
**Platform**: Web (`/ko/register`)
**Pre**: Phone `+84901234001` not registered

**Steps**:
1. Navigate to `/ko/register`
2. Select "근로자" (Worker) role
3. Enter phone `+84901234001`
4. Click "인증번호 전송"
5. Assert OTP SMS field appears
6. Enter OTP from `POST /auth/otp/send` test stub (value `123456`)
7. Click "확인"
8. Fill: `full_name = "Nguyễn Văn A"`, `date_of_birth = "1995-06-15"`, `gender = "male"`
9. Accept terms and privacy checkboxes
10. Click "가입하기"

**Assert**:
- Redirected to `/ko/worker`
- `gada_session` cookie set (non-httpOnly, `max-age=604800`)
- API `GET /me` returns `{ role: "worker", status: "ACTIVE" }`
- `auth.users` row created with `firebase_uid` populated
- `app.worker_profiles` row created with `full_name = "Nguyễn Văn A"`

---

### TC-E2E-002 — Worker email/password login
**Priority**: P1
**Platform**: Web (`/ko/login`)
**Pre**: User `worker@test.gada.vn` / `TestPass123!` exists in staging seed

**Steps**:
1. Navigate to `/ko/login`
2. Enter email and password
3. Click "로그인"

**Assert**:
- Redirected to `/ko/worker`
- `gada_session` cookie present
- Worker tab bar visible with correct name

---

### TC-E2E-003 — Worker Facebook social login
**Priority**: P2
**Platform**: Web
**Pre**: Staging Facebook test user configured

**Steps**:
1. Navigate to `/ko/login`
2. Click "Facebook으로 로그인"
3. Complete Facebook OAuth popup
4. Return to GADA site

**Assert**:
- Redirected to `/ko/worker` (or `/ko/register` if first login)
- `gada_session` cookie set
- `auth.users.firebase_uid` contains Facebook UID prefix `facebook.com:`

---

### TC-E2E-004 — Unauthenticated redirect to login
**Priority**: P0
**Platform**: Web

**Steps**:
1. Open incognito browser
2. Navigate to `/ko/worker`

**Assert**:
- Redirected to `/ko/login`
- URL contains `redirectTo=%2Fko%2Fworker`

---

### TC-E2E-005 — Worker mobile OTP login
**Priority**: P0
**Platform**: Mobile (iOS Simulator / Android Emulator)
**Pre**: Worker account exists with phone `+84901234002`

**Steps**:
1. Launch app, land on onboarding/login screen
2. Enter phone `+84901234002`
3. Tap "인증번호 받기"
4. Enter stub OTP `123456`
5. Tap "확인"

**Assert**:
- Tab bar appears with "일자리", "알림", "프로필", "계약서" tabs
- Worker dashboard shows job list or empty state
- `ops.fcm_tokens` row created for device

---

### TC-E2E-006 — Session persistence after browser restart
**Priority**: P1
**Platform**: Web
**Pre**: User is logged in

**Steps**:
1. Log in as worker
2. Close browser tab
3. Re-open `https://staging.gada.vn/ko/worker`

**Assert**:
- No login redirect (cookie persists with `max-age=604800`)
- Worker dashboard loads without re-authentication

---

### TC-E2E-007 — Logout clears session
**Priority**: P1
**Platform**: Web
**Pre**: User is logged in

**Steps**:
1. Navigate to profile page
2. Click "로그아웃"

**Assert**:
- `gada_session` cookie cleared (`max-age=0`)
- Redirected to `/ko/login`
- Subsequent navigation to `/ko/worker` redirects to login

---

## Suite 2 — Manager Application and Approval Flow

### TC-E2E-010 — Manager registration submission
**Priority**: P0
**Platform**: Web (`/ko/manager/profile`)
**Pre**: User logged in with `worker` role only

**Steps**:
1. Navigate to `/ko/manager/profile` (or click "사업주 등록" from worker dashboard)
2. Select business type "개인사업자"
3. Fill: `representative_name = "Kim Minsu"`, `representative_dob = "1980-03-10"`, `representative_gender = "male"`
4. Fill `contact_phone = "+82101234001"`, `contact_address = "서울시 강남구"`
5. Upload business registration document (test PDF)
6. Check terms and privacy boxes
7. Click "신청하기"

**Assert**:
- Toast/banner: "심사 신청이 완료되었습니다"
- `app.manager_profiles.approval_status = 'PENDING'`
- `GET /manager/registration/status` returns `{ status: "PENDING" }`
- Admin dashboard pending approval count increases by 1

---

### TC-E2E-011 — Admin approves manager (web panel)
**Priority**: P0
**Platform**: Admin web (`/admin/approvals`)
**Pre**: TC-E2E-010 completed; admin session active

**Steps**:
1. Log in to `/admin/login` with admin credentials
2. Navigate to `/admin/approvals?status=PENDING`
3. Click the pending application from "Kim Minsu"
4. Review profile data on detail page
5. Click "승인"
6. Confirm dialog

**Assert**:
- Approval detail page shows status badge "승인됨"
- `app.manager_profiles.approval_status = 'APPROVED'`
- `app.manager_profiles.approved_at` populated
- `auth.user_roles` row inserted with `role = 'manager'`
- Manager's web app redirects away from "pending review" screen on next visit

---

### TC-E2E-012 — Admin rejects manager with reason
**Priority**: P1
**Platform**: Admin web
**Pre**: Another pending manager application exists

**Steps**:
1. Navigate to `/admin/approvals?status=PENDING`
2. Click a pending application
3. Click "반려"
4. Enter rejection reason "사업자 등록증 불일치"
5. Confirm

**Assert**:
- Status shows "반려됨" with reason text
- `app.manager_profiles.approval_status = 'REJECTED'`
- `app.manager_profiles.rejection_reason = "사업자 등록증 불일치"`

---

### TC-E2E-013 — Manager role gating before approval
**Priority**: P0
**Platform**: Web
**Pre**: User has submitted manager registration but not yet approved

**Steps**:
1. Log in as the pending-approval user
2. Navigate to `/ko/manager/sites`

**Assert**:
- Page shows "심사 대기 중" or redirects to registration status page
- `GET /manager/sites` returns `403 Forbidden`

---

## Suite 3 — Site and Job Creation Flow

### TC-E2E-020 — Manager creates construction site
**Priority**: P0
**Platform**: Web (`/ko/manager/sites/new`)
**Pre**: Logged in as approved manager

**Steps**:
1. Navigate to `/ko/manager/sites/new`
2. Fill: `name = "강남 오피스 빌딩 신축"`, `address = "서울시 강남구 역삼동 123"`, `province = "Seoul"`, `site_type = "COMMERCIAL"`
3. Enter coordinates (or use map picker): `lat = 37.5009`, `lng = 127.0369`
4. Upload 2 site images
5. Click "저장"

**Assert**:
- Redirected to `/ko/manager/sites/{siteId}`
- Site card shows on `/ko/manager/sites` list
- `app.construction_sites.status = 'ACTIVE'`
- `app.construction_sites.location` (PostGIS GEOMETRY) populated
- Image S3 keys stored in `image_s3_keys` array

---

### TC-E2E-021 — Manager creates job posting for site
**Priority**: P0
**Platform**: Web (`/ko/manager/sites/{siteId}/jobs/new`)
**Pre**: TC-E2E-020 completed; site exists

**Steps**:
1. Navigate to site detail → click "공고 추가"
2. Select trade: "철근공" (code: `rebar`)
3. Fill: `title = "철근 작업 구인"`, `work_date = {tomorrow}`, `start_time = "08:00"`, `end_time = "17:00"`
4. Set `daily_wage = 350000` (VND), `slots_total = 3`
5. Add description
6. Click "게시하기"

**Assert**:
- Job card appears on site detail page
- `app.jobs.status = 'OPEN'`
- `app.jobs.slots_filled = 0`
- `app.jobs.slug` is non-null and URL-safe
- Job appears in `GET /public/jobs` response
- Job detail available at `/ko/jobs/{slug}`

---

### TC-E2E-022 — Job validation — past work date rejected
**Priority**: P1
**Platform**: Web
**Pre**: Logged in as approved manager

**Steps**:
1. Navigate to job creation form
2. Enter `work_date = {yesterday}`
3. Click "게시하기"

**Assert**:
- Form validation error: "근무일은 오늘 이후여야 합니다"
- No API call made
- `app.jobs` row NOT created

---

### TC-E2E-023 — Manager edits job — slot count cannot go below filled slots
**Priority**: P2
**Platform**: Web
**Pre**: Job exists with `slots_total = 3`, `slots_filled = 2`

**Steps**:
1. Navigate to job edit page
2. Change `slots_total` to `1`
3. Click "저장"

**Assert**:
- API returns `422` with message about slot constraint
- `app.jobs.slots_total` unchanged

---

### TC-E2E-024 — Mobile — manager creates job from app
**Priority**: P1
**Platform**: Mobile (manager)
**Pre**: Logged in as approved manager on mobile

**Steps**:
1. Tap "+" or "공고 추가" from manager index
2. Select existing site, fill job details
3. Tap "저장"

**Assert**:
- Job card appears in manager job list
- API returns 201 with `job.id`

---

## Suite 4 — Worker Apply Flow

### TC-E2E-030 — Worker applies to job (web)
**Priority**: P0
**Platform**: Web
**Pre**: Job exists with `status = OPEN`, `slots_total = 3`, `slots_filled = 0`; Worker logged in

**Steps**:
1. Navigate to `/ko/jobs/{slug}`
2. Review job details (title, wage, trade, date, location)
3. Click "지원하기"
4. Confirm application modal

**Assert**:
- Button changes to "지원 완료" / disabled state
- Toast: "지원이 완료되었습니다"
- `app.job_applications.status = 'PENDING'`
- Job appears in `GET /worker/applications`

---

### TC-E2E-031 — Worker cannot apply twice to same job
**Priority**: P0
**Platform**: Web
**Pre**: Worker has already applied to the job

**Steps**:
1. Navigate to the same job slug
2. Observe apply button state

**Assert**:
- Button is disabled showing "지원 완료"
- If user force-submits: API returns `409 Conflict`
- No duplicate row in `app.job_applications`

---

### TC-E2E-032 — Worker withdraws application
**Priority**: P1
**Platform**: Web (`/ko/worker/applications/{id}`)
**Pre**: Worker has a PENDING application

**Steps**:
1. Navigate to application detail
2. Click "지원 취소"
3. Confirm dialog

**Assert**:
- `app.job_applications.status = 'WITHDRAWN'`
- Apply button re-enables on job detail page

---

### TC-E2E-033 — Filled job shows no apply button
**Priority**: P1
**Platform**: Web
**Pre**: Job with `slots_total = 1`, `slots_filled = 1` (status = FILLED)

**Steps**:
1. Navigate to the job's public page

**Assert**:
- "마감" badge shown (job is full)
- Apply button hidden or disabled

---

### TC-E2E-034 — Mobile worker applies from job detail screen
**Priority**: P0
**Platform**: Mobile
**Pre**: Worker logged in, job exists

**Steps**:
1. Open Jobs tab, find job in list
2. Tap job card
3. Tap "지원하기"
4. Confirm

**Assert**:
- Success alert "지원이 완료되었습니다"
- Job detail screen shows "지원 완료" state
- `GET /worker/applications` includes the new application

---

## Suite 5 — Hire / Cancel Flow

### TC-E2E-040 — Manager accepts application (single)
**Priority**: P0
**Platform**: Web (`/ko/manager/jobs/{jobId}/applicants`)
**Pre**: Worker has PENDING application; Manager logged in

**Steps**:
1. Navigate to job applicant list
2. Find worker application row
3. Click "수락" button
4. Confirm

**Assert**:
- Application row shows "수락됨" badge
- `app.job_applications.status = 'ACCEPTED'`
- `app.jobs.slots_filled` incremented by 1
- Worker receives notification (ops.notifications row created)

---

### TC-E2E-041 — Manager bulk-accepts applications
**Priority**: P1
**Platform**: Web
**Pre**: 3 PENDING applications exist for a job with `slots_total = 3`

**Steps**:
1. Navigate to applicant list
2. Check all 3 applicant checkboxes
3. Click "일괄 수락"
4. Confirm

**Assert**:
- All 3 applications → `status = 'ACCEPTED'`
- `app.jobs.slots_filled = 3`
- `app.jobs.status` changes to `'FILLED'`

---

### TC-E2E-042 — Manager rejects application
**Priority**: P1
**Platform**: Web
**Pre**: PENDING application exists

**Steps**:
1. Click "거절" on application row
2. Optionally enter rejection note
3. Confirm

**Assert**:
- `app.job_applications.status = 'REJECTED'`
- Worker can re-apply if job is still OPEN (same worker + same job combination — check WITHDRAWN/REJECTED exclusion logic)

---

### TC-E2E-043 — Manager cancels hire
**Priority**: P1
**Platform**: Web (`/ko/manager/hires`)
**Pre**: Application is ACCEPTED; hire record exists

**Steps**:
1. Navigate to hires list
2. Find the hire row
3. Click "채용 취소"
4. Confirm

**Assert**:
- `app.job_applications.status` reverts or hire entry removed
- `app.jobs.slots_filled` decremented
- Worker receives cancellation notification

---

### TC-E2E-044 — Accept beyond slot limit blocked
**Priority**: P0
**Platform**: Web
**Pre**: Job with `slots_total = 1`, already has 1 ACCEPTED application

**Steps**:
1. Attempt to accept a second application for the same job

**Assert**:
- API returns `422` with message "모든 슬롯이 채워졌습니다" or similar
- Second application stays `PENDING`

---

## Suite 6 — Contract Generation and Signing Flow

### TC-E2E-050 — Manager generates contract for accepted application
**Priority**: P0
**Platform**: Web (`/ko/manager/hires`)
**Pre**: Application `status = 'ACCEPTED'`; no contract exists yet

**Steps**:
1. Navigate to hires list
2. Find accepted worker row
3. Click "계약서 생성"

**Assert**:
- Button changes to "서명 대기" status badge
- `app.contracts` row created with `status = 'PENDING_WORKER_SIGN'`
- `contract_pdf_s3_key` populated (S3 HTML file uploaded)
- Worker receives notification "계약서가 생성되었습니다"

---

### TC-E2E-051 — Manager cannot generate duplicate contract
**Priority**: P1
**Platform**: Web
**Pre**: Contract already exists for the application

**Steps**:
1. Click "계약서 생성" again for the same application

**Assert**:
- API returns `409` or button is hidden/disabled
- No duplicate `app.contracts` row

---

### TC-E2E-052 — Worker views and signs contract (web)
**Priority**: P0
**Platform**: Web (`/ko/worker/contracts/{id}`)
**Pre**: Contract exists with `status = 'PENDING_WORKER_SIGN'`

**Steps**:
1. Navigate to contracts list → click contract
2. Read contract HTML (worker/manager parties, trade, date, wage, site)
3. Click "서명하기"
4. Draw signature on canvas pad
5. Click "확인"

**Assert**:
- Success message shown
- `app.contracts.status = 'PENDING_MANAGER_SIGN'`
- `app.contracts.worker_signed_at` populated
- `app.contracts.worker_signature_s3_key` populated (presigned URL accessible)
- Manager receives notification "근로자가 서명했습니다"

---

### TC-E2E-053 — Worker cannot sign contract not belonging to them
**Priority**: P0
**Platform**: Web
**Pre**: Contract belongs to different worker

**Steps**:
1. Attempt to access `/ko/worker/contracts/{other_worker_contract_id}`

**Assert**:
- API returns `403 Forbidden`
- Page shows error state, not contract content

---

### TC-E2E-054 — Manager signs contract (web)
**Priority**: P0
**Platform**: Web (`/ko/manager/contracts/{id}`)
**Pre**: Contract `status = 'PENDING_MANAGER_SIGN'`

**Steps**:
1. Navigate to manager contract detail
2. Verify worker signature image is visible
3. Draw manager signature
4. Click "서명하기"

**Assert**:
- `app.contracts.status = 'FULLY_SIGNED'`
- `app.contracts.manager_signed_at` populated
- `app.job_applications.status = 'CONTRACTED'`
- Download button appears on worker's contract page
- Worker receives notification "계약이 완료되었습니다"

---

### TC-E2E-055 — Worker downloads fully-signed contract
**Priority**: P1
**Platform**: Web
**Pre**: Contract `status = 'FULLY_SIGNED'`

**Steps**:
1. Navigate to contract detail
2. Click "계약서 다운로드"

**Assert**:
- Presigned S3 URL returned with `TTL ≤ 900s`
- Browser begins download of HTML file
- Downloaded file contains both signature images embedded

---

### TC-E2E-056 — Mobile worker signs contract
**Priority**: P0
**Platform**: Mobile
**Pre**: Contract `status = 'PENDING_WORKER_SIGN'`

**Steps**:
1. Navigate to Contracts tab → tap contract
2. Tap "서명하기"
3. Draw signature on touch pad
4. Tap "확인"

**Assert**:
- Success alert shown
- Contract screen refreshes to "서명 완료" status
- API `POST /worker/contracts/{id}/sign` returns 200
- `signature_data_url` sent as `data:image/svg+xml;base64,...`
- S3 file stored at `contract-signatures/{id}/worker.svg`

---

### TC-E2E-057 — Contract signature requires drawing (empty pad blocked)
**Priority**: P1
**Platform**: Web + Mobile
**Pre**: Contract in `PENDING_WORKER_SIGN` state

**Steps**:
1. Open signature pad
2. Do NOT draw anything
3. Click/tap "확인"

**Assert**:
- Button is disabled when pad is empty (web: `hasDrawn === false`; mobile: `paths.length === 0`)
- No API call made

---

## Suite 7 — Attendance / Absence / Work Time Flow

### TC-E2E-060 — Manager marks single worker as attended
**Priority**: P0
**Platform**: Web (`/ko/manager/jobs/{jobId}/attendance`)
**Pre**: Job `work_date = today`; worker is hired (ACCEPTED or CONTRACTED)

**Steps**:
1. Navigate to job attendance page
2. Find worker row (status shows "대기")
3. Click "출근" (ATTENDED)
4. Enter `check_in_time = "08:05"`, `check_out_time = "17:15"`, `hours_worked = "9.17"`

**Assert**:
- Row updates to "출근" status badge
- `app.attendance_records.status = 'ATTENDED'`
- `check_in_time`, `check_out_time`, `hours_worked` stored correctly
- `marked_by` = manager's user_id

---

### TC-E2E-061 — Manager marks worker as absent
**Priority**: P0
**Platform**: Web
**Pre**: Same preconditions as TC-E2E-060

**Steps**:
1. Click "결근" (ABSENT) for the worker row

**Assert**:
- `app.attendance_records.status = 'ABSENT'`
- `check_in_time`, `check_out_time` are NULL
- `hours_worked = 0` or NULL

---

### TC-E2E-062 — Manager marks half-day
**Priority**: P1
**Platform**: Web
**Pre**: Same preconditions

**Steps**:
1. Click "반일" (HALF_DAY)
2. Enter `check_in_time = "08:00"`, `check_out_time = "12:00"`, `hours_worked = "4"`

**Assert**:
- `app.attendance_records.status = 'HALF_DAY'`
- Hours stored as entered

---

### TC-E2E-063 — Manager edits attendance — audit trail created
**Priority**: P0
**Platform**: Web
**Pre**: Attendance record exists with `status = 'ATTENDED'`

**Steps**:
1. Click "수정" (edit) on an existing ATTENDED record
2. Change `hours_worked` from `9.0` to `8.5`
3. Enter reason "퇴근 시간 조정"
4. Click "저장"

**Assert**:
- `app.attendance_records.hours_worked = 8.5`
- `app.attendance_audits` row created:
  - `old_hours = 9.0`, `new_hours = 8.5`
  - `changed_by` = manager's user_id
  - `reason = "퇴근 시간 조정"`
  - `changed_at` timestamp present

---

### TC-E2E-064 — Worker views own attendance (read-only)
**Priority**: P1
**Platform**: Web (`/ko/worker/attendance`)
**Pre**: Attendance records exist for the worker

**Steps**:
1. Navigate to worker attendance page

**Assert**:
- Attendance records listed with date, status, hours
- No edit controls visible (read-only view)
- Worker cannot `PUT /manager/jobs/{jobId}/attendance`

---

### TC-E2E-065 — Admin overrides attendance record
**Priority**: P1
**Platform**: Admin web (`/admin/attendance`)
**Pre**: Attendance record exists

**Steps**:
1. Search for attendance record by worker name or date
2. Click "수정"
3. Change status from `ABSENT` to `ATTENDED`, add times
4. Save

**Assert**:
- `app.attendance_records` updated
- `app.attendance_audits` row created with admin's `changed_by`

---

### TC-E2E-066 — Duplicate attendance for same job/worker/date blocked
**Priority**: P0
**Platform**: Web
**Pre**: Attendance already recorded for job/worker/date combination

**Steps**:
1. Attempt to upsert a second attendance record for the same combination

**Assert**:
- Backend uses UPSERT (ON CONFLICT) — second write updates existing row, no duplicate
- `app.attendance_records` unique constraint `(job_id, worker_id, work_date)` not violated

---

## Suite 8 — Language Switching

### TC-E2E-070 — Language switcher changes locale in URL and content
**Priority**: P1
**Platform**: Web

**Steps**:
1. Navigate to `/ko/jobs` (Korean)
2. Click locale switcher → select "Tiếng Việt" (Vietnamese)

**Assert**:
- URL changes to `/vi/jobs`
- Page headings rendered in Vietnamese
- `localStorage.getItem('gada_locale') === 'vi'`
- `PATCH /me/locale` called with `{ locale: "vi" }` (if authenticated)

---

### TC-E2E-071 — Locale preserved after login redirect
**Priority**: P1
**Platform**: Web

**Steps**:
1. Navigate to `/vi/worker` (unauthenticated)
2. Redirected to `/vi/login`
3. Complete login

**Assert**:
- After login, redirected back to `/vi/worker` (locale preserved)

---

### TC-E2E-072 — Public job detail page rendered in 3 locales
**Priority**: P1
**Platform**: Web
**Pre**: Job slug `sat-thep-hcm-20260315` exists

**Steps**:
1. Navigate to `/ko/jobs/sat-thep-hcm-20260315`
2. Switch to `/vi/jobs/sat-thep-hcm-20260315`
3. Switch to `/en/jobs/sat-thep-hcm-20260315`

**Assert**:
- All 3 pages return HTTP 200
- `<html lang>` attribute changes (ko / vi / en)
- Trade name rendered in each language (name_ko / name_vi / name_en from `ref.construction_trades`)
- `hreflang` link tags present pointing to all 3 locale variants

---

### TC-E2E-073 — Mobile language preference persists
**Priority**: P2
**Platform**: Mobile
**Pre**: App installed

**Steps**:
1. Open Settings / Profile tab
2. Change language from Korean to Vietnamese
3. Restart app

**Assert**:
- App UI renders in Vietnamese after restart
- `AsyncStorage` or i18n config persists the preference

---

## Suite 9 — Public SEO Page Validation

### TC-E2E-080 — Landing page loads with correct SEO metadata
**Priority**: P0
**Platform**: Web (`/ko`)

**Steps**:
1. Load page source (or use Playwright `page.evaluate`)

**Assert**:
- `<title>` contains primary keyword
- `<meta name="description">` present and non-empty
- `<meta property="og:title">` present
- `<meta property="og:image">` present
- `<script type="application/ld+json">` contains `ItemList` schema with at least 1 `JobPosting`
- HTTP response header `Cache-Control` present (ISG/SSR)

---

### TC-E2E-081 — Job listing page SSG/ISR loads correctly
**Priority**: P0
**Platform**: Web (`/ko/jobs`)

**Steps**:
1. Navigate to `/ko/jobs`
2. Check response headers via network tab

**Assert**:
- Returns HTTP 200
- Jobs rendered in page source (SSR/SSG — not client-only)
- `<title>` contains job count or trade type
- `x-nextjs-cache: HIT` or `STALE` on second load (ISG working)

---

### TC-E2E-082 — Job detail page has JSON-LD JobPosting
**Priority**: P0
**Platform**: Web (`/ko/jobs/{slug}`)
**Pre**: Job slug exists

**Steps**:
1. Navigate to job detail page
2. Extract `<script type="application/ld+json">` content

**Assert**:
- `@type: "JobPosting"`
- `title` matches job title
- `hiringOrganization.name` matches manager company name
- `jobLocation.address.addressCountry = "VN"`
- `baseSalary.value` matches `daily_wage`
- `datePosted` matches `published_at`
- `validThrough` matches `expires_at` (if set)

---

### TC-E2E-083 — Province location page renders correctly
**Priority**: P1
**Platform**: Web (`/ko/locations/ho-chi-minh`)

**Steps**:
1. Navigate to `/ko/locations/ho-chi-minh`

**Assert**:
- HTTP 200
- `<h1>` contains province name
- Job cards rendered with slugs
- Internal links: each job links to `/ko/jobs/{slug}`
- `<title>` contains province name + "건설 일자리" or similar keyword
- Structured data `ItemList` or `JobPosting` present

---

### TC-E2E-084 — Non-existent province returns 404
**Priority**: P2
**Platform**: Web

**Steps**:
1. Navigate to `/ko/locations/mars-colony`

**Assert**:
- HTTP 404 response
- Next.js 404 page shown (not blank or 500)

---

### TC-E2E-085 — Site detail public page renders
**Priority**: P1
**Platform**: Web (`/ko/sites/{slug}`)
**Pre**: Site with slug exists

**Steps**:
1. Navigate to `/ko/sites/{slug}`

**Assert**:
- HTTP 200
- Site name and address visible in page source
- Jobs listed for the site
- OG tags present

---

### TC-E2E-086 — Worker signup CTA visible on job pages
**Priority**: P1
**Platform**: Web

**Steps**:
1. Navigate to `/ko/jobs/{slug}` in incognito (unauthenticated)

**Assert**:
- "앱 다운로드" or "지금 가입하기" CTA section present
- CTA links to app store or `/ko/register`

---

### TC-E2E-087 — Canonical and hreflang correctness
**Priority**: P1
**Platform**: Web

**Steps**:
1. Navigate to `/ko/jobs/{slug}`
2. Inspect `<head>` tags

**Assert**:
- `<link rel="canonical" href="https://staging.gada.vn/ko/jobs/{slug}">` present
- Three `<link rel="alternate" hreflang="ko|vi|en">` tags present, each with correct URL

---

### TC-E2E-088 — robots.txt and sitemap.xml present
**Priority**: P2
**Platform**: Web

**Steps**:
1. `GET https://staging.gada.vn/robots.txt`
2. `GET https://staging.gada.vn/sitemap.xml`

**Assert**:
- `robots.txt` returns 200 with `User-agent: *` and `Sitemap:` directive
- `sitemap.xml` returns 200, valid XML, contains at least one job URL and province URL
- *(Note: Blocked by GAP-WEB-06 — sitemap.xml not yet implemented; this test will fail until P1 fix is shipped)*

---

## Suite 10 — Admin Panel Smoke Tests

### TC-E2E-090 — Admin dashboard loads with stats
**Priority**: P0
**Platform**: Admin web (`/admin`)
**Pre**: Admin session active; staging seed data loaded

**Steps**:
1. Navigate to `/admin`

**Assert**:
- HTTP 200
- 4 stat cards visible (총 사용자, 활성 공고, 완료 채용, 오늘 출근)
- Pending approvals table shows at least 1 row (from seed data)
- 14-day bar chart renders without JS errors

---

### TC-E2E-091 — Admin user search and suspend
**Priority**: P1
**Platform**: Admin web

**Steps**:
1. Navigate to `/admin/users`
2. Search by phone `+84901234001`
3. Click user → detail page
4. Click "정지"

**Assert**:
- `auth.users.status = 'SUSPENDED'`
- User's next API call returns `403` or `401`

---

## Suite 11 — Cross-Cutting / Security

### TC-E2E-100 — Worker cannot access manager routes
**Priority**: P0
**Platform**: Web
**Pre**: Logged in as worker (no manager role)

**Steps**:
1. Navigate to `/ko/manager/sites`
2. Direct `GET /api/v1/manager/sites`

**Assert**:
- Web redirects to worker dashboard or shows 403 page
- API returns `403 Forbidden`

---

### TC-E2E-101 — Rate limiting on OTP send
**Priority**: P1
**Platform**: API
**Pre**: None

**Steps**:
1. Send `POST /auth/otp/send` 6 times in under 1 minute from same IP

**Assert**:
- 6th request returns HTTP `429 Too Many Requests`
- Response body includes `Retry-After` or throttle message

---

### TC-E2E-102 — Manager cannot view another manager's sites
**Priority**: P0
**Platform**: Web + API
**Pre**: Two approved managers with separate sites

**Steps**:
1. Log in as Manager A
2. Directly navigate to `/ko/manager/sites/{siteId_of_Manager_B}`
3. Direct API call `GET /manager/sites/{siteId_of_Manager_B}`

**Assert**:
- Web shows 403 / not-found page
- API returns `403 Forbidden`

---

## Test Execution Order (Smoke Suite — CI)

For a fast CI smoke run, execute these in order:

```
TC-E2E-001  Worker signup
TC-E2E-004  Auth redirect
TC-E2E-010  Manager registration
TC-E2E-011  Admin approval
TC-E2E-013  Role gating
TC-E2E-020  Site creation
TC-E2E-021  Job creation
TC-E2E-030  Worker applies
TC-E2E-040  Manager accepts
TC-E2E-050  Contract generation
TC-E2E-052  Worker signs contract
TC-E2E-054  Manager signs contract
TC-E2E-060  Mark attendance
TC-E2E-080  Landing page SEO
TC-E2E-082  Job detail JSON-LD
TC-E2E-090  Admin dashboard
TC-E2E-100  RBAC enforcement
```

Estimated smoke run time: **~12 minutes** (Playwright, headed=false, 2 workers)
