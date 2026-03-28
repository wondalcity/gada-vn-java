# GADA VN — Staging Deployment Plan

**Date**: 2026-03-21
**Author**: Release Engineering
**Stack**: pnpm monorepo · Next.js 15 · Laravel 11 · Expo SDK 51 · PostgreSQL 16 + PostGIS · Redis · AWS ECS Fargate · CDK (ap-southeast-1)

---

## 1. Staging Domain Strategy

| Service | Staging URL | Production URL |
|---------|-------------|----------------|
| Web (Next.js) | `https://staging.gada.vn` | `https://gada.vn` |
| API / Admin (Laravel) | `https://api-staging.gada.vn` | `https://api.gada.vn` |
| Admin Panel (Laravel web) | `https://admin-staging.gada.vn` | `https://admin.gada.vn` |
| CDN (CloudFront) | `https://cdn-staging.gada.vn` (CNAME to CF domain) | `https://cdn.gada.vn` |
| Mobile API base | `https://api-staging.gada.vn/api/v1` | `https://api.gada.vn/api/v1` |

**DNS setup required** (Route 53 or external DNS):
```
staging.gada.vn         CNAME → gada-vn-staging-web-alb.ap-southeast-1.elb.amazonaws.com
api-staging.gada.vn     CNAME → gada-vn-staging-api-alb.ap-southeast-1.elb.amazonaws.com
admin-staging.gada.vn   CNAME → gada-vn-staging-admin-alb.ap-southeast-1.elb.amazonaws.com
cdn-staging.gada.vn     CNAME → <cloudfront-domain>.cloudfront.net
```

The CDK ECS stack outputs the ALB DNS names as `${prefix}-api-url` and `${prefix}-web-url`. Retrieve them after CDK deploy:
```bash
aws cloudformation describe-stacks \
  --stack-name gada-vn-staging-ecs \
  --query 'Stacks[0].Outputs' \
  --region ap-southeast-1
```

**SSL certificates**: Request ACM certificates for `*.gada.vn` (wildcard) or per-subdomain. Must be in `us-east-1` for CloudFront, `ap-southeast-1` for ALB.

---

## 2. Environment Variable Separation

### Strategy
All secrets are stored in **AWS Secrets Manager** and **SSM Parameter Store** — never in `.env` files committed to the repository. The ECS task role (`AmazonSSMReadOnlyAccess`) pulls values at container startup.

```
AWS Secrets Manager path prefix:    /gada-vn/staging/
AWS SSM Parameter Store prefix:     /gada-vn/staging/
```

### Naming Convention

| Variable class | Storage | Staging path | Production path |
|----------------|---------|--------------|-----------------|
| DB credentials | Secrets Manager | `gada-vn-staging/rds/credentials` | `gada-vn-production/rds/credentials` |
| Firebase service account | Secrets Manager | `/gada-vn/staging/firebase-credentials` | `/gada-vn/production/firebase-credentials` |
| Encryption key | Secrets Manager | `/gada-vn/staging/encryption-key` | `/gada-vn/production/encryption-key` |
| App URLs, feature flags | SSM Parameter Store | `/gada-vn/staging/APP_URL` | `/gada-vn/production/APP_URL` |
| API keys (Maps, Firebase web) | SSM Parameter Store | `/gada-vn/staging/GOOGLE_MAPS_API_KEY` | `/gada-vn/production/GOOGLE_MAPS_API_KEY` |

