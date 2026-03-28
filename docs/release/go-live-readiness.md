# Go-Live Readiness Assessment — GADA VN MVP

**Reviewer**: Platform Release Reviewer
**Date**: 2026-03-21
**Version**: MVP
**Target environment**: `https://gada.vn` (production)

---

## Overall Verdict

> ## ⛔ NO-GO
>
> **The MVP is not ready for production release.**
>
> Three P0 security defects remain unpatched in the deployed codebase. Two of them directly allow bypassing account controls that protect real user data. These must be fixed, tested, and deployed to staging before any production release proceeds.
>
> A conditional GO is achievable within **3–5 engineering days** once the blockers listed in `docs/release/blockers.md` are resolved.

---

## Summary Scorecard

| Area | Status | Verdict |
|------|--------|---------|
| Architecture consistency | Solid | ✅ GO |
| Infrastructure readiness | Solid with minor gaps | ✅ GO |
| Security — P0 defects | 2 of 4 unpatched | ⛔ NO-GO |
| Security — P1/P2 defects | Known, acceptable deferral | ⚠️ CONDITIONAL |
| Performance — P0 issues | 2 of 6 unpatched | ⚠️ CONDITIONAL |
| Staging deployment | Not yet executed | ⛔ NO-GO |
| UAT | Not yet started | ⛔ NO-GO |
| Operational readiness | Documentation complete | ✅ GO |
| Mobile build readiness | EAS project ID placeholder | ⛔ NO-GO (mobile) |
| i18n / translations | No translation files committed | ⛔ NO-GO (multilingual) |

---

## 1. Architecture Consistency

**Verdict: ✅ GO**

The platform architecture is coherent and well-implemented:

- **API layer** (Laravel 11, PHP 8.2): Clean controller → service → repository separation. Firebase JWT authentication via `FirebaseAuthMiddleware`. Role checking via `RoleMiddleware`. No major structural issues.
- **Web layer** (Next.js 15, App Router): Correct use of SSR/SSG/ISR patterns. `next-intl` integration with `ko`/`vi`/`en` locale routing. Public and authenticated route separation is clean.
- **Mobile** (Expo SDK 51, React Native 0.74): Expo Router v3, EAS build profiles configured. Firebase OTP and Facebook social login integrated.
- **Database**: PostgreSQL 16 + PostGIS. 8 migrations applied. Multi-schema layout (`auth`, `app`, `ref`, `ops`) is well-structured. RLS enabled on core tables.
- **Infrastructure** (AWS CDK, ap-southeast-1): VPC → RDS → Redis → CDN → ECS dependency chain is correct. Per-environment isolation (bucket names, Firebase project IDs, encryption keys) is documented and enforced in CDK stacks.
- **CI/CD**: GitHub Actions pipeline covers lint → test → build → deploy-staging → deploy-production (manual gate). EAS mobile builds triggered per branch.

**Minor inconsistency**: `apps/web-next` is the active Next.js app but `apps/web` also exists. Both have `.env.example` files. The team should confirm `apps/web` is deprecated and remove it to avoid confusion. This is not a release blocker.

---

## 2. Infrastructure Readiness

**Verdict: ✅ GO (with noted gaps)**

Production infrastructure is production-grade:

| Component | Configuration | Status |
|-----------|--------------|--------|
| RDS PostgreSQL 16 | Multi-AZ ✅, deletion protection ✅, 14-day backup ✅, storage encrypted ✅, read replica ✅ | GO |
| ECS Fargate (API) | 2 desired tasks in prod ✅, auto-scaling to 10 ✅, private subnets ✅ | GO |
| ECS Fargate (Web) | Same ✅ | GO |
| ElastiCache Redis | In VPC, no public access ✅ | GO |
| S3 (uploads) | Private bucket, presigned URLs only ✅, per-environment isolation ✅ | GO |
| CloudFront | OAC for CDN bucket ✅, image optimizer Lambda placeholder ⚠️ | Partial |
| ECR | Lifecycle policy (10 images max) ✅ | GO |
| Secrets Manager | DB credentials, Firebase creds, encryption key per env ✅ | GO |
| SSM Parameter Store | APP_KEY, ADMIN_PANEL_PASSWORD, etc. per env ✅ | GO |

