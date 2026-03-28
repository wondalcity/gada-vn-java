# GADA VN — Consistency Review
**Date**: 2026-03-21
**Scope**: Full monorepo cross-layer audit
**Reviewer**: Technical Review (automated)
**Result**: 7 / 10 — Mostly functional; 1 critical blocker, 8 significant mismatches

---

## 1. Database Schema vs. Laravel Models

### 1.1 `auth.user_roles` — CRITICAL MISMATCH

| Layer | Value |
|-------|-------|
| Migration 001 | `auth.users.role` — single TEXT column (`WORKER\|MANAGER\|ADMIN`) |
| Docs (`rbac-model.md`) | Separate `auth.user_roles` table with multi-role 1:N relationship |
| `User.php` | `hasMany(UserRole::class)` — expects `auth.user_roles` |
| `UserRole.php` | Maps to `auth.user_roles` |
| `FirebaseAuthMiddleware` | `DB::table('auth.user_roles')->insertOrIgnore(...)` on first login |
| `RoleMiddleware` | Queries `auth.user_roles` for role check |

**Finding**: No migration creates `auth.user_roles`. The middleware and models both reference this table. If the table is absent, the application crashes on every authenticated request. Either the table is created in an unread migration (007+) or this is a live blocker.

---

### 1.2 Table Naming — 3 Mismatches

| Entity | Migration 001 (authoritative) | schema.md | Laravel Model |
|--------|-------------------------------|-----------|---------------|
| Trades | `ref.construction_trades` | `ref.trades` | `ref.construction_trades` ✓ |
| Provinces | `ref.vn_provinces` | `ref.provinces` | (raw queries) |
| Contracts | `app.contracts` | `app.employment_contracts` | `app.contracts` ✓ |
| Hires | Not in migration 001 | `app.hires` (full schema) | `app.job_applications` (ACCEPTED/CONTRACTED) |

**Finding**: Laravel and TypeScript types are aligned to migration 001. `schema.md` uses different table names. The `app.hires` table described in docs does not appear in any migration; the application correctly models hires as a subset of `app.job_applications` with `status IN ('ACCEPTED','CONTRACTED')`.

---

### 1.3 Status Enum Casing — All Enums Affected

| Entity | Migration 001 | schema.md | Laravel | TypeScript |
|--------|--------------|-----------|---------|-----------|
| Application | `PENDING\|ACCEPTED\|REJECTED\|WITHDRAWN\|CONTRACTED` | `pending\|accepted\|rejected\|withdrawn\|expired` | matches DB ✓ | matches DB ✓ |
| Job | `OPEN\|FILLED\|CANCELLED\|COMPLETED` | `draft\|open\|filled\|closed` | matches DB ✓ | matches DB ✓ |
| Contract | `PENDING_WORKER_SIGN\|PENDING_MANAGER_SIGN\|FULLY_SIGNED\|VOID` | `pending\|worker_signed\|fully_signed\|voided` | matches DB ✓ | matches DB ✓ |
| Attendance | `PENDING\|ATTENDED\|ABSENT\|HALF_DAY` | `present\|absent\|half_day\|late\|excused` | matches DB ✓ | matches DB ✓ |
| Site | `ACTIVE\|COMPLETED\|PAUSED` | not documented | matches DB ✓ | matches DB ✓ |

**Finding**: Implementation (Laravel + TypeScript) correctly matches migration 001 in all cases. `schema.md` is stale — it uses lowercase values and, in some cases, different state names (`expired` instead of `CONTRACTED`, `draft` not in DB, `late/excused` not in DB).

---

### 1.4 Model Fillable Arrays vs. Migration Columns

| Model | Column | Added In | Status |
|-------|--------|----------|--------|
| `WorkerProfile` | `terms_accepted`, `privacy_accepted`, `terms_accepted_at` | Migration 003 | ✓ correct |
| `ManagerProfile` | `first_site_name`, `first_site_address` | Migration 004 | ✓ correct |
| `Site` | `image_s3_keys`, `cover_image_idx` | Migration 005 | ✓ correct |
| `Job` | (no incremental columns) | — | ✓ correct |
| `AttendanceRecord` | (no incremental columns) | — | ✓ correct |

**Finding**: All models are consistent with their respective migrations. Fillable arrays are accurate.

---

