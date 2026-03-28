# Local Run Checklist — GADA VN

**Date**: 2026-03-21
**Purpose**: Step-by-step verification checklist for first-time local setup and daily startup

Mark each item: `[x]` PASS · `[ ]` TODO · `[!]` FAIL (note why)

---

## Part A — One-Time Setup Checklist

Run this once when setting up a new development machine.

### A1. System Prerequisites

| # | Check | Command | Expected |
|---|-------|---------|----------|
| A1.1 | Node.js version | `node --version` | `v20.x.x` or higher |
| A1.2 | pnpm version | `pnpm --version` | `9.15.0` |
| A1.3 | Docker running | `docker info` | No error |
| A1.4 | PHP version (for Laravel) | `php --version` | `PHP 8.2.x` |
| A1.5 | Composer installed | `composer --version` | `Composer 2.x.x` |
| A1.6 | Git configured | `git config user.email` | Your email |

---

### A2. Repository Setup

| # | Step | Command |
|---|------|---------|
| A2.1 | Clone repository | `git clone <repo-url> && cd gada-vn` |
| A2.2 | Install all workspace dependencies | `pnpm install` |
| A2.3 | Confirm no install errors | No red errors in output |
| A2.4 | Install Laravel PHP dependencies | `cd apps/admin-laravel && composer install && cd ../..` |

---

### A3. Environment Files

| # | File | Created? | Required variables filled? |
|---|------|----------|---------------------------|
| A3.1 | `.env.local` (repo root) | `cp .env.example .env.local` | `DATABASE_URL`, `REDIS_URL`, Firebase vars |
| A3.2 | `apps/web-next/.env.local` | `cp apps/web-next/.env.example apps/web-next/.env.local` | `NEXT_PUBLIC_FIREBASE_*` vars |
| A3.3 | `apps/admin-laravel/.env` | `cp apps/admin-laravel/.env.example apps/admin-laravel/.env` | `APP_KEY`, `DB_*`, `FIREBASE_PROJECT_ID` |
| A3.4 | `apps/mobile/.env.local` | `cp apps/mobile/.env.example apps/mobile/.env.local` | `EXPO_PUBLIC_API_URL` |
| A3.5 | Laravel app key generated | `cd apps/admin-laravel && php artisan key:generate` | `APP_KEY` in `.env` is not blank |
| A3.6 | Firebase credentials JSON placed | `ls apps/admin-laravel/storage/app/firebase-credentials.json` | File exists |

---

### A4. Shared Package Build

| # | Step | Command | Expected output |
|---|------|---------|----------------|
| A4.1 | Build `packages/core` | `pnpm build --filter @gada-vn/core` | `dist/` created in `packages/core/` |
| A4.2 | Confirm `dist/index.js` exists | `ls packages/core/dist/index.js` | File exists |

---

### A5. Database Initialisation

| # | Step | Command | Expected output |
|---|------|---------|----------------|
| A5.1 | Start PostgreSQL and Redis | `docker compose up postgres redis -d` | Both containers start |
| A5.2 | Wait for PostgreSQL health | `docker compose ps` | postgres status: `healthy` |
| A5.3 | Wait for Redis health | `docker compose ps` | redis status: `healthy` |
| A5.4 | Run migrations | `pnpm db:migrate` | `All migrations applied.` |
| A5.5 | Run seeds | `pnpm db:seed` | `Seeding complete.` |
| A5.6 | Verify trade count | `docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn -c "SELECT COUNT(*) FROM ref.construction_trades;"` | Count > 0 |
| A5.7 | Verify province count | `docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn -c "SELECT COUNT(*) FROM ref.vn_provinces;"` | Count = 63 |

---

## Part B — Daily Startup Checklist

Run this every time you start a new dev session.

### B1. Start Infrastructure

| # | Step | Command | Verify |
|---|------|---------|--------|
| B1.1 | Start Docker services | `docker compose up postgres redis -d` | |
| B1.2 | PostgreSQL is healthy | `docker exec gada-vn-postgres pg_isready -U gadaadmin` | `accepting connections` |
| B1.3 | Redis is healthy | `docker exec gada-vn-redis redis-cli ping` | `PONG` |

---

### B2. Apply New Migrations (if any)

| # | Step | When |
|---|------|------|
| B2.1 | Pull latest code | After every `git pull` |
| B2.2 | Install new deps | Run `pnpm install` if `pnpm-lock.yaml` changed |
| B2.3 | Rebuild core | Run `pnpm build --filter @gada-vn/core` if `packages/core` changed |
| B2.4 | Run migrations | Run `pnpm db:migrate` if new `.sql` files in `packages/db/migrations/` |

---

