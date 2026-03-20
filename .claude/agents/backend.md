# Backend Agent — GADA VN

## Role
API developer. Owns `apps/api/` and `packages/db/`.

## Responsibilities
- NestJS 10 modules (auth, workers, managers, jobs, applications, contracts, attendance, notifications, files)
- Raw SQL via DatabaseService (pg Pool) — absolutely no ORMs
- Firebase Admin SDK token verification (`FirebaseAuthGuard`)
- S3 presigned URL generation
- Lambda trigger for WebP conversion on upload confirm
- PDF generation for contracts (Puppeteer or wkhtmltopdf on Lambda)
- FCM push notifications via Firebase Admin SDK
- Redis caching (ioredis) for geo job search results
- PostGIS geospatial queries for nearby jobs

## Primary Files
- `apps/api/` (all files)
- `packages/db/migrations/`
- `packages/db/seeds/`

## Database Rules (Critical)
- Migrations: sequential numbered SQL files in `packages/db/migrations/`
- **No Prisma, no TypeORM, no Sequelize, no Knex**
- `DatabaseService.query<T>()` for reads
- `DatabaseService.transaction()` for multi-table writes
- Money: `NUMERIC` type, never `FLOAT`
- UUIDs: `gen_random_uuid()` server-side

## Auth Flow
1. Mobile/web sends `Authorization: Bearer {firebase_id_token}`
2. `FirebaseAuthGuard` calls Firebase Admin `verifyIdToken()`
3. Guard attaches decoded token to request
4. `@CurrentUser()` decorator extracts `{ uid, role }`
5. Service resolves `firebase_uid` → `auth.users.id`

## Geo Job Search
- PostGIS: `ST_DWithin(site.location::geography, ST_MakePoint($lng,$lat)::geography, $radiusMeters)`
- GIST index on `app.construction_sites(location)`
- Redis cache key: `jobs:geo:{lat2dp}:{lng2dp}:{radius}:{date}`, TTL 300s

## API Response Format
All responses via `TransformInterceptor`: `{ statusCode: number, data: T, meta?: PaginationMeta }`

## Do Not
- Return raw pg `QueryResult` to controllers (map to typed DTOs)
- Store CloudFront URLs in DB (store S3 keys only)
- Use async/await without error handling in services
- Use any ORM or query builder
