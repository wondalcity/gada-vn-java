# Frontend Architecture — GADA VN Web

**Last updated**: 2026-03-21
**App**: `apps/web-next/`
**Tech**: Next.js 15.2, React 19, next-intl 3.26, TypeScript 5, Tailwind CSS 3

---

## 1. Overview

### Purpose

The GADA VN web application serves two primary audiences:

1. **Vietnamese construction workers** — discover jobs, apply, sign contracts, track attendance
2. **Site managers / construction companies** — post jobs, review applicants, manage worksites, record attendance

The web app is also the primary SEO surface for the platform. Job listing pages, job detail pages, province GEO pages, and site detail pages are indexed by search engines (primarily Naver for Korean users, Google for Vietnamese/international).

### Tech Choices Rationale

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Web framework | Next.js 15 App Router | SSR/ISR for public SEO pages; React Server Components reduce JS sent to client |
| Auth | Firebase client SDK | Phone OTP (primary Vietnamese users) + Facebook social login; Firebase handles SMS gateway complexity |
| i18n | next-intl | First-class App Router support; server-side translations without client hydration overhead |
| Mobile shell | Capacitor (planned) | Wraps the Next.js web app in a native container; avoids maintaining separate React Native + web codebases for authenticated app flows |
| Styling | Tailwind CSS | Utility-first; shared design token system via `packages/ui/tokens.json` |
| State management | Zustand | Lightweight; used only for client-side UI state in `(app)` routes |
| Forms | react-hook-form + Zod | Type-safe validation with server action integration |
| API integration | Custom fetch wrapper (`lib/api/client.ts`) | Thin abstraction over native fetch; leverages Next.js extended fetch (cache tags, revalidation) |

---

## 2. Directory Structure

```
apps/web-next/
├── next.config.ts                  # Next.js config: next-intl plugin, image domains, headers
├── tailwind.config.ts              # Tailwind config (extends packages/ui/tokens.json)
├── tsconfig.json                   # TypeScript config (path aliases)
├── package.json                    # Dependencies (@gada/ui, @gada/types, @gada/i18n, etc.)
│
└── src/
    ├── middleware.ts               # Auth guard + next-intl routing middleware
    │
    ├── i18n/
    │   ├── routing.ts              # defineRouting: locales, defaultLocale, localePrefix
    │   └── request.ts              # getRequestConfig: loads locale messages from packages/i18n
    │
    ├── app/
    │   ├── layout.tsx              # Root layout (html/body, no locale context yet)
    │   ├── sitemap.ts              # Dynamic sitemap generator
    │   ├── robots.ts               # robots.txt: disallows /worker/, /manager/
    │   │
    │   └── [locale]/               # Locale route segment (ko | vi | en)
    │       ├── layout.tsx          # Locale layout: NextIntlClientProvider, fonts, analytics
    │       ├── page.tsx            # Landing page (SSG)
    │       │
    │       ├── (public)/           # Route group: no auth required, SSR/ISR
    │       │   ├── layout.tsx      # Public layout: Navbar + Footer
    │       │   ├── jobs/
    │       │   │   ├── page.tsx            # Job listing (ISR 60s)
    │       │   │   ├── [slug]/
    │       │   │   │   └── page.tsx        # Job detail (SSR force-dynamic)
    │       │   │   └── [province]/
    │       │   │       └── page.tsx        # Province GEO page (ISR 60s, generateStaticParams)
    │       │   ├── sites/
    │       │   │   └── [slug]/
    │       │   │       └── page.tsx        # Site detail (SSR force-dynamic)
    │       │   ├── login/
    │       │   │   └── page.tsx            # Firebase OTP/password login (CSR)
    │       │   └── register/
    │       │       └── page.tsx            # Registration (CSR)
    │       │
    │       └── (app)/              # Route group: auth-gated, CSR
    │           ├── layout.tsx      # App layout: auth check, app shell nav
    │           ├── worker/         # Worker-role routes
    │           │   ├── page.tsx                    # Worker home dashboard
    │           │   ├── notifications/
    │           │   │   └── page.tsx                # Notification list
    │           │   ├── applications/
    │           │   │   ├── page.tsx                # Application list
    │           │   │   └── [id]/page.tsx           # Application detail
    │           │   ├── contracts/
    │           │   │   └── [id]/page.tsx           # Contract detail + signature
    │           │   └── profile/
    │           │       ├── page.tsx                # Profile edit
    │           │       ├── id-upload/page.tsx      # ID document upload
    │           │       └── signature/page.tsx      # Signature canvas
    │           └── manager/        # Manager-role routes (requires managerStatus=approved)
    │               ├── page.tsx                    # Manager dashboard
    │               ├── profile/page.tsx            # Manager registration status
    │               ├── sites/
    │               │   ├── page.tsx                # Site list
    │               │   ├── new/page.tsx            # Create site
    │               │   └── [siteId]/
    │               │       ├── page.tsx            # Site detail/edit
    │               │       └── jobs/
    │               │           ├── page.tsx        # Jobs for site
    │               │           └── new/page.tsx    # Create job
    │               └── jobs/
    │                   └── [jobId]/
    │                       ├── page.tsx            # Job detail + applicants
    │                       ├── applicants/page.tsx # Applicant management
    │                       └── attendance/page.tsx # Attendance sheet
    │
    ├── components/                 # Shared UI components (app-specific)
    │   └── navigation.tsx          # Top navigation bar
    │
    └── lib/
        ├── api/
        │   ├── client.ts           # apiClient<T>() fetch wrapper + ApiError class
        │   ├── public.ts           # Server-side public fetchers (no auth, cache tags)
        │   ├── worker.ts           # Authenticated worker API calls
        │   └── manager.ts          # Authenticated manager API calls
        ├── auth/
        │   └── server.ts           # getAuthUser() — reads gada_session cookie → GET /me
        └── seo/
            └── jsonld.ts           # JSON-LD builders: JobPosting, Place, ItemList
```

