# Environment Variable Reference — GADA VN

**Date**: 2026-03-21
**Scope**: All environment variables for local development across all apps

---

## Quick Reference: Which `.env` Files to Create

| File path | Copy from | Required for |
|-----------|-----------|--------------|
| `.env.local` | `.env.example` | DB migrations, NestJS API, root tooling |
| `apps/web-next/.env.local` | `apps/web-next/.env.example` | Next.js web app |
| `apps/admin-laravel/.env` | `apps/admin-laravel/.env.example` | Laravel admin panel |
| `apps/mobile/.env.local` | `apps/mobile/.env.example` | Expo mobile app |
| `apps/admin/.env.local` | `apps/admin/.env.example` | PHP admin shell (optional) |

> None of these files should ever be committed. They are all in `.gitignore`.

---

## 1. Root `.env.local`

Used by: `packages/db` (migrations/seeds), `apps/api` (NestJS reads `.env.local` via `ConfigModule`).

| Variable | Required | Local value | Description |
|----------|----------|-------------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://gadaadmin:localpassword@localhost:5432/gada_vn` | Full PostgreSQL connection string. Must match docker-compose postgres credentials. |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection URL. |
| `NODE_ENV` | ✅ | `development` | Runtime environment. |
| `PORT` | ✅ | `3001` | NestJS API listen port. |
| `WEB_URL` | ✅ | `http://localhost:3000` | Used by API for CORS `origin` config. Must match Next.js dev server URL. |
| `API_URL` | ✅ | `http://localhost:3001` | Self-referencing URL used for internal link generation. |
| `ADMIN_URL` | — | `http://localhost:8080` | PHP admin shell URL. |
| `FIREBASE_PROJECT_ID` | ✅ | `gada-vn-dev` | Firebase project ID. Must be a real Firebase project. For emulator use: any string works, but set `FIREBASE_AUTH_EMULATOR_HOST` too. |
| `FIREBASE_CLIENT_EMAIL` | ✅ | `firebase-adminsdk@gada-vn-dev.iam.gserviceaccount.com` | Service account email from Firebase Console → Service Accounts. |
| `FIREBASE_PRIVATE_KEY` | ✅ | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` | Service account private key. **Keep the surrounding quotes and `\n` escapes.** Copy exactly from the downloaded JSON. |
| `AWS_REGION` | ✅ | `ap-southeast-1` | AWS region. Use `us-east-1` if using LocalStack. |
| `AWS_ACCESS_KEY_ID` | ✅ | `test` | IAM key. Set to `test` when using LocalStack. |
| `AWS_SECRET_ACCESS_KEY` | ✅ | `test` | IAM secret. Set to `test` when using LocalStack. |
| `S3_UPLOADS_BUCKET` | ✅ | `gada-vn-local-uploads` | S3 bucket for private file uploads (ID docs, signatures). |
| `S3_STATIC_BUCKET` | — | `gada-vn-local-static` | S3 bucket for CDN-served static assets. |
| `CLOUDFRONT_DOMAIN` | — | `cdn.gadavn.com` | CloudFront domain for CDN URLs. Not needed for local development. |
| `GOOGLE_MAPS_API_KEY` | — | *(your key)* | Google Maps JavaScript API key. Optional for local — map features will not render without it. |
| `ADMIN_SERVICE_KEY` | — | `local-admin-service-key-change-me` | Shared secret between `apps/admin` PHP shell and `apps/api`. The PHP shell sends this as the `x-admin-key` header. |
| `ENCRYPTION_KEY` | ✅ | `0000...0000` (64 zeros) | 64 hex-character AES-256-GCM key used to encrypt sensitive data (bank accounts, signatures). **Never use all-zeros in staging/production.** |
| `FIREBASE_AUTH_EMULATOR_HOST` | — | `localhost:9099` | Set this to redirect Firebase Auth calls to the local emulator. Unset when using real Firebase. |

### Generating `ENCRYPTION_KEY` locally

```bash
# Generate a random 32-byte key as 64 hex characters
openssl rand -hex 32
```

---

## 2. `apps/api` (NestJS) — additional variables

The NestJS API reads `.env.local` from the repo root via `ConfigModule.forRoot({ envFilePath: '.env.local' })`. All root variables apply. No separate `.env` file is needed unless you want to override specific values for the API only.

Key variables consumed by the API:

| Variable | Module | Notes |
|----------|--------|-------|
| `DATABASE_URL` | `DatabaseModule` | pg Pool connection string |
| `REDIS_URL` | `CacheModule` | ioredis connection |
| `FIREBASE_PROJECT_ID` | `FirebaseModule` | Admin SDK init |
| `FIREBASE_CLIENT_EMAIL` | `FirebaseModule` | Admin SDK init |
| `FIREBASE_PRIVATE_KEY` | `FirebaseModule` | Admin SDK init |
| `AWS_*` + `S3_UPLOADS_BUCKET` | `FilesModule` | Presigned URL generation |
| `ENCRYPTION_KEY` | `ContractsModule` | Signature encryption |
| `WEB_URL` | `main.ts` | CORS allowed origin |
| `ADMIN_SERVICE_KEY` | `AdminModule` | Guards admin-only endpoints |

---

## 3. `apps/web-next/.env.local`

Used by: Next.js 15 web app. `NEXT_PUBLIC_*` variables are baked into the browser bundle at build time.

| Variable | Required | Local value | Description |
|----------|----------|-------------|-------------|
| `NEXT_PUBLIC_WEB_URL` | ✅ | `http://localhost:3000` | Canonical URL of the web app. Used for metadata and canonical link tags. |
| `INTERNAL_API_URL` | ✅ | `http://localhost:3001/v1` | Server-side API URL used by Next.js Server Components and API route handlers. Not exposed to the browser. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | — | *(your key)* | Google Maps JavaScript API key. Restrict to `localhost` for local development. |
| `NEXT_PUBLIC_CDN_DOMAIN` | — | `localhost:3001` | CDN domain for image URLs. Points to the API locally since there's no local CloudFront. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | *(from Firebase Console)* | Firebase web app API key. Found in Firebase Console → Project Settings → Your apps → Web. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | `gada-vn-dev.firebaseapp.com` | Firebase auth domain. Found in the same location. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | `gada-vn-dev` | Must match `FIREBASE_PROJECT_ID` in root `.env.local`. |

