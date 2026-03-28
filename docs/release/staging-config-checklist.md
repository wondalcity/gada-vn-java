# GADA VN — Staging Configuration Checklist

This checklist covers every configuration value that must be verified **after**
infrastructure is provisioned and **before** traffic is routed to staging.

Work through each section, fill in the **Actual value** column, and mark ✅/❌.
A section fails if any **[REQUIRED]** row is ❌.

**Tester**: _____________ **Date**: _____________ **CDK stack version**: _____________

---

## Section 1 — AWS Infrastructure Outputs

After `cdk deploy --all --context env=staging`, collect these outputs:

| Output | CDK Export name | Expected format | Actual value | ✅/❌ |
|--------|----------------|-----------------|-------------|------|
| RDS endpoint | `gada-vn-staging-db-endpoint` | `gada-vn-staging-db.xxxx.ap-southeast-1.rds.amazonaws.com` | | |
| RDS secret ARN | `gada-vn-staging-db-secret-arn` | `arn:aws:secretsmanager:ap-southeast-1:...` | | |
| Redis endpoint | `gada-vn-staging-redis-endpoint` | `gada-vn-staging-redis.xxxx.cfg.apse1.cache.amazonaws.com` | | |
| VPC ID | `gada-vn-staging-vpc-id` | `vpc-xxxx` | | |
| ECR API repo URI | — | `<account>.dkr.ecr.ap-southeast-1.amazonaws.com/gada-vn-staging/api` | | |
| ECR web repo URI | — | `<account>.dkr.ecr.ap-southeast-1.amazonaws.com/gada-vn-staging/web` | | |
| ECR admin repo URI | — | `<account>.dkr.ecr.ap-southeast-1.amazonaws.com/gada-vn-staging/admin` | | |
| CloudFront domain | — | `xxxx.cloudfront.net` | | |
| S3 uploads bucket | — | `gada-vn-staging-uploads` | | |
| ALB DNS | — | `gada-vn-staging-alb-xxxx.ap-southeast-1.elb.amazonaws.com` | | |
| ECS cluster ARN | — | `arn:aws:ecs:ap-southeast-1:...:cluster/gada-vn-staging-cluster` | | |

---

## Section 2 — DNS Records

| Record | Type | Points to | TTL | Verified |
|--------|------|-----------|-----|---------|
| `staging.gada.vn` | A / ALIAS | ALB DNS name | 60 | ☐ |
| `api.staging.gada.vn` | A / ALIAS | ALB DNS name | 60 | ☐ |
| `admin.staging.gada.vn` | A / ALIAS | ALB DNS name | 60 | ☐ |
| `cdn.staging.gada.vn` | CNAME | CloudFront domain | 300 | ☐ |

**Verify DNS propagation**:
```bash
dig staging.gada.vn +short
dig api.staging.gada.vn +short
dig cdn.staging.gada.vn +short
```

---

## Section 3 — TLS Certificates

| Domain | ACM ARN | Status | Region | Verified |
|--------|---------|--------|--------|---------|
| `*.staging.gada.vn` (ALB) | | `ISSUED` | `ap-southeast-1` | ☐ |
| `*.staging.gada.vn` (CloudFront) | | `ISSUED` | `us-east-1` | ☐ |

**Verify**:
```bash
aws acm list-certificates --region ap-southeast-1 | grep staging
aws acm list-certificates --region us-east-1 | grep staging
```

---

## Section 4 — AWS Secrets Manager

Verify all secrets exist and are non-empty:

```bash
# Run this block to check all secrets at once:
for secret in \
  "gada-vn-staging/rds/credentials" \
  "gada-vn-staging/firebase/service-account" \
  "gada-vn-staging/app/encryption-key" \
  "gada-vn-staging/app/admin-service-key" \
  "gada-vn-staging/app/admin-panel-password" \
  "gada-vn-staging/app/laravel-app-key"; do
  result=$(aws secretsmanager describe-secret --secret-id "$secret" \
    --region ap-southeast-1 --query 'Name' --output text 2>&1)
  echo "$secret: $result"
done
```

| Secret | Must contain | Status |
|--------|-------------|--------|
| `gada-vn-staging/rds/credentials` | `username`, `password` keys | ☐ |
| `gada-vn-staging/firebase/service-account` | `project_id`, `private_key`, `client_email` | ☐ |
| `gada-vn-staging/app/encryption-key` | exactly 64 hex chars (not all zeros) | ☐ |
| `gada-vn-staging/app/admin-service-key` | ≥ 40 chars | ☐ |
| `gada-vn-staging/app/admin-panel-password` | ≥ 16 chars | ☐ |
| `gada-vn-staging/app/laravel-app-key` | begins with `base64:` | ☐ |