---

## 3. Routing Strategy

### Locale Segment

All routes live under `app/[locale]/`. The `localePrefix: 'always'` option in `routing.ts` means every URL includes the locale explicitly:

```
https://gada.vn/ko/jobs          Korean
https://gada.vn/vi/jobs          Vietnamese
https://gada.vn/en/jobs          English
```

There is no locale-free URL — `/jobs` redirects to `/ko/jobs` (the default locale). This ensures every URL is canonical and crawler-friendly with explicit language signals.

### Route Groups

Two route groups under `[locale]/`:

**`(public)/`** — No authentication required. Accessible to all users including crawlers. Pages use SSG, ISR, or SSR depending on data freshness requirements. The public layout renders a navbar with login/register CTAs.

**`(app)/`** — Authentication required. The layout reads the `gada_session` cookie via `getAuthUser()`. If the session is absent or invalid, the layout redirects to `/${locale}/login?redirect=...`. All pages in this group are rendered client-side (CSR) using SWR or server actions to keep them dynamic without adding SSR complexity.

### Full Route Table

| Name | Path | Access | Render Mode | Description |
|------|------|--------|-------------|-------------|
| Landing | `/[locale]` | Public | SSG | Home with job count stats, province grid, feature highlights |
| Job Listing | `/[locale]/jobs` | Public | ISR 60s | Filter by province/trade/date; paginated |
| Job Detail | `/[locale]/jobs/[slug]` | Public | SSR (force-dynamic) | Full job detail with JSON-LD JobPosting schema |
| Province Jobs | `/[locale]/jobs/[province]` | Public | ISR 60s | GEO SEO page per province; `generateStaticParams` |
| Site Detail | `/[locale]/sites/[slug]` | Public | SSR (force-dynamic) | Site info + open jobs; JSON-LD Place schema |
| Login | `/[locale]/login` | Guest-only | CSR | Firebase phone OTP or email/password |
| Register | `/[locale]/register` | Guest-only | CSR | Complete profile after Firebase auth |
| Worker Home | `/[locale]/worker` | Auth | CSR | Dashboard: pending contracts, active jobs |
| Worker Profile | `/[locale]/worker/profile` | Auth | CSR | Edit name, email, experience |
| Worker Profile — ID | `/[locale]/worker/profile/id-upload` | Auth | CSR | Upload ID document front/back via Camera plugin |
| Worker Profile — Signature | `/[locale]/worker/profile/signature` | Auth | CSR | Draw and save signature |
| Worker Applications | `/[locale]/worker/applications` | Auth | CSR | Application list with status |
| Worker Application Detail | `/[locale]/worker/applications/[id]` | Auth | CSR | Detail view, withdraw option |
| Worker Contracts | `/[locale]/worker/contracts` | Auth | CSR | Contracts awaiting signature |
| Worker Contract Detail | `/[locale]/worker/contracts/[id]` | Auth | CSR | Contract content + sign with saved signature |
| Worker Notifications | `/[locale]/worker/notifications` | Auth | CSR | Notification list with mark-read |
| Manager Home | `/[locale]/manager` | Auth + Manager | CSR | Dashboard: total workers, open jobs, pending applicants |
| Manager Sites | `/[locale]/manager/sites` | Auth + Manager | CSR | Site list |
| Manager Site New | `/[locale]/manager/sites/new` | Auth + Manager | CSR | Create new site |
| Manager Site Detail | `/[locale]/manager/sites/[siteId]` | Auth + Manager | CSR | Edit site details |
| Manager Site Jobs | `/[locale]/manager/sites/[siteId]/jobs` | Auth + Manager | CSR | Jobs for a specific site |
| Manager Site Job New | `/[locale]/manager/sites/[siteId]/jobs/new` | Auth + Manager | CSR | Create job for site |
| Manager Job Detail | `/[locale]/manager/jobs/[jobId]` | Auth + Manager | CSR | Job detail, applicant summary |
| Manager Applicants | `/[locale]/manager/jobs/[jobId]/applicants` | Auth + Manager | CSR | Review and accept/reject applicants |
| Manager Attendance | `/[locale]/manager/jobs/[jobId]/attendance` | Auth + Manager | CSR | Daily attendance sheet |
| Manager Profile | `/[locale]/manager/profile` | Auth + Manager | CSR | Business registration + approval status |

