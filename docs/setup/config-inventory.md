# Configuration Inventory — GADA VN

**Date**: 2026-03-21
**Scope**: Every environment variable across all apps and packages, with code references
**Method**: Direct inspection of `.env.example` files, `config/` files, `process.env.*` grep, `env()` grep, `configService.get()` grep, and SDK init code

---

## Apps Covered

| App | Directory | Config mechanism |
|-----|-----------|-----------------|
| NestJS API | `apps/api` | `ConfigModule.forRoot({ envFilePath: '.env.local' })` → `process.env.*` |
| Next.js Web | `apps/web-next` | Next.js built-in `.env.local` → `process.env.NEXT_PUBLIC_*` + `process.env.*` |
| Laravel Admin | `apps/admin-laravel` | `config/*.php` → `env()` calls → `.env` file |
| Mobile | `apps/mobile` | Expo `.env.local` → `process.env.EXPO_PUBLIC_*` |
| PHP Admin Shell | `apps/admin` | Manual `$_ENV` parse in `public/index.php` → `.env.local` |
| DB scripts | `packages/db` | `dotenv.config({ path: '../../../.env.local' })` → `process.env.*` |

---

## 1. NestJS API — `apps/api`

Config source: reads `.env.local` at repo root via `ConfigModule.forRoot({ envFilePath: '.env.local' })` in `app.module.ts:19`.

No `.env.example` exists for this app — all vars come from root `.env.example` or root `.env.local`.

| Variable | Required | Default | Service | Code reference | Notes |
|----------|----------|---------|---------|---------------|-------|
| `DATABASE_URL` | ✅ Yes | — | PostgreSQL | `src/common/database/database.service.ts:11` | Full pg connection string. Used by `pg.Pool`. |
| `REDIS_URL` | ✅ Yes | `redis://localhost:6379` | Redis | `src/common/cache/cache.service.ts:13` | ioredis connection. Optional in dev (defaults to local). |
| `FIREBASE_PROJECT_ID` | ✅ Yes | — | Firebase Admin SDK | `src/common/firebase/firebase.service.ts:12` | Firebase project identifier. |
| `FIREBASE_CLIENT_EMAIL` | ✅ Yes | — | Firebase Admin SDK | `src/common/firebase/firebase.service.ts:13` | Service account email. |
| `FIREBASE_PRIVATE_KEY` | ✅ Yes | — | Firebase Admin SDK | `src/common/firebase/firebase.service.ts:14` | Service account private key. `\n` in value is replaced with real newlines. |
| `AWS_REGION` | ⚠️ For uploads | `ap-southeast-1` | AWS S3 | `src/modules/files/files.service.ts:14,50` | S3 region. |
| `AWS_ACCESS_KEY_ID` | ⚠️ For uploads | `""` | AWS S3 | `src/modules/files/files.service.ts:16` | IAM access key. Defaults to empty (uses task role in ECS). |
| `AWS_SECRET_ACCESS_KEY` | ⚠️ For uploads | `""` | AWS S3 | `src/modules/files/files.service.ts:17` | IAM secret key. |
| `S3_BUCKET` | ⚠️ For uploads | `gada-vn-uploads` | AWS S3 | `src/modules/files/files.service.ts:20` | Private uploads bucket. ⚠️ Name differs from root `.env.example` which uses `S3_UPLOADS_BUCKET`. |
| `ENCRYPTION_KEY` | ✅ Yes | — | Contracts | `src/modules/contracts/contracts.service.ts` | 64-char hex AES-256-GCM key. Required for contract signature encryption. |
| `ADMIN_SERVICE_KEY` | ✅ Yes | — | Admin guard | `src/modules/admin/admin.guard.ts:8` | Value of `x-admin-key` header. Must match `apps/admin` `ADMIN_SERVICE_KEY`. |
| `WEB_URL` | ⚠️ For CORS | `http://localhost:3000` | CORS | `src/main.ts:31` | Allowed CORS origin. Must match web app URL. |
| `PORT` | — | `3001` | Server | `src/main.ts:35` | HTTP listen port. |
| `NODE_ENV` | — | `development` | General | `packages/db/src/reset.ts:10` | Runtime environment flag. |
| `FIREBASE_AUTH_EMULATOR_HOST` | — | — | Firebase emulator | `src/common/firebase/firebase.service.ts` | Set to `localhost:9099` to redirect to Firebase emulator. Unset for real Firebase. |

