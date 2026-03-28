# Environment Variables by App — GADA VN

**Date**: 2026-03-21
**Purpose**: Copy-paste ready `.env` templates for every app, with local and staging values side-by-side

Use this file to set up each app's environment. For full descriptions of each variable, see `docs/setup/config-inventory.md`.

---

## Notation

| Symbol | Meaning |
|--------|---------|
| ✅ | Required — app will not start or core features break without this |
| ⚠️ | Conditional — required only for the named feature |
| — | Optional — has a safe default |

---

## 1. Root `.env.local`

**Path**: `.env.local` (repo root)
**Used by**: `packages/db` (migration scripts), `apps/api` (NestJS reads this file directly)

```dotenv
# ════════════════════════════════════════════════════
# ROOT .env.local
# ════════════════════════════════════════════════════

# ── Database ✅ ──────────────────────────────────────
# Local: matches docker-compose.yml credentials
# Staging: set via SSM /gada-vn/staging/DB_HOST
DATABASE_URL=postgresql://gadaadmin:localpassword@localhost:5432/gada_vn

# ── Redis ✅ ─────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Firebase Admin SDK ✅ ────────────────────────────
# Get from: Firebase Console → Project Settings → Service Accounts
# → Generate new private key → download JSON
# Local: use gada-vn-dev project
# Staging: use gada-vn-staging project
FIREBASE_PROJECT_ID=gada-vn-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@gada-vn-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_HERE\n-----END PRIVATE KEY-----\n"

# ── AWS S3 ⚠️ file uploads ───────────────────────────
# Local option A: use 'test' values + LocalStack (recommended)
# Local option B: use real IAM dev credentials
# Staging: leave blank — ECS task role handles S3 auth
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_UPLOADS_BUCKET=gada-vn-local-uploads
S3_STATIC_BUCKET=gada-vn-local-static
CLOUDFRONT_DOMAIN=localhost:3001

# ── Encryption ✅ ────────────────────────────────────
# 64 hex characters = 32 bytes for AES-256-GCM
# Generate: openssl rand -hex 32
# NEVER use all-zeros in staging/production
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

# ── App URLs ─────────────────────────────────────────
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000
ADMIN_URL=http://localhost:8080
NODE_ENV=development
PORT=3001

# ── Google Maps ⚠️ map features ──────────────────────
GOOGLE_MAPS_API_KEY=

# ── Admin service authentication ✅ ──────────────────
# Shared secret between apps/admin PHP shell and apps/api NestJS
# Must be identical in both places
ADMIN_SERVICE_KEY=local-admin-service-key-change-me-32chars
ADMIN_SERVICE_ACCOUNT_JWT=
ADMIN_SECRET_KEY=

# ── Firebase Emulator (optional) ─────────────────────
# Uncomment to use local Firebase emulator instead of real Firebase
# FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### Staging overrides (`.env.local` equivalent injected as ECS env vars)

| Variable | Staging value |
|----------|--------------|
| `DATABASE_URL` | From SSM `/gada-vn/staging/DB_HOST` + Secrets Manager `gada-vn-staging/rds/credentials` |
| `REDIS_URL` | From SSM `/gada-vn/staging/REDIS_HOST` |
| `FIREBASE_PROJECT_ID` | `gada-vn-staging` |
| `S3_UPLOADS_BUCKET` | `gada-vn-staging-uploads` |
| `ENCRYPTION_KEY` | From Secrets Manager `gada-vn-staging/encryption-key` |
| `WEB_URL` | `https://staging.gada.vn` |
| `NODE_ENV` | `production` |

---

## 2. `apps/api` — NestJS API

**Path**: No dedicated `.env` — reads root `.env.local` via `ConfigModule.forRoot({ envFilePath: '.env.local' })`
**Missing file**: `apps/api/.env.example` does not exist — create it (see `docs/setup/missing-env-vars.md#MISSING-001`)

All variables are inherited from root `.env.local`. The table below shows which root vars are consumed by the API and at which code location.

