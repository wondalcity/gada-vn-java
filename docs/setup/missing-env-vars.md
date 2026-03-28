# Missing Environment Variables — GADA VN

**Date**: 2026-03-21
**Purpose**: Variables referenced in source code that are absent from `.env.example` files, plus name inconsistencies between apps

This document is the action list for fixing env documentation gaps before staging deploy.

---

## Summary

| Category | Count |
|----------|-------|
| Variables used in code but missing from all `.env.example` files | 7 |
| Variable name mismatches between apps (same value, different key) | 3 |
| Apps with no `.env.example` at all | 1 (`apps/api`) |
| `.env.example` files with insecure defaults committed | 1 (`ADMIN_PANEL_PASSWORD=gadaAdmin2026!`) |

---

## Section 1 — Variables Missing from `.env.example` Files

These variables are actively read in source code but undocumented in the corresponding `.env.example`. A new developer has no way to know they are required.

---

### GAP-001 — `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (web-next)

| Field | Value |
|-------|-------|
| **App** | `apps/web-next` |
| **File where used** | `src/lib/firebase/client.ts:21` |
| **Present in `.env.example`?** | ❌ No |
| **Required?** | ✅ Yes — Firebase SDK init fails if any of the 6 config fields are undefined |
| **Safe placeholder** | `gada-vn-dev.appspot.com` |
| **How to get** | Firebase Console → Project Settings → Your apps → Web app → `storageBucket` field |

**Fix**: Add to `apps/web-next/.env.example`:
```dotenv
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

---

### GAP-002 — `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (web-next)

| Field | Value |
|-------|-------|
| **App** | `apps/web-next` |
| **File where used** | `src/lib/firebase/client.ts:22` |
| **Present in `.env.example`?** | ❌ No |
| **Required?** | ✅ Yes — part of Firebase web app config object |
| **Safe placeholder** | `123456789012` |
| **How to get** | Firebase Console → Project Settings → Your apps → Web app → `messagingSenderId` field |

**Fix**: Add to `apps/web-next/.env.example`:
```dotenv
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
```

---

### GAP-003 — `NEXT_PUBLIC_FIREBASE_APP_ID` (web-next)

| Field | Value |
|-------|-------|
| **App** | `apps/web-next` |
| **File where used** | `src/lib/firebase/client.ts:23` |
| **Present in `.env.example`?** | ❌ No |
| **Required?** | ✅ Yes — part of Firebase web app config object |
| **Safe placeholder** | `1:123456789012:web:abcdef1234567890` |
| **How to get** | Firebase Console → Project Settings → Your apps → Web app → `appId` field |

**Fix**: Add to `apps/web-next/.env.example`:
```dotenv
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

---

### GAP-004 — `NEXT_PUBLIC_SITE_URL` (web-next)

| Field | Value |
|-------|-------|
| **App** | `apps/web-next` |
| **Files where used** | `src/app/robots.ts:3`, `src/app/sitemap.ts:3` |
| **Present in `.env.example`?** | ❌ No |
| **Required?** | ⚠️ Has a hardcoded fallback `https://gada.vn` in code, but staging needs `https://staging.gada.vn` |
| **Safe placeholder** | `http://localhost:3000` |
| **Staging value** | `https://staging.gada.vn` |
| **Production value** | `https://gada.vn` |

**Fix**: Add to `apps/web-next/.env.example`:
```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

### GAP-005 — `EXPO_PUBLIC_CDN_URL` (mobile)

| Field | Value |
|-------|-------|
| **App** | `apps/mobile` |
| **Files where used** | `components/jobs/JobCard.tsx:35`, `app/(worker)/jobs/[id].tsx:12` |
| **Present in `.env.example`?** | ❌ No (present in `eas.json` build env but not in `.env.example`) |
| **Required?** | ⚠️ Not required to boot, but all job images will have broken URLs without it |
| **Safe placeholder** | `http://localhost:3001` (point to API for local image serving) |
| **Staging value** | `https://cdn.staging.gadavn.com` |
| **Production value** | `https://cdn.gadavn.com` |

