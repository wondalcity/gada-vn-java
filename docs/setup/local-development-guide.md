# Local Development Guide — GADA VN

**Date**: 2026-03-21
**Stack**: Node.js 20 · pnpm 9 · NestJS 10 · Next.js 15 · Laravel 11 · Expo SDK 51
**Platforms**: macOS / Linux (Windows via WSL2)

---

## Overview

GADA VN is a pnpm monorepo with four runnable apps and five shared packages:

| App | Directory | Port | Runtime | Purpose |
|-----|-----------|------|---------|---------|
| **NestJS API** | `apps/api` | 3001 | Node.js 20 | Main REST API — auth, jobs, contracts, workers, managers |
| **Next.js Web** | `apps/web-next` | 3000 | Node.js 20 | Public-facing web + worker/manager dashboards |
| **Laravel Admin** | `apps/admin-laravel` | 8000 | PHP 8.2 | Admin panel + standalone admin API endpoints |
| **Mobile** | `apps/mobile` | N/A | Expo SDK 51 | React Native app for workers |
| **PHP Admin Shell** | `apps/admin` | 8080 | PHP | Thin HTTP proxy to NestJS — less active than admin-laravel |

> `apps/mobile-shell` is a setup plan directory only — it contains no runnable code.
> `apps/web` is the deprecated predecessor to `apps/web-next` — do not run it.

---

## Prerequisites

### 1. System Tools

Install in this order:

```bash
# macOS — install Homebrew first if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 20 (use nvm for version management)
brew install nvm
nvm install 20
nvm use 20
node --version   # must be >= 20.0.0

# pnpm 9.15.0 (exact version)
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm --version   # must be 9.15.0

# PHP 8.2 + Composer (for admin-laravel only)
brew install php@8.2
brew link php@8.2 --force
php --version    # must be 8.2.x
brew install composer
composer --version

# Docker (for PostgreSQL + Redis)
brew install --cask docker
# Start Docker Desktop, then verify:
docker --version
docker compose version

# Firebase CLI (optional but useful for emulator)
npm install -g firebase-tools
firebase --version
```

### 2. Mobile-Only Prerequisites (skip if not working on mobile)

```bash
# Expo CLI
npm install -g expo-cli eas-cli

# iOS (macOS only)
# Install Xcode from the App Store (full installation, ~15GB)
# Then install command-line tools:
xcode-select --install
sudo xcodebuild -license accept

# Android
# Install Android Studio from https://developer.android.com/studio
# In Android Studio: SDK Manager → install Android 14 (API 34)
# Set ANDROID_HOME in ~/.zshrc or ~/.bash_profile:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

### 3. Optional Tools

```bash
# TablePlus or psql for DB inspection
brew install --cask tableplus

# Redis Commander for Redis inspection
npm install -g redis-commander

# awslocal (LocalStack CLI) for S3 without real AWS credentials
pip install awscli-local
```

---

## Step 1 — Clone and Install

```bash
git clone https://github.com/your-org/gada-vn.git
cd gada-vn

# Install all workspace dependencies
pnpm install
```

This installs dependencies for all apps and packages in one command. It takes 2–4 minutes on first run.

---

## Step 2 — Environment Files

You need three `.env` files. Copy each example and fill in real values.

### 2.1 Root `.env.local` (required by packages/db and apps/api)

```bash
cp .env.example .env.local
```

Minimum values for local development:

```dotenv
# .env.local (repo root)
DATABASE_URL=postgresql://gadaadmin:localpassword@localhost:5432/gada_vn
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3001
WEB_URL=http://localhost:3000
API_URL=http://localhost:3001
ADMIN_URL=http://localhost:8080

# Firebase — get from Firebase Console (gada-vn-dev project)
FIREBASE_PROJECT_ID=gada-vn-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@gada-vn-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AWS — use dummy values if using LocalStack
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_UPLOADS_BUCKET=gada-vn-local-uploads
S3_STATIC_BUCKET=gada-vn-local-static

