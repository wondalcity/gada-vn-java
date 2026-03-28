# GADA VN — Local Bootstrap Change Log

This document records every change made during the **bootstrap engineer** pass.
Its purpose is to give any team member a clear audit trail of what was added,
why it was added, and where to look if something breaks.

---

## Summary

| # | Change | File(s) touched | Why |
|---|--------|-----------------|-----|
| B-001 | Created `apps/api/.env.example` | `apps/api/.env.example` | NestJS had no env template; new devs had no way to know which vars to set |
| B-002 | Created `apps/web-next/.env.example` | `apps/web-next/.env.example` | Next.js had no env template; 6 Firebase vars and API URL were undocumented |
| B-003 | Updated `apps/mobile/.env.example` | `apps/mobile/.env.example` | `EXPO_PUBLIC_CDN_URL` was used in code but absent from the template |
| B-004 | Updated `apps/admin-laravel/.env.example` | `apps/admin-laravel/.env.example` | Wrong DB credentials, missing `ADMIN_PANEL_PASSWORD`, wrong S3 bucket name |
| B-005 | Updated root `.env.example` | `.env.example` | Wrong DATABASE_URL credentials; `PORT`, `S3_BUCKET`, `ENCRYPTION_KEY`, `ADMIN_SERVICE_KEY` missing |
| B-006 | Added `/health` route to Laravel | `apps/admin-laravel/routes/api.php` | Laravel had no health endpoint; NestJS had one; ECS ALB requires it |
| B-007 | Added scripts to root `package.json` | `package.json` | Missing `db:bootstrap`, `services:up/down/logs`, `setup`, `packages:build` |
| B-008 | Created seed SQL | `packages/db/seeds/001_dev_data.sql` | `packages/db/seeds/` was empty; new devs had no test data to exercise app flows |
| B-009 | Created `scripts/bootstrap.sh` | `scripts/bootstrap.sh` | No one-shot setup script existed; onboarding required 8 manual steps |
| B-010 | Created `Makefile` | `Makefile` | Convenience aliases for the most common dev commands |
| B-011 | Created this log | `docs/setup/local-bootstrap-log.md` | Audit trail |
| B-012 | Created bootstrap checklist | `docs/setup/local-bootstrap-checklist.md` | Verify first boot works end-to-end |

---

## Detailed Change Notes

### B-001 — `apps/api/.env.example` (created)

**Problem**: The NestJS API reads env vars from the repo root `.env.local`
(`ConfigModule.forRoot({ envFilePath: '.env.local' })`), but that root file's
`.env.example` was missing several API-specific vars. Developers working only
inside `apps/api` had no reference.

**What was created**:
- `DATABASE_URL` — with `gadaadmin:localpassword` credentials matching docker-compose
- `REDIS_URL` — for BullMQ job queues
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` — Admin SDK
- `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` — S3 uploads
- `AWS_ENDPOINT_URL` — commented; activate for LocalStack local testing
- `FIREBASE_AUTH_EMULATOR_HOST` — commented; activate for local auth without real Firebase
- `PORT=3001` — explicit default
- `ENCRYPTION_KEY` — 64 hex chars (AES-256-GCM); 64-zero placeholder for local
- `ADMIN_SERVICE_KEY` — inter-service auth token; example value provided

**Known issue documented**: NestJS reads `S3_BUCKET` but root `.env.example` also
exports `S3_UPLOADS_BUCKET`. Standardising on one name is tracked as MISMATCH-001
in `docs/setup/missing-env-vars.md`.

---

### B-002 — `apps/web-next/.env.example` (created)

**Problem**: `apps/web-next` had no `.env.example` at all. Six
`NEXT_PUBLIC_FIREBASE_*` variables were read in
`src/lib/firebase/client.ts:21-23` but were entirely undocumented. Any new
developer would get a blank Firebase web app on first boot.

**What was created**:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` — public API URL for browser fetches
- `INTERNAL_API_URL=http://localhost:3001` — SSR fetch (same in local, differs in prod)
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000` — used by `robots.ts` and `sitemap.ts`
- `NEXT_PUBLIC_CDN_DOMAIN` — blank; enables CloudFront in staging/prod
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — blank; optional for map features

---

### B-003 — `apps/mobile/.env.example` (updated)

**Problem**: `EXPO_PUBLIC_CDN_URL` was read in `components/jobs/JobCard.tsx:35` and
`app/(worker)/jobs/[id].tsx:12` but was not in the `.env.example`.

**What was changed**:
- Added `EXPO_PUBLIC_CDN_URL=http://localhost:3001` (falls back to NestJS for
  unoptimised images during local dev; CloudFront in prod)