| Variable | Required | Local value | Staging value | Code location |
|----------|----------|-------------|---------------|---------------|
| `DATABASE_URL` | ✅ | `postgresql://gadaadmin:localpassword@localhost:5432/gada_vn` | RDS connection string | `src/common/database/database.service.ts:11` |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | ElastiCache URL | `src/common/cache/cache.service.ts:13` |
| `FIREBASE_PROJECT_ID` | ✅ | `gada-vn-dev` | `gada-vn-staging` | `src/common/firebase/firebase.service.ts:12` |
| `FIREBASE_CLIENT_EMAIL` | ✅ | service account email | staging service account | `src/common/firebase/firebase.service.ts:13` |
| `FIREBASE_PRIVATE_KEY` | ✅ | private key string | staging private key | `src/common/firebase/firebase.service.ts:14` |
| `AWS_REGION` | ⚠️ | `ap-southeast-1` | `ap-southeast-1` | `src/modules/files/files.service.ts:14` |
| `AWS_ACCESS_KEY_ID` | ⚠️ | `test` (LocalStack) | *(task role)* | `src/modules/files/files.service.ts:16` |
| `AWS_SECRET_ACCESS_KEY` | ⚠️ | `test` (LocalStack) | *(task role)* | `src/modules/files/files.service.ts:17` |
| `S3_BUCKET` | ⚠️ | `gada-vn-local-uploads` | `gada-vn-staging-uploads` | `src/modules/files/files.service.ts:20` |
| `ENCRYPTION_KEY` | ✅ | 64-zero hex | from Secrets Manager | `src/modules/contracts/contracts.service.ts` |
| `ADMIN_SERVICE_KEY` | ✅ | `local-admin-service-key-change-me-32chars` | from SSM | `src/modules/admin/admin.guard.ts:8` |
| `WEB_URL` | ✅ | `http://localhost:3000` | `https://staging.gada.vn` | `src/main.ts:31` |
| `PORT` | — | `3001` | `3001` | `src/main.ts:35` |

> ⚠️ **S3_BUCKET vs S3_UPLOADS_BUCKET**: The NestJS API reads `S3_BUCKET` but root `.env.example` documents `S3_UPLOADS_BUCKET`. Until standardised, set both in `.env.local`.

---

## 3. `apps/web-next` — Next.js Web

**Path**: `apps/web-next/.env.local`
**Note**: `NEXT_PUBLIC_*` vars are baked into the JS bundle at build time. Restart `pnpm dev` after changing them.

```dotenv
# ════════════════════════════════════════════════════
# apps/web-next/.env.local
# ════════════════════════════════════════════════════

# ── API endpoint ✅ ──────────────────────────────────
# Client-side (browser): full URL with /api/v1 path
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/v1

# Server-side only (Server Components, route handlers)
# NOT exposed to browser — use for internal service calls
INTERNAL_API_URL=http://localhost:3001/v1

# ── Firebase Web SDK ✅ ──────────────────────────────
# Get all 6 values from: Firebase Console → Project Settings
# → Your apps → Web app (click </> icon to add if none exists)
# → SDK snippet → Config object
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyYOUR_WEB_API_KEY_HERE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gada-vn-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gada-vn-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gada-vn-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef

# ── Google Maps ⚠️ job location map ─────────────────
# Optional locally — map renders but shows billing prompt
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# ── CDN ⚠️ image delivery ────────────────────────────
# Local: point to API (it can serve S3 assets via presigned URLs)
NEXT_PUBLIC_CDN_DOMAIN=localhost:3001

# ── SEO ⚠️ robots.txt + sitemap ─────────────────────
# Local: localhost URL (robots.txt won't be indexed anyway)
# Staging: https://staging.gada.vn
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Staging values (`apps/web-next/.env.local` at build time for staging Docker image)

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://api-staging.gada.vn/v1
INTERNAL_API_URL=http://api-service:3001/v1          # internal ECS service DNS
NEXT_PUBLIC_FIREBASE_API_KEY=<staging web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gada-vn-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gada-vn-staging
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gada-vn-staging.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<staging sender ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<staging app ID>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<staging restricted key>
NEXT_PUBLIC_CDN_DOMAIN=cdn-staging.gada.vn
NEXT_PUBLIC_SITE_URL=https://staging.gada.vn
```

> ⚠️ **Build-time baking**: The Next.js Docker image must be rebuilt for each environment. You cannot change `NEXT_PUBLIC_*` values by restarting the container.

---

## 4. `apps/admin-laravel` — Laravel Admin Panel

**Path**: `apps/admin-laravel/.env`