# Maps (optional for local — fill in to test map features)
GOOGLE_MAPS_API_KEY=

# Admin service key — shared secret between apps/admin and apps/api
ADMIN_SERVICE_KEY=local-admin-service-key-change-me

# Encryption key — 64 hex characters
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

> **Firebase credentials**: Obtain the service account JSON from the Firebase Console → Project Settings → Service Accounts → Generate new private key. Copy the `project_id`, `client_email`, and `private_key` fields into `.env.local`. Alternatively, use the Firebase emulator (see Section 6).

### 2.2 `apps/web-next/.env.local`

```bash
cp apps/web-next/.env.example apps/web-next/.env.local
```

```dotenv
# apps/web-next/.env.local
NEXT_PUBLIC_WEB_URL=http://localhost:3000
INTERNAL_API_URL=http://localhost:3001/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # optional for local
NEXT_PUBLIC_CDN_DOMAIN=localhost:3001

# Firebase web config — from Firebase Console → Project Settings → Your apps → Web app
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gada-vn-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gada-vn-dev
```

### 2.3 `apps/admin-laravel/.env`

```bash
cp apps/admin-laravel/.env.example apps/admin-laravel/.env
```

Edit the following fields:

```dotenv
# apps/admin-laravel/.env
APP_KEY=        # generate with: php artisan key:generate --show
DB_USERNAME=gadaadmin
DB_PASSWORD=localpassword
```

Generate the app key:
```bash
cd apps/admin-laravel
php artisan key:generate
```

You also need the Firebase credentials JSON file:
```bash
# Download from Firebase Console → Service Accounts → Generate new private key
cp ~/Downloads/your-firebase-credentials.json apps/admin-laravel/storage/app/firebase-credentials.json
```

### 2.4 `apps/mobile/.env.local`

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

```dotenv
# apps/mobile/.env.local
EXPO_PUBLIC_API_URL=http://localhost:3001/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=   # from Firebase Console → Your apps → Web client ID
```

---

## Step 3 — Start Local Services (Docker)

PostgreSQL and Redis run in Docker containers. The `docker-compose.yml` at the repo root starts them.

```bash
# Start only postgres and redis (not the app containers — run apps natively)
docker compose up postgres redis -d

# Verify they are healthy
docker compose ps
# postgres: "healthy"
# redis:    "healthy"
```

You can also confirm connectivity:
```bash
# PostgreSQL
docker exec gada-vn-postgres pg_isready -U gadaadmin -d gada_vn

# Redis
docker exec gada-vn-redis redis-cli ping   # → PONG
```

---

## Step 4 — Database Setup

### 4.1 Run Migrations

The migration script reads `.env.local` from the repo root.

```bash
# From repo root
pnpm db:migrate
```

Expected output:
```
[run]  001_schemas.sql
[done] 001_schemas.sql
[run]  002_seed_trades.sql
[done] 002_seed_trades.sql
...
[done] 008_users_deleted_status.sql
All migrations applied.
```

If you rerun it, already-applied migrations are skipped:
```
[skip] 001_schemas.sql already applied
```

### 4.2 Seed Reference Data

```bash
pnpm db:seed
```

This populates:
- Construction trades (`ref.construction_trades`) — 120+ trade types
- Vietnamese provinces (`ref.vn_provinces`) — all 63 provinces

### 4.3 Reset Database (start fresh)

```bash
pnpm db:reset
```

> **Warning**: This drops and recreates the database. All data is lost.

---

## Step 5 — Build Shared Packages

`packages/core` must be compiled before any app starts, because `apps/api` imports from `@gada-vn/core/dist`.

```bash
# Build core (and any other package with a build step)
pnpm build --filter @gada-vn/core

# Or build all packages at once
pnpm turbo build --filter="./packages/*"
```

> You must rebuild `packages/core` whenever you change a type or utility in it.

---

## Step 6 — Start Apps

Run each app in a separate terminal. The order matters.