### Laravel `.env` for staging (ECS task definition injects these at runtime)
```ini
APP_NAME="GADA VN Admin (Staging)"
APP_ENV=staging
APP_KEY=<from SSM: /gada-vn/staging/APP_KEY>
APP_DEBUG=false
APP_URL=https://api-staging.gada.vn

LOG_CHANNEL=stderr
LOG_LEVEL=info

DB_CONNECTION=pgsql
DB_HOST=<gada-vn-staging-db.xxxx.ap-southeast-1.rds.amazonaws.com>
DB_PORT=5432
DB_DATABASE=gada_vn
DB_USERNAME=gadaadmin
DB_PASSWORD=<from Secrets Manager: gada-vn-staging/rds/credentials>

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

REDIS_HOST=<gada-vn-staging-redis.xxxx.cache.amazonaws.com>
REDIS_PASSWORD=null
REDIS_PORT=6379

FIREBASE_CREDENTIALS=/run/secrets/firebase-credentials.json
FIREBASE_PROJECT_ID=gada-vn-staging           # ← staging Firebase project

AWS_ACCESS_KEY_ID=<ECS task role — not needed with IAM role>
AWS_SECRET_ACCESS_KEY=<ECS task role — not needed with IAM role>
AWS_DEFAULT_REGION=ap-southeast-1
AWS_BUCKET=gada-vn-staging-uploads            # ← staging S3 bucket

SUPER_ADMIN_EMAILS=<from SSM>
ENCRYPTION_KEY=<from Secrets Manager>

ADMIN_PANEL_PASSWORD=<from SSM: /gada-vn/staging/ADMIN_PANEL_PASSWORD>
```

### Next.js web `.env` for staging
```ini
NEXT_PUBLIC_API_BASE_URL=https://api-staging.gada.vn/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=<staging Firebase web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gada-vn-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gada-vn-staging
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<staging-restricted Maps key>
NEXT_PUBLIC_CDN_URL=https://cdn-staging.gada.vn
NEXTAUTH_URL=https://staging.gada.vn
```

### Mobile (Expo) `.env` for staging build
```ini
EXPO_PUBLIC_API_URL=https://api-staging.gada.vn/api/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<staging-restricted Maps key>
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=<staging Firebase web client ID>
```

---

## 3. Database Strategy

### Architecture
- **Staging RDS**: `gada-vn-staging-db` — PostgreSQL 16, `t4g.medium`, single AZ, no read replica, 3-day backup retention
- **No shared data with production** — completely separate RDS instance
- **PostGIS extension**: Required. CI tests use `postgis/postgis:16-3.4-alpine`. Staging RDS must have PostGIS installed (use the same image family).

### Initial Staging DB Setup

```bash
# Step 1: Connect to staging RDS (via SSM Session Manager bastion or temporary EC2)
psql -h gada-vn-staging-db.xxxx.ap-southeast-1.rds.amazonaws.com \
     -U gadaadmin -d gada_vn

# Step 2: Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

# Step 3: Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS ops;

# Step 4: Run all migrations in order
# (via pnpm db:migrate from a CI job or migration runner container)
```

### Running Migrations

Migrations are sequential SQL files in `packages/db/migrations/`. Run via:

```bash
pnpm db:migrate
```

**For staging deployment**: Migrations run as a one-shot ECS task before the application services start:

```bash
# Trigger migration runner task (example — add to CI deploy step)
aws ecs run-task \
  --cluster gada-vn-staging-cluster \
  --task-definition gada-vn-staging-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
  --overrides '{"containerOverrides":[{"name":"app","command":["pnpm","db:migrate"]}]}'

# Wait for task to complete before updating services
aws ecs wait tasks-stopped --cluster gada-vn-staging-cluster --tasks <taskArn>
```

### Seed Data for Staging

After initial migration, seed reference data and fixture users:

```bash
pnpm db:seed   # seeds ref.construction_trades, ref.vn_provinces
```

Additionally, create staging-specific fixture accounts (from `docs/qa/test-data-strategy.md`):
- `worker-01@staging.gada.vn` — active worker with profile
- `worker-suspended@staging.gada.vn` — suspended worker
- `manager-approved@staging.gada.vn` — approved manager with 1 site and 1 job
- `manager-pending@staging.gada.vn` — pending approval manager
- `admin@staging.gada.vn` — admin account

### Backup and Reset Policy
- Automated RDS backups: every 3 days (CDK config: `backupRetention: Duration.days(3)`)
- Nightly fixture reset for QA: run `docs/qa/test-data-strategy.md → staging-reset.sh` via EventBridge cron
- **Never restore production data to staging** — PII risk

---

## 4. S3 Bucket Separation

The CDK CdnStack creates environment-namespaced buckets:

