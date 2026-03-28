# GADA VN

Vietnamese construction worker marketplace platform — connecting workers, managers, and employers across Vietnam.

---

## Repository Structure

```
gada-vn/
├── apps/
│   ├── web-next/          # Public website + authenticated web app (Next.js)
│   ├── admin-laravel/     # Back-office admin panel + REST API (Laravel)
│   └── mobile-shell/      # Mobile app shell (Capacitor wrapping web-next)
│
├── packages/
│   ├── ui/                # Shared component library (React, Tailwind)
│   ├── config/            # Shared config: ESLint, Prettier, Tailwind base, tsconfig
│   ├── i18n/              # Translation files and i18n utilities (ko / vi / en)
│   └── types/             # Shared TypeScript types and domain interfaces
│
├── infra/
│   └── terraform/         # AWS infrastructure as code (Terraform)
│
└── docs/
    ├── prd/               # Product requirements documents
    ├── architecture/      # System and data architecture diagrams + ADRs
    ├── api/               # API specifications (OpenAPI / Swagger)
    ├── figma/             # Figma links and exported design assets
    └── qa/                # Test plans, QA checklists, UAT documents
```

---

## Architecture Overview

```
                        ┌─────────────────────────────────────────────┐
                        │               AWS (ap-southeast-1)          │
                        │                                             │
  ┌──────────┐   HTTPS  │  ┌──────────────┐    ┌───────────────────┐ │
  │  Mobile  │──────────┼─▶│  CloudFront  │───▶│  web-next (ECS)   │ │
  │  (iOS /  │          │  │  + WAF       │    │  Next.js 15       │ │
  │  Android)│          │  └──────────────┘    └─────────┬─────────┘ │
  └──────────┘          │                                │           │
        ▲               │  ┌──────────────┐    ┌─────────▼─────────┐ │
        │ Capacitor      │  │  S3 (assets) │    │ admin-laravel     │ │
  ┌──────────┐          │  │  + CDN       │    │ (ECS)             │ │
  │  Browser │          │  └──────────────┘    │ REST API + Admin  │ │
  │  (PWA)   │          │                      └─────────┬─────────┘ │
  └──────────┘          │                                │           │
                        │              ┌─────────────────┼──────────┐│
                        │              │                 │          ││
                        │  ┌───────────▼──┐  ┌──────────▼───────┐  ││
                        │  │  PostgreSQL  │  │  Redis           │  ││
                        │  │  (RDS 16)    │  │  (ElastiCache)   │  ││
                        │  └─────────────┘  └──────────────────┘  ││
                        │                                          ││
                        └──────────────────────────────────────────┘│
                                                                     │
  ┌──────────────────────────────────────────────────────────────────┘
  │  External Services
  │  ├── Firebase Auth  — phone OTP + Facebook social login
  │  └── AWS SES        — transactional email
```

**Key architectural decisions:**

- **Laravel as the single API layer.** All business logic and REST endpoints live in `admin-laravel`. `web-next` calls Laravel for data; the admin UI is also served from Laravel (Blade/Inertia).
- **Next.js for the user-facing surface.** Public job listings (SEO/SSG), authenticated worker/manager dashboards (SSR), and PWA manifest all live in `web-next`.
- **Capacitor as the mobile shell.** `mobile-shell` wraps the `web-next` PWA into native iOS and Android apps via Capacitor. No separate React Native codebase.
- **Shared packages.** `packages/ui`, `packages/types`, `packages/i18n`, and `packages/config` are consumed by `web-next` (and optionally `mobile-shell`). Laravel has its own PHP types.
- **Terraform for infrastructure.** All AWS resources (VPC, RDS, ElastiCache, ECS, S3, CloudFront, Route53, SES, Secrets Manager) are defined in `infra/terraform/`.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Public web + app | Next.js 15 (App Router, SSR/SSG/ISR) |
| Admin panel + API | Laravel 11 (REST API + Blade admin) |
| Mobile | Capacitor 6 (iOS + Android shell over web-next) |
| Database | PostgreSQL 16 (AWS RDS), PostGIS extension |
| Cache / Queue | Redis 7 (AWS ElastiCache) |
| Authentication | Firebase Auth — phone OTP + Facebook login |
| File storage | AWS S3 + CloudFront (WebP conversion via Lambda) |
| Infrastructure | Terraform, AWS ap-southeast-1 (Singapore) |
| CI/CD | GitHub Actions |
| Monorepo tooling | pnpm workspaces + Turborepo |

---

## Languages / i18n

| Code | Language | Status |
|---|---|---|
| `ko` | Korean | Default (internal / admin) |
| `vi` | Vietnamese | Primary user-facing language |
| `en` | English | Secondary user-facing language |

Translation files live in `packages/i18n/`. `web-next` loads them via `next-intl`.

---

## Database Schemas

| Schema | Purpose |
|---|---|
| `auth` | Firebase UID mapping, sessions |
| `app` | Workers, managers, jobs, contracts, attendance |
| `ref` | Reference data: trades, provinces, skill levels |
| `ops` | Notifications, FCM tokens, audit logs |

Migrations are managed by Laravel (`admin-laravel/database/migrations/`).

---

## Local Development

```bash
# Prerequisites: Docker, pnpm >= 9, PHP 8.2 + Composer, Node.js 20

# 1. Start infrastructure
docker compose up -d          # PostgreSQL + Redis

# 2. Install dependencies
pnpm install                  # JS workspaces (web-next, packages/*)
cd apps/admin-laravel && composer install

# 3. Environment
cp .env.example .env.local    # fill Firebase + AWS keys
cd apps/admin-laravel && cp .env.example .env

# 4. Database
cd apps/admin-laravel && php artisan migrate --seed

# 5. Run
pnpm dev                      # starts web-next (localhost:3000)
cd apps/admin-laravel && php artisan serve   # localhost:8000
```

---

## Key Conventions

- **Money**: `NUMERIC` column type, VND stored as integer (never FLOAT)
- **Timestamps**: `TIMESTAMPTZ` stored UTC; displayed in `Asia/Ho_Chi_Minh`
- **S3 keys** stored in DB; CloudFront URLs computed at runtime (never persist CDN URLs)
- **i18n keys**: `snake_case`, grouped by feature — e.g. `jobs.apply_button`
- **API responses**: `{ statusCode, data, meta? }`
- **Secrets**: local `.env.local` only; production via AWS Secrets Manager

---

## Documentation

| Folder | Contents |
|---|---|
| `docs/prd/` | Product requirements, user stories, feature specs |
| `docs/architecture/` | System diagrams, data models, Architecture Decision Records (ADRs) |
| `docs/api/` | OpenAPI specs, Postman collections |
| `docs/figma/` | Figma file links, exported design tokens, screen inventories |
| `docs/qa/` | Test plans, QA checklists, UAT sign-off templates |