**Verify encryption key is not all zeros**:
```bash
aws secretsmanager get-secret-value \
  --secret-id "gada-vn-staging/app/encryption-key" \
  --region ap-southeast-1 \
  --query SecretString --output text | grep -v "^0\{64\}$" && echo "✅ non-zero" || echo "❌ ALL ZEROS — insecure"
```

**Verify encryption key matches between API and admin**:
```bash
# Both services must read the same secret — this is enforced by using the same
# Secrets Manager ARN in both ECS task definitions. Confirm:
aws ecs describe-task-definition --task-definition gada-vn-staging-api \
  --query 'taskDefinition.containerDefinitions[0].secrets' | grep encryption-key

aws ecs describe-task-definition --task-definition gada-vn-staging-admin \
  --query 'taskDefinition.containerDefinitions[0].secrets' | grep encryption-key
```
**Expected**: both reference the same `gada-vn-staging/app/encryption-key` ARN.

---

## Section 5 — ECS Task Definitions

### NestJS API task

```bash
aws ecs describe-task-definition \
  --task-definition gada-vn-staging-api \
  --query 'taskDefinition.containerDefinitions[0].{env:environment, secrets:secrets}'
```

| Variable | Source | Expected value | ✅/❌ |
|----------|--------|----------------|------|
| `NODE_ENV` | env | `staging` | |
| `PORT` | env | `3001` | |
| `REDIS_URL` | env | `rediss://<elasticache-endpoint>:6379` | |
| `S3_BUCKET` | env | `gada-vn-staging-uploads` | |
| `AWS_DEFAULT_REGION` | env | `ap-southeast-1` | |
| `WEB_URL` | env | `https://staging.gada.vn` | |
| `CLOUDFRONT_DOMAIN` | env | `cdn.staging.gada.vn` | |
| `DATABASE_URL` | Secrets Manager | references `gada-vn-staging/rds/credentials` | |
| `FIREBASE_PRIVATE_KEY` | Secrets Manager | references `gada-vn-staging/firebase/service-account` | |
| `ENCRYPTION_KEY` | Secrets Manager | references `gada-vn-staging/app/encryption-key` | |
| `ADMIN_SERVICE_KEY` | Secrets Manager | references `gada-vn-staging/app/admin-service-key` | |
| `FIREBASE_AUTH_EMULATOR_HOST` | **must be absent** | variable must not exist | |
| `AWS_ENDPOINT_URL` | **must be absent** | variable must not exist | |
| `AWS_ACCESS_KEY_ID` | **must be absent** | use ECS task role instead | |
| `AWS_SECRET_ACCESS_KEY` | **must be absent** | use ECS task role instead | |

### Laravel admin task

| Variable | Source | Expected value | ✅/❌ |
|----------|--------|----------------|------|
| `APP_ENV` | env | `staging` | |
| `APP_DEBUG` | env | `false` | |
| `APP_URL` | env | `https://admin.staging.gada.vn` | |
| `DB_HOST` | env | RDS endpoint hostname | |
| `DB_DATABASE` | env | `gada_vn` | |
| `DB_USERNAME` | env | `gadaadmin` | |
| `REDIS_HOST` | env | ElastiCache endpoint | |
| `REDIS_PORT` | env | `6379` | |
| `AWS_BUCKET` | env | `gada-vn-staging-uploads` | |
| `AWS_DEFAULT_REGION` | env | `ap-southeast-1` | |
| `CDN_BASE_URL` | env | `https://cdn.staging.gada.vn` | |
| `FIREBASE_PROJECT_ID` | env | `gada-vn-staging` | |
| `DB_PASSWORD` | Secrets Manager | references `gada-vn-staging/rds/credentials` | |
| `APP_KEY` | Secrets Manager | references `gada-vn-staging/app/laravel-app-key` | |
| `ADMIN_PANEL_PASSWORD` | Secrets Manager | references `gada-vn-staging/app/admin-panel-password` | |
| `ENCRYPTION_KEY` | Secrets Manager | **same ARN** as API task | |
| `ADMIN_SERVICE_KEY` | Secrets Manager | **same ARN** as API task | |
| `APP_DEBUG` | env | **must be `false`** | |

