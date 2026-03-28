# GADA VN — Staging Deployment Prerequisites

Complete every item in this document **before** running `cdk deploy` or pushing
to the `staging` branch. Items are ordered by dependency — each section may depend
on sections above it.

**Owner column**: who is responsible for completing the step.
**Blocker column**: Y = staging deploy cannot proceed without this item.

---

## 1. AWS Account and CDK Bootstrap

| # | Task | Owner | Blocker | Done |
|---|------|-------|---------|------|
| P-01 | AWS account exists and is accessible via CLI (`aws sts get-caller-identity`) | DevOps | Y | ☐ |
| P-02 | AWS region confirmed: `ap-southeast-1` (Singapore) | DevOps | Y | ☐ |
| P-03 | CDK bootstrapped in the account+region: `cd infra && npx cdk bootstrap aws://<account>/ap-southeast-1` | DevOps | Y | ☐ |
| P-04 | CDK version matches: `npx cdk --version` should be ≥ 2.100.0 | DevOps | Y | ☐ |
| P-05 | `infra/node_modules` installed: `cd infra && pnpm install` | DevOps | Y | ☐ |
| P-06 | CDK synth succeeds with no errors: `cd infra && pnpm synth -- --context env=staging` | DevOps | Y | ☐ |

---

## 2. IAM Role for GitHub Actions (OIDC)

The CI/CD pipeline uses AWS OIDC federation — no long-lived IAM access keys.

| # | Task | Owner | Blocker | Done |
|---|------|-------|---------|------|
| P-07 | Create GitHub OIDC provider in AWS IAM (`token.actions.githubusercontent.com`) | DevOps | Y | ☐ |
| P-08 | Create IAM role `gada-vn-github-deploy` with OIDC trust policy scoped to this repo and `staging` branch | DevOps | Y | ☐ |
| P-09 | Attach policies to the deploy role: `AmazonECS_FullAccess`, `AmazonEC2ContainerRegistryPowerUser`, `AWSSecretsManagerReadWrite` | DevOps | Y | ☐ |
| P-10 | Note the role ARN (format: `arn:aws:iam::<account>:role/gada-vn-github-deploy`) | DevOps | Y | ☐ |

**Trust policy** (replace `<org>` and `<repo>`):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:<org>/<repo>:ref:refs/heads/staging"
      },
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      }
    }
  }]
}
```

---

## 3. GitHub Repository Secrets and Environments

| # | Secret / Setting | Value | Where to set | Blocker | Done |
|---|-----------------|-------|-------------|---------|------|
| P-11 | `AWS_DEPLOY_ROLE_ARN` | ARN from P-10 | GitHub → Settings → Secrets → Actions | Y | ☐ |
| P-12 | `EXPO_TOKEN` | EAS access token from expo.dev | GitHub → Settings → Secrets → Actions | Y (mobile) | ☐ |
| P-13 | Create GitHub environment named `staging` | — | GitHub → Settings → Environments | Y | ☐ |
| P-14 | (Optional) Add required reviewers to `staging` environment for deploy approval | — | Environment settings | N | ☐ |
| P-15 | Confirm `production` environment requires manual approval (branch protection) | — | Environment settings | Y | ☐ |

---

## 4. DNS and TLS Certificates

| # | Task | Owner | Blocker | Done |
|---|------|-------|---------|------|
| P-16 | Domain registrar: confirm access to DNS for `gada.vn` | DevOps/Business | Y | ☐ |
| P-17 | Create DNS records for staging subdomains (Route 53 or external): | DevOps | Y | ☐ |
|       | • `staging.gada.vn` → ALB web target group | | | |
|       | • `api.staging.gada.vn` → ALB API target group | | | |
|       | • `admin.staging.gada.vn` → ALB admin target group | | | |
|       | • `cdn.staging.gada.vn` → CloudFront distribution (CNAME) | | | |
| P-18 | Request ACM certificate for `*.staging.gada.vn` in `us-east-1` (required by CloudFront) and `ap-southeast-1` (for ALB) | DevOps | Y | ☐ |
| P-19 | Complete ACM DNS validation (add CNAME records in DNS) | DevOps | Y | ☐ |
| P-20 | Note ACM certificate ARN(s) — needed in CDK `ecs-stack.ts` ALB HTTPS listener | DevOps | Y | ☐ |

> **Note**: The CDK ECS stack (`infra/lib/ecs-stack.ts`) currently uses listener port 443 but
> does not explicitly set a certificate ARN. Update the ALB HTTPS listener with the ACM
> ARN before deploying.

---

## 5. Firebase Staging Project

| # | Task | Owner | Blocker | Done |
|---|------|-------|---------|------|
| P-21 | Create Firebase project `gada-vn-staging` at console.firebase.google.com | Backend/DevOps | Y | ☐ |
| P-22 | Enable Phone Authentication in Firebase Console → Authentication → Sign-in methods | Backend | Y | ☐ |
| P-23 | Enable Facebook Sign-In and add App ID + App Secret from Facebook Developer App | Backend | Y | ☐ |
| P-24 | Copy OAuth redirect URI from Firebase Console (format: `https://gada-vn-staging.firebaseapp.com/__/auth/handler`) and add to Facebook App's Valid OAuth Redirect URIs | Backend | Y | ☐ |
| P-25 | Add `staging.gada.vn` to Firebase Console → Authentication → Authorized domains | Backend | Y | ☐ |
| P-26 | Generate Firebase Admin SDK service account: Console → Project Settings → Service Accounts → Generate new private key | Backend/DevOps | Y | ☐ |
| P-27 | Store service account JSON in AWS Secrets Manager: `gada-vn-staging/firebase/service-account` (full JSON as value) | DevOps | Y | ☐ |
| P-28 | Note the 6 Firebase Web Config values (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID) | Backend | Y | ☐ |
| P-29 | Enable FCM (Cloud Messaging) in Firebase project for push notifications | Backend | Y | ☐ |
| P-30 | Add Android app in Firebase with package name `com.gada.vn.staging` (for EAS preview builds) | Mobile | N | ☐ |
| P-31 | Add iOS app in Firebase with bundle ID `com.gada.vn.staging` | Mobile | N | ☐ |

