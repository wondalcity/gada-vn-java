# GADA VN — Local Bootstrap Checklist

Use this checklist after running `pnpm setup` (or `bash scripts/bootstrap.sh`)
to verify that every component started correctly.

Run each smoke-test command in a terminal and confirm the expected output.
Items marked **REQUIRED** must pass before you can do meaningful development.
Items marked **OPTIONAL** are only needed for the corresponding feature area.

---

## Phase 1 — Prerequisites

| # | Check | Command | Expected |
|---|-------|---------|----------|
| P-01 | Node.js ≥ 20 | `node --version` | `v20.x.x` or higher |
| P-02 | pnpm installed | `pnpm --version` | `9.x.x` |
| P-03 | Docker running | `docker info \| head -1` | `Client: Docker Engine...` |
| P-04 | PHP 8.2 (optional) | `php --version` | `PHP 8.2.x` |
| P-05 | Composer (optional) | `composer --version` | `Composer version 2.x.x` |

---

## Phase 2 — Environment Files

> All four env files must exist. They are created by the bootstrap script.
> They must be filled with real values before connecting to external services.

| # | Check | Command | Expected |
|---|-------|---------|----------|
| E-01 | Root env exists | `ls -la .env.local` | File present |
| E-02 | NestJS env present | `ls -la apps/api/.env.local` | File present |
| E-03 | Next.js env present | `ls -la apps/web-next/.env.local` | File present |
| E-04 | Laravel env present | `ls -la apps/admin-laravel/.env` | File present |
| E-05 | Mobile env present | `ls -la apps/mobile/.env.local` | File present |
| E-06 | Laravel APP_KEY set | `grep APP_KEY apps/admin-laravel/.env` | Non-empty value |
| E-07 | No real secrets committed | `git diff HEAD -- .env.local` | Empty (no output) |

---

## Phase 3 — Docker Services

| # | Check | Command | Expected |
|---|-------|---------|----------|
| D-01 | Postgres container running | `docker ps --filter name=gada-vn-postgres --format '{{.Status}}'` | `Up ... (healthy)` |
| D-02 | Redis container running | `docker ps --filter name=gada-vn-redis --format '{{.Status}}'` | `Up ...` |
| D-03 | Postgres accepts connections | `docker exec gada-vn-postgres pg_isready -U gadaadmin -d gada_vn` | `...accepting connections` |
| D-04 | Redis responds | `docker exec gada-vn-redis redis-cli ping` | `PONG` |

If D-01 / D-02 fail: run `pnpm services:up` and wait ~10 s, then retry.

---

## Phase 4 — Database

| # | Check | Command | Expected |
|---|-------|---------|----------|
| DB-01 | Migrations table exists | `docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn -c "SELECT COUNT(*) FROM public.migrations"` | Row count ≥ 1 |
| DB-02 | Auth schema present | `docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn -c "\dn"` | `auth`, `app`, `ref` listed |
| DB-03 | Seed users exist | `docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn -c "SELECT phone, role FROM auth.users ORDER BY role"` | 4 rows: ADMIN / MANAGER / 2x WORKER |
| DB-04 | Dev job posted | `docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn -c "SELECT status, work_date FROM app.jobs WHERE slug = 'dev-concrete-hanoi-001'"` | `OPEN`, date ~7 days from now |
| DB-05 | Application seeded | `docker exec gada-vn-postgres psql -U gadaadmin -d gada_vn -c "SELECT status FROM app.job_applications LIMIT 1"` | `PENDING` |

If DB-01 fails: run `pnpm db:migrate` then retry.
If DB-03/04/05 fail: run `pnpm db:seed` then retry.

---

## Phase 5 — Shared Packages

| # | Check | Command | Expected |
|---|-------|---------|----------|
| PK-01 | packages/core compiled | `ls packages/core/dist/index.js` | File exists |
| PK-02 | packages/db compiled | `ls packages/db/dist/migrate.js` | File exists |

If PK-01 fails: run `pnpm packages:build` then retry.

---

## Phase 6 — NestJS API (`apps/api`)

Start the API in a dedicated terminal:
```bash
cd apps/api && pnpm dev
```

Wait for: `[NestApplication] Nest application successfully started`

| # | Check | Command | Expected |
|---|-------|---------|----------|
| A-01 | Health endpoint (**REQUIRED**) | `curl -s http://localhost:3001/health` | `{"status":"ok","..."}` |
| A-02 | Public jobs list | `curl -s http://localhost:3001/v1/public/jobs` | JSON array with dev job |
| A-03 | Public provinces | `curl -s http://localhost:3001/v1/public/provinces` | JSON array |
| A-04 | Auth rejects missing token | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/v1/me` | `401` |

Common failures:
- `Error: FIREBASE_PRIVATE_KEY must contain actual newlines` — add surrounding quotes
  and ensure `\n` is a real newline in `.env.local`. See LB-005 in `local-blockers.md`.
- `ECONNREFUSED 5432` — PostgreSQL not running. Run `pnpm services:up`.
- Port 3001 in use — kill the conflicting process: `lsof -ti:3001 | xargs kill`

---

## Phase 7 — Next.js Web (`apps/web-next`)

Start the web app in a dedicated terminal:
```bash
cd apps/web-next && pnpm dev
```

Wait for: `Ready in ...ms`

| # | Check | Command / URL | Expected |
|---|-------|---------------|----------|
| W-01 | Home page loads (**REQUIRED**) | `open http://localhost:3000/ko` | Korean job listing page |
| W-02 | Job listing shows dev job | `open http://localhost:3000/ko/jobs` | Dev concrete job card visible |
| W-03 | Job detail page | `open http://localhost:3000/ko/jobs/dev-concrete-hanoi-001` | Job detail renders |
| W-04 | Robots.txt | `curl -s http://localhost:3000/robots.txt` | Non-empty response |
| W-05 | Sitemap | `curl -s http://localhost:3000/sitemap.xml` | XML response with URLs |

