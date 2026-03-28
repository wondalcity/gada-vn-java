# Screen Map — GADA VN

**Source**: Figma file `l9T36IlqSYGhGxAiRseRV7`
**Status key**: ✅ Designed · ⬜ To be designed · ⚠️ Partial · 🔵 Built · ✗ Post-MVP
**Platform key**: 📱 Mobile (Capacitor) · 🌐 Web (Next.js) · 🛠 Admin (Laravel)
**Last updated**: 2026-03-21

---

## Design Coverage Summary

The current Figma file (`01. Style` page) contains only the **design system / style guide**.
Screen-level frames for the Worker App, Manager App, Back Office, and Admin Web are **referenced by name in the style guide** but have **not been designed yet**.

All screens below are marked **⬜ To be designed** unless explicitly confirmed in Figma.
The 4 app sections defined in the style guide:
- **가다 근로자 앱** — Worker App (mobile)
- **가다 관리자 앱** — Manager App (mobile)
- **백오피스** — Back Office (admin web, desktop)
- **관리자웹** — Admin Web (desktop)

---

## Reading this Map

```
[ID]  Screen Name          | Route                    | Platform  | Status   | Notes
```

Screen IDs are used to cross-reference with `docs/figma/links.md` (Figma node IDs added there when screens are created).

---

## Section A — Authentication (Shared)

Shared across Worker and Manager. Single Firebase auth flow.

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| A-01 | Splash / Loading | `/` (native) | 📱 | ⬜ To be designed | App icon on brand bg |
| A-02 | Welcome / Onboarding | `/onboarding` | 📱 | ⬜ To be designed | 2–3 slides; skip option |
| A-03 | Login — Select method | `/login` | 📱 🌐 | ⬜ To be designed | Phone OTP · Password · Facebook |
| A-04 | Login — Phone number entry | `/login/phone` | 📱 | ⬜ To be designed | +84 / +82 selector |
| A-05 | Login — OTP verification | `/login/otp` | 📱 | ⬜ To be designed | 6-digit input; resend timer |
| A-06 | Login — Email + password | `/login/email` | 📱 🌐 | ⬜ To be designed | |
| A-07 | Register — Name + Email + PW | `/register` | 📱 | ⬜ To be designed | Shown on first OTP verify |
| A-08 | Register — Success | `/register/done` | 📱 | ⬜ To be designed | |
| A-09 | Forgot password | `/login/forgot` | 📱 🌐 | ⬜ To be designed | |

---

## Section B — Worker App 📱
**가다 근로자 앱** — Mobile (375px base)

### B1 — Home

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| B1-01 | Worker Home | `/app/home` | 📱 | ⬜ To be designed | Job recommendations, quick actions, notifications preview |
| B1-02 | Notifications list | `/app/notifications` | 📱 | ⬜ To be designed | All FCM notifications; mark read |

### B2 — Job Discovery

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| B2-01 | Job Feed (list) | `/app/jobs` | 📱 | ⬜ To be designed | Paginated; filter bar |
| B2-02 | Job Feed (map) | `/app/jobs?view=map` | 📱 | ⬜ To be designed | PostGIS pins on map |
| B2-03 | Job Filter sheet | `/app/jobs` (overlay) | 📱 | ⬜ To be designed | Bottom sheet: province, trade, date range |
| B2-04 | Job Detail | `/app/jobs/[id]` | 📱 | ⬜ To be designed | Full detail; apply CTA |
| B2-05 | Job Detail — Applied state | `/app/jobs/[id]` | 📱 | ⬜ To be designed | After apply; shows status |

### B3 — Applications

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| B3-01 | My Applications | `/app/applications` | 📱 | ⬜ To be designed | Grouped by status |
| B3-02 | Application Detail | `/app/applications/[id]` | 📱 | ⬜ To be designed | Status timeline + contract link |
| B3-03 | Contract View | `/app/contracts/[id]` | 📱 | ⬜ To be designed | PDF viewer + sign CTA |
| B3-04 | Contract Signed — Success | `/app/contracts/[id]/signed` | 📱 | ⬜ To be designed | Confetti / `doc_visual` illustration |