### B3. Start NestJS API (Terminal 1)

| # | Step | Command |
|---|------|---------|
| B3.1 | Start API | `cd apps/api && pnpm dev` |
| B3.2 | Wait for ready | Look for: `API running on port 3001` |
| B3.3 | Verify health | `curl http://localhost:3001/health` → `{"status":"ok"}` |
| B3.4 | Verify no startup errors | No `ERROR` lines in terminal output |

---

### B4. Start Next.js Web (Terminal 2)

| # | Step | Command |
|---|------|---------|
| B4.1 | Start web | `cd apps/web-next && pnpm dev` |
| B4.2 | Wait for ready | Look for: `✓ Ready in X.Xs` |
| B4.3 | Open browser | http://localhost:3000 — page loads without blank screen |
| B4.4 | Check console | Browser DevTools → Console: no red errors |

---

### B5. Start Laravel Admin (Terminal 3 — optional)

| # | Step | Command |
|---|------|---------|
| B5.1 | Start admin | `cd apps/admin-laravel && php artisan serve --port=8000` |
| B5.2 | Wait for ready | Look for: `Server running on http://127.0.0.1:8000` |
| B5.3 | Open browser | http://localhost:8000 — login page appears |

---

### B6. Start Mobile App (Terminal 4 — optional)

| # | Step | Command |
|---|------|---------|
| B6.1 | Verify `EXPO_PUBLIC_API_URL` for device type | If physical device, ensure IP address not `localhost` |
| B6.2 | Start Expo | `cd apps/mobile && pnpm dev` |
| B6.3 | Open simulator or scan QR | iOS: press `i`, Android: press `a`, Physical: scan QR in Expo Go |
| B6.4 | Verify API connectivity | Attempt to load any screen that calls the API |

---

## Part C — Feature Smoke Tests

Quick checks to verify key flows work end-to-end. Run after initial setup or after a major dependency update.

### C1. Authentication

| # | Test | How | Expected |
|---|------|-----|----------|
| C1.1 | OTP send (Firebase) | `POST http://localhost:3001/v1/auth/otp/send` with `{"phone":"+84900000001"}` | 200 OK |
| C1.2 | OTP verify | `POST http://localhost:3001/v1/auth/otp/verify` with phone + OTP `123456` (emulator/test number) | 200 with JWT |
| C1.3 | Authenticated request | Use JWT from C1.2 to `GET http://localhost:3001/v1/workers/me` | 200 or 404 (not 401) |

### C2. Public Job Listing

| # | Test | How | Expected |
|---|------|-----|----------|
| C2.1 | Public jobs API | `GET http://localhost:3001/v1/jobs` | 200 with `{data:[...], meta:{...}}` |
| C2.2 | Web job listing | Open http://localhost:3000/ko/jobs | Page renders, no blank screen |
| C2.3 | Locale routing | Open http://localhost:3000/vi/jobs | Vietnamese locale loads |

### C3. Database Connectivity

| # | Test | How | Expected |
|---|------|-----|----------|
| C3.1 | API can query DB | `GET http://localhost:3001/v1/jobs` — if DB is down, this returns 500 | 200 |
| C3.2 | API can query Redis | Check API startup logs for `Cache connected` message | No Redis errors |

### C4. File Upload

| # | Test | How | Expected |
|---|------|-----|----------|
| C4.1 | Presigned URL generation | `POST http://localhost:3001/v1/files/upload-url` with auth header | 200 with `uploadUrl` field |
| C4.2 | Upload via presigned URL | PUT to the returned URL with a small test file | 200 from S3/LocalStack |

> C4 requires AWS credentials or LocalStack configured. Skip if not set up.

---

## Part D — Shutdown Checklist

| # | Step | Command |
|---|------|---------|
| D1 | Stop all app terminals | `Ctrl+C` in each terminal |
| D2 | Stop Docker services | `docker compose down` |
| D3 | *(Optional)* Stop LocalStack | `localstack stop` |

---

## Part E — CI Equivalent Check

Before opening a pull request, run these locally:

| # | Check | Command | Must pass? |
|---|-------|---------|-----------|
| E1 | TypeScript type check (all packages) | `pnpm turbo type-check` | ✅ Yes |
| E2 | Lint | `pnpm turbo lint` | ✅ Yes |
| E3 | Build packages/core | `pnpm build --filter @gada-vn/core` | ✅ Yes |
| E4 | API tests | `pnpm --filter @gada-vn/api test` | ✅ Yes |
| E5 | Web build (catches missing imports) | `pnpm --filter @gada/web build` | ✅ Yes |

```bash
# Run everything in one command (same as CI)
pnpm turbo type-check lint
pnpm --filter @gada-vn/api test
```
