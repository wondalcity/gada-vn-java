#!/bin/bash
# fast-deploy.sh — Code-only fast deploy for GADA staging (~2 min vs 10+ min)
#
# Usage:
#   ./fast-deploy.sh              # Deploy all services
#   ./fast-deploy.sh web          # Deploy web only
#   ./fast-deploy.sh api          # Deploy API only
#   ./fast-deploy.sh admin        # Deploy admin only
#
# Prerequisites: No dependency changes (pnpm-lock.yaml, build.gradle.kts).
# For dependency/Dockerfile changes, use docker compose build + up.
set -euo pipefail

REPO_DIR="/opt/gada"
DEPLOY_DIR="$REPO_DIR/deploy/staging"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.staging.yml"

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

FILTER="${1:-all}"

cd "$REPO_DIR"

# ── 1. Git pull ───────────────────────────────────────────────────────────────
log "Git pull..."
HOME=/root git fetch origin --quiet
HOME=/root git reset --hard origin/main --quiet
SHORT_SHA=$(HOME=/root git rev-parse --short HEAD)
log "SHA: $SHORT_SHA"

# ── 2. Load env ───────────────────────────────────────────────────────────────
set -o allexport
source "$DEPLOY_DIR/.env.web"   2>/dev/null || true
source "$DEPLOY_DIR/.env.api"   2>/dev/null || true
source "$DEPLOY_DIR/.env.admin" 2>/dev/null || true
set +o allexport

# ── helpers ───────────────────────────────────────────────────────────────────
wait_healthy() {
  local svc=$1 max=${2:-30}
  for i in $(seq 1 $max); do
    status=$(docker inspect --format='{{.State.Health.Status}}' "staging-${svc}-1" 2>/dev/null || echo "none")
    [[ "$status" == "healthy" ]] && return 0
    sleep 5
  done
  die "$svc not healthy after $((max*5))s"
}

# ═══════════════════════════════════════════════════════════════════════════════
# WEB — Build with temp container (reuses pnpm store volume)
# ═══════════════════════════════════════════════════════════════════════════════
deploy_web() {
  log "━━━ WEB ━━━"

  # Build Next.js standalone using a temporary builder container.
  # pnpm-store volume is persisted between runs for fast installs.
  docker run --rm \
    --name gada-web-builder \
    -v "$REPO_DIR":/repo \
    -v gada-pnpm-store:/pnpm-store \
    -e PNPM_HOME=/pnpm-store \
    -e NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" \
    -e NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
    -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
    -e NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
    -e NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
    -e NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
    -e NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
    -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
    -e NEXT_PUBLIC_CDN_DOMAIN="$NEXT_PUBLIC_CDN_DOMAIN" \
    -e NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
    -w /repo \
    node:20-alpine sh -c "
      apk add --no-cache libc6-compat 2>/dev/null || true
      corepack enable && corepack prepare pnpm@9.15.0 --activate
      pnpm install --filter='@gada/web...' --frozen-lockfile
      pnpm --filter='@gada/web' build
    "

  log "Copying web artifacts..."
  STANDALONE="$REPO_DIR/apps/web-next/.next/standalone"

  # Patch files into the running container's writable layer.
  #
  # pnpm monorepo standalone uses relative symlinks that cross directory
  # boundaries (apps/web-next/node_modules/next -> ../../../node_modules/.pnpm/...)
  # `docker cp` rejects these as "invalid symlinks". Instead:
  #   1. Stream the entire standalone/ tree into a temp dir via tar (preserves symlinks)
  #   2. From inside the container, cp -a to final locations (symlinks stay valid
  #      in temp dir because relative paths resolve within the tree)
  #   3. Clean up temp dir

  docker exec -u root staging-web-1 rm -rf /app/.next /app/server.js /app/node_modules /tmp/web-build || true
  docker exec -u root staging-web-1 mkdir -p /tmp/web-build

  tar -C "$STANDALONE" -cf - . | docker exec -u root -i staging-web-1 tar -xf - -C /tmp/web-build

  docker exec -u root staging-web-1 sh -c "
    cp -a /tmp/web-build/node_modules /app/node_modules &&
    cp -a /tmp/web-build/apps/web-next/node_modules/. /app/node_modules/ &&
    cp /tmp/web-build/apps/web-next/server.js /app/server.js &&
    cp -a /tmp/web-build/apps/web-next/.next /app/.next &&
    rm -rf /tmp/web-build
  "

  tar -C "$REPO_DIR/apps/web-next/.next/static" -cf - . | docker exec -u root -i staging-web-1 tar -xf - -C /app/.next/static
  tar -C "$REPO_DIR/apps/web-next/public" -cf - . | docker exec -u root -i staging-web-1 tar -xf - -C /app/public

  log "Restarting web..."
  docker restart staging-web-1
  wait_healthy web 24
  log "web OK ✓"
}