---

## 6. Facebook Developer App

| # | Task | Owner | Blocker | Done |
|---|------|-------|---------|------|
| P-32 | Facebook Developer App exists at developers.facebook.com | Backend | Y | ☐ |
| P-33 | Add `staging.gada.vn` to App Domains in App Settings → Basic | Backend | Y | ☐ |
| P-34 | Add Firebase staging redirect URI to Facebook Login → Settings → Valid OAuth Redirect URIs | Backend | Y | ☐ |
| P-35 | If App is in Development mode: add staging test users who need to log in | Backend | N | ☐ |
| P-36 | Note Facebook App ID (needed for `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID` if using Facebook login in mobile) | Backend | N | ☐ |

---

## 7. Google Maps API Key

| # | Task | Owner | Blocker | Done |
|---|------|-------|---------|------|
| P-37 | Create a new Google Maps API key for staging (separate from dev key) | Backend/DevOps | N (degrades gracefully) | ☐ |
| P-38 | Enable APIs: Maps JavaScript API, Places API | DevOps | N | ☐ |
| P-39 | Set HTTP referrer restriction: `https://staging.gada.vn/*` | DevOps | N | ☐ |
| P-40 | For mobile: set Android/iOS app restriction on the mobile API key | Mobile | N | ☐ |

---

## 8. AWS Secrets Manager — Pre-provisioning

All secrets below must exist **before** `cdk deploy` or ECS task launch. The CDK
creates the RDS credentials secret automatically; all others must be created manually.

| Secret name | Content | Created by CDK? | Blocker | Done |
|-------------|---------|-----------------|---------|------|
| `gada-vn-staging/rds/credentials` | `{"username":"gadaadmin","password":"<generated>"}` | Yes (auto) | Y | ☐ |
| `gada-vn-staging/firebase/service-account` | Full Firebase Admin SDK JSON | No — manual | Y | ☐ |
| `gada-vn-staging/app/encryption-key` | 64 hex chars (`openssl rand -hex 32`) | No — manual | Y | ☐ |
| `gada-vn-staging/app/admin-service-key` | 40+ random chars (`openssl rand -hex 20`) | No — manual | Y | ☐ |
| `gada-vn-staging/app/admin-panel-password` | Strong password (16+ chars) | No — manual | Y | ☐ |
| `gada-vn-staging/app/laravel-app-key` | Laravel APP_KEY (`base64:...` format) | No — manual | Y | ☐ |