### 1.5 Timestamp Strategy — Mixed Pattern (Intentional)

| Model | `$timestamps` | Reason |
|-------|--------------|--------|
| `User`, `WorkerProfile`, `ManagerProfile`, `Site`, `Job`, `Contract`, `AttendanceRecord` | `true` | Standard `created_at/updated_at` |
| `JobShift` | `false` | Only `created_at` in schema (no `updated_at`) |
| `Application` | `false` | Uses `applied_at`, `reviewed_at` — domain timestamps, not Eloquent-managed |
| `Trade` | `false` | Reference data, no timestamps |

**Finding**: Pattern is intentional and consistent with schema. No issues.

---

## 2. Laravel API Routes vs. Frontend

### 2.1 Route Coverage — Complete

All API routes defined in `routes/api.php` have corresponding frontend consumers:

| Domain | API Routes | Web-Next Pages | Mobile Screens | Status |
|--------|-----------|----------------|----------------|--------|
| Auth | 5 | login, register | phone, otp, role | ✓ |
| Worker profile | 8 | /worker/profile (wizard) | profile.tsx | ✓ |
| Applications | 3 | /worker/applications | jobs/[id].tsx | ✓ |
| Hires | 1 | /worker/hires | — (web-only) | ✓ |
| Attendance | 1 (worker), 3 (manager) | both sides | — | ✓ |
| Contracts | 2 (worker), 3 (manager) | both sides | contracts/[id].tsx | ✓ |
| Manager registration | 2 | /manager/profile (wizard) | register.tsx | ✓ |
| Sites | 7 | /manager/sites/* | — (web-only) | ✓ |
| Jobs | 7 | /manager/jobs/* | jobs/[id].tsx | ✓ |
| Shifts | 3 | ShiftManager component | — | ✓ |
| Applications (mgr) | 5 | /manager/jobs/[id]/applicants | — | ✓ |
| Notifications | 3 | — | notifications.tsx | ⚠️ web missing |
| Public jobs | 2 | /jobs, /jobs/[slug] | — | ✓ |
| Public sites | 1 | /sites/[slug] | — | ✓ |
| Admin | 10 | /admin/* (Blade) | — | ✓ |

**Finding**: Notification read/mark-read is implemented in mobile but has no web-next page. All other routes have web coverage.

---

### 2.2 Response Shape — API → TypeScript Types

| Endpoint | API Field | TypeScript Field | Status |
|----------|-----------|-----------------|--------|
| `GET /worker/hires` | `contractId` | `Hire.contractId?` | ✓ added in fix |
| `GET /worker/hires` | `dailyWage` | `Hire.dailyWage` | ✓ |
| `GET /manager/hires` | `workerPhone` | `HireWithContract.workerPhone` | ✓ |
| `GET /public/jobs` | `provinceSlug` | `PublicJob.provinceSlug` | ✓ |
| `GET /public/jobs/{slug}` | `relatedJobs[]` | `PublicJobDetail.relatedJobs` | ✓ |
| `POST /worker/contracts/{id}/sign` | `signature_data_url` | canvas.toDataURL() | ✓ |
| `PUT /manager/jobs/{jobId}/attendance` | `records[].workerId` | `RosterEntry.workerId` | ✓ |

---

### 2.3 Permission Boundary Correctness

| Action | Required Role | Enforced By | Status |
|--------|-------------|-------------|--------|
| `POST /jobs/{jobId}/apply` | Any authenticated | `firebase.auth` only | ✓ |
| `POST /manager/register` | Any authenticated | `firebase.auth` only | ✓ |
| `GET /manager/sites` | `role:manager` | `RoleMiddleware` | ✓ |
| `POST /manager/applications/{id}/contract` | `role:manager` + ownership check | Middleware + controller | ✓ |
| `PATCH /admin/jobs/{id}/close` | `role:admin` | `RoleMiddleware` | ✓ |
| `PATCH /admin/attendance/{id}` | `role:admin` | `RoleMiddleware` | ✓ |
| `GET /worker/contracts/{id}` | ownership only (worker_id check) | Controller | ✓ |
| `POST /manager/contracts/{id}/sign` | ownership only (manager_id check) | Controller | ✓ |
| `DELETE /worker/applications/{id}` | ownership only (worker_id check) | Controller | ✓ |

**Finding**: No permission escalation paths found. Manager-only routes are correctly gated. Ownership checks are implemented in individual controllers.

---

## 3. Next.js Routes vs. Schema

### 3.1 URL Structure Consistency

| Route | Slug Source | Dynamic Param | Status |
|-------|------------|---------------|--------|
| `/jobs/[slug]` | `app.jobs.slug` | slug | ✓ |
| `/sites/[slug]` | Computed: `Str::slug(site.name)` | slug | ⚠️ no DB slug column |
| `/locations/[province]` | Computed: `Str::slug(province.name_vi)` | province | ⚠️ no DB slug column |
| `/manager/sites/[siteId]` | `app.construction_sites.id` | UUID | ✓ |
| `/manager/jobs/[jobId]` | `app.jobs.id` | UUID | ✓ |
| `/worker/contracts/[id]` | `app.contracts.id` OR `application_id` | UUID | ✓ (fallback handled) |

**Finding**: `/sites/[slug]` and `/locations/[province]` use runtime-computed slugs (no DB column). This means slug lookup requires full table scans and PHP string matching on every request. Low risk for current scale but not idiomatic.

---

### 3.2 Routing Conflict Resolution

- **`/jobs/[slug]` vs `/jobs/[province]`**: Conflict present in file system. Resolved by redirecting `jobs/[province]/page.tsx` → `/locations/[province]`. ✓
- **`/locations/[province]`**: New route, `generateStaticParams()` pre-generates all province slugs. ✓

---

### 3.3 i18n Route Coverage

| Locale | Homepage | Jobs | Locations | Sites | Login |
|--------|----------|------|-----------|-------|-------|
| ko | ✓ | ✓ | ✓ (SSG) | ✓ | ✓ |
| vi | ✓ | ✓ | ✓ (SSG) | ✓ | ✓ |
| en | ✓ | ✓ | ✓ (SSG) | ✓ | ✓ |

All locales covered via `[locale]` dynamic segment with `generateStaticParams`. ✓

---

## 4. Design Token Consistency

### 4.1 Color Palette Usage

| Token | Value | Used In |
|-------|-------|---------|
| Primary blue | `#0669F7` | Web-next (inline), mobile (hardcoded strings) |
| Error red | `#ED1C24` | Web-next components |
| Text primary | `#25282A` | Web-next components |
| Text muted | `#7A7B7A` | Web-next components |
| Border | `#DDDDDD` | Web-next components |
| Admin sidebar | `#0F172A` (slate-900) | Admin Blade templates |

**Finding**: `tailwind.config.ts` not found in `apps/web-next`. Design tokens are hardcoded as hex strings in component classes rather than defined as Tailwind theme extensions. Mobile app also hardcodes color strings. No shared design token package exists.

### 4.2 Typography

Web-next uses Inter (Google Fonts) via `<link>`. Mobile uses system font via Expo. Admin Blade uses Inter via CDN. No shared typography specification is enforced at build time.

---

## 5. i18n / Multilingual Consistency

### 5.1 Translation File Coverage

| Namespace | ko | vi | en | Status |
|-----------|----|----|----|----|
| `auth` | ✓ | ✓ | ✓ | ✓ |
| `common` | ✓ | ✓ | ✓ | ✓ |
| `worker` | ✓ | ✓ | ✓ | ✓ |
| `manager` | ✓ | ✓ | ✓ | ✓ |
| `jobs` | ✓ | ✓ | ✓ | ✓ |
| `landing` | ✓ | ✓ | ✓ | ✓ |
| `public` | Not verified | Not verified | Not verified | ⚠️ |
| `notifications` | ✓ | ✓ | ✓ | ✓ |
| `validation` | ✓ | ✓ | ✓ | ✓ |

**Finding**: `public` namespace referenced in `generateMetadata` calls for landing page but not confirmed present across all locales.

### 5.2 Database Multilingual Columns

| Table | Multilingual Columns | Present |
|-------|---------------------|---------|
| `ref.construction_trades` | `name_ko`, `name_vi`, `name_en` | ✓ |
| `app.jobs` | `title` (single), `description` (single) | ⚠️ not multilingual |
| `app.construction_sites` | `name` (single) | ⚠️ not multilingual |

**Finding**: Jobs and sites store title/description as single-language text (likely Vietnamese). The API `PublicJobController` returns `titleKo`, `titleVi` fields but these are the same `title` column aliased differently. No actual multi-language job titles are stored in the DB.

---

## 6. Mobile App vs. Web-next Coverage

| Feature | Web-next | Mobile | Notes |
|---------|---------|--------|-------|
| Auth (OTP + Facebook) | ✓ | ✓ | |
| Worker profile wizard | ✓ | partial | Mobile has basic profile screen |
| Job browse/search | ✓ | ✓ (via jobs/[id].tsx) | |
| Job apply | ✓ (ApplyButton) | ✓ | |
| Applications list | ✓ | — | Mobile missing |
| Contract sign (canvas) | ✓ | ✓ (SVG path) | Different signature implementations |
| Manager registration | ✓ | ✓ (register.tsx) | |
| Manager site/job CRUD | ✓ | — | Web-only feature |
| Attendance management | ✓ | — | Web-only feature |
| Notifications | — (web) | ✓ | Web missing notification page |
| Admin panel | Blade web | — | Admin-only |

---

## 7. Admin Dashboard vs. API Routes

### 7.1 Web Blade Routes vs. API Routes — Duplication Verified

| Action | API Route (`/v1/admin/*`) | Web Route (`/admin/*`) | Status |
|--------|--------------------------|------------------------|--------|
| List approvals | `GET /admin/manager-approvals` | `GET /admin/approvals` | ✓ dual-interface |
| Approve | `PATCH /admin/manager-approvals/{id}/approve` | `POST /admin/approvals/{id}/approve` | ✓ |
| Reject | `PATCH /admin/manager-approvals/{id}/reject` | `POST /admin/approvals/{id}/reject` | ✓ |
| List users | `GET /admin/users` | `GET /admin/users` | ✓ |
| Deactivate site | `PATCH /admin/sites/{id}/deactivate` | `POST /admin/sites/{id}/deactivate` | ✓ |
| Close job | `PATCH /admin/jobs/{id}/close` | `POST /admin/jobs/{id}/close` | ✓ |
| Edit attendance | `PATCH /admin/attendance/{id}` | — | ⚠️ API only, no Blade page |
| Translations | `GET/PUT /admin/translations` | `GET/PUT /admin/translations` | ✓ |
| Audit logs | — | `GET /admin/audit-logs` | ⚠️ Blade only, no API |

---

## 8. Contract Workflow State Machine

```
PENDING_WORKER_SIGN
    → [worker signs via POST /worker/contracts/{id}/sign]
PENDING_MANAGER_SIGN
    → [manager signs via POST /manager/contracts/{id}/sign]
FULLY_SIGNED
    → [application.status → CONTRACTED]
    → [HTML contract file stored in S3]

Side paths:
PENDING_WORKER_SIGN|PENDING_MANAGER_SIGN → VOID (admin action only — not yet implemented)
```

**Finding**: The VOID transition has no API endpoint. The admin API has no contract management endpoints (no list, no void, no override). This is a gap.

---

## 9. `GenerateContractJob` — Dead Code

`/apps/admin-laravel/app/Jobs/GenerateContractJob.php` references:
- `app.hires` — table does not exist in any migration
- `app.employment_contracts` — table renamed to `app.contracts`

This queue job is unreferenced in any controller (contract generation happens synchronously in `ContractService`). It is dead code and should be removed.

---

## 10. Summary Matrix

| Layer | Alignment Score | Critical Issues | Notes |
|-------|----------------|-----------------|-------|
| DB Schema ↔ Models | 9/10 | 0 | Minor: timestamps pattern mixed but intentional |
| DB Schema ↔ Docs | 4/10 | 0 | Docs severely outdated — all enums wrong casing, 3 wrong table names |
| API Routes ↔ Types | 9/10 | 0 | `contractId` field added in fix |
| API Routes ↔ Frontend | 8/10 | 0 | Web notification page missing |
| Permission Model ↔ Code | 10/10 | 0 | All gates correct |
| State Machines ↔ Code | 8/10 | 0 | Contract VOID path unimplemented |
| i18n ↔ Components | 8/10 | 0 | `public` namespace unverified |
| Mobile ↔ Web | 6/10 | 0 | Mobile is a subset; expected |
| `auth.user_roles` existence | **0/10** | **1 CRITICAL** | May crash app on every login |
| Design tokens | 5/10 | 0 | No shared token system; all inline |
