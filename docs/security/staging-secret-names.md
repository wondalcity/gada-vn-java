# GADA VN Staging — Secret Names Reference

**Namespace prefix**: `/gada/staging`
**Region**: `ap-southeast-1`
**Terraform resource**: `aws_secretsmanager_secret.app[<name>]`

All secrets are provisioned as empty placeholders by `terraform apply`.
Values must be set manually before the first deploy.

---

## Secret Inventory

| Secret ID (full path) | Type | Used by | Format |
|-----------------------|------|---------|--------|
| `/gada/staging/database-url` | JDBC URL | api, admin | `jdbc:postgresql://HOST:5432/gada_staging` |
| `/gada/staging/database-user` | string | api, admin | `gada_app` |
| `/gada/staging/database-password` | string | api, admin | random 32+ chars |
| `/gada/staging/redis-url` | URL | api | `redis://:PASSWORD@HOST:6379` |
| `/gada/staging/firebase-credentials` | base64 JSON | api | base64-encoded service account JSON |
| `/gada/staging/firebase-project-id` | string | api, web | `gada-vn` |
| `/gada/staging/firebase-web-api-key` | string | api, web | Firebase web API key |
| `/gada/staging/jwt-secret` | hex string | api | 64-char random hex |
| `/gada/staging/admin-service-key` | string | api, admin | 64+ char random string |
| `/gada/staging/anthropic-api-key` | string | api | `sk-ant-api03-...` |

**Total**: 10 secrets

---

## Provisioning Commands

Run once after `terraform apply`, before the first deploy.

```bash
REGION="ap-southeast-1"
PREFIX="/gada/staging"

# ── Database ──────────────────────────────────────────────────────────────────
aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/database-url" \
  --secret-string "jdbc:postgresql://YOUR_RDS_HOST:5432/gada_staging" \
  --region $REGION

aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/database-user" \
  --secret-string "gada_app" \
  --region $REGION

aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/database-password" \
  --secret-string "$(openssl rand -base64 32)" \
  --region $REGION

# ── Redis ─────────────────────────────────────────────────────────────────────
aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/redis-url" \
  --secret-string "redis://:YOUR_REDIS_PASSWORD@YOUR_REDIS_HOST:6379" \
  --region $REGION

# ── Firebase service account (base64) ────────────────────────────────────────
# Download service account JSON from Firebase Console first
aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/firebase-credentials" \
  --secret-string "$(base64 -i /path/to/firebase-service-account.json)" \
  --region $REGION

aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/firebase-project-id" \
  --secret-string "gada-vn" \
  --region $REGION

aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/firebase-web-api-key" \
  --secret-string "YOUR_FIREBASE_WEB_API_KEY" \
  --region $REGION

# ── Auth ─────────────────────────────────────────────────────────────────────
aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/jwt-secret" \
  --secret-string "$(openssl rand -hex 32)" \
  --region $REGION

aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/admin-service-key" \
  --secret-string "$(openssl rand -base64 48)" \
  --region $REGION

# ── Anthropic ─────────────────────────────────────────────────────────────────
aws secretsmanager put-secret-value \
  --secret-id "$PREFIX/anthropic-api-key" \
  --secret-string "sk-ant-api03-YOUR_KEY_HERE" \
  --region $REGION
```

---

## Verify All Secrets Are Set

```bash
REGION="ap-southeast-1"
PREFIX="/gada/staging"

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
  else
    echo "  SET      $PREFIX/$name (${#VALUE} chars)"
  fi
done
```

---

## Retrieval in `fetch-secrets.sh`

```bash
secret() {
  aws secretsmanager get-secret-value \
    --secret-id "/gada/staging/${1}" \
    --region ap-southeast-1 \
    --query SecretString \
    --output text
}

DATABASE_URL=$(secret "database-url")
ANTHROPIC_API_KEY=$(secret "anthropic-api-key")
# ...
```

No AWS credentials needed — the EC2 instance IAM role handles authentication automatically.

---

## How Firebase Credentials Are Handled

Firebase requires a JSON service account file, not a plain string. The handling:

1. **Store**: JSON is base64-encoded before storage in Secrets Manager
   ```bash
   base64 -i firebase-service-account.json  # → store this string
   ```

2. **Fetch**: `fetch-secrets.sh` decodes it back to a file
   ```bash
   echo "$FIREBASE_CREDENTIALS_B64" | base64 -d \
     > deploy/staging/secrets/firebase-service-account.json
   chmod 600 deploy/staging/secrets/firebase-service-account.json
   ```

3. **Inject**: Docker mounts the file read-only into the api container
   ```yaml
   volumes:
     - ./secrets/firebase-service-account.json:/app/firebase-service-account.json:ro
   ```