**Create secrets via CLI**:
```bash
# Encryption key
aws secretsmanager create-secret \
  --name "gada-vn-staging/app/encryption-key" \
  --region ap-southeast-1 \
  --secret-string "$(openssl rand -hex 32)"

# Admin service key
aws secretsmanager create-secret \
  --name "gada-vn-staging/app/admin-service-key" \
  --region ap-southeast-1 \
  --secret-string "$(openssl rand -hex 20)"

# Admin panel password
aws secretsmanager create-secret \
  --name "gada-vn-staging/app/admin-panel-password" \
  --region ap-southeast-1 \
  --secret-string "$(openssl rand -base64 24)"

# Laravel APP_KEY — generate in a temporary container or local Laravel install
# cd apps/admin-laravel && php artisan key:generate --show
# → base64:xxxx...
aws secretsmanager create-secret \
  --name "gada-vn-staging/app/laravel-app-key" \
  --region ap-southeast-1 \
  --secret-string "base64:<output-from-artisan>"

# Firebase service account (paste JSON file content)
aws secretsmanager create-secret \
  --name "gada-vn-staging/firebase/service-account" \
  --region ap-southeast-1 \
  --secret-string file://staging-firebase-credentials.json
```

> **Security rule**: the values of `encryption-key` and `admin-service-key` **must match**
> between the NestJS API and the Laravel admin. Both services read these from Secrets Manager
> at container startup. If they differ, contract signatures and inter-service auth will break.

---

## 9. ECS Task Definition — Secrets and Env Vars

ECS task definitions pass Secrets Manager values to containers as environment variables.
Update `infra/lib/ecs-stack.ts` to inject the following before deploying:

### NestJS API task (`${prefix}-api`)

