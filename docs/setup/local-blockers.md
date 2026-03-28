# Local Development Blockers — GADA VN

**Date**: 2026-03-21
**Purpose**: Known issues, likely failure points, and their fixes for new developers

Each entry describes: what goes wrong, why it goes wrong, and exactly how to fix it.

---

## LB-001 — `pnpm build` fails: `@gada-vn/core` dist not found

**Symptom**:
```
Cannot find module '@gada-vn/core' or its corresponding type declarations.
```
or:
```
Error: Cannot find module '/packages/core/dist/index.js'
```

**Why**: `apps/api` and `apps/mobile` import `@gada-vn/core` from its compiled output (`dist/`), not from source. The `dist/` directory is in `.gitignore` and is not committed to the repo. It must be compiled before any app starts.

**Fix**:
```bash
pnpm build --filter @gada-vn/core
# Verify:
ls packages/core/dist/index.js   # must exist
```

**When to re-run**: Any time you modify a file under `packages/core/src/`. The `pnpm dev` command for `apps/api` does not watch `packages/core` for changes.

---

## LB-002 — PostgreSQL connection refused

**Symptom**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
or Laravel:
```
SQLSTATE[08006] [7] could not connect to server: Connection refused
```

**Why**: The PostgreSQL Docker container is not running, or it hasn't finished starting up yet.

**Fix**:
```bash
# Start the container
docker compose up postgres -d

# Wait until healthy (takes 5–15 seconds)
docker compose ps
# postgres   ... (healthy)

# If it stays unhealthy, check logs:
docker compose logs postgres
```

**Common sub-causes**:
- Port 5432 is already in use by a local PostgreSQL installation: `lsof -i :5432`. Stop the local pg service (`brew services stop postgresql@16`) before running Docker.
- Docker Desktop is not running: start Docker Desktop first.
- Wrong credentials in `.env.local`: must be `gadaadmin` / `localpassword` to match `docker-compose.yml`.

---

## LB-003 — Migrations fail: `schema "ref" does not exist`

**Symptom**:
```
Migration failed: error: schema "ref" does not exist
```

**Why**: The migration files must be run in order. If `001_schemas.sql` failed or was partially applied, subsequent migrations that reference `ref.*` or `app.*` tables will fail.

**Fix**:
```bash
# Option 1: Reset and re-run
pnpm db:reset    # drops all schemas and recreates

# Option 2: Connect and check what was created
docker exec -it gada-vn-postgres psql -U gadaadmin -d gada_vn -c "\dn"
# Should show: auth, app, ref, ops

# If schemas are missing, check if PostGIS extension is available:
docker exec -it gada-vn-postgres psql -U gadaadmin -d gada_vn -c "SELECT extname FROM pg_extension;"
# Should include: postgis, uuid-ossp
```

**If PostGIS is missing**: The PostgreSQL image in `docker-compose.yml` is `postgis/postgis:16-3.4-alpine` which includes PostGIS. If you are using a different local PostgreSQL without PostGIS, the `CREATE EXTENSION postgis` line in `001_schemas.sql` will fail. Use the Docker container.

---

## LB-004 — `pnpm db:migrate` reads wrong database / cannot find `.env.local`

**Symptom**:
```
Error: Cannot find module '../../.env.local'
```
or migrations run against the wrong database.

**Why**: `packages/db/src/migrate.ts` loads `dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })`. The three `../` levels resolve to the repo root. If `.env.local` doesn't exist at the root, the `DATABASE_URL` environment variable is not set and `pg.Pool` may use default values or error.

**Fix**:
```bash
# Ensure .env.local exists at repo root
ls .env.local   # if missing:
cp .env.example .env.local
# Fill in DATABASE_URL

# Verify from repo root:
pnpm db:migrate
```

---

## LB-005 — NestJS API crashes: `Firebase admin initialization failed`

**Symptom**:
```
Error: Failed to parse private key: Error: Invalid PEM formatted message.
```
or:
```
FirebaseAppError: Failed to initialize a FirebaseApp with invalid credential.
```

**Why**: The `FIREBASE_PRIVATE_KEY` in `.env.local` has its `\n` newlines interpreted literally instead of as actual newlines, or the surrounding quotes were not preserved.