---

## 4. Rendering Modes

### Public Job Listing — ISR (revalidate: 60s)

`app/[locale]/(public)/jobs/page.tsx` is rendered server-side with ISR. The page fetches from `GET /public/jobs` via `lib/api/public.ts` using `next: { revalidate: 60 }`. This means Next.js serves a cached HTML response and regenerates it in the background at most every 60 seconds, keeping crawler-visible content fresh without hitting the API on every request.

Filter parameters (`province`, `trade`, `date`, `page`) are passed as search params. Each unique combination of query params generates its own ISR cache entry.

### Job Detail — SSR (force-dynamic)

`app/[locale]/(public)/jobs/[slug]/page.tsx` uses `export const dynamic = 'force-dynamic'`. Job availability changes frequently — a job may close between crawls. SSR ensures the page always reflects the real-time state from `GET /public/jobs/{slug}`. This also guarantees the JSON-LD `validThrough` field is never stale in search results.

### Province GEO Pages — generateStaticParams + ISR

`app/[locale]/(public)/jobs/[province]/page.tsx` calls `generateStaticParams()` at build time to pre-render a page for each of Vietnam's 63 provinces across all 3 locales (63 × 3 = 189 pages). Each page is then maintained as ISR (revalidate: 60s), meaning on-demand regeneration keeps the job count and listing current.

The province slug is the province's URL-safe name (e.g., `ho-chi-minh`, `ha-noi`). This creates targeted SEO pages matching queries like "hà nội 건설 일자리".

### Site Detail — SSR (force-dynamic)