| Bucket | Staging name | Production name | Purpose |
|--------|-------------|-----------------|---------|
| Uploads | `gada-vn-staging-uploads` | `gada-vn-production-uploads` | Worker ID docs, signatures, site images, contracts |
| CDN | `gada-vn-staging-cdn` | `gada-vn-production-cdn` | Optimized images served via CloudFront |

**Key security properties** (from `cdn-stack.ts`):
- Both buckets: `blockPublicAccess: BLOCK_ALL` — no public access
- Uploads bucket: presigned URL access only (TTL 900s for signatures, 3600s for contracts)
- CDN bucket: CloudFront OAC (Origin Access Control) only
- Staging buckets: `removalPolicy: DESTROY` (safe to recreate)
- Production buckets: `removalPolicy: RETAIN` (never auto-deleted)

**CORS on uploads bucket** (configured in CDK):
```
allowedOrigins: ['*']  ← tighten to ['https://staging.gada.vn', 'https://api-staging.gada.vn'] for staging
```

Update `cdn-stack.ts` before staging deploy to scope CORS to staging domains.

**S3 key namespacing** — all objects in the uploads bucket are prefixed by function. No per-environment prefix in keys (bucket name provides isolation):
```
worker-id/{userId}/{nonce}          ← worker identity documents
contract-signatures/{contractId}/worker.{ext}
contracts/{contractId}/contract.html
site-images/{siteId}/{filename}
images/*.jpg, images/*.png          ← triggers Lambda image optimizer
temp/*                              ← expires after 1 day (lifecycle rule)
```

---

## 5. Firebase / Facebook / Google Maps Staging Config

### Firebase

**Requirement**: A separate Firebase project for staging — `gada-vn-staging` — fully isolated from production user accounts and tokens.

**Why separate project, not separate app within the same project**:
- Firebase phone auth OTP quotas are per-project; staging testing should not consume production quotas
- FCM tokens must not cross environments (staging push notifications should not reach production devices)
- Firebase Auth emulator is available for local dev but staging should use real Firebase

**Staging Firebase project setup**:
```
Project ID:   gada-vn-staging
Display name: GADA VN (Staging)
```

**Steps**:
1. Create project in Firebase Console: `gada-vn-staging`
2. Enable Authentication → Phone and Facebook providers
3. Add test phone numbers for CI/QA (Firebase allows whitelisted numbers with fixed OTPs):
   ```
   +84 90 000 0001  →  OTP: 123456   (worker-01 fixture)
   +84 90 000 0002  →  OTP: 123456   (manager fixture)
   +84 90 000 0099  →  OTP: 123456   (admin fixture)
   ```
4. Generate Service Account key → download JSON → store in AWS Secrets Manager at `/gada-vn/staging/firebase-credentials`
5. Register web app → note `apiKey`, `authDomain`, `projectId` → set as SSM params
6. Register Android app with package `com.gadavn.app.staging` (separate staging bundle ID)
7. Register iOS app with bundle `com.gadavn.app.staging`
8. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) for staging
9. Store in EAS Secrets: `GOOGLE_SERVICES_JSON_STAGING`, `GOOGLE_SERVICE_INFO_PLIST_STAGING`

**EAS build profile** (`apps/mobile/eas.json`):
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-staging.gada.vn/api/v1",
        "EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID": "<staging web client id>"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.gada.vn/api/v1"
      }
    }
  }
}
```

**`app.json` for staging**: use `app.config.ts` to switch `android.googleServicesFile` and `ios.googleServicesFile` based on `process.env.APP_ENV`:
```typescript
// apps/mobile/app.config.ts
const isStaging = process.env.APP_ENV === 'staging'
export default {
  expo: {
    android: {
      package: isStaging ? 'com.gadavn.app.staging' : 'com.gadavn.app',
      googleServicesFile: isStaging
        ? './google-services.staging.json'
        : './google-services.json',
    },
    ios: {
      bundleIdentifier: isStaging ? 'com.gadavn.app.staging' : 'com.gadavn.app',
      googleServicesFile: isStaging
        ? './GoogleService-Info.staging.plist'
        : './GoogleService-Info.plist',
    },
  },
}
```

### Facebook Login

**Steps**:
1. In Meta Developer Console, create a test version of the GADA VN app or enable "Development Mode" on the existing app
2. In development mode, only test users can log in — safe for staging
3. Add staging domains to "Valid OAuth Redirect URIs":
   ```
   https://staging.gada.vn/__/auth/handler
   https://api-staging.gada.vn/auth/social/facebook/callback
   ```
4. Set staging `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in SSM (separate from production values)
5. In Firebase Console → Authentication → Sign-in providers → Facebook: update with staging Facebook App credentials for the `gada-vn-staging` project