> **Why `INTERNAL_API_URL` is not `NEXT_PUBLIC_*`**: This URL is only used on the server side (Server Components, route handlers). It is intentionally kept out of the browser bundle to avoid leaking internal service topology. Never change this to `NEXT_PUBLIC_INTERNAL_API_URL`.

---

## 4. `apps/admin-laravel/.env`

Laravel reads this file directly (not `.env.local`). It is placed in `apps/admin-laravel/.env`.

| Variable | Required | Local value | Description |
|----------|----------|-------------|-------------|
| `APP_NAME` | — | `GADA VN Admin` | Application name shown in page titles. |
| `APP_ENV` | ✅ | `local` | Laravel environment. Controls behavior in service providers. Must be `local` for dev. |
| `APP_KEY` | ✅ | *(generated)* | 32-byte base64 key. Generate with `php artisan key:generate`. |
| `APP_DEBUG` | — | `true` | Enables stack trace display. Must be `false` in staging/production. |
| `APP_URL` | ✅ | `http://localhost:8000` | Laravel base URL. Used for generating asset URLs and callbacks. |
| `DB_CONNECTION` | ✅ | `pgsql` | Database driver. Do not change. |
| `DB_HOST` | ✅ | `127.0.0.1` | PostgreSQL host. Use `127.0.0.1` (not `localhost`) to force TCP instead of Unix socket. |
| `DB_PORT` | ✅ | `5432` | PostgreSQL port. |
| `DB_DATABASE` | ✅ | `gada_vn` | Database name. Must match docker-compose `POSTGRES_DB`. |
| `DB_USERNAME` | ✅ | `gadaadmin` | PostgreSQL user. Must match docker-compose `POSTGRES_USER`. |
| `DB_PASSWORD` | ✅ | `localpassword` | PostgreSQL password. Must match docker-compose `POSTGRES_PASSWORD`. |
| `CACHE_STORE` | ✅ | `redis` | Cache driver. Must be `redis` for session-dependent features to work. Can use `file` if Redis is not running (limited functionality). |
| `QUEUE_CONNECTION` | ✅ | `redis` | Queue driver. `sync` runs jobs inline (simpler for local dev but no async). `redis` enables background queue. |
| `SESSION_DRIVER` | ✅ | `redis` | Session storage driver. |
| `SESSION_LIFETIME` | — | `120` | Session lifetime in minutes (120 = 2 hours for local). |
| `REDIS_HOST` | ✅ | `127.0.0.1` | Redis host. |
| `REDIS_PORT` | ✅ | `6379` | Redis port. |
| `REDIS_PASSWORD` | — | `null` | Redis auth password. Not needed for local Docker container. |
| `FIREBASE_CREDENTIALS` | ✅ | `storage/app/firebase-credentials.json` | Path to Firebase service account JSON file, relative to Laravel root. |
| `FIREBASE_PROJECT_ID` | ✅ | `gada-vn-dev` | Firebase project ID. Must match the credentials JSON file. |
| `AWS_ACCESS_KEY_ID` | — | *(your key or `test` for LocalStack)* | AWS IAM key for S3 access. |
| `AWS_SECRET_ACCESS_KEY` | — | *(your secret or `test` for LocalStack)* | AWS IAM secret. |
| `AWS_DEFAULT_REGION` | — | `ap-southeast-1` | AWS region. |
| `AWS_BUCKET` | — | `gada-vn-local-uploads` | S3 bucket name. |
| `SUPER_ADMIN_EMAILS` | — | *(your local email)* | Comma-separated emails with super admin privileges in the admin panel. |
| `ENCRYPTION_KEY` | ✅ | `0000...0000` (64 zeros) | Same 64-hex key as root `.env.local`. Must be consistent across API and Laravel if both encrypt/decrypt the same data. |
| `ADMIN_PANEL_PASSWORD` | ✅ | *(any strong local password)* | Password for the admin panel login page. Set something memorable for local dev. |

