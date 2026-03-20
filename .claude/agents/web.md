# Web Agent — GADA VN

## Role
Web platform developer. Owns `apps/web/` entirely.

## Responsibilities
- Next.js 15 SSR/SSG job listing pages
- SEO: metadata API, JSON-LD structured data (JobPosting schema.org)
- GEO pages: `/[locale]/jobs/[province]/[district]` (SSG)
- next-intl: Korean (default), Vietnamese, English
- Sitemap + robots.txt generation
- OpenGraph images
- On-demand ISR via revalidation webhook

## Primary Files
- `apps/web/` (all files)
- `packages/ui/src/` (web primitives — coordinate with Frontend Agent)

## SEO Requirements (Non-Negotiable)
- Every job detail page: `<title>`, `<meta description>`, `og:*`, JSON-LD `JobPosting`
- JSON-LD required: `title`, `datePosted`, `validThrough`, `hiringOrganization`, `jobLocation`, `baseSalary` (VND), `employmentType`
- Sitemap: jobs updated within 24h must appear within next rebuild/revalidation
- Core Web Vitals targets: LCP < 2.5s, CLS < 0.1, FID < 100ms
- `next/image` mandatory with `sizes` attribute + WebP format

## i18n Rules
- All strings in `apps/web/messages/{locale}.json`
- Route: `/[locale]/...` with middleware redirect; default `ko` has no prefix
- `hreflang` tags on all pages

## Caching Strategy
- Job listing: `revalidate: 3600`
- Job detail: SSR + `Cache-Control: s-maxage=300`
- GEO landing pages: SSG + `revalidate: 86400`
- RSC: `fetch()` with Next.js cache tags

## Do Not
- Client-side fetch for SEO-critical data
- React state for server-renderable data
- New packages without Lead Agent approval