### Google Maps

**Steps**:
1. In Google Cloud Console, create a new API key: `GADA VN Staging Maps`
2. Add HTTP referrer restriction:
   ```
   https://staging.gada.vn/*
   https://api-staging.gada.vn/*
   ```
3. Add Android app restriction: `com.gadavn.app.staging`
4. Add iOS bundle restriction: `com.gadavn.app.staging`
5. Store key in SSM: `/gada-vn/staging/GOOGLE_MAPS_API_KEY`
6. **Do not share the production Maps key with staging** — separate billing and quota tracking

---

## 6. Deployment Steps

### Pre-deployment Checklist

Before merging to the `staging` branch:

- [ ] All P0 security fixes applied (see `docs/qa/security-fix-list.md`)
- [ ] All P0 bug fixes applied (see `docs/qa/p0-fix-log.md`)
- [ ] Migration scripts reviewed and tested locally with `pnpm db:migrate`
- [ ] Staging Firebase project created and credentials stored in Secrets Manager
- [ ] Staging S3 buckets exist (CDK deploy confirms)
- [ ] DNS records for staging subdomains created and propagated
- [ ] ACM certificates issued and validated for staging domains
- [ ] `ADMIN_PANEL_PASSWORD` set in SSM (not the default value)
- [ ] `SUPER_ADMIN_EMAILS` set in SSM for staging admin access
- [ ] `ENCRYPTION_KEY` (64-hex) generated and stored in Secrets Manager

### Step 1: Deploy Infrastructure (CDK)

Run from `infra/` directory. Only needed on first deploy or when infra changes.

```bash
cd infra
pnpm install

# Bootstrap CDK (first time only per account/region)
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-southeast-1

# Preview changes
npx cdk diff --context env=staging

# Deploy all stacks in dependency order
npx cdk deploy --all --context env=staging --require-approval never

# Verify outputs
aws cloudformation describe-stacks \
  --stack-name gada-vn-staging-ecs \
  --query 'Stacks[0].Outputs' \
  --region ap-southeast-1
```

Expected stacks deployed:
- `gada-vn-staging-vpc` — VPC, subnets, security groups
- `gada-vn-staging-rds` — PostgreSQL 16 instance + Secrets Manager credentials
- `gada-vn-staging-redis` — ElastiCache Redis
- `gada-vn-staging-cdn` — S3 buckets + CloudFront distribution + image optimizer Lambda
- `gada-vn-staging-ecs` — ECS cluster + Fargate services (api, web, admin) + ECR repos

### Step 2: Initialize the Database

```bash
# 2a. Enable PostGIS (run via a temporary connection — bastion or SSM port forward)
psql $STAGING_DB_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql $STAGING_DB_URL -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# 2b. Run migrations
DATABASE_URL=$STAGING_DB_URL pnpm db:migrate

# 2c. Verify migrations
psql $STAGING_DB_URL -c "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('auth','app','ref','ops') ORDER BY 1,2;"

# 2d. Seed reference data (trades, provinces)
DATABASE_URL=$STAGING_DB_URL pnpm db:seed

# 2e. Seed QA fixture accounts (optional — for QA team)
# See docs/qa/test-data-strategy.md → StagingFixtureSeeder
```

### Step 3: Store Secrets in AWS Secrets Manager / SSM