---

## 5. `apps/mobile/.env.local`

Used by Expo — all variables must start with `EXPO_PUBLIC_` to be accessible in app code.

| Variable | Required | Local value | Description |
|----------|----------|-------------|-------------|
| `EXPO_PUBLIC_API_URL` | ✅ | `http://localhost:3001/v1` | NestJS API URL. **Important**: when testing on a physical device, replace `localhost` with your machine's local IP (e.g., `http://192.168.1.5:3001/v1`). |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | — | *(your key)* | Google Maps API key restricted to the app package. Optional for local. |
| `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID` | ✅ | *(from Firebase Console)* | Used for Google OAuth sign-in in Firebase. Found in Firebase Console → Project Settings → Your apps → Web client → Client ID. |

### Physical Device Note

When running on a physical Android or iOS device (not a simulator), the device cannot reach `localhost` on your machine. Find your machine's local IP:

```bash
# macOS
ipconfig getifaddr en0   # → e.g., 192.168.1.42
```

Then set:
```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.42:3001/v1
```

---

## 6. Firebase Setup Details

### Option A — Use a real Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project named `gada-vn-dev` (or use an existing one)
3. Enable **Phone Authentication** and **Facebook** under Authentication → Sign-in method
4. For server-side (API + Laravel): Project Settings → Service Accounts → Generate new private key → download JSON
   - Copy `project_id`, `client_email`, `private_key` into root `.env.local`
   - Copy the full JSON to `apps/admin-laravel/storage/app/firebase-credentials.json`
5. For web: Project Settings → Your apps → Add app (Web) → copy config values into `apps/web-next/.env.local`
6. Add test phone numbers: Authentication → Sign-in method → Phone → Phone numbers for testing
   - `+84900000001` → `123456`
   - `+82100000001` → `123456`

### Option B — Use Firebase emulator (no credentials needed)

```bash
# Install Firebase tools if not already
npm install -g firebase-tools
firebase login

# From repo root
firebase init emulators   # select: Authentication, Functions
firebase emulators:start --only auth

# Set in .env.local:
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

With the emulator, any phone number and OTP `123456` will work.

---

## 7. AWS S3 Setup Details

### Option A — Use LocalStack (no real AWS credentials)

```bash
# Install LocalStack
brew install localstack/tap/localstack-cli
localstack start -d

# Create local buckets
awslocal s3 mb s3://gada-vn-local-uploads --region ap-southeast-1
awslocal s3 mb s3://gada-vn-local-static --region ap-southeast-1

# Set in .env.local:
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
# Also set LocalStack endpoint in apps/api/src/modules/files/files.service.ts
# (requires a code change — see local-blockers.md)
```

### Option B — Use real AWS development credentials

```bash
# Install AWS CLI
brew install awscli
aws configure
# Enter your dev IAM key, secret, region ap-southeast-1

# Create dev S3 buckets
aws s3 mb s3://gada-vn-local-uploads --region ap-southeast-1
aws s3 mb s3://gada-vn-local-static --region ap-southeast-1
```

Use an IAM user with `AmazonS3FullAccess` policy for development only. Never use root credentials.

---

## 8. Variable Cheatsheet by Feature

| Feature | Variables needed |
|---------|----------------|
| Start API (no auth) | `DATABASE_URL`, `REDIS_URL`, `PORT` |
| Firebase auth (OTP login) | + `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| File upload (ID docs, signatures) | + `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_UPLOADS_BUCKET` |
| Contract encryption | + `ENCRYPTION_KEY` |
| Google Maps (job location) | + `GOOGLE_MAPS_API_KEY` (web-next) or `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (mobile) |
| Web app (basic) | `NEXT_PUBLIC_WEB_URL`, `INTERNAL_API_URL` |
| Web app (auth) | + `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| Mobile basic | `EXPO_PUBLIC_API_URL` |
| Mobile auth | + `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID` |
| Laravel admin | `APP_KEY`, `DB_*`, `FIREBASE_CREDENTIALS`, `FIREBASE_PROJECT_ID` |
