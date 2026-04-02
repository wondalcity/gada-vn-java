# GADA VN Staging — Env vs Secret Matrix

Defines where each configuration value lives and why.

**Legend**:
- `SECRET` — AWS Secrets Manager (`/gada/staging/*`)
- `ENV` — plain env file or docker-compose environment block (committed as example, values not committed)
- `BUILD_ARG` — Docker build argument (baked into image at build time — must not be sensitive)
- `DERIVED` — computed at runtime from other values (no separate storage)

---

## Database

| Variable | Where | Reason |
|----------|-------|--------|
| `DATABASE_URL` | `SECRET` | Contains hostname + DB name — changes per environment |
| `DATABASE_USER` | `SECRET` | Credential |
| `DATABASE_PASSWORD` | `SECRET` | Credential |

## Redis

| Variable | Where | Reason |
|----------|-------|--------|
| `REDIS_URL` | `SECRET` | Contains auth token — stored as full URL |
| `REDIS_HOST` | `DERIVED` | Parsed from `REDIS_URL` by `fetch-secrets.sh` |
| `REDIS_PORT` | `DERIVED` | Parsed from `REDIS_URL` by `fetch-secrets.sh` |
| `REDIS_PASSWORD` | `DERIVED` | Parsed from `REDIS_URL` by `fetch-secrets.sh` |

## Firebase (server-side)

| Variable | Where | Reason |
|----------|-------|--------|
| `FIREBASE_CREDENTIALS_B64` | `SECRET` | Private key JSON — highest sensitivity |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `ENV` | File path only, not the credential itself |
| `FIREBASE_PROJECT_ID` | `SECRET` | Environment-specific identifier |
| `FIREBASE_WEB_API_KEY` | `SECRET` | API key — restricted but still a credential |

## Firebase (client-side — Next.js `NEXT_PUBLIC_*`)

These values are compiled into the JavaScript bundle and visible to all users in the browser. Treat as **low-sensitivity** but still keep out of git.

| Variable | Where | Reason |
|----------|-------|--------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `SECRET` → `BUILD_ARG` | Baked at build time from Secrets Manager value |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `DERIVED` | `${FIREBASE_PROJECT_ID}.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `SECRET` → `BUILD_ARG` | From Secrets Manager |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `DERIVED` | `${FIREBASE_PROJECT_ID}.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `ENV` | Non-sensitive numeric ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `ENV` | Non-sensitive app identifier |

> **Note on `BUILD_ARG`**: `NEXT_PUBLIC_*` vars must be present at `docker build` time to be baked into the JS bundle. `fetch-secrets.sh` writes them to `.env.web`, which is sourced by `deploy.sh` before running `docker compose build`. They are passed as `--build-arg`, not stored in image layers as secrets.

## Auth

| Variable | Where | Reason |
|----------|-------|--------|
| `JWT_SECRET` | `SECRET` | Signing key — compromise allows forging any JWT |
| `ADMIN_SERVICE_KEY` | `SECRET` | Shared secret between api ↔ admin services |

## AI / Anthropic

| Variable | Where | Reason |
|----------|-------|--------|
| `ANTHROPIC_API_KEY` | `SECRET` | Billable API key — leaked key allows unlimited spend |

## AWS

| Variable | Where | Reason |
|----------|-------|--------|
| `AWS_ACCESS_KEY_ID` | **Never set** | EC2 uses instance IAM role — no static keys |
| `AWS_SECRET_ACCESS_KEY` | **Never set** | EC2 uses instance IAM role — no static keys |
| `AWS_REGION` | `ENV` | Non-sensitive configuration |
| `AWS_S3_BUCKET` | `ENV` | Bucket name — not a credential |
| `CDN_DOMAIN` | `ENV` | Empty on staging |

## Spring Boot / Runtime

| Variable | Where | Reason |
|----------|-------|--------|
| `PORT` | `ENV` | Non-sensitive port config |
| `SPRING_PROFILES_ACTIVE` | `ENV` | Profile selector |
| `OTP_FIXED_CODE` | `ENV` | Staging-only bypass code — empty = disabled |

## URLs

| Variable | Where | Reason |
|----------|-------|--------|
| `INTERNAL_API_URL` | `ENV` | Docker internal network URL (`http://api:7001/v1`) |
| `NEXT_PUBLIC_API_BASE_URL` | `DERIVED` | Computed from EC2 public hostname at deploy time |
| `NEXT_PUBLIC_SITE_URL` | `DERIVED` | Computed from EC2 public hostname at deploy time |
| `API_BASE_URL` (admin) | `ENV` | Internal Docker network URL |
| `NEXT_PUBLIC_CDN_DOMAIN` | `ENV` | Empty on staging |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `ENV` | Optional on staging |

---

## Flow: How Values Move from Secrets Manager to Containers

```
terraform apply
  └─ Creates empty secrets at /gada/staging/*

aws secretsmanager put-secret-value (manual, one-time)
  └─ Populates each secret with real values

deploy.sh
  └─ fetch-secrets.sh
       ├─ Calls GetSecretValue for each of 10 secrets
       ├─ Writes .env.api      (chmod 600)
       ├─ Writes .env.admin    (chmod 600)
       ├─ Writes .env.web      (chmod 600)
       └─ Writes secrets/firebase-service-account.json (chmod 600)
  └─ sources .env.web → exports NEXT_PUBLIC_* as build args
  └─ docker compose build (NEXT_PUBLIC_* baked into JS bundle)
  └─ docker compose up   (env_file: .env.api / .env.admin / .env.web)
       └─ containers receive env vars at runtime
```

---

## Decision Guide: Secret vs Env?

Ask these questions in order:

1. **Does it grant access to a system?** (password, API key, signing key) → `SECRET`
2. **Does it change per environment?** (hostname, bucket name) → `ENV` (with different values per env)
3. **Is it safe to commit?** (port, profile, feature flag) → `ENV` (can commit the value itself)
4. **Is it baked into a build artifact?** (NEXT_PUBLIC_*) → `BUILD_ARG` sourced from `SECRET` at build time