**Fix**: Add to `apps/mobile/.env.example`:
```dotenv
EXPO_PUBLIC_CDN_URL=http://localhost:3001
```

---

### GAP-006 — `ADMIN_PANEL_PASSWORD` (admin-laravel)

| Field | Value |
|-------|-------|
| **App** | `apps/admin-laravel` |
| **Files where used** | `config/gada.php:21`, `app/Http/Controllers/Api/Auth/AuthController.php:27` |
| **Present in `.env.example`?** | ❌ No — but `config/gada.php` has `env('ADMIN_PANEL_PASSWORD', 'gadaAdmin2026!')` with an insecure hardcoded default |
| **Required?** | ✅ Yes — this is the only credential protecting the admin panel |
| **Safe placeholder** | `change-this-before-deploy` |
| **Security risk** | **HIGH** — The default `gadaAdmin2026!` is hardcoded in `config/gada.php` and will be used in any environment where this variable is not set, including staging and production if forgotten |

**Fix**:
1. Add to `apps/admin-laravel/.env.example`:
```dotenv
ADMIN_PANEL_PASSWORD=change-this-before-deploy
```
2. Change the default in `config/gada.php:21` from `'gadaAdmin2026!'` to throw an exception if not set:
```php
// config/gada.php
'admin_panel_password' => env('ADMIN_PANEL_PASSWORD') ?? throw new \RuntimeException('ADMIN_PANEL_PASSWORD must be set'),
```

---

### GAP-007 — `CDN_BASE_URL` (admin-laravel)

| Field | Value |
|-------|-------|
| **App** | `apps/admin-laravel` |
| **File where used** | `app/Http/Resources/WorkerProfileResource.php:24` — `env('CDN_BASE_URL', '')` |
| **Present in `.env.example`?** | ❌ No |
| **Required?** | — Optional. Falls back to presigned S3 URLs when empty |
| **Safe placeholder** | *(leave empty for local)* |
| **Production value** | `https://cdn.gada.vn` |

**Fix**: Add to `apps/admin-laravel/.env.example`:
```dotenv
CDN_BASE_URL=
```

---

## Section 2 — Variable Name Mismatches Between Apps

The same logical secret is referenced under three different names across the codebase. Each app must have the correct name set individually — there is no shared resolution.

---

### MISMATCH-001 — S3 Private Uploads Bucket Name

| App | Variable name | Current default |
|-----|--------------|----------------|
| `apps/api` (NestJS) | `S3_BUCKET` | `gada-vn-uploads` |
| `apps/admin-laravel` (Laravel) | `AWS_BUCKET` | `gada-vn-assets` |
| Root `.env.example` | `S3_UPLOADS_BUCKET` | `gada-vn-uploads` |

**Impact**: If not all three point to the same bucket, files uploaded via one app cannot be read via presigned URLs generated by the other.

**Recommendation**: Standardise on `S3_UPLOADS_BUCKET` across all apps. Requires updating `apps/api/src/modules/files/files.service.ts:20` to read `process.env.S3_UPLOADS_BUCKET` and `apps/admin-laravel/config/filesystems.php` to use `env('S3_UPLOADS_BUCKET')`.

---

### MISMATCH-002 — API Base URL Naming

| App | Variable name |
|-----|--------------|
| `apps/web-next` | `NEXT_PUBLIC_API_BASE_URL` |
| `apps/mobile` | `EXPO_PUBLIC_API_URL` |
| `apps/admin` (PHP shell) | `API_BASE_URL` |
| Root `.env.example` | `API_URL` |

**Impact**: Not a functional issue since each app reads its own variable. However, documentation inconsistency makes it hard to configure all apps uniformly. The URL must end in `/v1` for web-next and mobile (they call `/v1/...` paths), but root `API_URL` is just the base.

**Note**: No standardisation change is needed unless a shared config approach is adopted. Document the distinction clearly.

---

### MISMATCH-003 — CDN Domain Naming

| App | Variable name |
|-----|--------------|
| `apps/admin-laravel` | `CDN_BASE_URL` |
| `apps/admin` (PHP shell) | `CDN_DOMAIN` |
| `apps/mobile` | `EXPO_PUBLIC_CDN_URL` |
| Root `.env.example` | `CLOUDFRONT_DOMAIN` |