**Gaps (not blockers)**:
- CloudFront image optimizer Lambda is a placeholder (`// TODO: implement Sharp`). WebP optimisation is not active. Images will be served from S3 at original size. Acceptable for launch; address in v1.1.
- `CORS_ALLOWED_ORIGINS` is not yet configured in Laravel (`config/cors.php` missing). Currently using the default wildcard CORS. This is SEC-P2-02 and should be addressed post-launch.

---

## 3. Security Risk Status

**Verdict: ⛔ NO-GO**

### P0 Defects (must fix before release)

**SEC-P0-01 — Suspended accounts can still make API calls**

- **File**: `apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php:48`
- **Current code**: `if ($user->status === 'deleted')` — only blocks lowercase `'deleted'`
- **Impact**: Any user suspended via the admin panel (`status = 'SUSPENDED'`) can continue making all authenticated API calls indefinitely while their Firebase JWT remains valid (up to 1 hour). A suspended worker can continue viewing contracts, a suspended manager can continue posting jobs.
- **Status**: ⛔ **UNPATCHED** — fix documented in `docs/qa/security-fix-list.md` (SEC-P0-01) but not yet applied to code.

**SEC-P0-02 — No rate limiting on login and social auth endpoints**

- **File**: `apps/admin-laravel/routes/api.php:45,46`
- **Current code**: `/auth/login` and `/auth/social/facebook` have no `throttle` middleware
- **Impact**: Unlimited credential-stuffing attacks on login; unlimited account enumeration via Facebook login endpoint. OTP send endpoint has throttling but login verification does not.
- **Status**: ⛔ **UNPATCHED** — fix documented in `docs/qa/security-fix-list.md` (SEC-P0-02) but not yet applied.

### P0 Defects (mitigated at service layer)

**SEC-P0-03 — Signature data URL not validated in controller**

- **File**: `apps/admin-laravel/app/Http/Controllers/WorkerContractController.php:80`
- **Current code**: `'signature_data_url' => 'required|string'` only
- **Partial mitigation**: `ContractService.php:64` contains a regex check that rejects malformed data URLs. The attack surface is reduced because malformed payloads fail at the service layer.
- **Residual risk**: A very large base64 string (multi-MB) passes controller validation and reaches the service, consuming memory and CPU before rejection. A 2MB+ malformed payload could be used for a targeted DoS on the contract signing endpoint.
- **Status**: ⚠️ **PARTIALLY MITIGATED** — service-layer check exists. Controller-level validation (size + regex) should be added before release to fully close the window.

**SEC-P0-04 — Manager's S3 presigned signature URL exposed in worker-facing contract**

- **File**: `apps/admin-laravel/app/Http/Controllers/WorkerContractController.php:47-52`
- **Status**: Requires code review to confirm whether `manager_sig_url` is excluded from the worker-facing response. See `docs/qa/security-fix-list.md` (SEC-P0-04).

### P1 Defects (acceptable with plan)

| ID | Finding | Risk | Plan |
|----|---------|------|------|
| SEC-P1-01 | No audit logging for sensitive data access (ID docs, contracts) | Medium | v1.1 sprint |
| SEC-P1-02 | No pagination on `/manager/jobs/{id}/applications` | High (DoS risk) | Fix before release — see PERF-P0-06 |
| SEC-P1-03 | No CORS allowlist configured | Medium | Post-launch patch |
| SEC-P1-04 | Admin panel password is a shared secret | Low | Rotate before deploy |

### P2 Defects (deferred, logged)

CORS, audit log retention, brute-force lockout UI, and similar issues are documented in `docs/qa/security-fix-list.md` and tracked for v1.1.

---

## 4. Performance Readiness

**Verdict: ⚠️ CONDITIONAL**

### P0 Performance Issues

**PERF-P0-01 — N+1 query on public job listing page (unpatched)**

- **File**: `apps/admin-laravel/app/Http/Controllers/PublicJobController.php`
- **Issue**: `resolveProvinceForSite()` executes one DB query per job inside `$jobs->map()`. A listing page with 20 jobs triggers 21 queries (1 for jobs + 20 for provinces).
- **Impact**: Public job listing is the highest-traffic page. At 50 concurrent users browsing the listing, this produces ~1,050 DB queries per second for province lookups alone.
- **Status**: ⛔ **UNPATCHED** — fix is documented (pre-load province map keyed by province code before the map loop) but not applied.
- **Fix effort**: ~1 hour.

