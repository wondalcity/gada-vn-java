# User Flows — GADA VN

**Version**: 0.1
**Status**: Draft
**Last updated**: 2026-03-20

---

## Conventions

- **Screen** = a distinct UI view (web page or mobile screen).
- **API call** = a call to the Laravel REST API.
- **[Guard]** = a condition that must be true to proceed; failure redirects as noted.
- Decision diamonds contain the condition. Arrows are labeled with the outcome.

---

## Flow 1: Signup — Phone OTP

```
[Landing / Login screen]
        │
        ▼
[Enter phone number]
        │
        ▼ API: POST /api/v1/auth/send-otp
        │      (Firebase Auth sends SMS)
        │
        ▼
[Enter 6-digit OTP]
        │
        ├── Wrong OTP ──▶ Show error; allow retry (max 5 attempts)
        │
        ▼ API: POST /api/v1/auth/verify-otp
        │      Returns Firebase custom token
        │
        ▼
[Enter name + email + password]
        │
        ▼ API: POST /api/v1/auth/register
        │      Creates auth.users row; returns session
        │
        ▼
[Home screen — Worker role]
```

**DB writes**: `auth.users` (new row), `app.worker_profiles` (empty row).

---

## Flow 2: Login — Password

```
[Login screen]
        │
        ▼
[Enter email + password]
        │
        ├── Wrong credentials ──▶ Show error (max 5 attempts then 15min lockout)
        │
        ▼ Firebase signInWithEmailAndPassword
        │  Returns Firebase ID token
        │
        ▼ API: GET /api/v1/auth/me
        │      Verifies token; returns user + role flags
        │
        ▼
[Home screen]
```

---

## Flow 3: Login — Facebook

```
[Login screen]
        │
        ▼
[Tap "Continue with Facebook"]
        │
        ▼ Firebase signInWithPopup / signInWithRedirect (FacebookAuthProvider)
        │
        ├── User cancels ──▶ Return to login screen
        │
        ▼ Firebase returns ID token
        │
        ▼ API: POST /api/v1/auth/social-login
        │      Upsert auth.users (create if new, return existing if found by firebase_uid)
        │
        ▼
[Home screen]
```

---

## Flow 4: Worker Profile Setup

**Trigger**: First login, or user navigates to Profile.

```
[Profile screen]
        │
        ▼
[Edit basic info]
  Name, DOB, nationality, current province, preferred provinces, trade
        │
        ▼ API: PUT /api/v1/worker/profile
        │
        ▼
[Upload ID documents]
  Front image + back image (max 10 MB each, JPEG/PNG)
        │
        ▼ API: POST /api/v1/worker/profile/id-documents
        │      Uploads to S3; stores keys in worker_profiles
        │
        ▼
[Draw signature]
  Canvas; save as PNG
        │
        ▼ API: POST /api/v1/worker/profile/signature
        │      Uploads to S3; stores signature_key
        │
        ▼
[Add experience entries] (optional, repeatable)
  Trade, role, site name, start date, end date
        │
        ▼ API: POST /api/v1/worker/experiences
        │
        ▼
[Profile complete]
```

---

## Flow 5: Browse and Apply for a Job

```
[Job feed — /jobs (public) or /app/jobs (authenticated)]
        │
        ▼
[Filter: province, trade, date range] (optional)
        │
        ▼ API: GET /api/v1/jobs?province=&trade=&page=
        │
        ▼
[Job list — paginated cards]
        │
        ▼
[Tap job card]
        │
        ▼
[Job detail page — /jobs/[slug]]
  Site name, trade, headcount, daily wage, work dates, description
        │
        ├── Not logged in ──▶ [Prompt: Login to apply] ──▶ Login flow
        │
        ▼ [Guard: user is logged in]
        │
        ├── Already applied ──▶ Show application status (read-only)
        │
        ▼
[Tap "Apply"]
        │
        ▼ API: POST /api/v1/jobs/{jobId}/apply
        │
        ├── Job full (headcount reached) ──▶ Show "Job no longer accepting applications"
        │
        ▼
[Application submitted — status: pending]
  FCM notification sent to worker confirming submission
        │
        ▼
[Redirect to: My Applications list]
```