# ═══════════════════════════════════════════════════════════════════════════════
# API (Kotlin/Spring Boot) — Gradle build in temp container
# ═══════════════════════════════════════════════════════════════════════════════
deploy_api() {
  log "━━━ API ━━━"

  docker run --rm \
    --name gada-api-builder \
    -v "$REPO_DIR":/repo \
    -v gada-gradle-cache:/root/.gradle \
    -w /repo/apps/api-kotlin \
    eclipse-temurin:17-jdk \
    ./gradlew bootJar --no-daemon -x test --build-cache

  log "Copying API JAR..."
  JAR=$(ls "$REPO_DIR/apps/api-kotlin/build/libs/"*.jar | head -1)
  docker cp "$JAR" staging-api-1:/app/app.jar

  log "Restarting api..."
  docker restart staging-api-1
  wait_healthy api 36
  log "api OK ✓"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN (Kotlin + embedded React) — Gradle build in temp container
# ═══════════════════════════════════════════════════════════════════════════════
deploy_admin() {
  log "━━━ ADMIN ━━━"

  # Build React frontend first
  docker run --rm \
    --name gada-admin-fe-builder \
    -v "$REPO_DIR/apps/admin/frontend":/app/frontend \
    -w /app/frontend \
    node:20-alpine sh -c "npm ci --quiet && npm run build"

  # Copy dist into Spring Boot resources then build JAR
  docker run --rm \
    --name gada-admin-be-builder \
    -v "$REPO_DIR":/repo \
    -v gada-gradle-cache:/root/.gradle \
    -w /repo/apps/admin \
    eclipse-temurin:17-jdk sh -c "
      rm -rf src/main/resources/static && mkdir -p src/main/resources/static
      cp -r frontend/dist/* src/main/resources/static/
      ./gradlew bootJar --no-daemon -x test --build-cache
    "

  log "Copying admin JAR..."
  JAR=$(ls "$REPO_DIR/apps/admin/build/libs/"*.jar | head -1)
  docker cp "$JAR" staging-admin-1:/app/app.jar

  log "Restarting admin..."
  docker restart staging-admin-1
  wait_healthy admin 36
  log "admin OK ✓"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Run
# ═══════════════════════════════════════════════════════════════════════════════
case "$FILTER" in
  web)   deploy_web ;;
  api)   deploy_api ;;
  admin) deploy_admin ;;
  all)
    # Run web + api + admin in parallel
    deploy_web &  PID_WEB=$!
    deploy_api &  PID_API=$!
    deploy_admin & PID_ADMIN=$!
    wait $PID_WEB  || die "web failed"
    wait $PID_API  || die "api failed"
    wait $PID_ADMIN || die "admin failed"
    ;;
  *) die "Usage: $0 [web|api|admin|all]" ;;
esac

# ── Smoke test ────────────────────────────────────────────────────────────────
log "━━━ Smoke test ━━━"
sleep 3
check() { local code=$(curl -s -o /dev/null -w "%{http_code}" "$1"); echo "$1 → $code"; [[ "$code" =~ ^[23] ]] || die "$1 failed ($code)"; }
check "http://localhost/v1/health"
check "http://localhost/"
check "http://localhost:8080/health"

log "Deploy complete ✓ ($SHORT_SHA)"