```typescript
secrets: {
  DATABASE_URL: ecs.Secret.fromSecretsManager(rdsSecret, 'connectionString'),
  FIREBASE_PROJECT_ID: ecs.Secret.fromSecretsManager(firebaseSecret, 'project_id'),
  FIREBASE_CLIENT_EMAIL: ecs.Secret.fromSecretsManager(firebaseSecret, 'client_email'),
  FIREBASE_PRIVATE_KEY: ecs.Secret.fromSecretsManager(firebaseSecret, 'private_key'),
  ENCRYPTION_KEY: ecs.Secret.fromSecretsManager(encryptionKeySecret),
  ADMIN_SERVICE_KEY: ecs.Secret.fromSecretsManager(adminServiceKeySecret),
},
environment: {
  NODE_ENV: 'staging',
  PORT: '3001',
  REDIS_URL: `rediss://${redisStack.endpoint}:6379`,
  S3_BUCKET: `gada-vn-staging-uploads`,
  AWS_DEFAULT_REGION: 'ap-southeast-1',
  CLOUDFRONT_DOMAIN: 'cdn.staging.gada.vn',
  WEB_URL: 'https://staging.gada.vn',
}
```

### Laravel admin task (`${prefix}-admin`)

```typescript
secrets: {
  DB_PASSWORD: ecs.Secret.fromSecretsManager(rdsSecret, 'password'),
  APP_KEY: ecs.Secret.fromSecretsManager(laravelAppKeySecret),
  ADMIN_PANEL_PASSWORD: ecs.Secret.fromSecretsManager(adminPanelPasswordSecret),
  ENCRYPTION_KEY: ecs.Secret.fromSecretsManager(encryptionKeySecret),
  ADMIN_SERVICE_KEY: ecs.Secret.fromSecretsManager(adminServiceKeySecret),
},
environment: {
  APP_ENV: 'staging',
  APP_DEBUG: 'false',
  APP_URL: 'https://admin.staging.gada.vn',
  DB_HOST: rdsStack.instanceEndpoint.hostname,
  DB_DATABASE: 'gada_vn',
  DB_USERNAME: 'gadaadmin',
  REDIS_HOST: redisStack.endpoint,
  REDIS_PORT: '6379',
  AWS_BUCKET: 'gada-vn-staging-uploads',
  CDN_BASE_URL: 'https://cdn.staging.gada.vn',
  FIREBASE_PROJECT_ID: 'gada-vn-staging',
  FIREBASE_CREDENTIALS: '/run/secrets/firebase-credentials.json',
}
```

> **Firebase credentials file**: the Laravel `kreait/firebase` SDK requires a file path,
> not an environment variable. The Firebase JSON must be written to disk at container
> startup. Options:
> 1. Use a container init script that writes the Secrets Manager value to the expected path.
> 2. Mount an EFS volume with the credentials file (simpler for staging).
> 3. Patch `config/firebase.php` to load from env var directly (preferred long-term fix).

---

## 10. CI/CD Pipeline Fixes (Required Before First Deploy)

| # | Task | File | Blocker | Done |
|---|------|------|---------|------|
| P-41 | Update `build-images` to build `./apps/web-next` instead of `./apps/web` | `.github/workflows/ci.yml:162` | Y | ☐ |
| P-42 | Update `build-images` to build `./apps/admin-laravel` instead of `./apps/admin` | `.github/workflows/ci.yml:174` | Y | ☐ |
| P-43 | Add production Dockerfile to `apps/web-next/` | `apps/web-next/Dockerfile` | Y | ☐ |
| P-44 | Add production Dockerfile to `apps/admin-laravel/` | `apps/admin-laravel/Dockerfile` | Y | ☐ |
| P-45 | Add `gada-vn-staging-admin` ECS service to `deploy-staging` job | `.github/workflows/ci.yml:197-201` | Y | ☐ |
| P-46 | Add admin ECR repository to `infra/lib/ecs-stack.ts` | `infra/lib/ecs-stack.ts:50-55` | Y | ☐ |
| P-47 | Add admin Fargate service definition to `infra/lib/ecs-stack.ts` | `infra/lib/ecs-stack.ts` | Y | ☐ |
| P-48 | Update `apps/mobile/app.json` EAS project ID (currently placeholder `your-eas-project-id`) | `apps/mobile/app.json:60` | Y (mobile) | ☐ |

---

## 11. Database Setup on Staging RDS

After CDK deploys the RDS instance, run these once (via a bastion EC2 or ECS one-off task):

| # | Task | Command | Done |
|---|------|---------|------|
| P-49 | Enable PostGIS extension | `CREATE EXTENSION IF NOT EXISTS postgis;` | ☐ |
| P-50 | Run all migrations | `pnpm db:migrate` (with staging `DATABASE_URL`) | ☐ |
| P-51 | Do NOT run dev seed on staging | — | ☐ |
| P-52 | Create initial admin user manually | `INSERT INTO auth.users ...` with real Firebase UID | ☐ |
| P-53 | Verify `public.migrations` table is populated | `SELECT * FROM public.migrations;` | ☐ |

> **How to run migrations against staging RDS from local machine**:
> ```bash
> # Option 1: SSH tunnel via bastion
> ssh -L 5433:<rds-endpoint>:5432 ec2-user@<bastion-ip>
> DATABASE_URL=postgresql://gadaadmin:<password>@localhost:5433/gada_vn pnpm db:migrate
>
> # Option 2: ECS one-off task (preferred)
> aws ecs run-task \
>   --cluster gada-vn-staging-cluster \
>   --task-definition gada-vn-staging-migrate \
>   --launch-type FARGATE \
>   --network-configuration "awsvpcConfiguration={subnets=[<private-subnet>],securityGroups=[<ecs-sg>]}"
> ```

---

## 12. Expo / Mobile EAS Setup

| # | Task | Owner | Blocker | Done |
|---|------|-------|---------|------|
| P-54 | Create EAS project at expo.dev and note project ID | Mobile | Y | ☐ |
| P-55 | Update `apps/mobile/app.json` with real `projectId` | Mobile | Y | ☐ |
| P-56 | Create `eas.json` with `preview` build profile pointing to staging API URL | Mobile | Y | ☐ |
| P-57 | Add `EXPO_TOKEN` to GitHub secrets (P-12 above) | Mobile/DevOps | Y | ☐ |
| P-58 | Configure `app.config.ts` (replacing `app.json`) for env-based Firebase config switching | Mobile | Y | ☐ |

---

## Prerequisites Completion Checklist

Before triggering the first staging deploy, confirm:

- [ ] All P-01 through P-06: CDK bootstrap complete
- [ ] All P-07 through P-10: IAM OIDC role created
- [ ] All P-11 through P-15: GitHub secrets and environments configured
- [ ] All P-16 through P-20: DNS and TLS certificates ready
- [ ] All P-21 through P-31: Firebase staging project configured
- [ ] All P-32 through P-36: Facebook OAuth configured for staging
- [ ] All P-41 through P-48: CI/CD pipeline fixes applied
- [ ] All Secrets Manager entries created (Section 8)
- [ ] ECS task definitions updated with secrets (Section 9)
- [ ] PostGIS enabled and migrations run on staging RDS (Section 11)
