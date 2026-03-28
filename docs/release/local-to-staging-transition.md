# GADA VN — Local to Staging Transition

This document maps every configuration dimension that differs between the
local development environment and AWS staging. Use it as the primary reference
when preparing a staging deployment.

---

## Critical Finding — CI/CD Pipeline Targets Wrong Apps

> **⚠️ BLOCKER — must fix before first staging deploy**
>
> `.github/workflows/ci.yml` currently builds and deploys:
> - `apps/web` → legacy Next.js app (not the active web app)
> - `apps/admin` → legacy PHP shell (not the active admin panel)
>
> The active apps are `apps/web-next` (Next.js 15) and `apps/admin-laravel` (Laravel 11).
> The ECS stack also only defines services for `api` and `web` — no Laravel admin service.
>
> **Action required before staging deploy**:
> 1. Update `.github/workflows/ci.yml` build contexts from `./apps/web` → `./apps/web-next` and `./apps/admin` → `./apps/admin-laravel`
> 2. Add a third ECS service definition in `infra/lib/ecs-stack.ts` for `admin-laravel` (port 8000)
> 3. Add a Dockerfile to `apps/web-next/` and `apps/admin-laravel/` for production builds
> 4. Update `deploy-staging` job to include the new admin service

---

## Environment Comparison

### Infrastructure

| Dimension | Local | Staging | Production |
|-----------|-------|---------|------------|
| PostgreSQL | Docker `postgis/postgis:16-3.4-alpine` on localhost:5432 | RDS PostgreSQL 16 + PostGIS, `t4g.medium`, single-AZ | RDS `r6g.large`, Multi-AZ, read replica |
| Redis | Docker `redis:7-alpine` on localhost:6379, no password | ElastiCache Redis 7.1, `cache.t4g.medium`, single node, TLS | `cache.r6g.large`, 2 nodes (primary+replica), TLS, auto-failover |
| Object storage | Not available (or LocalStack at localhost:4566) | S3 `gada-vn-staging-uploads` in `ap-southeast-1` | S3 `gada-vn-production-uploads` |
| CDN | None — presigned S3 URLs or `localhost:3001` | CloudFront → `gada-vn-staging-cdn` bucket | CloudFront → `gada-vn-production-cdn` |
| Compute | Local processes / `pnpm dev` | ECS Fargate, 1 task per service, 512 CPU / 1024 MB | ECS Fargate, 2 tasks, 1024 CPU / 2048 MB, auto-scale to 10 |
| Networking | localhost | VPC `10.0.0.0/16`, 2 AZs, 1 NAT gateway, private subnets | Same VPC, 2 NAT gateways |
| Load balancer | None | ALB (HTTPS, ACM certificate) | ALB (HTTPS, ACM certificate) |
| DB credentials location | `.env.local` plaintext | AWS Secrets Manager: `gada-vn-staging/rds/credentials` | AWS Secrets Manager: `gada-vn-production/rds/credentials` |

### Application Ports

| Service | Local port | Staging (internal) | Staging (public) |
|---------|-----------|-------------------|-----------------|
| NestJS API | 3001 | 3001 (container) | `https://api.staging.gada.vn` |
| Next.js web | 3000 | 3000 (container) | `https://staging.gada.vn` |
| Laravel admin | 8000 | 8000 (container) | `https://admin.staging.gada.vn` |
| PostgreSQL | 5432 | 5432 (private subnet) | Not exposed |
| Redis | 6379 | 6379 (private subnet) | Not exposed |

---

## Environment Variable Diff — Service by Service

### NestJS API (`apps/api`) — reads root `.env.local`

