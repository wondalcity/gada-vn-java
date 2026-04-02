# GADA VN Staging — Secrets Provisioning Checklist

Run this checklist after `terraform apply` and before the first deploy.
Each step must be completed in order.

**Prerequisites**:
- AWS CLI configured (`aws configure --profile wonyuep`)
- Sufficient IAM permissions (`secretsmanager:PutSecretValue` on `/gada/staging/*`)
- All external services (Firebase, RDS/DB, Redis, Anthropic) already provisioned

---

## Phase 1 — Verify Infrastructure

- [ ] `terraform apply` completed successfully
- [ ] EC2 instance is running: `aws ec2 describe-instances --filters "Name=tag:Name,Values=gada-vn-staging-app" --region ap-southeast-1 --query 'Reservations[].Instances[].State.Name'`
- [ ] All 10 secret placeholders exist in Secrets Manager:
  ```bash
  aws secretsmanager list-secrets \
    --region ap-southeast-1 \
    --query "SecretList[?starts_with(Name, '/gada/staging')].Name" \
    --output table
  ```
  Expected output: 10 entries (`/gada/staging/database-url` ... `/gada/staging/anthropic-api-key`)

---

## Phase 2 — Provision Secrets

Complete each item. Check off only after the value is confirmed set.

### Database

- [ ] `/gada/staging/database-url`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/database-url \
    --secret-string "jdbc:postgresql://HOST:5432/gada_staging" \
    --region ap-southeast-1
  ```
  Verify: value starts with `jdbc:postgresql://`

- [ ] `/gada/staging/database-user`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/database-user \
    --secret-string "gada_app" \
    --region ap-southeast-1
  ```

- [ ] `/gada/staging/database-password`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/database-password \
    --secret-string "$(openssl rand -base64 32)" \
    --region ap-southeast-1
  ```
  ⚠️ Save this value — you'll need it when creating the DB user.

### Redis

- [ ] `/gada/staging/redis-url`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/redis-url \
    --secret-string "redis://:REDIS_PASSWORD@REDIS_HOST:6379" \
    --region ap-southeast-1
  ```
  Verify: value starts with `redis://`

### Firebase

- [ ] Download Firebase service account JSON from Firebase Console
  - Firebase Console → Project Settings → Service accounts → Generate new private key
  - Save as `/tmp/firebase-service-account.json` (delete after upload)

- [ ] `/gada/staging/firebase-credentials`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/firebase-credentials \
    --secret-string "$(base64 -i /tmp/firebase-service-account.json)" \
    --region ap-southeast-1

  # Delete local file immediately
  rm /tmp/firebase-service-account.json
  ```
  Verify: value is a long base64 string (>1000 chars)

- [ ] `/gada/staging/firebase-project-id`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/firebase-project-id \
    --secret-string "gada-vn" \
    --region ap-southeast-1
  ```

- [ ] `/gada/staging/firebase-web-api-key`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/firebase-web-api-key \
    --secret-string "YOUR_WEB_API_KEY" \
    --region ap-southeast-1
  ```
  Found at: Firebase Console → Project Settings → General → Web API Key

### Auth Keys

- [ ] `/gada/staging/jwt-secret`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/jwt-secret \
    --secret-string "$(openssl rand -hex 32)" \
    --region ap-southeast-1
  ```
  Verify: 64-character hex string

- [ ] `/gada/staging/admin-service-key`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/admin-service-key \
    --secret-string "$(openssl rand -base64 48)" \
    --region ap-southeast-1
  ```
  Verify: 64+ characters

### Anthropic

- [ ] `/gada/staging/anthropic-api-key`
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id /gada/staging/anthropic-api-key \
    --secret-string "sk-ant-api03-YOUR_KEY_HERE" \
    --region ap-southeast-1
  ```
  Found at: console.anthropic.com → API Keys
  Verify: value starts with `sk-ant-`

---

## Phase 3 — Validate All Secrets Are Set

Run the verification script (no actual values are printed):

```bash
REGION="ap-southeast-1"
PREFIX="/gada/staging"
ALL_OK=true

for name in \
  database-url database-user database-password \
  redis-url \
  firebase-credentials firebase-project-id firebase-web-api-key \
  jwt-secret admin-service-key \
  anthropic-api-key
do
  VALUE=$(aws secretsmanager get-secret-value \
    --secret-id "$PREFIX/$name" \
    --region $REGION \
    --query SecretString \
    --output text 2>/dev/null || echo "")

  if [[ -z "$VALUE" ]]; then
    echo "  MISSING  $PREFIX/$name"
    ALL_OK=false
  else
    echo "  SET      $PREFIX/$name (${#VALUE} chars)"
  fi
done

$ALL_OK && echo "" && echo "All secrets set. Ready to deploy." \
         || echo "" && echo "Fix missing secrets before deploying."
```

- [ ] All 10 secrets show `SET`

---

## Phase 4 — Test Fetch on EC2

Connect via SSM and run a dry-run:

```bash
aws ssm start-session \
  --target i-060b635518a854b74 \
  --region ap-southeast-1

# On EC2:
sudo bash /opt/gada/deploy/staging/scripts/fetch-secrets.sh --dry-run
```

- [ ] `fetch-secrets.sh --dry-run` exits 0 with `All secrets fetched.`
- [ ] No `[ERROR] Failed to fetch secret:` lines

---

## Phase 5 — First Deploy

```bash
# On EC2:
cd /opt/gada
sudo bash deploy/staging/scripts/deploy.sh
```

- [ ] Deploy completes with `Deploy complete. SHA: <sha>`
- [ ] `curl -s http://localhost/v1/health` → `{"statusCode":200,"data":{"status":"ok"}}`
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost/` → `200`
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health` → `200`

---

## Phase 6 — Security Hygiene

- [ ] `.env.api`, `.env.admin`, `.env.web` are NOT in git: `git status deploy/staging/`
- [ ] `deploy/staging/secrets/` directory is NOT in git
- [ ] Firebase service account JSON deleted from local machine: `ls /tmp/firebase*.json`
- [ ] No secrets appear in EC2 system logs: `sudo cat /var/log/user-data.log | grep -i "password\|secret\|key"`
- [ ] CloudTrail logging enabled in `ap-southeast-1`

---

## Troubleshooting

**`fetch-secrets.sh` fails with "Failed to fetch secret"**
→ EC2 instance IAM role may not have `GetSecretValue` permission, or the secret has no value set yet.
```bash
# Check IAM role attached to instance
aws ec2 describe-instances \
  --instance-ids i-060b635518a854b74 \
  --query 'Reservations[].Instances[].IamInstanceProfile.Arn' \
  --region ap-southeast-1
```

**DB connection refused after deploy**
→ Check `DATABASE_URL` points to the correct host and port. Verify security group allows EC2 → RDS on 5432.

**Firebase auth failing**
→ Verify base64 encoding is correct:
```bash
aws secretsmanager get-secret-value \
  --secret-id /gada/staging/firebase-credentials \
  --region ap-southeast-1 \
  --query SecretString \
  --output text | base64 -d | python3 -m json.tool | head -5
```
Should output valid JSON with `"type": "service_account"`.