**Fix — check the key format**:
```bash
# The value in .env.local must be:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# NOT:
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvAIBADA...
```

The `\n` characters in the `.env.local` file are literal backslash-n. The Firebase SDK (and dotenv) handles the conversion to real newlines.

**Alternative fix** — use the JSON credentials file approach:
Instead of setting `FIREBASE_PRIVATE_KEY` as a variable, place the full service account JSON at a path and reference it:
```dotenv
# In .env.local:
FIREBASE_CREDENTIALS_PATH=/Users/yourname/gada-vn-dev-firebase.json
```
Then update `apps/api/src/common/firebase/firebase.module.ts` to use `credential.cert(require(process.env.FIREBASE_CREDENTIALS_PATH))`.

---

## LB-006 — NestJS API crashes with Firebase error in local without real credentials

**Symptom**:
```
Error: An error occurred when trying to authenticate to the Firebase servers.
```

**Why**: No Firebase project credentials have been configured and `FIREBASE_AUTH_EMULATOR_HOST` is not set.

**Fix — use the Firebase emulator**:
```bash
npm install -g firebase-tools
firebase login
firebase emulators:start --only auth

# In .env.local, add:
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

The NestJS Firebase Admin SDK automatically detects `FIREBASE_AUTH_EMULATOR_HOST` and routes calls to the emulator. You can then use any phone number with OTP `123456`.

---

## LB-007 — Laravel admin: `php artisan serve` throws `SQLSTATE[08006]`

**Symptom**:
```
SQLSTATE[08006] [7] could not connect to server: Connection refused (SQL: select * from ...)
```

**Why**: Common causes in order of frequency:
1. `DB_HOST=localhost` instead of `DB_HOST=127.0.0.1` — on some systems, `localhost` resolves to IPv6 (`::1`) but PostgreSQL listens on IPv4.
2. PostgreSQL Docker container not running.
3. Wrong `DB_USERNAME`/`DB_PASSWORD` — must match docker-compose: `gadaadmin` / `localpassword`.

**Fix**:
```bash
# 1. In apps/admin-laravel/.env, ensure:
DB_HOST=127.0.0.1   # NOT localhost

# 2. Verify container is running:
docker compose ps postgres

# 3. Verify credentials work:
docker exec -it gada-vn-postgres psql -U gadaadmin -d gada_vn -c "SELECT 1"
```

---

## LB-008 — Laravel admin: `APP_KEY` is empty

**Symptom**:
```
RuntimeException: No application encryption key has been specified.
```

**Why**: `apps/admin-laravel/.env` was copied from `.env.example` but `APP_KEY` was left blank. Laravel requires a generated key.

**Fix**:
```bash
cd apps/admin-laravel
php artisan key:generate
# This writes APP_KEY=base64:... into .env
```

---

## LB-009 — Laravel admin: Firebase credentials file not found

**Symptom**:
```
InvalidArgumentException: Service account credentials JSON file "storage/app/firebase-credentials.json" does not exist.
```

**Why**: The file path in `FIREBASE_CREDENTIALS=storage/app/firebase-credentials.json` points to a file that hasn't been placed there yet.

**Fix**:
```bash
# Download service account JSON from Firebase Console
# → Project Settings → Service Accounts → Generate new private key

# Place it at the expected path:
cp ~/Downloads/your-key.json apps/admin-laravel/storage/app/firebase-credentials.json

# Verify:
ls -la apps/admin-laravel/storage/app/firebase-credentials.json
```

This file is in `.gitignore`. Never commit it.

---

## LB-010 — Next.js web: `NEXT_PUBLIC_FIREBASE_API_KEY` is not defined

**Symptom**: The web app loads but Firebase-dependent features (login, OTP) fail with:
```
FirebaseError: Firebase: Error (auth/invalid-api-key)
```
or browser console shows: `NEXT_PUBLIC_FIREBASE_API_KEY is undefined`.

**Why**: `apps/web-next/.env.local` doesn't exist or the Firebase web config variables are blank.

**Fix**:
1. Go to Firebase Console → Project Settings → Your apps
2. If no web app exists, add one (click `</>` icon)
3. Copy the `apiKey`, `authDomain`, `projectId` values
4. Add to `apps/web-next/.env.local`:
```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gada-vn-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gada-vn-dev
```
5. Restart `pnpm dev` — Next.js bakes `NEXT_PUBLIC_*` vars at startup

---

## LB-011 — Mobile app on physical device cannot reach API

**Symptom**: Mobile app loads but any API call times out or fails with `Network request failed`.

**Why**: `EXPO_PUBLIC_API_URL=http://localhost:3001/v1` — `localhost` on a physical device refers to the device itself, not your development machine.