---

## 2. Next.js Web — `apps/web-next`

Config source: `apps/web-next/.env.local` (loaded automatically by Next.js). `NEXT_PUBLIC_*` vars are baked into the browser JS bundle at build time.

| Variable | Required | Default | Service | Code reference | Notes |
|----------|----------|---------|---------|---------------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ Yes | `https://api.gada.vn/api/v1` | NestJS API | `src/lib/api/client.ts:1`, `src/lib/api/public.ts:1`, 15+ component files | Client-side API base URL. Used in every API call. |
| `INTERNAL_API_URL` | ✅ Yes | — | NestJS API | `apps/web-next/.env.example` | Server-side API URL. Used by Server Components and route handlers. Never exposed to browser. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ Yes | — | Firebase Web SDK | `src/lib/firebase/client.ts:18` | Firebase web app config. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ Yes | — | Firebase Web SDK | `src/lib/firebase/client.ts:19` | Firebase web app config. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ Yes | — | Firebase Web SDK | `src/lib/firebase/client.ts:20` | Firebase web app config. Must match backend `FIREBASE_PROJECT_ID`. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ Yes | — | Firebase Web SDK | `src/lib/firebase/client.ts:21` | Firebase storage bucket. ⚠️ **Missing from `.env.example`**. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ Yes | — | Firebase Web SDK | `src/lib/firebase/client.ts:22` | FCM sender ID. ⚠️ **Missing from `.env.example`**. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ Yes | — | Firebase Web SDK | `src/lib/firebase/client.ts:23` | Firebase app ID. ⚠️ **Missing from `.env.example`**. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | — | `""` | Google Maps | `src/lib/maps/loader.ts:8` | Maps JS API key. Optional — map renders without it but shows billing prompt. |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ For SEO | `https://gada.vn` | SEO | `src/app/robots.ts:3`, `src/app/sitemap.ts:3` | Canonical base URL for robots.txt and sitemap. ⚠️ **Missing from `.env.example`**. |
| `NEXT_PUBLIC_CDN_DOMAIN` | — | — | CloudFront | `apps/web-next/.env.example` | CDN domain for image delivery. Optional locally. |

---

## 3. Laravel Admin — `apps/admin-laravel`

Config source: `apps/admin-laravel/.env`. Resolved through Laravel config files under `config/`. Custom config in `config/gada.php`.

### Framework Config (standard Laravel)