```dotenv
# ════════════════════════════════════════════════════
# apps/admin-laravel/.env
# ════════════════════════════════════════════════════

# ── Laravel core ✅ ──────────────────────────────────
APP_NAME="GADA VN Admin"
APP_ENV=local
# Generate with: php artisan key:generate
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=ko
APP_FALLBACK_LOCALE=ko

# ── Logging ──────────────────────────────────────────
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

# ── Database ✅ ──────────────────────────────────────
# Must use 127.0.0.1 (not localhost) to force TCP socket
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gada_vn
DB_USERNAME=gadaadmin
DB_PASSWORD=localpassword

# ── Cache / Queue / Session ✅ ───────────────────────
# Use 'file' and 'sync' if Redis is not running locally
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

# ── Redis ✅ ─────────────────────────────────────────
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# ── Firebase ✅ ──────────────────────────────────────
# Download service account JSON from:
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Place the downloaded JSON at the path below (relative to apps/admin-laravel/)
FIREBASE_CREDENTIALS=storage/app/firebase-credentials.json
FIREBASE_PROJECT_ID=gada-vn-dev

# ── AWS S3 ⚠️ file uploads / contracts ──────────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=ap-southeast-1
AWS_BUCKET=gada-vn-local-uploads

# ── Custom: Admin panel access ✅ ────────────────────
# ⚠️  MUST be set — do NOT rely on the default in config/gada.php
# Use any strong password for local dev
ADMIN_PANEL_PASSWORD=change-this-local-password

# ── Custom: Super admin emails ───────────────────────
# Comma-separated emails that bypass role checks
SUPER_ADMIN_EMAILS=dev@gada.vn

# ── Custom: CDN ──────────────────────────────────────
# Leave blank locally — falls back to presigned S3 URLs
CDN_BASE_URL=

# ── Custom: Encryption ✅ ────────────────────────────
# Must match ENCRYPTION_KEY in root .env.local / apps/api
# 64 hex characters. Generate: openssl rand -hex 32
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

### Staging values for `apps/admin-laravel/.env` (injected as ECS task environment)

| Variable | Staging value |
|----------|--------------|
| `APP_ENV` | `staging` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://admin-staging.gada.vn` |
| `DB_HOST` | RDS endpoint from SSM |
| `DB_USERNAME` | `gadaadmin` |
| `DB_PASSWORD` | From Secrets Manager |
| `REDIS_HOST` | ElastiCache endpoint from SSM |
| `FIREBASE_CREDENTIALS` | `/run/secrets/firebase-credentials.json` |
| `FIREBASE_PROJECT_ID` | `gada-vn-staging` |
| `AWS_BUCKET` | `gada-vn-staging-uploads` |
| `ADMIN_PANEL_PASSWORD` | From SSM `/gada-vn/staging/ADMIN_PANEL_PASSWORD` |
| `CDN_BASE_URL` | `https://cdn-staging.gada.vn` |
| `ENCRYPTION_KEY` | From Secrets Manager |
| `LOG_CHANNEL` | `stderr` |
| `LOG_LEVEL` | `info` |
| `CACHE_STORE` | `redis` |
| `QUEUE_CONNECTION` | `redis` |
| `SESSION_DRIVER` | `redis` |
| `SESSION_LIFETIME` | `10080` |

---

## 5. `apps/mobile` — Expo Mobile App

**Path**: `apps/mobile/.env.local`
**Note**: `EXPO_PUBLIC_*` vars are baked into the JS bundle at EAS build time. Also configured per-profile in `eas.json`.

```dotenv
# ════════════════════════════════════════════════════
# apps/mobile/.env.local  (local Expo dev server)
# ════════════════════════════════════════════════════

# ── API endpoint ✅ ──────────────────────────────────
# Local simulator: use localhost
# Physical device: replace with your machine's local IP
# e.g. http://192.168.1.42:3001/v1
EXPO_PUBLIC_API_URL=http://localhost:3001/v1

# ── CDN ⚠️ job/site images ──────────────────────────
# Local: point to API (API serves S3 presigned URLs locally)
EXPO_PUBLIC_CDN_URL=http://localhost:3001

# ── Google Maps ⚠️ map features ─────────────────────
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=

# ── Firebase OAuth ✅ ────────────────────────────────
# From Firebase Console → Project Settings → Your apps
# → Web app (the OAuth client, not the native app) → Client ID
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

### EAS build env values (from `eas.json` — these override `.env.local` at build time)

| Build profile | `EXPO_PUBLIC_API_URL` | `EXPO_PUBLIC_CDN_URL` |
|--------------|-----------------------|-----------------------|
| `development` | `http://localhost:3001/v1` | `http://localhost:3001` |
| `preview` (staging) | `https://api.staging.gadavn.com/v1` | `https://cdn.staging.gadavn.com` |
| `production` | `https://api.gadavn.com/v1` | `https://cdn.gadavn.com` |

