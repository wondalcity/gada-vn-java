# MVP Scope — GADA VN

**Version**: 0.1
**Status**: Draft
**Last updated**: 2026-03-20

---

## 1. Product Summary

GADA VN is a Vietnam-focused construction job marketplace that connects construction workers with site managers. It is an MVP adaptation of the Korean GADA app, scoped to the Vietnamese market.

One Firebase account serves dual roles: a user can act as a **Worker** and a **Manager** from the same login. Manager capabilities are unlocked only after **platform admin approval** of the submitted business registration.

---

## 2. MVP vs Post-MVP Decision Criteria

A feature is **in MVP** if it satisfies all three:
1. Required to complete a hire-to-attendance loop end-to-end.
2. Cannot be deferred without blocking another MVP feature.
3. No third-party integration dependency beyond Firebase and AWS.

Everything else is **post-MVP**.

---

## 3. In-Scope Features (MVP)

### 3.1 Authentication

| # | Feature | Notes |
|---|---|---|
| A-01 | Phone number + OTP signup (Firebase) | Vietnamese (+84) and Korean (+82) phone numbers |
| A-02 | Email/password login | Email set during or after signup |
| A-03 | Facebook social login (Firebase) | OAuth 2.0 via Firebase Auth |
| A-04 | JWT session (Firebase ID token) | Passed as `Authorization: Bearer` to Laravel API |
| A-05 | Logout (all devices) | Revoke Firebase refresh token server-side |

### 3.2 Worker Features

| # | Feature | Description |
|---|---|---|
| W-01 | Worker profile | Name, photo, date of birth, nationality, current province, preferred provinces (multi), trade (single, from ref.trades) |
| W-02 | ID document upload | Front + back image upload to S3; stored as `id_front_key`, `id_back_key` in DB |
| W-03 | Digital signature | Canvas-drawn signature saved as PNG to S3; `signature_key` in DB |
| W-04 | Construction experience | Multiple entries: trade, role, site name, start/end date, description (optional) |
| W-05 | Job feed | Paginated list of open jobs; filter by province, trade, date range |
| W-06 | Job detail page | SSR page; shows site info, job description, daily wage, work dates, required headcount |
| W-07 | Job application | Apply to a job (one application per worker per job); status: `pending → accepted / rejected` |
| W-08 | My applications list | Worker sees their own applications with current status |
| W-09 | Contract view + signing | Worker receives contract PDF; signs via stored digital signature; status → `signed` |
| W-10 | Push notifications | FCM via Firebase; events: application status change, contract issued, attendance recorded |

### 3.3 Manager Features

| # | Feature | Description |
|---|---|---|
| M-01 | Business registration | Submit: business name, registration number, representative name, document upload (S3) |
| M-02 | Manager approval gate | Manager features locked until `manager_status = approved` in DB |
| M-03 | Site creation | Create a construction site: name, province, address, coordinates (PostGIS point), start/end date |
| M-04 | Job posting | Create a job under a site: trade required, headcount, daily wage (VND), work start/end date, description |
| M-05 | Applicant list | View workers who applied; see profile, ID status, experience |
| M-06 | Hire / reject | Set application status to `accepted` or `rejected`; triggers worker notification |
| M-07 | Attendance recording | Per accepted worker per day: `present`, `absent`, `half_day` |
| M-08 | Work hours input | Record actual hours worked per worker per day (used for wage calculation) |
| M-09 | Contract generation | Generate contract PDF from template; fields: site, job, worker, wage, dates, manager signature |

### 3.4 Platform Admin Features

| # | Feature | Description |
|---|---|---|
| P-01 | Manager approval queue | List of pending business registrations; approve / reject with note |
| P-02 | User list | Search, view, soft-delete any user account |
| P-03 | Site list | View all sites; deactivate a site |
| P-04 | Job list | View all jobs; close a job manually |
| P-05 | Translation management | Edit i18n string values (ko/vi/en) via admin UI; stored in DB, exported to JSON on deploy |

### 3.5 Public Web (SEO / GEO)