### Terminal 1 — NestJS API (start first)

```bash
cd apps/api
pnpm dev
# Starts on http://localhost:3001
# Health check: http://localhost:3001/health
```

Wait until you see: `API running on port 3001`

### Terminal 2 — Next.js Web

```bash
cd apps/web-next
pnpm dev
# Starts on http://localhost:3000
```

Wait until you see: `✓ Ready in X.Xs`

### Terminal 3 — Laravel Admin (optional)

```bash
cd apps/admin-laravel

# First-time only: install PHP dependencies
composer install

# Start the dev server
php artisan serve --port=8000
# Starts on http://localhost:8000
```

### Terminal 4 — Mobile (optional)

```bash
cd apps/mobile
pnpm dev
# Opens Expo CLI with QR code
```

To run on a simulator:
```bash
pnpm ios      # requires Xcode (macOS only)
pnpm android  # requires Android Studio
```

To run on a physical device: install Expo Go from the App Store / Play Store, then scan the QR code.

---

## Step 7 — Verify Everything Is Running

```bash
# API health
curl http://localhost:3001/health
# → {"status":"ok","ts":"..."}

# Web app
open http://localhost:3000

# Admin panel
open http://localhost:8000

# Admin panel password: whatever ADMIN_PANEL_PASSWORD is set to in apps/admin-laravel/.env
# Default for local: not set in .env.example — check with your team
```

---

## Step 8 — Using the Firebase Emulator (Alternative to Real Firebase)

If you don't have Firebase credentials yet, use the emulator:

```bash
# One-time setup
firebase login
firebase use gada-vn-dev   # or your dev project

# Start emulators (auth + firestore)
firebase emulators:start --only auth

# In a new terminal, set this env var before starting the API:
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

Then update `.env.local`:
```dotenv
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

The emulator provides a local auth UI at `http://localhost:4000` where you can create test users and phone numbers.

---

## Turbo Dev (All Apps at Once)

To start all Node.js apps together using Turborepo:

```bash
# From repo root — starts all apps with a `dev` script in parallel
pnpm dev
```

This runs `apps/api`, `apps/web-next` concurrently. Laravel (`apps/admin-laravel`) must still be started separately since it is not in the pnpm workspace dev pipeline.

> **Note**: `pnpm dev` from the root is convenient but mixes all log output. For active development on one app, use separate terminals.

---

## Typical Daily Workflow

```bash
# 1. Pull latest changes
git pull

# 2. Install any new dependencies
pnpm install

# 3. Rebuild packages if core types changed
pnpm build --filter @gada-vn/core

# 4. Run new migrations (if any)
pnpm db:migrate

# 5. Start services (if not already running)
docker compose up postgres redis -d

# 6. Start your target app
cd apps/api && pnpm dev        # or
cd apps/web-next && pnpm dev   # or
pnpm dev                       # all at once from root
```

---

## Running Tests

```bash
# All tests (requires running postgres for API tests)
pnpm test

# API tests only
pnpm --filter @gada-vn/api test

# API tests with coverage
pnpm --filter @gada-vn/api test -- --coverage

# Watch mode
pnpm --filter @gada-vn/api test -- --watch
```

API tests require a running PostgreSQL. The test suite uses a separate test database automatically when `NODE_ENV=test` is set.

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Next.js Web | 3000 | http://localhost:3000 |
| NestJS API | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | `postgresql://gadaadmin:localpassword@localhost:5432/gada_vn` |
| Redis | 6379 | `redis://localhost:6379` |
| Laravel Admin | 8000 | http://localhost:8000 |
| PHP Admin Shell | 8080 | http://localhost:8080 |
| Firebase Auth Emulator | 9099 | http://localhost:9099 |
| Firebase Emulator UI | 4000 | http://localhost:4000 |

---

## Stopping Everything

```bash
# Stop Docker services
docker compose down

# To also remove all data (volumes)
docker compose down -v
```

Press `Ctrl+C` in each terminal running an app to stop it.