---

## Flow 6: Manager — Business Registration

```
[Profile screen → "Become a Manager" CTA]
        │
        ▼
[Guard: manager_status IS NULL or 'rejected']
        │
        ▼
[Business Registration form]
  Business name, registration number, representative name
        │
        ▼
[Upload registration document] (PDF or image, max 10 MB)
        │
        ▼ API: POST /api/v1/manager/register
        │      Creates app.manager_profiles row; status = 'pending'
        │
        ▼
[Confirmation screen]
  "Your application is under review. You will be notified when approved."
        │
        ▼
[Profile shows "Pending approval" badge]
```

---

## Flow 7: Admin — Manager Approval

```
[Admin panel — /admin/manager-approvals]
        │
        ▼
[List of pending registrations]
  Columns: submitted_at, user name, business name, reg number, document link
        │
        ▼
[Click row → detail view]
  Show all submitted fields; document preview (S3 presigned URL)
        │
        ├── [Approve]
        │       │
        │       ▼ API: PATCH /api/v1/admin/manager-approvals/{id}/approve
        │              Sets manager_status = 'approved'; is_manager = true
        │              FCM push to user: "Manager status approved"
        │
        └── [Reject]
                │
                ▼
        [Enter rejection note (required)]
                │
                ▼ API: PATCH /api/v1/admin/manager-approvals/{id}/reject
                       Sets manager_status = 'rejected'
                       FCM push to user with rejection note
```

---

## Flow 8: Manager — Create Site and Job

**Guard**: `is_manager = true` (else 403 / redirect to registration flow).

```
[Manager dashboard → "New Site"]
        │
        ▼
[Site form]
  Name, province, full address, GPS coordinates (map picker), start date, end date
        │
        ▼ API: POST /api/v1/manager/sites
        │      Generates slug from name; stores PostGIS point
        │
        ▼
[Site created → Site detail page]
        │
        ▼
[Tap "Add Job"]
        │
        ▼
[Job form]
  Trade (from ref.trades), headcount, daily wage (VND), work start date, end date, description
        │
        ▼ API: POST /api/v1/manager/sites/{siteId}/jobs
        │      Generates slug; status = 'open'
        │
        ▼
[Job live on public /jobs feed]
```

---

## Flow 9: Manager — Review Applicants and Hire

```
[Manager dashboard → Site → Job → Applicants tab]
        │
        ▼ API: GET /api/v1/manager/jobs/{jobId}/applications
        │
        ▼
[Applicant list]
  Columns: applied_at, worker name, trade, ID verified (bool), experience count
        │
        ▼
[Click applicant row]
        │
        ▼
[Worker profile view (manager view)]
  Photo, ID status, experience list, signature on file (bool)
        │
        ├── [Hire]
        │       │
        │       ▼ API: PATCH /api/v1/manager/applications/{id}/accept
        │              Sets status = 'accepted'
        │              FCM to worker: "Your application was accepted"
        │              Triggers: contract generation (Flow 10)
        │
        └── [Reject]
                │
                ▼ API: PATCH /api/v1/manager/applications/{id}/reject
                       Sets status = 'rejected'
                       FCM to worker: "Your application was not accepted"
```

---

## Flow 10: Contract Generation and Worker Signing

```
[Triggered automatically after application → 'accepted']
        │
        ▼ Laravel job (queued): GenerateContractJob
        │  Populates PDF template:
        │    - Site name, address, dates
        │    - Job trade, wage, work dates
        │    - Worker name, ID number
        │    - Manager name, signature image (from S3)
        │  Uploads PDF to S3; creates app.contracts row (worker_signed_at = NULL)
        │
        ▼
[FCM to worker: "Your contract is ready to sign"]
        │
        ▼
[Worker: My Applications → Accepted job → View Contract]
        │
        ▼ API: GET /api/v1/worker/contracts/{contractId}
        │      Returns S3 presigned URL for PDF (valid 15 min)
        │
        ▼
[Worker reads PDF]
        │
        ▼
[Tap "Sign Contract"]
        │
        ▼ [Guard: worker has signature on file]
        │   No ──▶ Redirect to Profile → Draw Signature → return here
        │
        ▼ API: POST /api/v1/worker/contracts/{contractId}/sign
        │      Sets worker_signed_at = NOW()
        │      Regenerates PDF with worker signature appended
        │
        ▼
[Contract fully signed; status visible to both worker and manager]
```

