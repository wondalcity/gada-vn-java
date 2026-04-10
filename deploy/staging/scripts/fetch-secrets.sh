#!/bin/bash
# fetch-secrets.sh — Pull staging secrets from AWS Secrets Manager
# Generates per-service .env files consumed by docker-compose.
# Runs on EC2 — uses instance IAM role (no credentials needed).
#
# Usage: ./fetch-secrets.sh [--dry-run]
set -euo pipefail

REGION="ap-southeast-1"
SECRET_PREFIX="/gada/staging"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_DIR="$DEPLOY_DIR/secrets"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

# Fetch a single secret string value
secret() {
  local name="$1"
  aws secretsmanager get-secret-value \
    --secret-id "${SECRET_PREFIX}/${name}" \
    --region "$REGION" \
    --query "SecretString" \
    --output text 2>/dev/null \
    || die "Failed to fetch secret: ${SECRET_PREFIX}/${name}"
}

log "Fetching GADA staging secrets from AWS Secrets Manager..."

# ── Fetch all secrets ─────────────────────────────────────────────────────────
DATABASE_URL=$(secret "database-url")
DATABASE_USER=$(secret "database-user")
DATABASE_PASSWORD=$(secret "database-password")
REDIS_URL=$(secret "redis-url")
FIREBASE_CREDENTIALS_B64=$(secret "firebase-credentials")
FIREBASE_PROJECT_ID=$(secret "firebase-project-id")
FIREBASE_WEB_API_KEY=$(secret "firebase-web-api-key")
JWT_SECRET=$(secret "jwt-secret")
ADMIN_SERVICE_KEY=$(secret "admin-service-key")
ANTHROPIC_API_KEY=$(secret "anthropic-api-key")

# Parse Redis URL (redis://[:password@]host:port)
REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|redis://([^:@]+@)?([^:]+):[0-9]+.*|\2|')
REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|redis://[^:]*:([0-9]+).*|\1|')
REDIS_PASSWORD=$(echo "$REDIS_URL" | sed -E 's|redis://:([^@]+)@.*|\1|; t; s|.*||')

DATABASE_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*://[^/]+/([^?]+).*|\1|')

log "All secrets fetched."

if [ "$DRY_RUN" = true ]; then
  log "DRY RUN — not writing files."
  exit 0
fi

# ── Write Firebase credentials JSON ──────────────────────────────────────────
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"
echo "$FIREBASE_CREDENTIALS_B64" | base64 -d > "$SECRETS_DIR/firebase-service-account.json"
chmod 600 "$SECRETS_DIR/firebase-service-account.json"
log "Firebase credentials written to $SECRETS_DIR/firebase-service-account.json"

# ── .env.api (Spring Boot API) ────────────────────────────────────────────────
cat > "$DEPLOY_DIR/.env.api" << EOF
PORT=7001
SPRING_PROFILES_ACTIVE=staging

DATABASE_URL=${DATABASE_URL}
DATABASE_USER=${DATABASE_USER}
DATABASE_PASSWORD=${DATABASE_PASSWORD}

REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}

FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-service-account.json
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
FIREBASE_WEB_API_KEY=${FIREBASE_WEB_API_KEY}

ADMIN_SERVICE_KEY=${ADMIN_SERVICE_KEY}
JWT_SECRET=${JWT_SECRET}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=gada-vn-staging-uploads
CDN_DOMAIN=

OTP_FIXED_CODE=
EOF
chmod 600 "$DEPLOY_DIR/.env.api"
log ".env.api written"

# ── .env.admin (Spring Boot Admin) ───────────────────────────────────────────
cat > "$DEPLOY_DIR/.env.admin" << EOF
PORT=8081
SPRING_PROFILES_ACTIVE=staging

DATABASE_URL=${DATABASE_URL}
DATABASE_USER=${DATABASE_USER}
DATABASE_PASSWORD=${DATABASE_PASSWORD}

API_BASE_URL=http://api:7001/v1
ADMIN_SERVICE_KEY=${ADMIN_SERVICE_KEY}
EOF
chmod 600 "$DEPLOY_DIR/.env.admin"
log ".env.admin written"

# ── .env.web (Next.js) ────────────────────────────────────────────────────────
# Use the custom domain (set by setup-ssl.sh) if available; fall back to EC2 DNS.
STAGING_DOMAIN_FILE="$DEPLOY_DIR/.staging-domain"
if [[ -f "$STAGING_DOMAIN_FILE" ]]; then
    SITE_HOST=$(cat "$STAGING_DOMAIN_FILE")
    SITE_SCHEME="https"
    log "Using custom domain: $SITE_HOST (HTTPS)"
else
    EC2_DNS=$(curl -s --max-time 2 \
      -H "X-aws-ec2-metadata-token: $(curl -s -X PUT \
        'http://169.254.169.254/latest/api/token' \
        -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')" \
      http://169.254.169.254/latest/meta-data/public-hostname \
      || echo "localhost")
    SITE_HOST="$EC2_DNS"
    SITE_SCHEME="http"
    log "No custom domain found; using EC2 DNS: $SITE_HOST (HTTP)"
fi

cat > "$DEPLOY_DIR/.env.web" << EOF
PORT=3000
NODE_ENV=production

INTERNAL_API_URL=http://api:7001/v1
NEXT_PUBLIC_API_BASE_URL=${SITE_SCHEME}://${SITE_HOST}/v1
NEXT_PUBLIC_SITE_URL=${SITE_SCHEME}://${SITE_HOST}
NEXT_PUBLIC_CDN_DOMAIN=

NEXT_PUBLIC_FIREBASE_API_KEY=${FIREBASE_WEB_API_KEY}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_PROJECT_ID}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${FIREBASE_PROJECT_ID}.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
EOF
chmod 600 "$DEPLOY_DIR/.env.web"
log ".env.web written"

# ── .env.postgres (PostgreSQL container init) ─────────────────────────────────
cat > "$DEPLOY_DIR/.env.postgres" << EOF
POSTGRES_DB=${DATABASE_NAME}
POSTGRES_USER=${DATABASE_USER}
POSTGRES_PASSWORD=${DATABASE_PASSWORD}
EOF
chmod 600 "$DEPLOY_DIR/.env.postgres"
log ".env.postgres written"

# ── .env.redis (Redis container) ──────────────────────────────────────────────
cat > "$DEPLOY_DIR/.env.redis" << EOF
REDIS_PASSWORD=${REDIS_PASSWORD}
EOF
chmod 600 "$DEPLOY_DIR/.env.redis"
log ".env.redis written"

log "All .env files ready. Run docker-compose to apply."