| Variable | Required | Default | Service | Config key / Code reference | Notes |
|----------|----------|---------|---------|---------------------------|-------|
| `APP_NAME` | — | `GADA VN Admin` | Laravel | `config/app.php` → `app.name` | Page title prefix. |
| `APP_ENV` | ✅ Yes | `local` | Laravel | `config/app.php` → `app.env` | Controls provider behavior. `local` / `staging` / `production`. |
| `APP_KEY` | ✅ Yes | — | Laravel | `config/app.php` → `app.key` | 32-byte base64 encryption key. Generate with `php artisan key:generate`. |
| `APP_DEBUG` | ✅ Yes | `true` | Laravel | `config/app.php` → `app.debug` | Must be `false` in staging/production. |
| `APP_URL` | ✅ Yes | `http://localhost:8000` | Laravel | `config/app.php` → `app.url` | Base URL for link generation. |
| `APP_LOCALE` | — | `ko` | Laravel i18n | `config/app.php` → `app.locale` | Default locale. |
| `APP_FALLBACK_LOCALE` | — | `ko` | Laravel i18n | `config/app.php` → `app.fallback_locale` | Fallback locale. |
| `LOG_CHANNEL` | — | `stack` | Laravel Logging | `config/logging.php` | Log driver. Use `stderr` in ECS. |
| `LOG_LEVEL` | — | `debug` | Laravel Logging | `config/logging.php` | Min log level. Use `warning` in production. |
| `DB_CONNECTION` | ✅ Yes | `pgsql` | PostgreSQL | `config/database.php` | Must be `pgsql`. |
| `DB_HOST` | ✅ Yes | `127.0.0.1` | PostgreSQL | `config/database.php` | Use `127.0.0.1` not `localhost` to force TCP. |
| `DB_PORT` | ✅ Yes | `5432` | PostgreSQL | `config/database.php` | Standard PG port. |
| `DB_DATABASE` | ✅ Yes | `gada_vn` | PostgreSQL | `config/database.php` | Database name. |
| `DB_USERNAME` | ✅ Yes | `postgres` | PostgreSQL | `config/database.php` | Local: `gadaadmin`. |
| `DB_PASSWORD` | ✅ Yes | — | PostgreSQL | `config/database.php` | Local: `localpassword`. |
| `CACHE_STORE` | ✅ Yes | `redis` | Redis | `config/cache.php` | Use `file` for simplest local dev without Redis. |
| `QUEUE_CONNECTION` | ✅ Yes | `redis` | Redis Queue | `config/queue.php` | Use `sync` for inline job execution in local dev. |
| `SESSION_DRIVER` | ✅ Yes | `redis` | Redis | `config/session.php` | Use `file` for local dev without Redis. |
| `SESSION_LIFETIME` | — | `120` | Sessions | `config/session.php` | Minutes. 10080 = 7 days for production. |
| `REDIS_HOST` | ✅ Yes | `127.0.0.1` | Redis | `config/database.php` | Redis server hostname. |
| `REDIS_PORT` | — | `6379` | Redis | `config/database.php` | Redis port. |
| `REDIS_PASSWORD` | — | `null` | Redis | `config/database.php` | Redis auth. Leave `null` for local Docker. |
| `AWS_ACCESS_KEY_ID` | ⚠️ For uploads | — | AWS S3 | `config/filesystems.php` → `filesystems.disks.s3.key` | Used by `S3Service` and `ContractService`. |
| `AWS_SECRET_ACCESS_KEY` | ⚠️ For uploads | — | AWS S3 | `config/filesystems.php` → `filesystems.disks.s3.secret` | |
| `AWS_DEFAULT_REGION` | — | `ap-southeast-1` | AWS S3 | `config/filesystems.php` → `filesystems.disks.s3.region` | |
| `AWS_BUCKET` | ⚠️ For uploads | `gada-vn-assets` | AWS S3 | `config/filesystems.php` → `filesystems.disks.s3.bucket` | |

### Custom Config (`config/gada.php`)

| Variable | Required | Default | Config key | Code reference | Notes |
|----------|----------|---------|-----------|---------------|-------|
| `FIREBASE_CREDENTIALS` | ✅ Yes | `storage/app/firebase-credentials.json` | — | `config/gada.php` (kreait package reads directly) | Path to service account JSON file relative to Laravel root. |
| `FIREBASE_PROJECT_ID` | ✅ Yes | `gada-vn` | — | `config/gada.php` | Must match the project in the credentials file. |
| `ADMIN_PANEL_PASSWORD` | ✅ Yes | `gadaAdmin2026!` | `gada.admin_panel_password` | `config/gada.php:21`, `AuthController.php:27` | Shared admin login password. ⚠️ **Default is insecure — must override before deploy**. ⚠️ **Missing from `.env.example`**. |
| `SUPER_ADMIN_EMAILS` | — | `""` | `gada.super_admin_emails` | `config/gada.php:11`, `AuthController.php:46` | Comma-separated email list. Bypasses role check for listed addresses. |
| `CDN_BASE_URL` | — | `""` | — | `app/Http/Resources/WorkerProfileResource.php:24`, `env('CDN_BASE_URL', '')` | CDN prefix for worker profile images. Empty = use presigned S3 URLs. ⚠️ **Not in `.env.example`**. |
| `ENCRYPTION_KEY` | ✅ Yes | — | — | `app/Services/Contract/ContractService.php` | 64-hex AES-256-GCM key. Must match `ENCRYPTION_KEY` in NestJS API if both encrypt/decrypt shared data. |