---

## Flow 11: Manager — Attendance Recording

```
[Manager dashboard → Site → Job → Attendance tab]
        │
        ▼
[Select date (default: today)]
        │
        ▼ API: GET /api/v1/manager/jobs/{jobId}/attendance?date=YYYY-MM-DD
        │      Returns list of accepted workers for this job
        │
        ▼
[Attendance table]
  Columns: worker name, status (present/absent/half_day), hours worked
  One row per accepted worker
        │
        ▼
[Manager sets status + hours for each worker]
        │
        ▼ API: PUT /api/v1/manager/jobs/{jobId}/attendance
        │      Body: [{ worker_user_id, date, status, hours_worked }, ...]
        │      Upsert — overwrites if same (worker, date) exists
        │
        ▼
[Saved; FCM to each worker: "Attendance recorded for [date]"]
```

---

## Flow 12: Worker — Receive and Read Notifications

```
[Background: Firebase FCM delivers push to device]
        │
        ▼
[App opened → Notification bell shows unread count]
        │
        ▼ API: GET /api/v1/worker/notifications?page=1
        │
        ▼
[Notification list — newest first]
  Types: application_status, contract_ready, attendance_recorded
        │
        ▼
[Tap notification]
        │
        ├── application_status ──▶ Navigate to My Applications → that application
        ├── contract_ready     ──▶ Navigate to Contract view (Flow 10)
        └── attendance_recorded──▶ Navigate to Attendance history
        │
        ▼ API: PATCH /api/v1/worker/notifications/{id}/read
               Sets read_at = NOW()
```

---

## Flow 13: Public Job Discovery (SEO / No Auth)

```
[User arrives via Google search: "thợ hồ Hà Nội" / "건설 일자리 하노이"]
        │
        ▼
[/vi/jobs/ha-noi — SSG province index page]
  Structured data: ItemList of JobPosting
  hreflang: ko / vi / en
        │
        ▼
[Click job card]
        │
        ▼
[/vi/jobs/[slug] — SSR job detail page]
  Open Graph tags, canonical URL
  JobPosting schema.org JSON-LD
        │
        ├── Has account ──▶ Login → redirected back → Apply (Flow 5)
        └── No account  ──▶ Signup (Flow 1) → redirected back → Apply (Flow 5)
```

---

## Flow 14: Admin — Translation Management

```
[Admin panel → /admin/translations]
        │
        ▼
[Locale selector: ko | vi | en]
        │
        ▼ API: GET /api/v1/admin/translations?locale=vi
        │      Returns all key-value pairs for the locale
        │
        ▼
[Editable table: key | ko value | vi value | en value]
        │
        ▼
[Edit cell inline → Save]
        │
        ▼ API: PUT /api/v1/admin/translations
        │      Body: [{ key, locale, value }, ...]
        │      Writes to ops.i18n_strings table
        │
        ▼
[On next deploy: export script reads DB → writes packages/i18n/*.json]
```

---

## Error State Summary

| Condition | User-facing message | HTTP code |
|---|---|---|
| OTP expired (10 min) | "Code expired. Request a new one." | 400 |
| Too many OTP attempts | "Too many attempts. Try again in 15 minutes." | 429 |
| Job already full | "This job is no longer accepting applications." | 409 |
| Already applied | "You have already applied to this job." | 409 |
| Manager not approved | "Manager features require approval. Check your application status." | 403 |
| File too large | "File must be under 10 MB." | 413 |
| Signature missing on contract sign | "Please add your signature in your profile first." | 422 |
| Contract already signed | "Contract already signed." | 409 |
| Attendance already recorded (past day, non-admin) | "Past attendance can only be edited by an admin." | 403 |
