#!/bin/bash
# deploy.sh — Deploy GADA VN staging from Git
# Usage: ./deploy.sh [git-ref]   (default: origin/main)
#
# Run on the EC2 instance via Session Manager:
#   aws ssm start-session --target INSTANCE_ID --region ap-southeast-1
#   cd /opt/gada && bash deploy/staging/scripts/deploy.sh
set -euo pipefail

REPO_DIR="/opt/gada"
DEPLOY_DIR="$REPO_DIR/deploy/staging"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.staging.yml"
GIT_REF="${1:-origin/main}"

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

cd "$REPO_DIR"

# ── 1. Save current state for rollback ───────────────────────────────────────
PREV_SHA=$(git rev-parse HEAD 2>/dev/null || echo "none")
log "Current SHA: $PREV_SHA"
echo "$PREV_SHA" > "$DEPLOY_DIR/.rollback-sha"

# ── 2. Pull latest code ───────────────────────────────────────────────────────
log "Pulling $GIT_REF..."
git fetch origin --quiet
git checkout --quiet "${GIT_REF#origin/}" 2>/dev/null || git checkout --quiet -B main "$GIT_REF"
git reset --hard "$GIT_REF" --quiet
NEW_SHA=$(git rev-parse HEAD)
IMAGE_TAG="${NEW_SHA:0:8}"
log "Deploying SHA: $NEW_SHA (tag: $IMAGE_TAG)"

# ── 3. Fetch secrets from AWS Secrets Manager ─────────────────────────────────
log "Fetching secrets..."
bash "$DEPLOY_DIR/scripts/fetch-secrets.sh"

# ── 4. Export build-time vars for Next.js (NEXT_PUBLIC_* baked at build) ─────
set -o allexport
source "$DEPLOY_DIR/.env.web"
set +o allexport
export IMAGE_TAG

# ── 5. Build Docker images ────────────────────────────────────────────────────
log "Building images (tag: $IMAGE_TAG)..."
docker compose -f "$COMPOSE_FILE" build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --parallel

# ── 6. Rolling restart ────────────────────────────────────────────────────────
log "Deploying services..."

# Deploy api first (web depends on it for auth)
IMAGE_TAG=$IMAGE_TAG docker compose -f "$COMPOSE_FILE" up -d --no-deps api
log "Waiting for api health..."
for i in $(seq 1 30); do
  docker compose -f "$COMPOSE_FILE" ps api | grep -q "healthy" && break
  sleep 5
  [[ $i -eq 30 ]] && die "api failed health check after 150s — rolling back"
done
log "api healthy ✓"

# Deploy admin
IMAGE_TAG=$IMAGE_TAG docker compose -f "$COMPOSE_FILE" up -d --no-deps admin
log "Waiting for admin health..."
for i in $(seq 1 20); do
  docker compose -f "$COMPOSE_FILE" ps admin | grep -q "healthy" && break
  sleep 5
  [[ $i -eq 20 ]] && die "admin failed health check — rolling back"
done
log "admin healthy ✓"

# Deploy web
IMAGE_TAG=$IMAGE_TAG docker compose -f "$COMPOSE_FILE" up -d --no-deps web
log "Waiting for web health..."
for i in $(seq 1 20); do
  docker compose -f "$COMPOSE_FILE" ps web | grep -q "healthy" && break
  sleep 5
  [[ $i -eq 20 ]] && die "web failed health check — rolling back"
done
log "web healthy ✓"

# Restart nginx to pick up any config changes
IMAGE_TAG=$IMAGE_TAG docker compose -f "$COMPOSE_FILE" up -d --no-deps nginx

# ── 7. Smoke test ─────────────────────────────────────────────────────────────
log "Running smoke tests..."
sleep 5

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/v1/health)
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)

log "API:   $API_STATUS"
log "Web:   $WEB_STATUS"
log "Admin: $ADMIN_STATUS"

if [[ "$API_STATUS" != "200" ]]; then
  die "API smoke test failed (HTTP $API_STATUS)"
fi

# ── 8. Cleanup old images ─────────────────────────────────────────────────────
log "Pruning dangling images..."
docker image prune -f --filter "until=24h" > /dev/null

log "Deploy complete. SHA: $IMAGE_TAG"
echo "$IMAGE_TAG" > "$DEPLOY_DIR/.current-sha"