| # | Feature | Description |
|---|---|---|
| S-01 | Job listing page | `/jobs` — SSG, paginated, filterable by province + trade; structured data (JobPosting schema.org) |
| S-02 | Job detail page | `/jobs/[slug]` — SSR; Open Graph tags; canonical URL; structured data |
| S-03 | Site detail page | `/sites/[slug]` — SSR; maps embed; structured data |
| S-04 | Province index pages | `/jobs/[province]` — SSG; one page per province for GEO SEO |
| S-05 | Sitemap + robots.txt | Auto-generated on build; submitted to Google Search Console |
| S-06 | Locale routing | `/vi/...`, `/en/...`, `/ko/...` via next-intl; hreflang tags |

---

## 4. Out-of-Scope (Post-MVP)

| Feature | Reason deferred |
|---|---|
| In-app messaging (worker ↔ manager) | Requires real-time infra; not on critical path |
| Payroll / wage disbursement | Requires Vietnamese banking integration |
| Worker rating / review system | Needs post-hire data history to be meaningful |
| Manager rating by workers | Same as above |
| Job recommendation engine | Requires usage data |
| Multi-site manager dashboard | Single-site workflow sufficient for MVP |
| Apple login | Low priority for Vietnamese market |
| Google login | Defer to post-MVP |
| Resume / CV builder | Manual profile sufficient for MVP |
| Video introduction upload | Storage + streaming cost; deferred |
| Worker availability calendar | Complexity; deferred |
| Bulk attendance import (CSV) | Manual input sufficient for MVP site sizes |
| Invoice / tax document generation | Legal complexity; post-MVP |
| Public manager/company profile pages | Post-MVP SEO expansion |
| Native push (non-FCM) | FCM covers both iOS and Android |
| In-app contract amendment | Out of scope; re-issue contract instead |

---

## 5. MVP Data Model (Summary)

```
auth.users
  id, firebase_uid, email, phone, name, photo_key, role_flags, created_at

app.worker_profiles
  user_id (FK), dob, nationality, province_id (FK), preferred_province_ids, trade_id (FK),
  id_front_key, id_back_key, signature_key, id_verified_at

app.worker_experiences
  id, user_id (FK), trade_id (FK), role, site_name, start_date, end_date, description

app.manager_profiles
  user_id (FK), business_name, registration_number, rep_name, doc_key,
  manager_status (pending|approved|rejected), reviewed_by, reviewed_at, review_note

app.sites
  id, manager_user_id (FK), name, province_id (FK), address, location (GEOMETRY POINT),
  start_date, end_date, status (active|closed|archived), slug

app.jobs
  id, site_id (FK), trade_id (FK), headcount, daily_wage_vnd, start_date, end_date,
  description, status (open|filled|closed), slug

app.applications
  id, job_id (FK), worker_user_id (FK), status (pending|accepted|rejected), applied_at

app.contracts
  id, application_id (FK), pdf_key, worker_signed_at, manager_signed_at, issued_at

app.attendance
  id, application_id (FK), date, status (present|absent|half_day), hours_worked, recorded_by

ref.provinces        — 63 Vietnamese provinces
ref.trades           — construction trade types (ko/vi/en names)
ops.fcm_tokens       — user_id, token, platform (ios|android|web)
ops.notifications    — user_id, type, payload JSONB, read_at
```

---

## 6. Non-Functional Requirements (MVP)

| Concern | Requirement |
|---|---|
| Response time | API p95 < 500ms under 100 concurrent users |
| Uptime | 99.5% monthly (single-AZ acceptable for MVP) |
| File upload size | Max 10 MB per file (ID documents, business docs) |
| PDF generation | Contract PDF generated server-side (Laravel); max 5s |
| SEO | Core Web Vitals pass; LCP < 2.5s on public pages |
| Locales served | `ko` (default), `vi`, `en` |
| Mobile OS | iOS 15+, Android 10+ via Capacitor |
| Browser | Last 2 versions of Chrome, Safari, Firefox |
| Auth token expiry | Firebase ID token 1h; refresh handled client-side |
| GDPR/Personal data | User data deletable on request; ID images purged from S3 on delete |
