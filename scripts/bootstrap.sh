#!/usr/bin/env bash
# ================================================================
# GADA VN — Local bootstrap script
# Usage: bash scripts/bootstrap.sh
#        or: pnpm setup
#
# Run this once on a fresh clone to set up the full local dev
# environment. Safe to re-run — each step is idempotent.
# ================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✔ ${1}${RESET}"; }
info() { echo -e "${BLUE}  → ${1}${RESET}"; }
warn() { echo -e "${YELLOW}  ⚠ ${1}${RESET}"; }
fail() { echo -e "${RED}  ✗ ${1}${RESET}"; exit 1; }
step() { echo -e "\n${BOLD}${BLUE}▶ ${1}${RESET}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}   GADA VN — Local Bootstrap                           ${RESET}"
echo -e "${BOLD}════════════════════════════════════════════════════════${RESET}"

# ================================================================
# STEP 1 — Check prerequisites
# ================================================================
step "Checking prerequisites"

check_cmd() {
    local cmd="$1" label="$2" min_ver="$3"
    if command -v "$cmd" &>/dev/null; then
        local ver
        ver=$(${cmd} --version 2>&1 | head -1)
        ok "$label found: $ver"
    else
        fail "$label not found. Install it and re-run. See docs/setup/local-development-guide.md"
    fi
}

# Node.js >= 20
NODE_VER=$(node --version 2>/dev/null | tr -d 'v' || echo "0")
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
if [[ "$NODE_MAJOR" -ge 20 ]]; then
    ok "Node.js v${NODE_VER}"
else
    fail "Node.js >= 20 required (found v${NODE_VER}). Run: nvm install 20 && nvm use 20"
fi

# pnpm
if command -v pnpm &>/dev/null; then
    PNPM_VER=$(pnpm --version 2>&1)
    ok "pnpm ${PNPM_VER}"
else
    fail "pnpm not found. Run: corepack enable && corepack prepare pnpm@9.15.0 --activate"
fi

# Docker
if docker info &>/dev/null 2>&1; then
    ok "Docker is running"
else
    fail "Docker is not running. Start Docker Desktop and re-run."
fi

# PHP (optional — only needed for admin-laravel)
if command -v php &>/dev/null; then
    PHP_VER=$(php --version 2>&1 | head -1)
    ok "PHP found: $PHP_VER"
    PHP_AVAILABLE=true
else
    warn "PHP not found — apps/admin-laravel will not be available."
    warn "Install: brew install php@8.2"
    PHP_AVAILABLE=false
fi

# ================================================================
# STEP 2 — Install Node.js dependencies
# ================================================================
step "Installing Node.js dependencies"
info "Running pnpm install (this may take 2-4 minutes on first run)..."
pnpm install
ok "Dependencies installed"

# ================================================================
# STEP 3 — Install PHP dependencies (if PHP is available)
# ================================================================
if [[ "$PHP_AVAILABLE" == "true" ]]; then
    step "Installing PHP dependencies (apps/admin-laravel)"
    if command -v composer &>/dev/null; then
        (cd apps/admin-laravel && composer install --no-interaction --prefer-dist 2>&1 | tail -5)
        ok "Composer dependencies installed"
    else
        warn "Composer not found — skipping Laravel PHP dependencies."
        warn "Install: brew install composer"
    fi
fi

# ================================================================
# STEP 4 — Copy environment files (if not already present)
# ================================================================
step "Setting up environment files"

copy_env() {
    local src="$1" dst="$2" label="$3"
    if [[ -f "$dst" ]]; then
        ok "$label already exists — skipping"
    else
        cp "$src" "$dst"
        ok "$label created from $src"
        warn "  ↳ Open $dst and fill in real values before starting apps"
    fi
}

copy_env ".env.example"                          ".env.local"                              "Root .env.local"
copy_env "apps/web-next/.env.example"            "apps/web-next/.env.local"               "apps/web-next/.env.local"
copy_env "apps/admin-laravel/.env.example"       "apps/admin-laravel/.env"                "apps/admin-laravel/.env"
copy_env "apps/mobile/.env.example"              "apps/mobile/.env.local"                 "apps/mobile/.env.local"

if [[ -f "apps/admin/.env.example" ]] && [[ ! -f "apps/admin/.env.local" ]]; then
    cp "apps/admin/.env.example" "apps/admin/.env.local"
    ok "apps/admin/.env.local created"
fi

# Generate Laravel APP_KEY if it's blank
if [[ "$PHP_AVAILABLE" == "true" ]] && command -v composer &>/dev/null; then
    LARAVEL_ENV="apps/admin-laravel/.env"
    if grep -q "^APP_KEY=$" "$LARAVEL_ENV" 2>/dev/null; then
        info "Generating Laravel APP_KEY..."
        (cd apps/admin-laravel && php artisan key:generate --force 2>&1 | tail -2)
        ok "Laravel APP_KEY generated"
    else
        ok "Laravel APP_KEY already set"
    fi
fi

# ================================================================
# STEP 5 — Build shared packages (packages/core must be compiled first)
# ================================================================
step "Building shared packages"
info "Building packages/core (dist/ required by apps/api)..."
pnpm packages:build
ok "Shared packages built"

# ================================================================
# STEP 6 — Start Docker services
# ================================================================
step "Starting Docker services (PostgreSQL + Redis)"
docker compose up postgres redis -d
info "Waiting for PostgreSQL to be healthy..."
TRIES=0
until docker exec gada-vn-postgres pg_isready -U gadaadmin -d gada_vn -q 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [[ "$TRIES" -gt 30 ]]; then
        fail "PostgreSQL did not become healthy after 30 seconds. Check: docker compose logs postgres"
    fi
    sleep 1
done
ok "PostgreSQL is healthy"

info "Waiting for Redis to be healthy..."
TRIES=0
until docker exec gada-vn-redis redis-cli ping &>/dev/null 2>&1; do
    TRIES=$((TRIES + 1))
    if [[ "$TRIES" -gt 15 ]]; then
        fail "Redis did not respond after 15 seconds. Check: docker compose logs redis"
    fi
    sleep 1
done
ok "Redis is healthy"

# ================================================================
# STEP 7 — Run database migrations
# ================================================================
step "Running database migrations"
pnpm db:migrate
ok "Migrations complete"

# ================================================================
# STEP 8 — Seed development data
# ================================================================
step "Seeding development data"
pnpm db:seed
ok "Seed data loaded"

# ================================================================
# Done
# ================================================================
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}   Bootstrap complete!                                  ${RESET}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "${BOLD}Next steps:${RESET}"
echo ""
echo -e "  ${YELLOW}1. Fill in real secrets in your env files:${RESET}"
echo -e "     • .env.local                  — Firebase credentials, AWS keys"
echo -e "     • apps/web-next/.env.local    — Firebase web config (6 NEXT_PUBLIC_FIREBASE_* vars)"
echo -e "     • apps/admin-laravel/.env     — Firebase JSON file path, ADMIN_PANEL_PASSWORD"
echo ""
echo -e "  ${YELLOW}2. (Optional) Start the Firebase emulator instead of real Firebase:${RESET}"
echo -e "     firebase emulators:start --only auth"
echo -e "     Then add to .env.local: FIREBASE_AUTH_EMULATOR_HOST=localhost:9099"
echo ""
echo -e "  ${YELLOW}3. Start the apps (each in a separate terminal):${RESET}"
echo -e "     Terminal 1: cd apps/api && pnpm dev"
echo -e "     Terminal 2: cd apps/web-next && pnpm dev"
echo -e "     Terminal 3: cd apps/admin-laravel && php artisan serve --port=8000"
echo ""
echo -e "  ${YELLOW}4. Verify everything works:${RESET}"
echo -e "     curl http://localhost:3001/health     → NestJS API"
echo -e "     curl http://localhost:8000/health     → Laravel admin"
echo -e "     open http://localhost:3000            → Next.js web"
echo ""
echo -e "  ${YELLOW}5. Dev seed accounts (Firebase emulator OTP: 123456):${RESET}"
echo -e "     Admin:   +82100000001"
echo -e "     Manager: +82100000002 (approved, has site + job)"
echo -e "     Worker:  +84900000001 (complete profile, has pending application)"
echo ""
echo -e "See ${BOLD}docs/setup/local-development-guide.md${RESET} for full details."
echo ""