---

## 4. Mobile — `apps/mobile`

Config source: `apps/mobile/.env.local`. All vars must be prefixed `EXPO_PUBLIC_` to be accessible in app code. Baked into JS bundle at EAS build time.

| Variable | Required | Default | Service | Code reference | Notes |
|----------|----------|---------|---------|---------------|-------|
| `EXPO_PUBLIC_API_URL` | ✅ Yes | `http://localhost:3001/v1` | NestJS API | `lib/api-client.ts:3` | API endpoint. Replace `localhost` with machine IP when using physical device. |
| `EXPO_PUBLIC_CDN_URL` | ⚠️ For images | — | CloudFront | `components/jobs/JobCard.tsx:35`, `app/(worker)/jobs/[id].tsx:12` | CDN URL prefix for job images. ⚠️ **Missing from `.env.example`**. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | — | `""` | Google Maps | `apps/mobile/.env.example` | Maps API key. Optional — map renders without it on emulator. |
| `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID` | ✅ Yes | — | Firebase Auth | `apps/mobile/.env.example` | Required for Google OAuth sign-in via Firebase. |

---

## 5. PHP Admin Shell — `apps/admin`

Config source: `apps/admin/.env.local`. Parsed manually in `public/index.php:9-16` into `$_ENV`.

| Variable | Required | Default | Service | Code reference | Notes |
|----------|----------|---------|---------|---------------|-------|
| `APP_ENV` | — | `development` | App | `src/Controllers/BaseController.php` | Controls debug mode. |
| `ADMIN_USERNAME` | ✅ Yes | `admin` | Auth | `src/Services/AuthService.php` | Admin panel login username. |
| `ADMIN_PASSWORD_HASH` | ✅ Yes | — | Auth | `src/Services/AuthService.php` | bcrypt hash of the admin password. Generate with `password_hash('yourpass', PASSWORD_BCRYPT)`. |
| `API_BASE_URL` | ✅ Yes | `http://localhost:3001/v1` | NestJS API | `src/Services/ApiService.php` | URL of NestJS API for proxied requests. |
| `ADMIN_SERVICE_ACCOUNT_JWT` | ✅ Yes | — | NestJS API | `src/Services/ApiService.php` | JWT token sent to NestJS for admin-privileged API calls. |
| `ADMIN_SERVICE_KEY` | ✅ Yes | — | NestJS API | `src/Services/ApiService.php` | Must exactly match `ADMIN_SERVICE_KEY` in `apps/api`. Sent as `x-admin-key` header. |
| `SESSION_SECRET` | ✅ Yes | `change-this-secret-in-production` | Sessions | `src/Services/SessionService.php` | PHP session signing secret. |
| `CDN_DOMAIN` | — | `cdn.gadavn.com` | CloudFront | `src/Helpers/AssetHelper.php` | CDN domain for static asset URLs. |

---

## 6. Root `.env.local` — Shared / DB Scripts

Config source: `.env.local` at repo root. Read by `packages/db` scripts and `apps/api`.