### Next.js web task

| Variable | Source | Expected value | ✅/❌ |
|----------|--------|----------------|------|
| `NODE_ENV` | env | `production` | |
| `NEXT_PUBLIC_API_BASE_URL` | env (build arg) | `https://api.staging.gada.vn/v1` | |
| `INTERNAL_API_URL` | env | `http://api:3001/v1` or full staging URL | |
| `NEXT_PUBLIC_SITE_URL` | env (build arg) | `https://staging.gada.vn` | |
| `NEXT_PUBLIC_CDN_DOMAIN` | env (build arg) | `cdn.staging.gada.vn` | |
| All 6 `NEXT_PUBLIC_FIREBASE_*` | env (build args) | staging Firebase project values | |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | env (build arg) | staging Maps key | |

> **Important**: `NEXT_PUBLIC_*` variables are baked into the Next.js bundle at **build time**,
> not at container runtime. They must be set as Docker build arguments (`--build-arg`) in the
> `build-images` CI job, not as ECS task environment variables.

---

## Section 6 — Firebase Configuration

| Check | Expected | ✅/❌ |
|-------|----------|------|
| Firebase project `gada-vn-staging` exists | Yes | ☐ |
| Phone Authentication enabled | Yes | ☐ |
| Facebook sign-in enabled | Yes | ☐ |
| `staging.gada.vn` in Authorized Domains | Yes | ☐ |
| Service account key downloaded and stored in Secrets Manager | Yes | ☐ |
| `FIREBASE_AUTH_EMULATOR_HOST` absent from all staging env vars | Yes — must be absent | ☐ |
| FCM Cloud Messaging enabled | Yes | ☐ |

**Verify API can reach Firebase**:
```bash
# After API container is running, check startup logs for Firebase init errors:
aws logs tail /ecs/gada-vn-staging/api --follow --format short | grep -i firebase
```
**Expected**: no Firebase init errors in logs.

---

## Section 7 — Facebook OAuth

| Check | Expected | ✅/❌ |
|-------|----------|------|
| `staging.gada.vn` in Facebook App Domains | Yes | ☐ |
| Firebase staging redirect URI in Facebook Login Valid OAuth Redirect URIs | Yes | ☐ |
| `POST https://api.staging.gada.vn/v1/auth/social/facebook` accepts valid idToken | HTTP 200 | ☐ |
| Facebook login flow completes end-to-end in browser | Session cookie set | ☐ |

---

## Section 8 — Google Maps

| Check | Expected | ✅/❌ |
|-------|----------|------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set in Next.js build | Yes | ☐ |
| `https://staging.gada.vn/*` in Maps API key HTTP referrer restrictions | Yes | ☐ |
| Maps JavaScript API and Places API enabled for the key | Yes | ☐ |
| Address autocomplete works on site creation form | Dropdown appears | ☐ |
| Coordinates saved on site create | lat/lng non-null | ☐ |

---

## Section 9 — S3 and CDN

| Check | Command / Action | Expected | ✅/❌ |
|-------|-----------------|----------|------|
| S3 uploads bucket exists | `aws s3 ls s3://gada-vn-staging-uploads` | Lists (empty) | ☐ |
| S3 bucket blocks all public access | AWS Console → Block Public Access | All 4 settings ON | ☐ |
| S3 CORS policy allows staging origin | `aws s3api get-bucket-cors --bucket gada-vn-staging-uploads` | Origins include `https://staging.gada.vn` | ☐ |
| ECS task role has S3 permissions | `aws iam simulate-principal-policy` | `s3:PutObject`, `s3:GetObject` allowed | ☐ |
| Presigned URL generation works | `POST https://api.staging.gada.vn/v1/files/presigned-url` | Returns URL in response | ☐ |
| File upload via presigned URL succeeds | PUT to presigned URL | HTTP 200 | ☐ |
| CloudFront distribution active | `curl -I https://cdn.staging.gada.vn` | HTTP 200, `via: 1.1 CloudFront` header | ☐ |

---

## Section 10 — Database