`app/[locale]/(public)/sites/[slug]/page.tsx` uses `force-dynamic` because site data (open jobs, manager info) changes without a predictable schedule. The JSON-LD `Place` schema is injected server-side.

### App Pages (Worker / Manager) — CSR with SWR / Server Actions

All pages under `(app)/` are client-side rendered. The layout does a single server-side auth check (`getAuthUser()`) to prevent unauthenticated renders, then the page components fetch their data from the API using authenticated fetch calls. There is no static generation or ISR for authenticated pages — the data is user-specific and cannot be shared across requests.

Data fetching uses SWR for read operations (with `fetcher` using `lib/api/worker.ts` or `lib/api/manager.ts`) and Next.js Server Actions for mutations (form submissions, status changes, file uploads).

### Sitemap — Dynamic Generation

`app/sitemap.ts` is a Next.js route that returns `MetadataRoute.Sitemap`. It includes:
- Static routes (landing, job listing) for all 3 locales
- Dynamic job slugs fetched from `GET /public/jobs/slugs` (all active jobs)
- Province GEO pages for all 63 provinces × 3 locales
- Site pages for all active sites

The sitemap is regenerated on each deployment and cached by the CDN.

---

## 5. i18n Architecture

### Package Structure

Translations live in the shared package `packages/i18n/`, separate from the Next.js app, so they can be consumed by future apps (e.g., the mobile app if it migrates from `react-i18next` to a shared format).

```
packages/i18n/
├── package.json              # name: @gada/i18n
├── index.ts                  # Re-exports: Locale, Namespace types, locales/namespaces arrays
└── locales/
    ├── ko/                   # Korean (default locale)
    │   ├── index.ts          # Barrel: merges all namespaces for next-intl
    │   ├── common.json       # Shared UI strings: nav, buttons, status labels, errors
    │   ├── auth.json         # Login, register, OTP flows
    │   ├── jobs.json         # Job listing, detail, province, apply
    │   ├── worker.json       # Worker dashboard, profile, applications, contracts
    │   ├── manager.json      # Manager dashboard, sites, applicants, attendance
    │   ├── landing.json      # Landing page: hero, stats, features, footer
    │   ├── notifications.json # Notification types and labels
    │   └── validation.json   # Form validation messages
    ├── vi/                   # Vietnamese
    │   └── (same 7 files)
    └── en/                   # English
        └── (same 7 files)
```

### Namespaces

| Namespace | Purpose |
|-----------|---------|
| `common` | App name, nav links, buttons, status labels, generic errors, pagination |
| `auth` | Login (phone/email tabs), register form, OTP flow |
| `jobs` | Job listing filters, job detail labels, province pages, apply flow |
| `worker` | Worker home, profile (ID upload, signature), applications, contracts |
| `manager` | Manager home, business registration, sites, jobs, applicants, attendance |
| `landing` | Hero section, stats counters, features, province grid, footer links |
| `notifications` | Notification type templates with interpolation |
| `validation` | Form field validation error messages |

### next-intl Usage

**Server Components** use `getTranslations()` from `next-intl/server`:

```typescript
import { getTranslations } from 'next-intl/server'

// In a page or layout Server Component:
const t = await getTranslations('jobs')
const heading = t('listing.heading')
```

**Client Components** use `useTranslations()` from `next-intl`:

```typescript
'use client'
import { useTranslations } from 'next-intl'

export function ApplyButton() {
  const t = useTranslations('jobs')
  return <button>{t('detail.apply')}</button>
}
```

**Interpolation** uses `{{variable}}` syntax in JSON values:

```typescript
t('detail.wage', { amount: '500,000' })  // "일당 500,000 VND"
```

### Message Loading

`i18n/request.ts` loads the locale messages for each request:

```typescript
messages: (await import(`../../../packages/i18n/locales/${locale}/index.ts`)).default
```

Each locale's `index.ts` is a barrel file that merges all namespaces into a single flat object for next-intl:

```typescript
// packages/i18n/locales/ko/index.ts
import common from './common.json'
import auth from './auth.json'
// ... etc
export default { common, auth, jobs, worker, manager, landing, notifications, validation }
```

### Fallback Chain

1. Requested locale (from URL segment)
2. Default locale `ko` (if requested locale messages are missing)
3. Raw translation key (if even `ko` is missing — visible as a bug signal in development)

### Locale Detection (Public Pages Only)

For the landing page and job listing page, the locale is determined solely by the URL segment (`[locale]`). There is no automatic `Accept-Language` detection that redirects users — users must explicitly select a locale. The `?locale=` query param is not used for routing; it is only passed to the API for translated content (job titles, province names) in the appropriate language.

---

## 6. Auth Architecture

### Flow Overview

```
User submits phone OTP
        ↓
Firebase SDK verifies OTP
        ↓
firebase.auth().currentUser.getIdToken()
        ↓
POST /api/v1/auth/session  (NestJS)
  [Backend verifies ID token via Firebase Admin SDK]
  [Backend upserts user in auth.users table]
  [Backend returns opaque session token]
        ↓
Client stores token in httpOnly cookie: gada_session
        ↓
All subsequent requests include the cookie automatically
```

### Firebase Client SDK

Firebase is initialized once in `lib/firebase/client.ts` (client-only, guarded by `typeof window !== 'undefined'`). Phone authentication uses `signInWithPhoneNumber()` with `RecaptchaVerifier`. Facebook login uses `signInWithPopup()` with `FacebookAuthProvider`.

After successful Firebase sign-in, the client calls `currentUser.getIdToken()` to obtain a short-lived JWT (expires in 1 hour), then exchanges it at the backend `/auth/session` endpoint for a longer-lived opaque session token stored in a server-set httpOnly cookie.

### middleware.ts — Cookie Check and Redirect Logic

The middleware runs on every request (except `_next/` and static assets). It checks for the `gada_session` cookie:

- **Authenticated user hits guest-only route** (`/login`, `/register`): redirect to `/${locale}/worker`
- **Unauthenticated user hits protected route** (`/worker/*`, `/manager/*`): redirect to `/${locale}/login?redirect=${pathname}`
- **All other cases**: pass through to `handleI18nRouting(request)` for locale handling

The middleware does **not** validate the session token (no network call). Token validation happens in `getAuthUser()` when a protected page server-renders.

### lib/auth/server.ts — getAuthUser()

`getAuthUser()` reads the `gada_session` cookie from the Next.js cookies store and calls `GET /api/v1/me` with the token in the `Authorization: Bearer` header. The response is the `AuthUser` object including `roles` and `managerStatus`.

If the token is invalid or expired, `apiClient` throws an `ApiError` with status 401, which `getAuthUser()` catches and returns `null`. The calling layout then redirects to login.

### Session Refresh Strategy

Firebase ID tokens expire after 1 hour. The opaque session token issued by the backend has a configurable TTL (default: 30 days). The refresh flow:

1. On client mount in authenticated pages, a background effect checks if the Firebase user token is close to expiry (< 5 minutes remaining)
2. If expiring, calls `currentUser.getIdToken(true)` to force refresh
3. Exchanges the new ID token for a refreshed session cookie via `POST /api/v1/auth/session/refresh`
4. The server updates the httpOnly cookie in-place

This keeps sessions alive without requiring re-login for active users.

---

## 7. API Integration

### lib/api/client.ts — apiClient