**Fix**:
```bash
# Find your machine's local IP
ipconfig getifaddr en0   # macOS Wi-Fi
# e.g., 192.168.1.42

# Update apps/mobile/.env.local:
EXPO_PUBLIC_API_URL=http://192.168.1.42:3001/v1
```

The device and your machine must be on the same Wi-Fi network. Also ensure your machine's firewall allows inbound connections on port 3001.

---

## LB-012 — S3 file upload fails: `NoCredentialProviders` or `AccessDenied`

**Symptom**:
```
Error: Could not load credentials from any providers
```
or:
```
AccessDenied: User is not authorized to perform s3:PutObject
```

**Why**: No AWS credentials are configured, or the configured IAM user lacks S3 permissions.

**Fix — Option A (LocalStack)**:
```bash
# Install and start LocalStack
pip install localstack awscli-local
localstack start -d

# Create buckets
awslocal s3 mb s3://gada-vn-local-uploads --region ap-southeast-1

# In .env.local:
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
S3_UPLOADS_BUCKET=gada-vn-local-uploads
```

You also need to configure the AWS SDK to use the LocalStack endpoint. In `apps/api/src/modules/files/files.service.ts`, look for where the S3 client is initialised and add:
```typescript
endpoint: process.env.AWS_ENDPOINT_URL || undefined,
forcePathStyle: !!process.env.AWS_ENDPOINT_URL,
```
And set in `.env.local`:
```dotenv
AWS_ENDPOINT_URL=http://localhost:4566
```

**Fix — Option B (real AWS dev account)**:
```bash
aws configure   # enter your IAM key, secret, region ap-southeast-1
aws s3 mb s3://gada-vn-local-uploads --region ap-southeast-1
```

---

## LB-013 — `pnpm install` fails: ENOENT or peer dependency errors

**Symptom**:
```
ERR_PNPM_NO_MATCHING_VERSION  No matching version found for ...
```
or:
```
peer dependencies missing: react@"^19.0.0"
```

**Why**: pnpm version mismatch, or `pnpm-lock.yaml` is out of date with `package.json`.

**Fix**:
```bash
# Ensure you're using the exact pnpm version
corepack prepare pnpm@9.15.0 --activate
pnpm --version   # must be 9.15.0

# If lockfile is stale (after rebasing or merging):
pnpm install    # updates lockfile
```

If peer dependency warnings appear but do not block the install, they can usually be ignored for local development. The `pnpm.overrides` in root `package.json` pins `@types/react` to resolve known conflicts.

---

## LB-014 — Mobile app: metro bundler cannot find `packages/core`

**Symptom**:
```
Unable to resolve module @gada-vn/core from ...
```

**Why**: Metro's module resolver needs to be aware of monorepo packages outside `apps/mobile/node_modules`. The `metro.config.js` in `apps/mobile` sets `watchFolders` and `resolver.nodeModulesPaths` to handle this, but `packages/core/dist` must exist.

**Fix**:
```bash
# Build core first
pnpm build --filter @gada-vn/core

# Then restart Metro with cache cleared
cd apps/mobile
pnpm dev --clear
```

---

## LB-015 — `docker compose up` port conflict (5432 or 6379 already in use)

**Symptom**:
```
Error response from daemon: Ports are not available: listen tcp 0.0.0.0:5432: bind: address already in use
```

**Why**: A local PostgreSQL or Redis installation is running on the same port.

**Fix**:
```bash
# Find what's using the port
lsof -i :5432   # PostgreSQL
lsof -i :6379   # Redis

# Stop the conflicting service (macOS Homebrew):
brew services stop postgresql@16
brew services stop redis

# Then retry:
docker compose up postgres redis -d
```