**PERF-P0-02 — Job detail page has zero CDN caching (partially applicable)**

- **File**: `apps/web-next/src/app/[locale]/(public)/jobs/[slug]/page.tsx:15`
- **Current**: `export const dynamic = 'force-dynamic'` is set. This forces a server-side render on every request with no caching.
- **Impact**: Every page view hits the Laravel API. For high-traffic job listings this bypasses CloudFront entirely and directly loads the origin.
- **Note**: If `force-dynamic` is intentional for real-time slot counts, the minimum fix is to remove it and use `revalidate = 60` (1-minute ISR). See `docs/qa/performance-fix-list.md` PERF-P0-02.
- **Status**: ⚠️ **UNPATCHED** — needs team decision: is real-time slot count required, or is 60-second cache acceptable?

**PERF-P0-03 — DashboardController executes 13 sequential DB queries per load (unpatched)**

- **File**: `apps/admin-laravel/app/Http/Controllers/DashboardController.php:13-45`
- **Issue**: 9 COUNT queries + 4 list queries all execute sequentially. Admin dashboard takes 300–500ms to load even with low data volume.
- **Status**: ⚠️ **UNPATCHED** — fix is to consolidate into a single CTE query + add Redis caching (5-min TTL). Acceptable for MVP if admin load is low (< 5 admins). Becomes blocking at scale.

### P0 Issues Acceptable for Launch (with caveats)

**PERF-P0-04 — `bulkAccept` uses N×UPDATE loop**

- **File**: `apps/admin-laravel/app/Services/ApplicationService.php:145-152`
- **Impact**: Accepting 50 applications = 50 UPDATE queries instead of 1. Runs inside a transaction so it is correct, just slow. For typical MVP usage (< 20 bulk accepts at once) latency is ~200ms.
- **Status**: ⚠️ Known issue. Acceptable for MVP volume. Fix in v1.1.

**PERF-P0-05 — `ContractService::makeS3Client()` creates a new client per call**

- **File**: `apps/admin-laravel/app/Services/ContractService.php:18-27`
- **Impact**: 3–4 new S3 clients per contract sign operation. Adds ~50–100ms latency but does not affect correctness.
- **Status**: ⚠️ Acceptable for MVP. Fix in v1.1.

### P0 Issue — Must Fix Before Release

**PERF-P0-06 — No pagination on applicant list endpoint**

- **File**: `apps/admin-laravel/app/Http/Controllers/ManagerApplicationController.php:64`
- **Current**: `.get()` — loads ALL applications for a job into memory with no limit.
- **Impact**: If a popular job has 500+ applicants, this endpoint will load and serialize all 500+ rows, causing memory exhaustion and 30s+ response times. This is both a performance P0 and a security P1 (DoS vector).
- **Status**: ⛔ **MUST FIX** — `.paginate(50)` + pagination metadata must be added before release. Fix effort: ~30 minutes.

---

## 5. Staging Validation

**Verdict: ⛔ NO-GO**

The staging environment has not been deployed. No smoke tests have been executed. The staging deployment plan (`docs/release/staging-release-plan.md`) and smoke test checklist (`docs/release/staging-smoke-test.md`) are complete but not yet run.

**Required before production release**:
1. Deploy all services to staging (`api-staging.gada.vn`, `staging.gada.vn`, `admin-staging.gada.vn`).
2. Run DB migration on staging RDS.
3. Complete all P0 and P1 items in `docs/release/staging-smoke-test.md`.
4. Confirm staging Firebase project (`gada-vn-staging`) is configured with test phone numbers.
5. Confirm staging S3 bucket is isolated from production.

**Estimated time to complete**: 1–2 days (including fixing deployment issues found during staging).

---

## 6. UAT Completion

**Verdict: ⛔ NO-GO**

UAT has not been conducted. UAT checklists are complete (`docs/qa/uat-checklist-admin.md`, `docs/qa/uat-checklist-manager.md`, `docs/qa/uat-checklist-worker.md`) but no testing has been performed against any environment.

**Required before production release**:
- All P0 items in all three UAT checklists must pass.
- At least one complete end-to-end flow must be validated: worker registers → applies → contract signed → attendance marked.
- Admin manager approval flow must be validated end-to-end.

**Estimated time**: 2–3 days with dedicated testers (can overlap with staging deployment).