| Variable | Local value | Staging value | Notes |
|----------|-------------|---------------|-------|
| `NODE_ENV` | `development` | `staging` | |
| `PORT` | `3001` | `3001` | Same — set by ECS task |
| `DATABASE_URL` | `postgresql://gadaadmin:localpassword@localhost:5432/gada_vn` | `postgresql://gadaadmin:<sm-password>@<rds-endpoint>:5432/gada_vn` | Password from Secrets Manager at deploy time |
| `REDIS_URL` | `redis://localhost:6379` | `rediss://<elasticache-endpoint>:6379` | `rediss://` (TLS) for ElastiCache |
| `FIREBASE_PROJECT_ID` | `gada-vn-dev` | `gada-vn-staging` | Separate Firebase project |
| `FIREBASE_CLIENT_EMAIL` | dev service account | staging service account | New service account key |
| `FIREBASE_PRIVATE_KEY` | dev private key | staging private key | Stored in Secrets Manager |
| `AWS_ACCESS_KEY_ID` | personal IAM / LocalStack | Not used — ECS task role | ECS task role grants S3 access via IAM |
| `AWS_SECRET_ACCESS_KEY` | personal IAM / LocalStack | Not used — ECS task role | Same |
| `S3_BUCKET` | `gada-vn-local-uploads` | `gada-vn-staging-uploads` | CDK creates bucket |
| `CLOUDFRONT_DOMAIN` | `localhost:3001` | `cdn.staging.gada.vn` | CloudFront distribution domain |
| `WEB_URL` | `http://localhost:3000` | `https://staging.gada.vn` | Used for CORS |
| `ENCRYPTION_KEY` | 64 zero-hex (local dev) | 64 random hex (from Secrets Manager) | **Must be non-zero** |
| `ADMIN_SERVICE_KEY` | example value | Secrets Manager value | Must match Laravel |
| `FIREBASE_AUTH_EMULATOR_HOST` | `localhost:9099` (optional) | **must not be set** | Remove for staging |
| `AWS_ENDPOINT_URL` | `http://localhost:4566` (LocalStack, optional) | **must not be set** | Remove for staging |

### Next.js Web (`apps/web-next`)

| Variable | Local value | Staging value | Notes |
|----------|-------------|---------------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001/v1` | `https://api.staging.gada.vn/v1` | Browser-side API calls |
| `INTERNAL_API_URL` | `http://localhost:3001/v1` | `http://api:3001/v1` (ECS internal) or `https://api.staging.gada.vn/v1` | SSR-side calls; use internal hostname if same VPC |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://staging.gada.vn` | Sitemap, robots.txt, og:url |
| `NEXT_PUBLIC_CDN_DOMAIN` | `localhost:3001` | `cdn.staging.gada.vn` | CloudFront domain |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | dev project key | staging project key | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `gada-vn-dev.firebaseapp.com` | `gada-vn-staging.firebaseapp.com` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `gada-vn-dev` | `gada-vn-staging` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `gada-vn-dev.appspot.com` | `gada-vn-staging.appspot.com` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | dev value | staging value | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | dev value | staging value | |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | dev key (localhost referrer) | staging key (staging.gada.vn referrer) | Add domain to API key restrictions |

### Laravel Admin (`apps/admin-laravel`)

