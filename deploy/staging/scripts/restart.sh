#!/bin/bash
# restart.sh — Restart one or all GADA staging services
# Usage: ./restart.sh [service]
#   ./restart.sh           → restart all services
#   ./restart.sh api       → restart api only
#   ./restart.sh web       → restart web only
#   ./restart.sh admin     → restart admin only
#   ./restart.sh nginx     → reload nginx config only
set -euo pipefail

REPO_DIR="/opt/gada"
DEPLOY_DIR="$REPO_DIR/deploy/staging"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.staging.yml"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

SERVICE="${1:-}"
IMAGE_TAG=$(cat "$DEPLOY_DIR/.current-sha" 2>/dev/null || echo "latest")
export IMAGE_TAG

cd "$REPO_DIR"

if [[ -z "$SERVICE" ]]; then
  log "Restarting all services (IMAGE_TAG=$IMAGE_TAG)..."
  docker compose -f "$COMPOSE_FILE" restart
  log "All services restarted."
elif [[ "$SERVICE" == "nginx" ]]; then
  log "Reloading nginx config..."
  docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload \
    || docker compose -f "$COMPOSE_FILE" restart nginx
  log "Nginx reloaded."
else
  log "Restarting $SERVICE (IMAGE_TAG=$IMAGE_TAG)..."
  docker compose -f "$COMPOSE_FILE" restart "$SERVICE"
  log "$SERVICE restarted."
fi

log "Service status:"
docker compose -f "$COMPOSE_FILE" ps