The base fetch wrapper reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1`). It:

1. Merges `Content-Type: application/json` and optional `Authorization: Bearer {token}` headers
2. Passes through any additional `RequestInit` options (including Next.js-extended `next.revalidate` / `next.tags` / `cache`)
3. On non-OK response, parses the error JSON and throws `ApiError(status, message, errors?)`
4. On success, unwraps `json.data` — the API wraps all responses in `{ statusCode, data, meta? }`

### lib/api/public.ts — Server-Side Public Fetchers

These functions run only on the server (in page Server Components or `generateStaticParams`). They use the extended Next.js fetch options for caching:

| Function | Cache Strategy | Revalidation |
|----------|---------------|--------------|
| `fetchPublicJobs()` | `next: { revalidate: 60 }` | 60 seconds |
| `fetchPublicJobBySlug()` | `cache: 'no-store'` | Never (SSR always fresh) |
| `fetchPublicSiteBySlug()` | `cache: 'no-store'` | Never (SSR always fresh) |
| `fetchProvinces()` | `next: { revalidate: 86400 }` | 24 hours |
| `fetchTrades()` | `next: { revalidate: 86400 }` | 24 hours |

Cache tags (e.g., `next: { tags: ['jobs-listing'] }`) are added to enable on-demand revalidation via `revalidateTag()` when the backend triggers a webhook or admin action.

**Planned cache tags:**

| Tag | Used By | Invalidated When |
|-----|---------|-----------------|
| `jobs-listing` | Job listing pages | Job created/closed |
| `job-{slug}` | Job detail page | Job updated |
| `site-{slug}` | Site detail page | Site updated |
| `provinces` | Province pages, filters | Never (static reference data) |

### lib/api/worker.ts — Authenticated Worker Calls

Worker API calls pass the `gada_session` token from cookies. These run both server-side (in layout auth checks) and client-side (in SWR fetchers):

```typescript
export async function applyToJob(jobId: string, token: string) {
  return apiClient(`/worker/jobs/${jobId}/apply`, { method: 'POST', token })
}
```

### lib/api/manager.ts — Authenticated Manager Calls

Manager calls follow the same pattern but target `/manager/*` endpoints. The manager role is enforced both in the frontend (layout checks `user.managerStatus === 'approved'`) and in the NestJS API (role guard on the controller).

---

## 8. SEO Architecture

### generateMetadata()

Every public page exports `generateMetadata()`. For dynamic pages it receives `params` and `searchParams`:

```typescript
export async function generateMetadata({ params }: { params: { locale: string; slug: string } }) {
  const job = await fetchPublicJobBySlug(params.slug, params.locale)
  return {
    title: `${job.title} | GADA VN`,
    description: job.summary,
    openGraph: {
      title: job.title,
      description: job.summary,
      images: [{ url: job.ogImageUrl ?? 'https://cdn.gada.vn/og/default.png' }],
    },
    alternates: {
      canonical: `https://gada.vn/${params.locale}/jobs/${params.slug}`,
      languages: {
        'ko': `https://gada.vn/ko/jobs/${params.slug}`,
        'vi': `https://gada.vn/vi/jobs/${params.slug}`,
        'en': `https://gada.vn/en/jobs/${params.slug}`,
      },
    },
  }
}
```

The `alternates.languages` map generates `<link rel="alternate" hreflang="...">` tags, which are critical for multilingual SEO. All three locale variants of each page reference each other.

### lib/seo/jsonld.ts — JSON-LD Builders

Three builders are exported:

| Function | Schema Type | Used On |
|----------|-------------|---------|
| `buildJobPostingJsonLd(job, locale)` | `schema:JobPosting` | Job detail pages |
| `buildSiteJsonLd(site, locale)` | `schema:Place` | Site detail pages |
| `buildJobListingJsonLd(jobs, locale)` | `schema:ItemList` | Job listing page |

JSON-LD is injected into pages via a `<script type="application/ld+json">` tag in the page component using Next.js metadata or a dedicated `<JsonLd>` client component.

Key fields in `JobPosting`:
- `datePosted`, `validThrough` — for freshness signals in Google Jobs
- `baseSalary` in VND — helps Google Jobs filter by compensation
- `jobLocation` with `GeoCoordinates` when site coordinates are available
- `employmentType: TEMPORARY` — accurate for short-term construction placements

### app/sitemap.ts — Dynamic Sitemap

The sitemap includes:
- Landing pages: all 3 locales (priority 1.0, weekly)
- Job listing pages: all 3 locales (priority 0.9, hourly)
- Active job detail pages: all slugs × all 3 locales (priority 0.8, daily)
- Province GEO pages: 63 provinces × 3 locales (priority 0.7, daily)
- Active site pages: all site slugs × 3 locales (priority 0.6, weekly)

### app/robots.ts — Crawler Directives

All authenticated routes are blocked from crawlers:

```
Disallow: /ko/worker/
Disallow: /ko/manager/
Disallow: /vi/worker/
Disallow: /vi/manager/
Disallow: /en/worker/
Disallow: /en/manager/
```

### OG Image Strategy

OG images are derived from job data at render time:
- If the job/site has an uploaded cover image in S3, the CloudFront URL is used as `og:image`
- Fallback: `https://cdn.gada.vn/og/default.png` (static branded default)
- Future: dynamic OG image generation via `app/opengraph-image.tsx` using `@vercel/og` or a Lambda-based service

---

## 9. Component Architecture

### Server Components by Default

All page and layout components in `app/` are React Server Components (RSC) unless they include `'use client'` at the top. RSCs:
- Fetch data directly (no useEffect/SWR) by calling `lib/api/*.ts` functions
- Access server-only APIs (`cookies()`, `headers()`)
- Do not add to the client JS bundle

Client Components are used only when interactivity is needed:
- Event handlers (`onClick`, `onChange`)
- Browser APIs (Firebase SDK, Canvas for signature, Camera)
- React hooks (`useState`, `useEffect`, `useRef`)
- Real-time updates (SWR polling, WebSocket)

### packages/ui/ — Shared Component Library

Design system components live in `packages/ui/src/` and are published as `@gada/ui`. These are framework-agnostic Tailwind components (no `'use client'` unless required). Examples:
- `Button`, `Input`, `Select`, `Textarea`
- `Card`, `Badge`, `Avatar`
- `Modal`, `Drawer`, `Toast`
- `DataTable`, `Pagination`

App-specific compositions (combining multiple UI primitives with business logic) live in `apps/web-next/src/components/`.

### Loading and Error Boundaries

Each route segment uses Next.js collocated files:
- `loading.tsx` — Suspense fallback shown during streaming
- `error.tsx` — Error boundary for runtime errors (includes retry button)
- `not-found.tsx` — Custom 404 with search CTA

### Suspense for Async Data

Server Component pages that fetch data wrap slow sections in `<Suspense fallback={<Skeleton />}>` to enable streaming HTML. The browser receives the shell immediately and the data-dependent sections stream in as they resolve.

---

## 10. Mobile Shell (Capacitor)

### apps/mobile-shell/

The `apps/mobile-shell/` app wraps the Next.js web app in a Capacitor native container for iOS and Android distribution. This avoids maintaining a separate native codebase for the authenticated app flows (worker dashboard, applications, contracts).

Architecture:
- The Next.js app is built to `apps/web-next/out/` (static export for non-SSR app pages)
- Capacitor serves the static files via a local HTTP server inside the WebView
- Public SSR pages (job listing, job detail) are served from the live `https://gada.vn` domain (not static export) to retain SSR/SEO benefits

### Hybrid Approach

| Route Type | Served From | Reason |
|------------|-------------|--------|
| `/(public)/` pages | Live `https://gada.vn` | SSR required for SEO and fresh data |
| `/(app)/` pages | Local static export | Works offline; faster navigation; no SSR needed |

Capacitor's `server.hostname` in `capacitor.config.ts` is set to `gada.vn` to share cookies with the live site, enabling seamless auth across the WebView boundary.

### Native Plugins

| Plugin | Capability | Used By |
|--------|-----------|---------|
| `@capacitor/camera` | Photo capture from camera or gallery | ID document upload, profile photo |
| `@capacitor-community/fcm` | Firebase Cloud Messaging push notifications | Worker application status, contract ready alerts |
| `@capacitor/preferences` | Secure key-value storage (replaces localStorage for tokens) | Fallback session storage |

### Deep Linking

Deep links map to `/(app)/` routes:

```
gada://worker/contracts/123   →  /[locale]/worker/contracts/123
gada://worker/applications    →  /[locale]/worker/applications
```

The current locale is read from the stored user preference when resolving deep links.

---

## 11. Performance Strategy

### Images

All images use `next/image` with:
- S3 presigned URLs resolved to CloudFront CDN URLs at runtime (never stored)
- `remotePatterns` in `next.config.ts` allows `cdn.gada.vn` and `*.cloudfront.net`
- Images are served as WebP by a CloudFront Lambda@Edge function (Sharp-based resize)
- `sizes` prop tuned per usage context (e.g., `sizes="(max-width: 640px) 100vw, 400px"`)

### Fonts

Font optimization uses `next/font/google`:
- `Noto Sans KR` — Korean UI text (weights: 400, 500, 700)
- `Be Vietnam Pro` — Vietnamese body text (weights: 400, 500, 700)
- Both fonts are loaded with `display: 'swap'` and preloaded for the default locale

### Bundle Analysis

`@next/bundle-analyzer` is configured in `next.config.ts` behind the `ANALYZE=true` env flag. Run with:

```bash
ANALYZE=true pnpm build
```

Key targets:
- First Load JS for public pages: < 100KB gzipped
- No Firebase SDK in server bundles (guarded by `typeof window !== 'undefined'`)

### Caching Strategy

- **ISR**: Public listing pages cached at CDN edge; background regeneration keeps content fresh
- **no-store**: Job/site detail pages always fetch from origin (SSR) — cannot be cached at CDN
- **24h cache**: Province and trade reference data (rarely changes)
- **SWR**: Client-side data in `(app)/` pages — stale-while-revalidate with 30s focus revalidation

---

## 12. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | NestJS API base URL (e.g., `https://api.gada.vn/api/v1`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain (e.g., `gada-vn.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | Firebase Analytics measurement ID |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Yes | Facebook app ID for social login |
| `NEXT_PUBLIC_CDN_URL` | Yes | CloudFront CDN base URL (e.g., `https://cdn.gada.vn`) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical site URL (e.g., `https://gada.vn`) |
| `ANALYZE` | No | Set to `true` to run bundle analyzer on build |

All `NEXT_PUBLIC_*` variables are inlined into the client bundle at build time. Non-public server-only variables (if added in future) must not use the `NEXT_PUBLIC_` prefix.

---

## 13. Package Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.2.0 | Web framework (App Router, SSR/ISR/SSG) |
| `react` | ^19.0.0 | UI library |
| `react-dom` | ^19.0.0 | DOM renderer |
| `next-intl` | ^3.26.0 | i18n: routing, server/client translations |
| `firebase` | ^11.0.0 | Firebase client SDK: phone OTP, Facebook auth |
| `zustand` | ^5.0.0 | Lightweight client state management |
| `react-hook-form` | ^7.54.0 | Form state and validation |
| `zod` | ^3.24.0 | Schema validation (shared with API types) |
| `@hookform/resolvers` | ^3.9.0 | Zod resolver adapter for react-hook-form |
| `clsx` | ^2.1.1 | Conditional className utility |
| `tailwind-merge` | ^2.5.4 | Merge Tailwind classes without conflicts |
| `@gada/ui` | workspace | Shared component library |
| `@gada/types` | workspace | Shared TypeScript types |
| `@gada/i18n` | workspace | Locale JSON files + type exports |
| `@gada/config` | workspace | Shared ESLint/TS/Tailwind configs |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5 | TypeScript compiler |
| `tailwindcss` | ^3.4.0 | Utility-first CSS framework |
| `autoprefixer` | ^10.4.0 | CSS vendor prefixes |
| `postcss` | ^8.4.0 | CSS processing |
| `@types/node` | ^22 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@next/bundle-analyzer` | latest | Bundle size analysis |