Alternatively, change the host port mapping in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"   # Map to 5433 on host
```
And update `DATABASE_URL` in `.env.local` to use port `5433`.

---

## LB-016 — `turbo dev` only starts NestJS API and Next.js, not Laravel

**Why**: `apps/admin-laravel` is a PHP project. It is not in Turborepo's JavaScript task pipeline. Running `pnpm dev` from the root only starts apps with a `dev` script in their `package.json` within the pnpm workspace.

**Fix**: Always start Laravel manually in a separate terminal:
```bash
cd apps/admin-laravel
php artisan serve --port=8000
```

This is expected behaviour — not a bug.

---

## LB-017 — Laravel: session/cache fails because Redis is not running

**Symptom**: Laravel page loads but operations fail silently, or you see:
```
Predis\Connection\ConnectionException: php_network_getaddresses: getaddrinfo failed
```

**Why**: `apps/admin-laravel/.env` has `CACHE_STORE=redis` and `SESSION_DRIVER=redis`. If Redis is not running, all cached operations and session persistence fail.

**Fix**:
```bash
# Start Redis
docker compose up redis -d

# Or for simplest local dev without Redis, change .env:
CACHE_STORE=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
```

Using `sync` for `QUEUE_CONNECTION` means queued jobs run inline (synchronously) rather than in the background. This is acceptable for local development but will not reproduce production queue behaviour.

---

## LB-018 — Next.js build fails: `Cannot find module '@gada/types'`

**Symptom**:
```
Module not found: Can't resolve '@gada/types'
```

**Why**: `packages/types` is a source-only package (`"main": "src/index.ts"`). It does not have a `build` step. The Next.js bundler (webpack/turbopack) resolves it directly from source, which works for the dev server but can fail in certain configurations.

**Fix**: If this happens during `pnpm build` for web:
```bash
# Check packages/types/src/index.ts exists
ls packages/types/src/index.ts

# Verify tsconfig paths in apps/web-next/tsconfig.json:
# "@gada/types": ["../../packages/types/src/index.ts"]
# This should resolve the package correctly.
```

If the path is correct and the file exists, try clearing the Next.js cache:
```bash
cd apps/web-next
rm -rf .next
pnpm dev
```

---

## LB-019 — `apps/mobile-shell` is not a runnable app

**Note**: `apps/mobile-shell/` contains only a setup plan document, not a working application. Do not attempt to run it. The actual mobile app is `apps/mobile/`.

If you see it listed in `pnpm-workspace.yaml` and it causes install issues:
```bash
# Confirm the actual mobile app location:
ls apps/mobile/package.json   # should exist
ls apps/mobile-shell/         # should only contain docs/planning files
```

---

## LB-020 — `docker-compose.yml` references `apps/web` and `apps/admin`, not active apps

**Important**: The root `docker-compose.yml` still references the older app directories (`apps/web`, `apps/admin`) for the containerised dev setup. The active apps are `apps/web-next` and `apps/admin-laravel`.

**Implication**: Running `docker compose up api web admin` will build containers from the legacy apps. **Do not use the app containers in docker-compose for local development.** Instead:
- Run infrastructure only: `docker compose up postgres redis -d`
- Run apps natively in separate terminals (see the guide)

This is a known inconsistency — the `docker-compose.yml` needs to be updated to reference `apps/web-next` and optionally `apps/admin-laravel` once the Dockerfiles for those apps are written.

---

## Quick Diagnostic Commands

When something is broken and you're not sure what:

```bash
# Is Postgres running and accepting connections?
docker exec gada-vn-postgres pg_isready -U gadaadmin -d gada_vn

# Is Redis running?
docker exec gada-vn-redis redis-cli ping

# Is the API up?
curl -s http://localhost:3001/health | jq .

# What's using port 3001?
lsof -i :3001

# Is packages/core built?
ls packages/core/dist/index.js

# What migrations have been applied?
docker exec -it gada-vn-postgres psql -U gadaadmin -d gada_vn \
  -c "SELECT filename, applied_at FROM public.migrations ORDER BY id;"

# Check NestJS API environment (safe vars only)
curl http://localhost:3001/v1/admin/health-check

# Check Laravel config
cd apps/admin-laravel && php artisan about
```