```bash
# Firebase service account (base64-encode the JSON file)
aws secretsmanager create-secret \
  --name "/gada-vn/staging/firebase-credentials" \
  --secret-string "$(cat apps/admin-laravel/storage/app/firebase-staging-credentials.json)" \
  --region ap-southeast-1

# App encryption key (64 hex chars = 32 bytes = 256-bit)
ENCRYPTION_KEY=$(openssl rand -hex 32)
aws secretsmanager create-secret \
  --name "/gada-vn/staging/encryption-key" \
  --secret-string "{\"key\":\"$ENCRYPTION_KEY\"}" \
  --region ap-southeast-1

# Laravel APP_KEY
APP_KEY=$(docker run --rm php:8.2-cli php -r "echo base64_encode(random_bytes(32));")
aws ssm put-parameter --name "/gada-vn/staging/APP_KEY" \
  --value "base64:$APP_KEY" --type SecureString --region ap-southeast-1

# Admin panel password
aws ssm put-parameter --name "/gada-vn/staging/ADMIN_PANEL_PASSWORD" \
  --value "<your-staging-admin-password>" --type SecureString --region ap-southeast-1

# Super admin emails
aws ssm put-parameter --name "/gada-vn/staging/SUPER_ADMIN_EMAILS" \
  --value "admin@gada.vn,staging-admin@gada.vn" --type String --region ap-southeast-1
```

### Step 4: Configure ECS Task Definitions

Update ECS task definitions to inject secrets from Secrets Manager and SSM:

```json
// In task definition secrets array (add to EcsStack taskImageOptions.secrets):
{
  "name": "DB_PASSWORD",
  "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:ACCOUNT:secret:gada-vn-staging/rds/credentials:password::"
},
{
  "name": "APP_KEY",
  "valueFrom": "arn:aws:ssm:ap-southeast-1:ACCOUNT:parameter/gada-vn/staging/APP_KEY"
},
{
  "name": "ENCRYPTION_KEY",
  "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:ACCOUNT:secret:/gada-vn/staging/encryption-key:key::"
}
```

### Step 5: Trigger Application Deployment

Push to the `staging` branch to trigger the CI/CD pipeline:

```bash
git checkout staging
git merge develop   # or cherry-pick specific commits
git push origin staging
```

The GitHub Actions pipeline (`.github/workflows/ci.yml`) will:
1. Run lint and type-check
2. Run API tests (PostgreSQL service container)
3. Build Docker images for api, web, admin
4. Push images to ECR with `IMAGE_TAG=$GITHUB_SHA` and `:latest`
5. Update ECS services via `aws ecs update-service --force-new-deployment`

Monitor deployment progress:
```bash
# Watch service stabilization
aws ecs wait services-stable \
  --cluster gada-vn-staging-cluster \
  --services gada-vn-staging-api gada-vn-staging-web gada-vn-staging-admin \
  --region ap-southeast-1

# Check running task count (should equal desired count)
aws ecs describe-services \
  --cluster gada-vn-staging-cluster \
  --services gada-vn-staging-api gada-vn-staging-web gada-vn-staging-admin \
  --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount}' \
  --region ap-southeast-1
```

### Step 6: Mobile Build (EAS)

The mobile build is triggered automatically on push to `staging` with `BUILD_PROFILE=preview`:

```bash
# Or trigger manually via GitHub Actions workflow_dispatch
gh workflow run mobile.yml \
  --ref staging \
  -f platform=all \
  -f profile=preview
```

After build completes, distribute via Expo Go or internal distribution link to QA testers.

### Step 7: Post-deploy Verification

Run the smoke test checklist in `docs/release/staging-smoke-test.md`.

---

## 7. Rollback Steps

### ECS Service Rollback (API / Web / Admin)

ECS keeps the previous task definition active. Rolling back is a re-deploy with the prior task definition revision.

```bash
# 1. Find the previous task definition revision
aws ecs describe-task-definition \
  --task-definition gada-vn-staging-api \
  --query 'taskDefinition.revision' \
  --region ap-southeast-1
# Returns e.g. 15 (current), previous is 14

# 2. Update service to use previous task definition
aws ecs update-service \
  --cluster gada-vn-staging-cluster \
  --service gada-vn-staging-api \
  --task-definition gada-vn-staging-api:14 \
  --force-new-deployment \
  --region ap-southeast-1

# Repeat for web and admin
aws ecs update-service --cluster gada-vn-staging-cluster \
  --service gada-vn-staging-web --task-definition gada-vn-staging-web:14 --force-new-deployment
aws ecs update-service --cluster gada-vn-staging-cluster \
  --service gada-vn-staging-admin --task-definition gada-vn-staging-admin:14 --force-new-deployment

# 3. Wait for rollback to stabilize
aws ecs wait services-stable \
  --cluster gada-vn-staging-cluster \
  --services gada-vn-staging-api gada-vn-staging-web gada-vn-staging-admin
```