| Variable | Local value | Staging value | Notes |
|----------|-------------|---------------|-------|
| `APP_ENV` | `local` | `staging` | Controls Laravel error pages, logging |
| `APP_DEBUG` | `true` | `false` | **Must be false** — prevents stack traces in responses |
| `APP_URL` | `http://localhost:8000` | `https://admin.staging.gada.vn` | |
| `APP_KEY` | local generated key | separate staging key | `php artisan key:generate` |
| `DB_HOST` | `127.0.0.1` | `<rds-staging-endpoint>` | e.g. `gada-vn-staging-db.xxxx.ap-southeast-1.rds.amazonaws.com` |
| `DB_PASSWORD` | `localpassword` | Secrets Manager value | |
| `REDIS_HOST` | `127.0.0.1` | `<elasticache-staging-endpoint>` | e.g. `gada-vn-staging-redis.xxxx.cfg.apse1.cache.amazonaws.com` |
| `REDIS_PORT` | `6379` | `6379` | |
| `REDIS_PASSWORD` | `null` | AWS auth token (if enabled) | ElastiCache default = no password in staging |
| `FIREBASE_CREDENTIALS` | `storage/app/firebase-credentials.json` (file on disk) | Secrets Manager value → file injected at boot | Path must still be a valid file path |
| `FIREBASE_PROJECT_ID` | `gada-vn-dev` | `gada-vn-staging` | |
| `AWS_ACCESS_KEY_ID` | personal IAM | Not used — ECS task role | |
| `AWS_SECRET_ACCESS_KEY` | personal IAM | Not used — ECS task role | |
| `AWS_BUCKET` | `gada-vn-local-uploads` | `gada-vn-staging-uploads` | |
| `CDN_BASE_URL` | empty (uses presigned URLs) | `https://cdn.staging.gada.vn` | |
| `ADMIN_PANEL_PASSWORD` | `change-this-local-password` | Strong secret from Secrets Manager | |
| `ENCRYPTION_KEY` | 64 zero-hex | Same 64 random hex as API | **Must match exactly** |
| `QUEUE_CONNECTION` | `sync` or `redis` | `redis` | ElastiCache Redis |
| `SESSION_DRIVER` | `file` or `redis` | `redis` | |
| `CACHE_STORE` | `file` or `redis` | `redis` | |
| `SUPER_ADMIN_EMAILS` | `dev@gada.vn` | staging admin email(s) | |
| `LOG_CHANNEL` | `stack` | `stack` | Route to CloudWatch via Laravel handler |

### Mobile App (`apps/mobile`)

| Variable | Local value | Staging value | Notes |
|----------|-------------|---------------|-------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001/v1` | `https://api.staging.gada.vn/v1` | Baked into EAS build |
| `EXPO_PUBLIC_CDN_URL` | `http://localhost:3001` | `https://cdn.staging.gada.vn` | |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | dev key | staging key (or same key + bundle ID) | |
| `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID` | dev client ID | staging client ID | |

---

## External Services — Local vs Staging Configuration

### Firebase

| Aspect | Local | Staging |
|--------|-------|---------|
| Project ID | `gada-vn-dev` | `gada-vn-staging` (separate project) |
| Auth emulator | `localhost:9099` — `FIREBASE_AUTH_EMULATOR_HOST` must be set | Real Firebase Auth — emulator host var **must be absent** |
| Phone auth | Emulator accepts any OTP `123456` | Real SMS via Firebase (requires billing enabled) |
| Facebook provider | Dev App OAuth redirect | Staging App OAuth redirect → `https://gada-vn-staging.firebaseapp.com/__/auth/handler` |
| Service account key | `storage/app/firebase-credentials.json` on dev machine | JSON injected at container boot from Secrets Manager |
| Admin SDK init | `FIREBASE_PROJECT_ID` + `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL` in env | Same vars, staging values, from Secrets Manager |
| FCM push notifications | Not tested locally (emulator) | Live FCM — requires valid FCM server key in staging project |

### Facebook OAuth

| Aspect | Local | Staging |
|--------|-------|---------|
| Facebook App | Dev App ID (localhost allowed) | Staging App ID — or same app with `staging.gada.vn` added to allowed domains |
| OAuth redirect URI | `https://gada-vn-dev.firebaseapp.com/__/auth/handler` | `https://gada-vn-staging.firebaseapp.com/__/auth/handler` |
| Valid OAuth redirect | `localhost:3000` in App Settings | `https://staging.gada.vn` in App Settings |
| App mode | Development (restricted to test users) | Development or Live (all users) |
| Config location | `NEXT_PUBLIC_FIREBASE_APP_ID` points to dev project | Points to staging project |

### Google Maps

| Aspect | Local | Staging |
|--------|-------|---------|
| API key restriction | `http://localhost:3000/*` | `https://staging.gada.vn/*` |
| APIs enabled | Maps JavaScript API, Places API | Same |
| Key | Dev key or unrestricted key | New restricted staging key |
| Mobile key | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (dev bundle ID allowed) | Same key with staging bundle ID `com.gada.vn.staging` allowed |