- Added note that physical device testing requires replacing `localhost` with the
  Mac's LAN IP (e.g., `192.168.x.x`)
- Reorganised file with section comments to match the other `.env.example` files

---

### B-004 — `apps/admin-laravel/.env.example` (updated)

**Three concrete bugs fixed**:

1. `DB_USERNAME` was `postgres` — docker-compose creates user `gadaadmin`
2. `DB_PASSWORD` was blank — docker-compose sets `localpassword`
3. `AWS_BUCKET` was `gada-vn-assets` — docker-compose/NestJS use `gada-vn-local-uploads`

**Missing vars added**:
- `ADMIN_PANEL_PASSWORD=change-this-local-password` with security warning
  (config/gada.php has an insecure hardcoded default `gadaAdmin2026!` if this is unset)
- `CDN_BASE_URL=` (blank/optional; used by WorkerProfileResource presigned URL logic)
- `ENCRYPTION_KEY` with 64-zero placeholder (must match root ENCRYPTION_KEY; used for
  encrypted fields; all-zeros is safe only for local dev)

---

### B-005 — Root `.env.example` (updated)

**Bugs fixed**:
- `DATABASE_URL` credentials corrected from `postgres:password` to
  `gadaadmin:localpassword` to match `docker-compose.yml` postgres service

**Missing vars added**:
- `PORT=3001` — NestJS listen port; explicit default
- `S3_BUCKET=gada-vn-local-uploads` — NestJS storage var name
- `AWS_BUCKET=gada-vn-local-uploads` — Laravel storage var name (same bucket)
- `ENCRYPTION_KEY` — 64 hex-char placeholder; mandatory for contract signing
- `AWS_ENDPOINT_URL` — commented; activate for LocalStack S3 emulation
- `FIREBASE_AUTH_EMULATOR_HOST` — commented; activate for local OTP without real Firebase
- `ADMIN_SERVICE_KEY` — inter-service auth token used by db seed scripts

---

### B-006 — Laravel `/health` endpoint (added)

**Problem**: `apps/admin-laravel` had no health check route. The NestJS API has
`GET /health` registered in `main.ts`. ECS ALB target group health checks require
this endpoint on both services.

**What was added** to `apps/admin-laravel/routes/api.php` (before the `v1` prefix group):

```php
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'ts'     => now()->toISOString(),
    ]);
});
```

- No auth middleware
- No rate limiting
- Returns `{"status":"ok","ts":"<ISO8601>"}` — matches NestJS health response shape
- Smoke test command: `curl http://localhost:8000/health`

---

### B-007 — Root `package.json` scripts (updated)

**Scripts added**:

| Script | Command | Why it was missing |
|--------|---------|-------------------|
| `db:bootstrap` | `pnpm db:migrate && pnpm db:seed` | Convenience wrapper for full DB setup |
| `services:up` | `docker compose up postgres redis -d` | Standard way to start Docker services |
| `services:down` | `docker compose down` | Standard way to stop Docker services |
| `services:logs` | `docker compose logs -f postgres redis` | Tail Docker service logs |
| `setup` | `bash scripts/bootstrap.sh` | One-shot first-time setup |
| `packages:build` | `turbo build --filter='./packages/*'` | Required before apps start; `packages/core/dist/` must exist |