The ECR lifecycle rule retains up to 10 images (`lifecycleRules: [{ maxImageCount: 10 }]` in `ecs-stack.ts`). The previous image is always available unless more than 10 deployments occurred since it was pushed. For rapid succession of deployments, also tag images with `stable` after a confirmed successful deploy:

```bash
# After smoke tests pass — tag current as stable
MANIFEST=$(aws ecr batch-get-image \
  --repository-name gada-vn-staging/api \
  --image-ids imageTag=$GITHUB_SHA \
  --query 'images[0].imageManifest' --output text)

aws ecr put-image \
  --repository-name gada-vn-staging/api \
  --image-tag stable \
  --image-manifest "$MANIFEST"
```

### Database Rollback

Schema changes (migrations) are NOT automatically reversible. Plan ahead:

- **Additive migrations** (ADD COLUMN, CREATE TABLE, CREATE INDEX): safe to leave in place even after app rollback
- **Destructive migrations** (DROP TABLE, DROP COLUMN, ALTER COLUMN TYPE): write a corresponding down migration before applying up migration
- **Rule**: Never deploy a destructive migration without a tested down script staged in the PR

```bash
# If a migration must be reversed:
# 1. Run the down script manually (must be written in advance)
psql $STAGING_DB_URL -f packages/db/migrations/down/009_rollback.sql

# 2. Then rollback the application (ECS rollback above)
```

**Migration 007 and 008** (added in P0 fixes) are additive and idempotent (`IF NOT EXISTS`, `DO NOTHING`) — safe to leave even if rolling back the app.

### Mobile Rollback

EAS builds are immutable. Rollback = distribute the previous build to testers:
```bash
# List recent builds
eas build:list --platform all --limit 5

# Share previous build URL with QA team
eas build:view <previous-build-id>
```

For production releases on app stores, rollback is via an expedited store submission of the previous version.

---

## 8. Staging Environment Sizing

| Resource | Staging | Production |
|----------|---------|------------|
| ECS CPU | 512 (0.5 vCPU) | 1024 (1 vCPU) |
| ECS Memory | 1024 MB | 2048 MB |
| ECS Desired count | 1 per service | 2 per service |
| ECS Max (auto-scale) | 3 per service | 10 per service |
| RDS instance | t4g.medium | r6g.large |
| RDS Multi-AZ | No | Yes |
| RDS Read Replica | No | Yes |
| Backup retention | 3 days | 14 days |
| Deletion protection | No | Yes |

---

## 9. Open Action Items Before First Staging Deploy

| # | Action | Owner | Status |
|---|--------|-------|--------|
| 1 | Create `gada-vn-staging` Firebase project | Backend | ⬜ TODO |
| 2 | Register Facebook app in Dev Mode for staging | Backend | ⬜ TODO |
| 3 | Create staging-restricted Google Maps API key | Backend | ⬜ TODO |
| 4 | Set all secrets in AWS Secrets Manager / SSM | DevOps | ⬜ TODO |
| 5 | Create ACM certificates for `*.gada.vn` | DevOps | ⬜ TODO |
| 6 | Create DNS records for staging subdomains | DevOps | ⬜ TODO |
| 7 | Write EAS `eas.json` with preview/production profiles | Mobile | ⬜ TODO |
| 8 | Convert `apps/mobile/app.json` → `app.config.ts` for env switching | Mobile | ⬜ TODO |
| 9 | Write down scripts for migrations 007, 008 | Backend | ⬜ TODO |
| 10 | Configure CORS in CDN stack to staging domains only | DevOps | ⬜ TODO |
| 11 | Apply P0 performance fixes (PERF-P0-01 through P0-06) | Backend | ⬜ TODO |
| 12 | Apply P0 security fixes (SEC-P0-01 through P0-04) | Backend | ⬜ TODO |