**Impact**: Each app constructs CDN image URLs independently. If they point to different CloudFront distributions, image URLs served by one app cannot be loaded by another.

---

## Section 3 — Missing `.env.example` File

### MISSING-001 — `apps/api` has no `.env.example`

| Field | Value |
|-------|-------|
| **App** | `apps/api` (NestJS) |
| **Status** | No `.env.example` exists at `apps/api/.env.example` |
| **Impact** | A new developer working only on the API has no in-repo documentation of required variables. They must read the root `.env.example` and infer which vars apply. |
| **Required action** | Create `apps/api/.env.example` |

**Recommended content for `apps/api/.env.example`**:
```dotenv
# ─── Database ────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://gadaadmin:localpassword@localhost:5432/gada_vn

# ─── Cache & Queue ───────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Firebase Admin SDK ──────────────────────────────────────────────────
# Get from: Firebase Console → Project Settings → Service Accounts → Generate new private key
FIREBASE_PROJECT_ID=gada-vn-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@gada-vn-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# ─── AWS S3 ──────────────────────────────────────────────────────────────
# Use 'test' values when using LocalStack
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=gada-vn-local-uploads

# ─── Encryption ──────────────────────────────────────────────────────────
# 64 hex characters (32 bytes). Generate: openssl rand -hex 32
# NEVER use all-zeros in staging/production
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

# ─── Server ──────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development

# ─── CORS ────────────────────────────────────────────────────────────────
WEB_URL=http://localhost:3000

# ─── Admin authentication ────────────────────────────────────────────────
# Must match ADMIN_SERVICE_KEY in apps/admin/.env.local
ADMIN_SERVICE_KEY=local-admin-service-key-change-me

# ─── Firebase Emulator (optional) ────────────────────────────────────────
# Set to redirect Firebase calls to local emulator instead of real Firebase
# FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

---

## Section 4 — Insecure Defaults in Committed Files

### INSECURE-001 — `ADMIN_PANEL_PASSWORD` default in `config/gada.php`

| Field | Value |
|-------|-------|
| **File** | `apps/admin-laravel/config/gada.php:21` |
| **Code** | `env('ADMIN_PANEL_PASSWORD', 'gadaAdmin2026!')` |
| **Risk** | If `ADMIN_PANEL_PASSWORD` is not set in the deployed environment, the admin panel is accessible with the publicly-known default password `gadaAdmin2026!` |
| **Environments at risk** | Any deployment (staging, production) where the env var is forgotten |
| **Fix** | Replace the default with an exception (see GAP-006 fix above) |

---

## Section 5 — Action Checklist

| # | Action | File to change | Priority |
|---|--------|---------------|----------|
| 1 | Add `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` to web-next `.env.example` | `apps/web-next/.env.example` | P0 |
| 2 | Add `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` to web-next `.env.example` | `apps/web-next/.env.example` | P0 |
| 3 | Add `NEXT_PUBLIC_FIREBASE_APP_ID` to web-next `.env.example` | `apps/web-next/.env.example` | P0 |
| 4 | Add `NEXT_PUBLIC_SITE_URL` to web-next `.env.example` | `apps/web-next/.env.example` | P1 |
| 5 | Add `EXPO_PUBLIC_CDN_URL` to mobile `.env.example` | `apps/mobile/.env.example` | P1 |
| 6 | Add `ADMIN_PANEL_PASSWORD` to admin-laravel `.env.example` | `apps/admin-laravel/.env.example` | P0 |
| 7 | Add `CDN_BASE_URL` to admin-laravel `.env.example` | `apps/admin-laravel/.env.example` | P2 |
| 8 | Create `apps/api/.env.example` | `apps/api/.env.example` | P0 |
| 9 | Remove insecure default from `config/gada.php:21` | `apps/admin-laravel/config/gada.php` | P0 |
| 10 | Standardise S3 bucket var name to `S3_UPLOADS_BUCKET` | `apps/api/src/modules/files/files.service.ts:20` | P1 |