---

## 7. Mobile Build Readiness

**Verdict: ⛔ NO-GO**

- **EAS Project ID**: `apps/mobile/app.json:60` still contains `"projectId": "your-eas-project-id"`. This must be replaced with the actual EAS project ID registered at `expo.dev` before any EAS build can be submitted.
- **`app.json` vs `app.config.ts`**: The mobile app uses a static `app.json`. To support environment-specific Firebase config files (`google-services.json`, `GoogleService-Info.plist`) per the staging release plan, `app.json` must be converted to `app.config.ts`. Until this is done, the staging build uses the same Firebase project as production.
- **EAS build profiles**: `eas.json` is correctly configured with `development`, `preview` (staging), and `production` profiles.

---

## 8. i18n / Translation Readiness

**Verdict: ⛔ NO-GO (if multilingual at launch)**

No translation source files exist in the repository:
- `apps/web-next/messages/` — does not exist
- `apps/mobile/src/locales/` — does not exist

If the MVP launch is Korean-only (workers and managers using the Korean interface), this is not a blocker for the Korean-language experience. However:
- Vietnamese-speaking workers in Vietnam are a core user group. A Korean-only launch may severely limit adoption.
- Any hardcoded Korean strings in the UI will display as-is for Vietnamese users.

**Decision required**: Is the MVP launch Korean-only or bilingual (Korean + Vietnamese)?
- If Korean-only: unblock this item; ensure the app degrades gracefully for Vietnamese users.
- If bilingual: translation files must be created, translated, reviewed, and committed. Estimated effort: 3–5 days.

---

## 9. Operational Readiness

**Verdict: ✅ GO**

All operational documentation is complete:
- `docs/ops/admin-operations-manual.md` ✅
- `docs/ops/customer-support-flow.md` ✅
- `docs/ops/incident-response-guide.md` ✅
- `docs/ops/content-and-translation-management.md` ✅
- `docs/qa/security-review.md` + `security-fix-list.md` ✅
- `docs/qa/performance-review.md` + `performance-fix-list.md` ✅
- `docs/release/staging-release-plan.md` + `staging-smoke-test.md` + `env-matrix.md` ✅
- UAT checklists (admin, manager, worker) ✅

CloudWatch alarms are configured in CDK. On-call escalation paths are documented. Incident response playbooks cover all P0 failure scenarios. Support response templates are available in Korean and Vietnamese.

**Gaps (not blockers)**:
- Formal help desk tool (Freshdesk/Zendesk) is not integrated. Support runs via KakaoTalk/Zalo manually.
- PagerDuty on-call rotation is not configured. P0 contact is direct phone to engineering lead.

---

## 10. Path to GO

Resolve the following in order:

### Phase 1 — Security + Performance Fixes (2–3 days)
1. Fix `FirebaseAuthMiddleware` to block SUSPENDED and all DELETED status variants (SEC-P0-01)
2. Add `throttle` middleware to `/auth/login` and `/auth/social/facebook` (SEC-P0-02)
3. Add size + regex validation for `signature_data_url` in controller (SEC-P0-03)
4. Add `.paginate(50)` to `ManagerApplicationController::index()` (PERF-P0-06)
5. Fix N+1 in `PublicJobController` (pre-load province map) (PERF-P0-01)
6. Decide on job detail page caching strategy — `force-dynamic` vs ISR (PERF-P0-02)
7. Replace EAS project ID placeholder in `app.json`
8. Convert `app.json` → `app.config.ts` for environment-based Firebase config

### Phase 2 — Staging Deploy + Smoke Tests (1–2 days)
9. Deploy all services to staging
10. Run `docs/release/staging-smoke-test.md` — all P0/P1 items
11. Confirm environment isolation (Firebase project, S3 bucket, encryption key)

### Phase 3 — UAT (2–3 days, can overlap with Phase 2)
12. Conduct UAT with real testers using `docs/qa/uat-checklist-*.md`
13. All P0 UAT items must pass before sign-off

### Phase 4 — Translation (parallel with Phase 1–3)
14. Decision: Korean-only or bilingual launch
15. If bilingual: create and commit `messages/ko.json`, `messages/vi.json`, `locales/ko/translation.json`, `locales/vi/translation.json`

**Minimum estimated time to GO from today**: **5–7 business days** (Phases 1–3, assuming 2 engineers).