### B4 — Worker Profile

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| B4-01 | My Profile (view) | `/app/profile` | 📱 | ⬜ To be designed | Shows all profile info + level |
| B4-02 | Edit Basic Info | `/app/profile/edit` | 📱 | ⬜ To be designed | Name, DOB, nationality, provinces, trade |
| B4-03 | ID Document Upload | `/app/profile/id-upload` | 📱 | ⬜ To be designed | Front + back camera/gallery; preview |
| B4-04 | Signature Pad | `/app/profile/signature` | 📱 | ⬜ To be designed | Canvas draw; save/clear |
| B4-05 | Experience List | `/app/profile/experience` | 📱 | ⬜ To be designed | List of past jobs |
| B4-06 | Add / Edit Experience | `/app/profile/experience/[id]` | 📱 | ⬜ To be designed | Form |
| B4-07 | Become a Manager — Entry | `/app/profile/manager` | 📱 | ⬜ To be designed | CTA + status if pending/rejected |

### B5 — Manager Registration (from Worker profile)

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| B5-01 | Business Registration form | `/app/manager-register` | 📱 | ⬜ To be designed | Business name, reg number, rep name |
| B5-02 | Business doc upload | `/app/manager-register/doc` | 📱 | ⬜ To be designed | PDF or image |
| B5-03 | Registration submitted | `/app/manager-register/done` | 📱 | ⬜ To be designed | Pending state |
| B5-04 | Registration rejected | `/app/manager-register/rejected` | 📱 | ⬜ To be designed | Shows rejection note; re-submit CTA |

---

## Section C — Manager App 📱
**가다 관리자 앱** — Mobile. Unlocked after manager approval.

### C1 — Manager Home

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| C1-01 | Manager Home | `/app/manager` | 📱 | ⬜ To be designed | Site list summary, pending applicants count |

### C2 — Sites

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| C2-01 | Site List | `/app/manager/sites` | 📱 | ⬜ To be designed | All sites with status |
| C2-02 | Create Site | `/app/manager/sites/new` | 📱 | ⬜ To be designed | Form + map picker for GPS |
| C2-03 | Site Detail | `/app/manager/sites/[id]` | 📱 | ⬜ To be designed | Job list, quick stats |
| C2-04 | Edit Site | `/app/manager/sites/[id]/edit` | 📱 | ⬜ To be designed | |

### C3 — Jobs

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| C3-01 | Job List (under site) | `/app/manager/sites/[id]/jobs` | 📱 | ⬜ To be designed | Per-site job list |
| C3-02 | Create Job | `/app/manager/sites/[id]/jobs/new` | 📱 | ⬜ To be designed | Trade, headcount, wage, dates |
| C3-03 | Job Detail (manager view) | `/app/manager/jobs/[id]` | 📱 | ⬜ To be designed | Applicant count, status |
| C3-04 | Edit Job | `/app/manager/jobs/[id]/edit` | 📱 | ⬜ To be designed | |

### C4 — Applicant Management

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| C4-01 | Applicant List | `/app/manager/jobs/[id]/applicants` | 📱 | ⬜ To be designed | Worker list with status |
| C4-02 | Applicant Detail (worker profile) | `/app/manager/applicants/[id]` | 📱 | ⬜ To be designed | Worker profile (manager view) |
| C4-03 | Hire confirm dialog | Overlay | 📱 | ⬜ To be designed | Confirm modal |
| C4-04 | Reject confirm dialog | Overlay | 📱 | ⬜ To be designed | Confirm modal |

### C5 — Attendance

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| C5-01 | Attendance — Date selection | `/app/manager/jobs/[id]/attendance` | 📱 | ⬜ To be designed | Calendar or date picker |
| C5-02 | Attendance — Worker list for date | `/app/manager/jobs/[id]/attendance/[date]` | 📱 | ⬜ To be designed | Swipe row: present/absent/half |
| C5-03 | Attendance — Hours input | Inline or sheet | 📱 | ⬜ To be designed | Numeric input per worker |

### C6 — Contracts

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| C6-01 | Contract Preview | `/app/manager/contracts/[id]` | 📱 | ⬜ To be designed | PDF view; generate/resend |

---

## Section D — Public Web 🌐
**Next.js — SEO/GEO optimized. No auth required.**

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| D-01 | Landing page | `/` or `/[locale]` | 🌐 | ⬜ To be designed | Hero, value prop, app download links |
| D-02 | Job listing | `/[locale]/jobs` | 🌐 | ⬜ To be designed | SSG; schema.org JobPosting; filter |
| D-03 | Job detail | `/[locale]/jobs/[slug]` | 🌐 | ⬜ To be designed | SSR; OG tags; structured data |
| D-04 | Province index | `/[locale]/jobs/[province]` | 🌐 | ⬜ To be designed | SSG per province (63 pages) |
| D-05 | Site detail | `/[locale]/sites/[slug]` | 🌐 | ⬜ To be designed | SSR; map embed; jobs on site |
| D-06 | Login prompt (gate) | `/[locale]/login` | 🌐 | ⬜ To be designed | Redirects unauthenticated from apply |
| D-07 | 404 | — | 🌐 | ⬜ To be designed | |
| D-08 | 500 / Error | — | 🌐 | ⬜ To be designed | |