Common failures:
- `NEXT_PUBLIC_FIREBASE_*` blank → Firebase SDK initialisation warning in console.
  Fill in `apps/web-next/.env.local` from Firebase Console.
- `INTERNAL_API_URL` wrong → SSR data fetch fails, pages show empty data.

---

## Phase 8 — Laravel Admin (`apps/admin-laravel`)

**Requires PHP 8.2 and Composer.**

Start the admin panel in a dedicated terminal:
```bash
cd apps/admin-laravel && php artisan serve --port=8000
```

| # | Check | Command | Expected |
|---|-------|---------|----------|
| L-01 | Health endpoint (**REQUIRED**) | `curl -s http://localhost:8000/health` | `{"status":"ok","ts":"..."}` |
| L-02 | v1 public jobs | `curl -s http://localhost:8000/v1/public/jobs` | JSON response |
| L-03 | Auth rejects missing token | `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/v1/me` | `401` |
| L-04 | Admin panel login page | `open http://localhost:8000/admin` | Login form renders |

Common failures:
- `SQLSTATE[08006] Connection refused` — PostgreSQL not running. Run `pnpm services:up`.
- `APP_KEY not set` — run `cd apps/admin-laravel && php artisan key:generate`.
- `Class "Redis" not found` — Redis PHP extension missing.
  Set `CACHE_STORE=file` and `SESSION_DRIVER=file` and `QUEUE_CONNECTION=sync`
  in `apps/admin-laravel/.env` for local dev without Redis extension.
- `FirebaseException: Invalid credentials` — `FIREBASE_CREDENTIALS` file missing.
  Download service account JSON from Firebase Console; place at
  `apps/admin-laravel/storage/app/firebase-credentials.json`.

---

## Phase 9 — Firebase Emulator (OPTIONAL — local auth without real Firebase)

**Only needed if you don't have real Firebase credentials yet.**

```bash
firebase emulators:start --only auth
```

Then add to `.env.local` (root) and `apps/web-next/.env.local`:
```
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

Add to `apps/admin-laravel/.env`:
```
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

| # | Check | Expected |
|---|-------|----------|
| EM-01 | Emulator UI loads | Open `http://localhost:4000` — auth emulator tab visible |
| EM-02 | Admin login works | Phone `+82100000001`, OTP `123456` → logged in as admin |
| EM-03 | Manager login works | Phone `+82100000002`, OTP `123456` → logged in as manager |
| EM-04 | Worker login works | Phone `+84900000001`, OTP `123456` → logged in as worker |

---

## Phase 10 — Expo Mobile (OPTIONAL)

**Requires Expo Go app on your phone or Android/iOS simulator.**

```bash
cd apps/mobile && pnpm start
```

| # | Check | Expected |
|---|-------|----------|
| M-01 | Metro bundler starts | QR code printed in terminal |
| M-02 | App loads in Expo Go | Scan QR code → app renders on phone |
| M-03 | Job list fetches data | Job listing screen shows dev job |

Note: If testing on a physical device, replace `localhost` with your Mac's LAN IP
in `apps/mobile/.env.local`:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
EXPO_PUBLIC_CDN_URL=http://192.168.x.x:3001
```

---

## All Clear

When all REQUIRED checks pass (A-01, W-01, L-01, DB-01 through DB-05),
the local environment is fully operational.

Recommended full-app smoke test sequence:
1. Log in as **admin** → verify manager approval dashboard loads
2. Log in as **manager** → verify sites list, dev job visible, pending application shown
3. Log in as **worker** → verify job listing, apply flow, application status

---

## Quick Reference — Dev Accounts

| Role | Phone | OTP (emulator) |
|------|-------|----------------|
| Admin | `+82100000001` | `123456` |
| Manager | `+82100000002` | `123456` |
| Worker (complete profile) | `+84900000001` | `123456` |
| Worker (incomplete profile) | `+84900000002` | `123456` |

> These accounts only work with the Firebase Auth emulator.
> Against real Firebase, create matching users in Firebase Console first.

---

## Quick Reference — Ports

| Service | Port | Start command |
|---------|------|---------------|
| NestJS API | 3001 | `cd apps/api && pnpm dev` |
| Next.js web | 3000 | `cd apps/web-next && pnpm dev` |
| Laravel admin | 8000 | `cd apps/admin-laravel && php artisan serve --port=8000` |
| PostgreSQL | 5432 | `pnpm services:up` |
| Redis | 6379 | `pnpm services:up` |
| Firebase emulator | 9099 | `firebase emulators:start --only auth` |
| Firebase emulator UI | 4000 | (started with emulator) |

---

## Further Reading

- Full setup guide: `docs/setup/local-development-guide.md`
- Environment variable reference: `docs/setup/env-reference.md`
- Known blockers: `docs/setup/local-blockers.md`
- Bootstrap change log: `docs/setup/local-bootstrap-log.md`
