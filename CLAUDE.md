# GADA VN — Root Agent Orchestration Context

## Project
Vietnamese construction worker marketplace platform (베트남 건설 근로자 매칭 플랫폼).
Monorepo at `/Users/leewonyuep/gada-vn` — pnpm + Turborepo.

## Stack
| Layer | Tech |
|-------|------|
| Mobile | React Native, Expo SDK 51, Expo Router v3 |
| Web | Next.js 15 (app router, SSR/SSG) |
| API | NestJS 10, node-postgres (pg), Firebase Admin SDK |
| Admin | PHP 8.2, Twig 3, Guzzle, Alpine.js |
| DB | PostgreSQL 16 + PostGIS extension |
| Cache | Redis 7 (ElastiCache) |
| Auth | Firebase (phone OTP + Facebook social login) |
| i18n | next-intl (web), react-i18next (mobile) — default: Korean (ko) |
| Storage | AWS S3 + CloudFront + Lambda/Sharp (WebP) |
| IaC | AWS CDK TypeScript, ap-southeast-1 |

## Agent Team (6 Agents)
See `.claude/agents/` for each agent's detailed CLAUDE.md:
- `lead.md` — Architect/orchestrator (owns types, OpenAPI, CI, cross-cutting PRs)
- `frontend.md` — Mobile app (apps/mobile/)
- `web.md` — Web/SEO (apps/web/)
- `backend.md` — NestJS API + DB (apps/api/, packages/db/)
- `devops.md` — AWS CDK + CI/CD (infra/, .github/)
- `admin.md` — PHP admin panel (apps/admin/)

## Critical Conventions
- **pnpm only** (never npm or yarn)
- **node-postgres raw SQL** — no ORM, no Prisma, no TypeORM, no Knex
- **Firebase UID** is the source of truth for user identity
- **Money**: `NUMERIC` type, VND as integer (never FLOAT)
- **Timestamps**: `TIMESTAMPTZ` stored UTC; display in `Asia/Ho_Chi_Minh`
- **S3 keys** stored in DB; CloudFront URLs computed at runtime (never store CDN URLs)
- **i18n keys**: `snake_case` grouped by feature (e.g., `jobs.apply_button`)
- All API responses wrapped: `{ statusCode, data, meta? }`

## Cross-Agent Contracts
- Shared TypeScript types → `packages/core/src/types/` (Lead Agent owns — do not modify without Lead review)
- API contract → `apps/api/openapi.yaml` (Lead Agent owns)
- DB migrations → `packages/db/migrations/` — sequential numbered SQL files (Backend Agent owns)
- Blockers between agents → GitHub Issues labeled `agent-blocker`

## DB Schemas
- `auth` — user identity (firebase_uid mapping)
- `app` — business entities (workers, managers, jobs, contracts, attendance)
- `ref` — reference/lookup data (trades, provinces)
- `ops` — operational (notifications, FCM tokens)

## Environment
- Copy `.env.example` → `.env.local` and fill in real values
- Never commit `.env.local` or any file with secrets
- Production secrets in AWS Secrets Manager only