### AWS S3 and CloudFront

| Aspect | Local | Staging |
|--------|-------|---------|
| Auth method | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | ECS Task Role (IAM) — no long-lived credentials |
| Upload bucket | `gada-vn-local-uploads` (LocalStack or real) | `gada-vn-staging-uploads` (CDK-created) |
| CDN bucket | Not used | `gada-vn-staging-cdn` |
| CDN domain | Not used — direct presigned URLs | CloudFront `cdn.staging.gada.vn` (or `*.cloudfront.net`) |
| Presigned URL expiry | 300 seconds (same) | 300 seconds (same) |
| Bucket access | Public or LocalStack (no restrictions) | Fully private, OAC for CloudFront |
| CORS | Any origin | Specific origin `https://staging.gada.vn` |

### Logging

| Aspect | Local | Staging |
|--------|-------|---------|
| NestJS logs | stdout (terminal) | CloudWatch Logs: `/ecs/gada-vn-staging/api`, 1 month retention |
| Laravel logs | `apps/admin-laravel/storage/logs/laravel.log` | CloudWatch Logs via awslogs driver |
| Next.js logs | stdout (terminal) | CloudWatch Logs: `/ecs/gada-vn-staging/web` |
| DB slow query log | None | RDS: `log_min_duration_statement=1000ms` (parameter group) |
| VPC flow logs | None | CloudWatch Logs (enabled in VpcStack) |
| Structured format | No | JSON recommended for CloudWatch filtering |

---

## Networking — Key Differences

### Local
- All services reachable on `localhost`
- No TLS anywhere
- No authentication between services (no mTLS, no Secrets Manager)
- CORS allows `http://localhost:3000`

### Staging
- All public traffic via ALB on port 443 (HTTPS)
- ACM certificate required for `*.staging.gada.vn`
- Internal ECS service-to-service: `http://<service>:port` (same VPC, no TLS needed internally)
- RDS and Redis in `PRIVATE_ISOLATED` subnets — not reachable from public internet
- ECS tasks in private subnets with egress via NAT gateway
- Security groups: ECS SG can reach RDS SG (port 5432) and Redis SG (port 6379)
- CORS: NestJS API allows `https://staging.gada.vn` only (from `WEB_URL` env var)

---

## Database Migration Strategy

| Step | Local | Staging |
|------|-------|---------|
| Run migrations | `pnpm db:migrate` from developer machine | CI/CD job or one-off ECS task before service update |
| Seed data | `pnpm db:seed` (dev seed data) | Do NOT run dev seed — staging uses real or UAT data |
| Migration tracking | `public.migrations` table | Same table on RDS |
| Rollback | `pnpm db:reset` (drops everything) | Manual SQL or point-in-time restore (3-day backup window) |
| PostGIS extension | Docker image includes it | RDS must have `rds.force_ssl=1` and PostGIS extension installed during initial setup |

---

## Deployment Pipeline Summary

```
Developer pushes to 'staging' branch
           │
           ▼
GitHub Actions: ci.yml
  ├─ lint + type-check (all apps)
  ├─ test-api (PostgreSQL service container)
  ├─ build-images (if lint+test pass)
  │    ├─ docker build apps/api   → ECR: gada-vn-staging/api:{sha}
  │    ├─ docker build apps/web-next  → ECR: gada-vn-staging/web:{sha}  ← (fix CI first)
  │    └─ docker build apps/admin-laravel → ECR: gada-vn-staging/admin:{sha} ← (fix CI first)
  └─ deploy-staging
       ├─ aws ecs update-service gada-vn-staging-api
       ├─ aws ecs update-service gada-vn-staging-web
       └─ aws ecs update-service gada-vn-staging-admin  ← (add to CI)
```

Authentication: GitHub OIDC → AWS IAM Role (`secrets.AWS_DEPLOY_ROLE_ARN`)
No long-lived AWS credentials stored in GitHub.
