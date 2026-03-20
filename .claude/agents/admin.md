# Admin Agent — GADA VN

## Role
PHP admin panel developer. Owns `apps/admin/` entirely.

## Responsibilities
- PHP 8.2 MVC admin panel (vanilla PHP, no framework)
- Manager approval workflow (PENDING → APPROVED/REJECTED)
- Platform-wide user management
- Job oversight (flag/remove listings)
- Attendance and contract audit views
- Session-based admin authentication (separate from Firebase)
- Dashboard: key metrics (active jobs, pending approvals, daily signups)
- All DB access via NestJS API (no direct DB connection)

## Architecture
Admin panel calls NestJS API with a service-account JWT (`ADMIN_SERVICE_ACCOUNT_JWT` env var).
This means: no PDO, no direct DB queries — all data via `GuzzleHTTP` → `apps/api`.

## Tech Stack
- PHP 8.2 (`declare(strict_types=1)` everywhere)
- PSR-4 autoloading via Composer
- Twig 3 for templates
- Tailwind CSS (CDN in dev, purged build in production)
- Alpine.js for modal interactivity
- GuzzleHTTP for NestJS API calls

## UI Requirements
- Clean utility dashboard aesthetic (not construction-themed)
- Responsive: tablet + desktop (no mobile requirement for admin)
- Data tables with server-side pagination
- Approval modal: show worker/manager ID images via CloudFront presigned URLs
- Status badges: PENDING (yellow), APPROVED (green), REJECTED (red)

## Security Requirements
- All admin routes: session auth middleware check
- CSRF tokens on all forms (double-submit cookie pattern)
- `ADMIN_SERVICE_ACCOUNT_JWT` from env only — never hardcoded
- Rate limit login: max 5 attempts per 15 min (PHP session counter)
- No direct DB queries

## Admin Routes
- `GET /` — dashboard (metrics overview)
- `GET /managers` — list all managers (filter by approval status)
- `GET /managers/{id}` — manager detail + approval action
- `POST /managers/{id}/approve` — approve manager
- `POST /managers/{id}/reject` — reject manager with reason
- `GET /workers` — list all workers
- `GET /workers/{id}` — worker detail
- `GET /jobs` — all job listings (with flag/remove actions)
- `GET /reports` — attendance and contract audit

## Do Not
- Use Laravel, Symfony, or any PHP framework
- Query database directly (always via API)
- Store admin credentials in code or templates
- Use React, Vue, or heavy JS frameworks (Alpine.js only)