| Check | Command | Expected | ✅/❌ |
|-------|---------|----------|------|
| RDS reachable from ECS (via security group) | NestJS API startup log | No `ECONNREFUSED` errors | ☐ |
| PostGIS extension installed | `SELECT PostGIS_version();` | Version string | ☐ |
| Migrations applied | `SELECT COUNT(*) FROM public.migrations;` | ≥ 1 | ☐ |
| `auth`, `app`, `ref`, `ops` schemas present | `\dn` | All 4 listed | ☐ |
| `auth.users` has ≥ 1 admin account | `SELECT role FROM auth.users WHERE role='ADMIN'` | ≥ 1 row | ☐ |
| RDS encryption at rest enabled | AWS Console → RDS → Storage | Encrypted | ☐ |
| Backup retention: 3 days | AWS Console → RDS → Maintenance | 3 days | ☐ |
| Deletion protection: disabled for staging | AWS Console → RDS | Not enabled | ☐ |

---

## Section 11 — Redis

| Check | Command | Expected | ✅/❌ |
|-------|---------|----------|------|
| Redis reachable from ECS | Laravel/NestJS startup log | No Redis connection errors | ☐ |
| Redis TLS connection works | `REDIS_URL=rediss://...` in API env | API starts without TLS errors | ☐ |
| Laravel session stored in Redis | Log in via API → `redis-cli keys "*session*"` | Session key exists | ☐ |
| Laravel cache stored in Redis | Hit cached endpoint → `redis-cli keys "*"` | Cache keys present | ☐ |

---

## Section 12 — Logging

| Check | Expected | ✅/❌ |
|-------|----------|------|
| CloudWatch log group `/ecs/gada-vn-staging/api` exists | Yes | ☐ |
| CloudWatch log group `/ecs/gada-vn-staging/web` exists | Yes | ☐ |
| NestJS API logs flowing to CloudWatch | `aws logs tail /ecs/gada-vn-staging/api` shows output | ☐ |
| Laravel logs flowing to CloudWatch | Log group for admin service shows output | ☐ |
| `APP_DEBUG=false` in Laravel — no stack traces in API responses | `GET /v1/nonexistent` returns `{"message":"..."}` not PHP exception | ☐ |
| No sensitive data (passwords, tokens, keys) in logs | Review log output manually | ☐ |

---

## Section 13 — Security Baseline

| Check | Expected | ✅/❌ |
|-------|----------|------|
| All HTTPS — no HTTP allowed on public endpoints | ALB listener redirects HTTP 80 → HTTPS 443 | ☐ |
| TLS 1.2+ enforced on ALB | ALB Security Policy = `ELBSecurityPolicy-TLS13-1-2-2021-06` | ☐ |
| RDS not publicly accessible | AWS Console → RDS → Connectivity → Not publicly accessible | ☐ |
| Redis not publicly accessible | ElastiCache → No public access | ☐ |
| S3 bucket no public access | All 4 Block Public Access settings ON | ☐ |
| No hardcoded `ENCRYPTION_KEY` all-zeros | Verified in Section 4 | ☐ |
| `APP_DEBUG=false` | Verified above | ☐ |
| CORS only allows `https://staging.gada.vn` | Check `WEB_URL` in API task env | ☐ |
| Admin panel password is not the default `gadaAdmin2026!` | Test: wrong password returns 403 | ☐ |
| Firebase Auth emulator disabled | `FIREBASE_AUTH_EMULATOR_HOST` absent from env | ☐ |

---

## Section 14 — Mobile Build (EAS Preview)

| Check | Expected | ✅/❌ |
|-------|----------|------|
| `apps/mobile/app.json` has real EAS `projectId` | Not `your-eas-project-id` | ☐ |
| `eas.json` has `preview` profile with `EXPO_PUBLIC_API_URL=https://api.staging.gada.vn/v1` | Yes | ☐ |
| `EXPO_TOKEN` GitHub secret set | Yes | ☐ |
| EAS preview build triggers on push to `staging` branch | GitHub Actions `mobile.yml` runs | ☐ |
| Preview APK/IPA installs and connects to staging API | Manual test | ☐ |

---

## Sign-Off

| Section | Pass? | Notes |
|---------|-------|-------|
| 1 — AWS Infra Outputs | | |
| 2 — DNS | | |
| 3 — TLS Certificates | | |
| 4 — Secrets Manager | | |
| 5 — ECS Task Definitions | | |
| 6 — Firebase | | |
| 7 — Facebook OAuth | | |
| 8 — Google Maps | | |
| 9 — S3 and CDN | | |
| 10 — Database | | |
| 11 — Redis | | |
| 12 — Logging | | |
| 13 — Security Baseline | | |
| 14 — Mobile Build | | |

**Overall**: ☐ READY FOR SMOKE TEST   ☐ BLOCKED — see notes above

**Signed off by**: _____________  **Date**: _____________