---

### B-008 — `packages/db/seeds/001_dev_data.sql` (created)

**Problem**: `packages/db/seeds/` was empty. There was no dev seed data. New
developers had to manually create database records to exercise any feature.

**Seed data created**:

| Entity | Value | Purpose |
|--------|-------|---------|
| `auth.users` admin | `+82100000001` | Log in as admin, approve managers |
| `auth.users` manager | `+82100000002` | Log in as manager, post jobs, review applications |
| `auth.users` worker-1 | `+84900000001` | Log in as worker with complete profile |
| `auth.users` worker-2 | `+84900000002` | Log in as worker with incomplete profile |
| `app.manager_profiles` | APPROVED | Manager can post jobs immediately |
| `app.worker_profiles` worker-1 | CONCRETE trade, HCM, profile_complete=true | Full applicant flow |
| `app.worker_profiles` worker-2 | FINISHING trade, BD, profile_complete=false | Incomplete profile UX |
| `app.construction_sites` | 'Dự án Chung cư Hà Nội (Dev)', province=HN | Manager has an active site |
| `app.jobs` | OPEN, work_date = NOW()+7d, 500000 VND, slots=3 | Public listing visible immediately |
| `app.job_applications` | PENDING, worker-1 applied | Manager can accept/reject |

**Design decisions**:
- All inserts use `ON CONFLICT (id) DO NOTHING` — safe to re-run
- `firebase_uid` values are descriptive placeholders (`dev-firebase-admin-001` etc.)
  that work with the Firebase Auth emulator; they do NOT work against real Firebase
- `work_date = CURRENT_DATE + INTERVAL '7 days'` keeps the job perpetually "upcoming"
  so it always appears in the public listing
- `primary_trade_id` uses a subquery on `ref.construction_trades.code` to avoid
  hardcoded UUIDs that would differ between databases

---

### B-009 — `scripts/bootstrap.sh` (created)

**Problem**: Onboarding a new developer required approximately 8 manual steps with
no documented order or failure handling.

**What the script does** (in order):
1. Checks Node.js ≥ 20, pnpm, Docker running, PHP (optional)
2. Runs `pnpm install`
3. Runs `composer install` in `apps/admin-laravel` (if PHP + Composer available)
4. Copies each `.env.example` → `.env.local` / `.env` if the target doesn't exist yet
5. Generates Laravel `APP_KEY` if blank in `apps/admin-laravel/.env`
6. Runs `pnpm packages:build` to compile `packages/core/dist/`
7. Starts `docker compose up postgres redis -d`
8. Polls `pg_isready` until PostgreSQL is healthy (up to 30 s)
9. Polls `redis-cli ping` until Redis is healthy (up to 15 s)
10. Runs `pnpm db:migrate`
11. Runs `pnpm db:seed`
12. Prints coloured next-steps summary with dev account credentials

**Script properties**:
- `set -euo pipefail` — fails fast on any error
- Idempotent — safe to re-run on an existing dev environment
- Colour-coded output: green ✔ = success, blue → = info, yellow ⚠ = warning, red ✗ = fatal
- Invoked via `pnpm setup` (added to root `package.json`)

---

### B-010 — `Makefile` (created)

Common developer commands aliased to short `make` targets.
See `Makefile` at repo root for the full target list.

---

## Files NOT Modified

The following files were reviewed but not changed:

- `apps/admin-laravel/app/Http/Middleware/FirebaseAuthMiddleware.php` — security bug
  identified (SUSPENDED users bypass auth) but fix is tracked in security-fix-list.md
  and is outside the bootstrap scope
- `docker-compose.yml` — legacy `apps/web` and `apps/admin` service definitions noted;
  only `postgres` and `redis` should be used for local dev; full rewrite is out of scope
- `infra/` — no local dev changes needed
- `.github/workflows/` — no local dev changes needed