| Variable | Required | Default | Service | Code reference | Notes |
|----------|----------|---------|---------|---------------|-------|
| `DATABASE_URL` | ✅ Yes | — | PostgreSQL | `packages/db/src/migrate.ts:8`, `packages/db/src/seed.ts:8`, `packages/db/src/reset.ts:7` | Full pg connection string. Also used by `apps/api`. |
| `FIREBASE_PROJECT_ID` | ✅ Yes | — | Firebase | `apps/api` | Shared with API. |
| `FIREBASE_CLIENT_EMAIL` | ✅ Yes | — | Firebase | `apps/api` | Shared with API. |
| `FIREBASE_PRIVATE_KEY` | ✅ Yes | — | Firebase | `apps/api` | Shared with API. |
| `REDIS_URL` | ✅ Yes | `redis://localhost:6379` | Redis | `apps/api` | Shared with API. |
| `AWS_REGION` | — | `ap-southeast-1` | AWS | `apps/api` | Shared with API. |
| `AWS_ACCESS_KEY_ID` | — | — | AWS | `apps/api` | Shared with API. |
| `AWS_SECRET_ACCESS_KEY` | — | — | AWS | `apps/api` | Shared with API. |
| `S3_UPLOADS_BUCKET` | — | `gada-vn-uploads` | AWS S3 | Root `.env.example` | ⚠️ Root example uses `S3_UPLOADS_BUCKET` but API code reads `S3_BUCKET`. |
| `S3_STATIC_BUCKET` | — | `gada-vn-static` | AWS S3 | Root `.env.example` | Not referenced in current API code; reserved for static assets. |
| `CLOUDFRONT_DOMAIN` | — | `cdn.gadavn.com` | CloudFront | Root `.env.example` | Not referenced in current API code. |
| `GOOGLE_MAPS_API_KEY` | — | — | Google Maps | Root `.env.example` | Server-side Maps usage if needed. |
| `API_URL` | — | `http://localhost:3001` | Internal | Root `.env.example` | Convenience reference. Not consumed by API itself. |
| `WEB_URL` | ✅ Yes | `http://localhost:3000` | CORS | `apps/api/src/main.ts:31` | Must match Next.js dev server URL. |
| `ADMIN_URL` | — | `http://localhost:8080` | Internal | Root `.env.example` | Convenience reference. |
| `NODE_ENV` | — | `development` | General | `packages/db/src/reset.ts:10` | Prevents accidental reset in non-development. |
| `PORT` | — | `3001` | NestJS | `apps/api/src/main.ts:35` | API listen port. |
| `ADMIN_SERVICE_KEY` | ✅ Yes | — | Admin guard | `apps/api/src/modules/admin/admin.guard.ts:8` | Shared with `apps/admin`. |
| `ADMIN_SERVICE_ACCOUNT_JWT` | ✅ Yes | — | Admin auth | Root `.env.example` | Shared with `apps/admin`. |
| `ENCRYPTION_KEY` | ✅ Yes | — | Contracts | `apps/api/src/modules/contracts/contracts.service.ts` | 64 hex chars. Shared between API and Laravel if both encrypt contract data. |

---

## 7. Variable Name Conflicts and Cross-App Inconsistencies

These are cases where the same logical secret is referenced under different names in different apps:

| Logical value | `apps/api` name | `apps/admin-laravel` name | Root `.env.example` name | Impact |
|--------------|----------------|--------------------------|-------------------------|--------|
| S3 private bucket | `S3_BUCKET` | `AWS_BUCKET` | `S3_UPLOADS_BUCKET` | Three different names for the same bucket. Must be set correctly in each app's env. |
| API base URL | *(self, not consumed)* | *(self, not consumed)* | `API_URL` | Root example has `API_URL`; web-next uses `NEXT_PUBLIC_API_BASE_URL`; mobile uses `EXPO_PUBLIC_API_URL`. All three must point to the same API server. |
| CDN domain | *(not used)* | `CDN_BASE_URL` | `CLOUDFRONT_DOMAIN` | `apps/admin` uses `CDN_DOMAIN`. Three names for the same CloudFront domain. |

---

## 8. Complete Variable Count

| App | Total vars | Required | Optional | Missing from .env.example |
|-----|-----------|----------|----------|--------------------------|
| `apps/api` | 15 | 9 | 6 | All (no .env.example exists) |
| `apps/web-next` | 10 | 8 | 2 | 4 (`STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, `SITE_URL`) |
| `apps/admin-laravel` | 32 | 18 | 14 | 2 (`ADMIN_PANEL_PASSWORD`, `CDN_BASE_URL`) |
| `apps/mobile` | 4 | 2 | 2 | 1 (`EXPO_PUBLIC_CDN_URL`) |
| `apps/admin` | 8 | 6 | 2 | 0 |
| Root `.env.local` | 18 | 8 | 10 | 2 (`PORT`, `ADMIN_SERVICE_KEY` undocumented) |
| **Total unique** | **~55** | **~30** | **~25** | **7 gaps** |
