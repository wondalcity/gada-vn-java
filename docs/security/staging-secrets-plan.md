# GADA VN Staging — Secrets Management Plan

**Environment**: Staging
**Region**: `ap-southeast-1`
**Secret namespace**: `/gada/staging/*`

---

## 1. Architecture Overview

```
AWS Secrets Manager
  /gada/staging/*
        │
        │  (IAM role — no static keys)
        ▼
  EC2 Instance (gada-vn-staging)
        │
        │  fetch-secrets.sh (runs at deploy time)
        ▼
  .env.api  .env.admin  .env.web        ← chmod 600, never committed
  secrets/firebase-service-account.json ← chmod 600, never committed
        │
        │  docker compose env_file
        ▼
  containers (api / admin / web)
```

**Core principle**: Secrets never touch the codebase or CI pipeline. They live only in AWS Secrets Manager and are materialized on EC2 at deploy time via the instance IAM role.

---

## 2. Secret Tiers

### Tier 1 — Must be in Secrets Manager (sensitive credentials)

Values that, if leaked, would allow unauthorized access to systems or data.

| Category | What |
|----------|------|
| Database | Connection URL, username, password |
| Redis | Full connection URL (includes auth token) |
| Firebase | Service account JSON (private key), web API key |
| Auth | JWT signing secret |
| Inter-service | Admin service key |
| AI | Anthropic API key |

### Tier 2 — Safe in env files / config (non-sensitive)

Values that are structural but carry no credential risk.

| Category | What |
|----------|------|
| Ports | `PORT=7001`, `PORT=3000` |
| AWS config | `AWS_REGION`, `AWS_S3_BUCKET` |
| Spring profiles | `SPRING_PROFILES_ACTIVE=staging` |
| Service URLs | `API_BASE_URL=http://api:7001/v1` (internal Docker network) |
| Firebase domain | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (derived from project ID) |
| Feature flags | `OTP_FIXED_CODE=` (blank = disabled) |
| CDN domain | `CDN_DOMAIN=` (blank on staging) |

---

## 3. Retrieval Strategy on EC2

EC2 uses its **instance IAM role** — no AWS access keys are stored anywhere.

### IAM role policy (already provisioned via Terraform)
```json
{
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
  "Resource": "arn:aws:secretsmanager:ap-southeast-1:*:secret:/gada/staging/*"
}
```

### Fetch flow (triggered by `deploy.sh`)
```bash
# 1. fetch-secrets.sh calls AWS CLI — uses instance metadata credentials
aws secretsmanager get-secret-value \
  --secret-id "/gada/staging/database-url" \
  --region ap-southeast-1 \
  --query "SecretString" \
  --output text

# 2. Writes to .env files (chmod 600)
# 3. Decodes Firebase JSON from base64 → file (chmod 600)
# 4. docker compose picks up env_file at container start
```

### Manual retrieval (for debugging)
```bash
# On EC2 via SSM
aws secretsmanager get-secret-value \
  --secret-id /gada/staging/anthropic-api-key \
  --region ap-southeast-1 \
  --query SecretString \
  --output text
```

---

## 4. Secret Lifecycle

### Provisioning (one-time, after `terraform apply`)
```bash
aws secretsmanager put-secret-value \
  --secret-id /gada/staging/<name> \
  --secret-string '<value>' \
  --region ap-southeast-1
```

### Rotation
- **JWT secret**: Rotate quarterly. Requires container restart (invalidates all sessions).
- **Admin service key**: Rotate quarterly. Requires restart of both api and admin.
- **Anthropic API key**: Rotate on Anthropic dashboard, update secret, restart api.
- **Database password**: Coordinate with RDS — update secret before rotating password.
- **Firebase credentials**: Rotate in Firebase Console, re-encode base64, update secret.

### Rotation procedure
```bash
# 1. Update value in Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id /gada/staging/<name> \
  --secret-string '<new-value>' \
  --region ap-southeast-1

# 2. Re-fetch on EC2
sudo bash /opt/gada/deploy/staging/scripts/fetch-secrets.sh

# 3. Restart affected services
sudo bash /opt/gada/deploy/staging/scripts/restart.sh api
```

---

## 5. What Must Never Happen

| Rule | Risk if violated |
|------|-----------------|
| Never commit `.env.api`, `.env.admin`, `.env.web` | Credentials in git history permanently |
| Never commit `secrets/firebase-service-account.json` | Firebase private key exposed |
| Never set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in env files | Static key leakage |
| Never log secret values | Secrets appear in CloudWatch Logs |
| Never put secrets in Docker build args | Secrets baked into image layers, visible in `docker history` |
| Never share secrets via Slack/email | Uncontrolled distribution |

### `.gitignore` enforcement
The following are already gitignored in `deploy/staging/`:
```
.env.api
.env.admin
.env.web
secrets/
*.pem
*.key
```

---

## 6. Access Control

| Who | Access method | Scope |
|-----|--------------|-------|
| EC2 instance | IAM instance role | Read `/gada/staging/*` |
| Engineers | AWS Console / CLI (IAM user) | Read/write `/gada/staging/*` |
| CI/CD (future) | OIDC role (not static key) | Read `/gada/staging/*` |
| Docker containers | `env_file` written at deploy time | Values only, not AWS access |

---

## 7. Audit Trail

All `GetSecretValue` calls are logged in AWS CloudTrail by default.

To query recent secret access:
```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --region ap-southeast-1 \
  --max-results 20
```
