#!/bin/bash
# rollback.sh — Roll back GADA staging to a previous Git SHA
# Usage: ./rollback.sh [sha]
#   ./rollback.sh            → roll back to .rollback-sha (saved by deploy.sh)
#   ./rollback.sh abc12345   → roll back to specific 8-char SHA
set -euo pipefail

REPO_DIR="/opt/gada"
DEPLOY_DIR="$REPO_DIR/deploy/staging"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.staging.yml"

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

# ── Determine target SHA ──────────────────────────────────────────────────────
if [[ -n "${1:-}" ]]; then
  TARGET_SHA="$1"
else
  ROLLBACK_FILE="$DEPLOY_DIR/.rollback-sha"
  [[ -f "$ROLLBACK_FILE" ]] || die "No .rollback-sha file found. Specify a SHA explicitly."
  TARGET_SHA=$(cat "$ROLLBACK_FILE")
fi

CURRENT_SHA=$(cat "$DEPLOY_DIR/.current-sha" 2>/dev/null || echo "unknown")
log "Current: $CURRENT_SHA → Rolling back to: $TARGET_SHA"

# ── Check if target image exists locally ─────────────────────────────────────
SHORT_SHA="${TARGET_SHA:0:8}"

API_EXISTS=$(docker images -q "gada-api:$SHORT_SHA" 2>/dev/null)
WEB_EXISTS=$(docker images -q "gada-web:$SHORT_SHA" 2>/dev/null)
ADMIN_EXISTS=$(docker images -q "gada-admin:$SHORT_SHA" 2>/dev/null)

if [[ -z "$API_EXISTS" || -z "$WEB_EXISTS" || -z "$ADMIN_EXISTS" ]]; then
  log "Images for $SHORT_SHA not found locally — rebuilding from Git..."

  cd "$REPO_DIR"
  git fetch origin --quiet
  git checkout --quiet "$TARGET_SHA" -- . \
    || die "Cannot checkout SHA $TARGET_SHA"

  # Re-fetch secrets (in case env changed)
  bash "$DEPLOY_DIR/scripts/fetch-secrets.sh"

  set -o allexport
  source "$DEPLOY_DIR/.env.web"
  set +o allexport
  export IMAGE_TAG="$SHORT_SHA"

  docker compose -f "$COMPOSE_FILE" build --parallel
  docker tag gada-api:latest   "gada-api:$SHORT_SHA"
  docker tag gada-admin:latest "gada-admin:$SHORT_SHA"
  docker tag gada-web:latest   "gada-web:$SHORT_SHA"
else
  log "Images found locally — using cached images for $SHORT_SHA."
  cd "$REPO_DIR"
  git checkout --quiet "$TARGET_SHA" -- . \
    || log "WARN: Could not checkout code for $TARGET_SHA — using existing images only"
fi

# ── Switch services to rollback images ───────────────────────────────────────
export IMAGE_TAG="$SHORT_SHA"
log "Switching to IMAGE_TAG=$IMAGE_TAG..."

docker compose -f "$COMPOSE_FILE" up -d --no-deps api admin web
sleep 10

# ── Quick health check ────────────────────────────────────────────────────────
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/v1/health || echo "000")
log "API health after rollback: HTTP $API_STATUS"

if [[ "$API_STATUS" != "200" ]]; then
  log "WARNING: API health check returned $API_STATUS — check logs:"
  docker compose -f "$COMPOSE_FILE" logs --tail=50 api
fi

echo "$SHORT_SHA" > "$DEPLOY_DIR/.current-sha"
log "Rollback complete → $SHORT_SHA"
log ""
log "To confirm services are running:"
log "  docker compose -f $COMPOSE_FILE ps"