---

## Section E — Authenticated Web App 🌐
**Next.js — Worker and Manager dashboards in browser.**

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| E-01 | Worker dashboard | `/[locale]/app/home` | 🌐 | ⬜ To be designed | Desktop layout of B1-01 |
| E-02 | Job feed (web) | `/[locale]/app/jobs` | 🌐 | ⬜ To be designed | Desktop layout of B2-01 |
| E-03 | Worker profile (web) | `/[locale]/app/profile` | 🌐 | ⬜ To be designed | Desktop layout of B4-01 |
| E-04 | Manager dashboard (web) | `/[locale]/app/manager` | 🌐 | ⬜ To be designed | Desktop layout of C1-01 |

---

## Section F — Admin Panel 🛠
**백오피스 / 관리자웹 — Laravel Blade. Desktop only (1280px+).**

| ID | Screen | Route | Platform | Status | Notes |
|---|---|---|---|---|---|
| F-01 | Admin Login | `/admin/login` | 🛠 | ⬜ To be designed | Email + password only; no Firebase |
| F-02 | Dashboard / Overview | `/admin` | 🛠 | ⬜ To be designed | KPI cards: users, sites, jobs, pending approvals |
| F-03 | Manager Approval Queue | `/admin/manager-approvals` | 🛠 | ⬜ To be designed | Table: pending registrations |
| F-04 | Manager Approval Detail | `/admin/manager-approvals/[id]` | 🛠 | ⬜ To be designed | Doc preview + approve/reject |
| F-05 | User List | `/admin/users` | 🛠 | ⬜ To be designed | Search; paginated table |
| F-06 | User Detail | `/admin/users/[id]` | 🛠 | ⬜ To be designed | Profile + roles + activity |
| F-07 | Site List | `/admin/sites` | 🛠 | ⬜ To be designed | All sites; deactivate action |
| F-08 | Site Detail | `/admin/sites/[id]` | 🛠 | ⬜ To be designed | Site info + jobs + manager |
| F-09 | Job List | `/admin/jobs` | 🛠 | ⬜ To be designed | All jobs; close action |
| F-10 | Job Detail | `/admin/jobs/[id]` | 🛠 | ⬜ To be designed | Job info + applicants |
| F-11 | Translation Management | `/admin/translations` | 🛠 | ⬜ To be designed | Inline edit: ko / vi / en strings |

---

## Screen Priority for MVP Design Sprint

Design in this order to unblock implementation in parallel:

| Sprint | Screens | Unblocks |
|---|---|---|
| Sprint 1 | A-03 → A-08 (Auth) | All user journeys |
| Sprint 1 | B2-01, B2-04 (Job feed + detail) | Worker core loop |
| Sprint 1 | C2-02, C3-02 (Create site + job) | Manager core loop |
| Sprint 2 | B3-01, B3-03, B3-04 (Applications + contract) | Hire loop |
| Sprint 2 | C4-01, C4-02 (Applicant management) | Hire loop |
| Sprint 2 | C5-02 (Attendance) | Attendance loop |
| Sprint 3 | B4-01 → B4-06 (Profile setup) | Profile completeness |
| Sprint 3 | D-02, D-03 (Public job pages) | SEO launch |
| Sprint 4 | F-01 → F-04 (Admin auth + approval) | Manager unblocking |
| Sprint 4 | Remaining Admin screens | Admin operations |

---

## Post-MVP Screens (Do Not Design Now)

| Screen | Section | Reason |
|---|---|---|
| In-app messaging | Worker ↔ Manager | Phase 2 |
| Worker rating | After contract complete | Phase 2 |
| Manager rating | After contract complete | Phase 2 |
| Wage history | Requires payment integration | Phase 4 |
| Job recommendations | Requires usage data | Phase 3 |
| Worker search (for managers) | Phase 3 feature | Phase 3 |
| Worker availability calendar | Phase 3 feature | Phase 3 |
