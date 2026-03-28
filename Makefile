# ================================================================
# GADA VN — Developer convenience Makefile
# Usage: make <target>
#
# All targets delegate to pnpm scripts or Docker commands.
# Requires: Node >= 20, pnpm >= 9, Docker Desktop running.
# ================================================================

.PHONY: help setup up down logs dev dev-api dev-web dev-admin \
        migrate seed reset db packages build lint typecheck test clean

# Default target — show help
help:
	@echo ""
	@echo "GADA VN — Available targets"
	@echo ""
	@echo "  Setup"
	@echo "    make setup          First-time environment setup (runs scripts/bootstrap.sh)"
	@echo ""
	@echo "  Services"
	@echo "    make up             Start PostgreSQL + Redis containers"
	@echo "    make down           Stop all Docker containers"
	@echo "    make logs           Tail PostgreSQL + Redis logs"
	@echo ""
	@echo "  Database"
	@echo "    make migrate        Run pending DB migrations"
	@echo "    make seed           Load dev seed data"
	@echo "    make db             migrate + seed (full DB bootstrap)"
	@echo "    make reset          Drop + re-migrate + re-seed (destructive)"
	@echo ""
	@echo "  Development servers (each in a separate terminal)"
	@echo "    make dev-api        Start NestJS API on :3001"
	@echo "    make dev-web        Start Next.js web on :3000"
	@echo "    make dev-admin      Start Laravel admin on :8000"
	@echo ""
	@echo "  Build / QA"
	@echo "    make packages       Build shared packages (packages/core, packages/db)"
	@echo "    make build          Build all apps"
	@echo "    make lint           Lint all apps"
	@echo "    make typecheck      Type-check all apps"
	@echo "    make test           Run all tests"
	@echo ""
	@echo "  Cleanup"
	@echo "    make clean          Remove node_modules and dist directories"
	@echo ""

# ── Setup ──────────────────────────────────────────────────────────────────

setup:
	bash scripts/bootstrap.sh

# ── Docker services ────────────────────────────────────────────────────────

up:
	docker compose up postgres redis -d

down:
	docker compose down

logs:
	docker compose logs -f postgres redis

# ── Database ───────────────────────────────────────────────────────────────

migrate:
	pnpm db:migrate

seed:
	pnpm db:seed

db:
	pnpm db:migrate && pnpm db:seed

reset:
	pnpm db:reset

# ── Development servers ────────────────────────────────────────────────────

dev-api:
	cd apps/api && pnpm dev

dev-web:
	cd apps/web-next && pnpm dev

dev-admin:
	cd apps/admin-laravel && php artisan serve --port=8000

# ── Build / QA ─────────────────────────────────────────────────────────────

packages:
	pnpm packages:build

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm type-check

test:
	pnpm test

# ── Cleanup ────────────────────────────────────────────────────────────────

clean:
	find . -name "node_modules" -type d -not -path "*/\.*" -prune -exec rm -rf {} + 2>/dev/null || true
	find . -name "dist" -type d -not -path "*/node_modules/*" -not -path "*/\.*" -exec rm -rf {} + 2>/dev/null || true
	@echo "node_modules and dist directories removed"