> ⚠️ Note: `eas.json` uses `api.staging.gadavn.com` (with `gadavn.com`) while other docs use `api-staging.gada.vn`. Confirm the correct staging domain with the DevOps team and update `eas.json` to match.

---

## 6. `apps/admin` — PHP Admin Shell

**Path**: `apps/admin/.env.local`

```dotenv
# ════════════════════════════════════════════════════
# apps/admin/.env.local
# ════════════════════════════════════════════════════

# ── App ──────────────────────────────────────────────
APP_ENV=development

# ── Auth ✅ ──────────────────────────────────────────
ADMIN_USERNAME=admin
# Generate hash: php -r "echo password_hash('yourpassword', PASSWORD_BCRYPT);"
ADMIN_PASSWORD_HASH=$2y$10$examplehashgoeshereabc123

# ── NestJS API connection ✅ ─────────────────────────
API_BASE_URL=http://localhost:3001/v1

# ── Admin API authentication ✅ ──────────────────────
# Must exactly match ADMIN_SERVICE_KEY in root .env.local / apps/api
ADMIN_SERVICE_KEY=local-admin-service-key-change-me-32chars
# JWT token for admin-privileged API calls (signed service account token)
ADMIN_SERVICE_ACCOUNT_JWT=

# ── Session ✅ ───────────────────────────────────────
SESSION_SECRET=change-this-secret-minimum-32-chars

# ── CDN ──────────────────────────────────────────────
CDN_DOMAIN=localhost:3001
```

---

## 7. Cross-App Shared Secrets

These values must be **identical** across the apps listed. If they differ, authentication or encryption will fail.

| Secret | Apps that must share it | Variable name per app |
|--------|------------------------|----------------------|
| Firebase Project ID | `apps/api`, `apps/admin-laravel`, `apps/web-next`, `apps/mobile` | `FIREBASE_PROJECT_ID` · `FIREBASE_PROJECT_ID` · `NEXT_PUBLIC_FIREBASE_PROJECT_ID` · *(from `google-services.json`)* |
| Encryption key | `apps/api`, `apps/admin-laravel` | `ENCRYPTION_KEY` · `ENCRYPTION_KEY` |
| S3 uploads bucket | `apps/api`, `apps/admin-laravel` | `S3_BUCKET` · `AWS_BUCKET` |
| Admin service key | `apps/api`, `apps/admin` | `ADMIN_SERVICE_KEY` · `ADMIN_SERVICE_KEY` |
| API base URL (must agree) | `apps/web-next`, `apps/mobile`, `apps/admin` | `NEXT_PUBLIC_API_BASE_URL` · `EXPO_PUBLIC_API_URL` · `API_BASE_URL` |

---

## 8. Environment-Specific Value Reference

Quick reference for all environments. Fill in actual values from AWS and Firebase before deploying.

| Variable | Local | Staging | Production |
|----------|-------|---------|-----------|
| `DATABASE_URL` | `postgresql://gadaadmin:localpassword@localhost:5432/gada_vn` | From SSM + Secrets Manager | From SSM + Secrets Manager |
| `REDIS_URL` | `redis://localhost:6379` | ElastiCache endpoint | ElastiCache endpoint |
| `FIREBASE_PROJECT_ID` | `gada-vn-dev` | `gada-vn-staging` | `gada-vn` |
| `S3_UPLOADS_BUCKET` / `S3_BUCKET` | `gada-vn-local-uploads` | `gada-vn-staging-uploads` | `gada-vn-production-uploads` |
| `AWS_BUCKET` (Laravel) | `gada-vn-local-uploads` | `gada-vn-staging-uploads` | `gada-vn-production-uploads` |
| `CDN_BASE_URL` / `EXPO_PUBLIC_CDN_URL` | `http://localhost:3001` | `https://cdn-staging.gada.vn` | `https://cdn.gada.vn` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001/v1` | `https://api-staging.gada.vn/v1` | `https://api.gada.vn/v1` |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001/v1` | `https://api-staging.gada.vn/v1` | `https://api.gada.vn/v1` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://staging.gada.vn` | `https://gada.vn` |
| `APP_DEBUG` (Laravel) | `true` | `false` | `false` |
| `LOG_LEVEL` (Laravel) | `debug` | `info` | `warning` |
| `NODE_ENV` | `development` | `production` | `production` |
| `ENCRYPTION_KEY` | `0000...0000` (64 zeros) | Unique random key | Unique random key |
| `ADMIN_PANEL_PASSWORD` | any strong local password | From SSM | From SSM |
