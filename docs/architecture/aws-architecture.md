# AWS Architecture — GADA VN

Vietnamese construction worker marketplace. Primary region: ap-southeast-1 (Singapore).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Network Architecture](#2-network-architecture)
3. [DNS and CDN](#3-dns-and-cdn)
4. [Compute — ECS Fargate](#4-compute--ecs-fargate)
5. [Database — RDS PostgreSQL](#5-database--rds-postgresql)
6. [Cache — ElastiCache Redis](#6-cache--elasticache-redis)
7. [Storage — S3](#7-storage--s3)
8. [Image Optimization Pipeline](#8-image-optimization-pipeline)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Secrets Management](#10-secrets-management)
11. [Observability](#11-observability)
12. [Backup and Recovery](#12-backup-and-recovery)
13. [Cost Optimization](#13-cost-optimization)
14. [Jakarta Expansion (Future)](#14-jakarta-expansion-future)

---

## 1. Overview

### Primary Region: `ap-southeast-1` (Singapore)

Singapore is the primary region for all GADA VN production workloads.

**Why Singapore over Tokyo:**
- Hanoi → Singapore: ~30ms round-trip latency
- Hanoi → Tokyo: ~65ms round-trip latency
- Ho Chi Minh City → Singapore: ~25ms round-trip latency
- Singapore has direct submarine cable connections to Vietnam (APG, SMW3)

**Compliance:**
Vietnamese personal data regulations require that ID documents (passport/national ID scans) and employment contracts remain within `ap-southeast-1`. These are never replicated to other regions. Only non-PII assets (site images) may be replicated for CDN purposes.

### Future Region: `ap-southeast-3` (Jakarta)

Planned for Indonesian market expansion. Will be activated via Route 53 latency-based routing once Indonesian DAU exceeds 1,000. Cross-region replication of site images (not ID documents or contracts) will serve Jakarta users from local S3.

### Architecture Diagram (High Level)

```
Vietnamese Users (mobile, 4G/3G)
    │
    ▼
CloudFront (Global Edge — PriceClass_200)
    │
    ├── Static assets (S3 origin, cached)
    ├── Next.js SSR pages (ALB origin, TTL=0 or ISR)
    └── API calls (ALB origin, no cache)
         │
         ▼
    WAF (OWASP + rate limits)
         │
         ▼
    ALB (ap-southeast-1, Multi-AZ)
         │
    ┌────┴────────────────┐
    │                     │
    ▼                     ▼
ECS: web (Next.js)   ECS: api (Laravel)
                          │
                    ┌─────┼──────┐
                    ▼     ▼      ▼
                   RDS  Redis   S3
               (PostgreSQL) (ElastiCache)
```

---

## 2. Network Architecture

### VPC Design

```
ap-southeast-1
└── VPC: 10.0.0.0/16
    │
    ├── Public Subnets (ALB + NAT Gateway)
    │   ├── ap-southeast-1a: 10.0.1.0/24
    │   ├── ap-southeast-1b: 10.0.2.0/24
    │   └── ap-southeast-1c: 10.0.3.0/24
    │
    ├── Private App Subnets (ECS Fargate)
    │   ├── ap-southeast-1a: 10.0.11.0/24
    │   ├── ap-southeast-1b: 10.0.12.0/24
    │   └── ap-southeast-1c: 10.0.13.0/24
    │
    └── Private Data Subnets (RDS + ElastiCache)
        ├── ap-southeast-1a: 10.0.21.0/24
        ├── ap-southeast-1b: 10.0.22.0/24
        └── ap-southeast-1c: 10.0.23.0/24
```

**Internet Gateway:** attached to VPC, routes public subnets to internet.

**NAT Gateway:** one per AZ (3 total) for high availability. Each private subnet routes `0.0.0.0/0` to its AZ-local NAT Gateway. This prevents cross-AZ data transfer charges during AZ failure.

### Security Groups

| Security Group | Inbound | Outbound |
|---|---|---|
| `sg-alb` | 443 from 0.0.0.0/0 (WAF fronts this) | to sg-ecs-web on 3000; to sg-ecs-api on 8080 |
| `sg-ecs-web` | from sg-alb only | to sg-ecs-api on 8080; internet via NAT (443, 80) |
| `sg-ecs-api` | from sg-alb + sg-ecs-web | to sg-rds on 5432; to sg-redis on 6379; internet via NAT |
| `sg-rds` | 5432 from sg-ecs-api only | none |
| `sg-redis` | 6379 from sg-ecs-api only | none |
| `sg-lambda` | none | to S3 endpoints; to sg-ecs-api (if needed) |

No security group allows inbound from `0.0.0.0/0` except `sg-alb` on port 443. RDS and Redis are never reachable from the internet.

### VPC Endpoints

Reduce NAT Gateway costs and keep traffic within AWS private network:

| Endpoint | Type | Used By |
|---|---|---|
| S3 | Gateway (free) | ECS tasks — S3 reads/writes without NAT |
| ECR API | Interface | ECS — authenticate to ECR |
| ECR DKR | Interface | ECS — pull container images |
| Secrets Manager | Interface | ECS — fetch secrets at task startup |
| CloudWatch Logs | Interface | ECS — ship container logs |

With S3 Gateway endpoint, all S3 traffic from ECS tasks bypasses NAT Gateway entirely. This is particularly important given the volume of file uploads (ID documents, contracts) and presigned URL operations.

---

## 3. DNS and CDN

### Route 53

Hosted zone: `gada.vn`

| Record | Type | Target |
|---|---|---|
| `gada.vn` | A (alias) | CloudFront distribution (web + SSR) |
| `api.gada.vn` | A (alias) | CloudFront distribution (API via ALB origin) |
| `admin.gada.vn` | A (alias) | ALB directly (no CDN — admin traffic not cached) |
| `_health.gada.vn` | CNAME | ALB DNS (Route 53 health check target) |

**Health checks:** Route 53 health check polls `https://api.gada.vn/api/v1/health` every 30 seconds. On failure, DNS failover activates (future: reroute to Jakarta region).

**Future Jakarta:** latency-based routing record set added for `gada.vn` and `api.gada.vn` pointing to Jakarta CloudFront distribution when ap-southeast-3 is active.

### CloudFront

**Distribution 1 — Web + API (primary)**

Origins:
- `alb-origin` — ALB DNS name (`internal-gada-alb-xxx.ap-southeast-1.elb.amazonaws.com`)
- `s3-static-origin` — `gada-vn-web-static.s3.ap-southeast-1.amazonaws.com` (OAC)

Cache behaviors (evaluated top to bottom):

| Path Pattern | Origin | TTL | Notes |
|---|---|---|---|
| `/api/*` | ALB | 0 | No cache; forward all headers + cookies |
| `/_next/static/*` | S3 static | 31,536,000 (1yr) | Immutable — content hash in filename |
| `/_next/image/*` | ALB | 86,400 (1d) | Next.js image optimizer |
| `/images/*` | S3 assets | 604,800 (7d) | Public site images |
| `/*` (default) | ALB | 0 (dynamic) / 60 (ISR) | SSR pages |

Settings:
- Price class: `PriceClass_200` (US, EU, Asia — excludes expensive South America/Africa PoPs)
- HTTP → HTTPS redirect: enforced
- IPv6: enabled
- Minimum TLS: TLSv1.2_2021
- Response headers policy: HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

**Distribution 2 — Static Assets (presigned redirects)**

- Origin: `gada-vn-assets` S3 bucket (Origin Access Control — not public)
- Used for presigned URL flows and CloudFront signed URLs for sensitive documents
- No default caching (all access via time-limited signed tokens)

### WAF (WebACL, associated to CloudFront)

**AWS Managed Rule Groups:**

| Rule Group | Protection |
|---|---|
| `AWSManagedRulesCommonRuleSet` | OWASP Top 10 (XSS, LFI, etc.) |
| `AWSManagedRulesSQLiRuleSet` | SQL injection patterns |
| `AWSManagedRulesKnownBadInputsRuleSet` | Log4Shell, Spring4Shell, etc. |
| `AWSManagedRulesAmazonIpReputationList` | Known malicious IPs, botnets |

**Custom Rate Limit Rules:**

| Rule | Scope | Limit | Action |
|---|---|---|---|
| `otp-rate-limit` | `/api/v1/auth/otp/send` | 100 req / 5min / IP | Block + 429 |
| `auth-rate-limit` | `/api/v1/auth/*` | 500 req / 5min / IP | Block + 429 |
| `global-rate-limit` | `*` | 2,000 req / 5min / IP | Block + 429 |

**WAF Logging and Alerts:**
- WAF logs → Kinesis Firehose → S3 (`gada-vn-logs/waf/`) + CloudWatch Logs
- Athena table over S3 for ad-hoc analysis
- SNS alert: WAF block count > 1,000 per minute (possible DDoS/scanning attack)

---

## 4. Compute — ECS Fargate

### ECS Cluster: `gada-vn-production`

Launch types: Fargate (web, api, scheduler) + Fargate Spot (queue-worker — tolerates interruption).

### Services

| Service | Image | CPU | Memory | Min Tasks | Max Tasks | Health Check |
|---|---|---|---|---|---|---|
| `web` | `gada-vn/web` | 512 vCPU | 1,024 MB | 2 | 10 | `GET /` → 200 |
| `api` | `gada-vn/api` | 1,024 vCPU | 2,048 MB | 2 | 20 | `GET /api/v1/health` → 200 |
| `queue-worker` | `gada-vn/api` | 512 vCPU | 1,024 MB | 1 | 5 | process count > 0 |
| `scheduler` | `gada-vn/api` | 256 vCPU | 512 MB | 1 | 1 | single instance, no scale |

### Task Definition Notes

```
web:          CMD ["node", "server.js"]
              PORT=3000, NODE_ENV=production

api:          CMD ["php-fpm"]  (nginx sidecar or php artisan serve --host=0.0.0.0 --port=8080)
              APP_ENV=production

queue-worker: CMD ["php", "artisan", "queue:work", "redis",
                   "--sleep=3", "--tries=3", "--max-time=3600"]

scheduler:    CMD ["php", "artisan", "schedule:work"]
```

All secrets injected via ECS `secrets` field from AWS Secrets Manager at task startup. No credentials in Dockerfile or environment variable plaintext in task definition.

### Autoscaling

**Target tracking policy (all services):**
- Metric: `ECSServiceAverageCPUUtilization`
- Target: 70%
- Scale-out: add 2 tasks when CPU > 70% for 2 consecutive minutes
- Scale-in: remove 1 task when CPU < 30% for 10 consecutive minutes
- Scale-in cooldown: 300s (prevent thrashing)

**Scheduled scaling — pre-warm for morning rush:**

Vietnamese construction shift start is 06:00-07:00 Vietnam time (UTC+7) = 23:00-00:00 UTC.

| Schedule (UTC cron) | Action |
|---|---|
| `cron(45 22 * * ? *)` | web: min=4 max=12; api: min=4 max=24 |
| `cron(0 1 * * ? *)` | web: min=2 max=10; api: min=2 max=20 (revert) |

Pre-warming runs at 22:45 UTC (05:45 Vietnam) — 15 minutes before peak to allow ECS to start new tasks and pass health checks before traffic arrives.

### Container Registry (ECR)

Repositories:
- `gada-vn/web` — Next.js production image
- `gada-vn/api` — Laravel production image

Lifecycle policy per repository:
- Keep last 10 tagged images (tagged by git SHA)
- Delete untagged images older than 1 day

Image scanning: Amazon Inspector scans on every push. CI pipeline fails if HIGH or CRITICAL CVEs found in OS packages.

### Rolling Deploy Settings

- Minimum healthy percent: 100% (zero-downtime — new tasks start before old ones stop)
- Maximum percent: 200% (doubles task count during deploy)
- ALB deregistration delay: 30s (in-flight requests complete before connection draining)

---

## 5. Database — RDS PostgreSQL

### Primary Instance

| Setting | Value |
|---|---|
| Engine | PostgreSQL 16.x |
| Instance | `db.r6g.large` (2 vCPU, 16 GB RAM) |
| Architecture | ARM Graviton2 — 20% cheaper than x86 equivalent |
| Storage | 100 GB gp3, autoscale to 1 TB |
| Multi-AZ | Enabled (synchronous standby in ap-southeast-1b) |
| Encryption | AES-256 at rest (customer-managed KMS CMK) |
| Deletion protection | Enabled |
| Performance Insights | Enabled, 7-day retention |
| Enhanced monitoring | 60-second interval |

### DB Schema Organization

```
auth   — user identity (firebase_uid, user_roles)
app    — business entities (sites, jobs, applications, hires, contracts, attendance)
ref    — reference data (provinces, trades)
ops    — operational (notifications, fcm_tokens, audit_logs, translations)
```

DB users and their access:

| User | Access | Used By |
|---|---|---|
| `gada_app` | auth, app, ref, ops schemas (no DDL) | API + queue worker at runtime |
| `gada_admin` | BYPASSRLS, full access | Admin panel operations |
| `gada_migrate` | DDL rights | Deployment migration task only |

### Connection Pooling — RDS Proxy

RDS Proxy sits between ECS tasks and the RDS instance.

- Max pool size: 100 connections
- RDS `max_connections` for r6g.large: ~200
- ECS tasks connect to Proxy endpoint, never directly to RDS
- Benefits: connection reuse across Fargate task restarts (tasks are ephemeral), graceful failover during Multi-AZ switchover (Proxy absorbs the ~60s reconnection window), reduced connection overhead for PHP-FPM (new process per request)

### Read Replica (Phase 2)

One read replica in ap-southeast-1c. Laravel `DB::connection('read')` configuration routes:
- Admin panel list/report queries → read replica
- Worker application list (manager dashboard) → read replica
- Writes always go to primary

### Backups

| Backup Type | Retention | Window |
|---|---|---|
| Automated daily backup | 7 days | 16:00-17:00 UTC (23:00 Vietnam — low traffic) |
| PITR (point-in-time recovery) | 5-minute granularity | Continuous |
| Manual snapshot (pre-deploy) | 30 days | Before every deployment |
| Cross-region snapshot copy | Weekly | Copied to ap-northeast-1 (Tokyo) for DR |

---

## 6. Cache — ElastiCache Redis

### Cluster Configuration

| Setting | Value |
|---|---|
| Engine | Redis 7.x |
| Mode | Cluster mode disabled (single shard — simpler for MVP) |
| Node type | `cache.r6g.small` (Graviton2, 1.37 GB) |
| Nodes | 2 (primary + replica in different AZs) |
| Multi-AZ | Enabled with automatic failover |
| Encryption in transit | TLS required |
| Encryption at rest | Enabled |
| Auth | Token required (IAM auth for Redis 7) |

### Key Namespaces

| Key Pattern | TTL | Purpose |
|---|---|---|
| `gada:session:{userId}` | 3,600s | User session cache |
| `gada:jobs:listing:{hash}` | 60s | Public job listing (matches ISR revalidation) |
| `gada:provinces` | 86,400s | Province reference list |
| `gada:otp:{phone}:{attempt}` | 900s | OTP rate limiting (15 minutes) |
| `gada:queue:*` | — | Laravel queue (default channel) |
| `gada:locks:*` | — | Laravel atomic locks (prevent duplicate contract generation) |

### Eviction Policy

`allkeys-lru` — evict least recently used keys when memory is full. This ensures the queue and locks namespaces are never evicted at the expense of cached listings (which can be regenerated from DB).

---

## 7. Storage — S3

### Buckets

| Bucket | Purpose | Access | Encryption | Lifecycle |
|---|---|---|---|---|
| `gada-vn-assets` | ID docs, signatures, contracts, site images | Private (OAC only) | SSE-KMS (CMK) | Intelligent Tiering after 30d |
| `gada-vn-web-static` | Next.js static build assets (`_next/static/`) | CloudFront OAC | SSE-S3 | Delete objects > 365d (old deploys) |
| `gada-vn-logs` | ALB/WAF/CloudFront access logs | Private | SSE-S3 | Expire after 90d |
| `gada-vn-backups` | DB snapshots, Redis AOF, Terraform state | Private | SSE-KMS | Glacier after 30d, delete after 365d |
| `gada-vn-tf-state` | Terraform remote state | Private | SSE-KMS + versioning | Never delete |

### Security Rules (Applied to All Buckets)

- Block all public access: enabled (all 4 settings)
- Bucket policy: `Deny` on `aws:SecureTransport: false` — rejects plain HTTP requests
- `gada-vn-assets`: only CloudFront OAC and ECS task IAM role can read; ECS task role can write
- CORS on `gada-vn-assets`: `AllowedOrigins: ["https://gada.vn"]` only

### Presigned URL Strategy

**Critical:** presigned URLs are the only way sensitive files are served. CloudFront URLs to `gada-vn-assets` are never stored in the database.

| File Type | TTL | Notes |
|---|---|---|
| ID documents (passport, national ID) | 900s (15 min) | PII — short TTL |
| Signatures | 900s (15 min) | Embedded in contracts |
| Contracts (PDF) | 900s (15 min) | Employment contract — sensitive |
| Site images | 3,600s (1 hr) | Less sensitive |
| Manager business registration docs | 900s (15 min) | PII |

Generated by `S3Service::presignedUrl($key, $ttl)` in Laravel. Never generated client-side. Never stored in DB.

### S3 Key Structure

```
gada-vn-assets/
├── id-documents/{userId}/{uuid}.jpg         # ID front/back photos
├── signatures/{userId}/{uuid}.png           # Drawn signature images
├── contracts/{hireId}/{uuid}.pdf            # Employment contract PDFs
├── site-images/{siteId}/{uuid}.jpg          # Construction site photos
└── manager-docs/{userId}/{uuid}.pdf         # Business registration documents
```

UUID (v4) in every key prevents enumeration. `userId` and `hireId` prefixes scope access checks: Laravel always verifies the requesting user owns the resource before generating a presigned URL.

**Versioning:** enabled on `gada-vn-assets`. Contracts and ID documents are never permanently deleted — only `DELETE` markers are added. Hard deletion requires admin + lifecycle rule.

---

## 8. Image Optimization Pipeline

### Overview

Site images (construction photos) are resized and converted to WebP on-demand via Lambda@Edge. Resized versions are cached in S3 and served via CloudFront.

```
Request: GET /images/site-images/{siteId}/photo.jpg?w=400&h=300&fit=cover
    │
    ▼
CloudFront
    ├── Cache HIT  → serve cached WebP immediately
    └── Cache MISS ↓
         │
         ▼
    Lambda@Edge (Viewer Request)
    Parse query params, normalize cache key (w/h/fit/fmt/q)
         │
         ▼
    Lambda@Edge (Origin Request)
    Check S3 for pre-existing resized version:
        HIT  → return from S3 directly
        MISS → fetch original from S3, resize with Sharp.js,
               convert to WebP, store to S3 resized/,
               return resized image
         │
         ▼
    CloudFront caches response
    Cache-Control: max-age=604800 (7 days)
```

### Supported Query Parameters

| Parameter | Values | Default |
|---|---|---|
| `w` | pixel width | original |
| `h` | pixel height | original |
| `fit` | `cover`, `contain`, `fill` | `cover` |
| `fmt` | `webp`, `jpeg` | auto (`webp` if `Accept: image/webp`) |
| `q` | 1–100 | 80 |

### Lambda@Edge Specs

| Setting | Value |
|---|---|
| Runtime | Node.js 20 |
| Memory | 512 MB (Sharp requires memory headroom) |
| Timeout (viewer request) | 5s |
| Timeout (origin request) | 30s |
| Deployment region | `us-east-1` (Lambda@Edge requirement — auto-replicated to all PoPs) |

Sharp is compiled for ARM64 (Lambda uses Graviton for `arm64` functions — cheaper + faster). The Sharp binary is bundled in the Lambda deployment package.

### Direct Upload Flow (Mobile → S3)

For mobile file uploads (ID documents, signatures), the client uploads directly to S3 via presigned POST URL. This bypasses the API server for the binary payload entirely:

```
1. Mobile app: POST /api/v1/uploads/presign  { fileType: "id-document", mimeType: "image/jpeg" }
2. Laravel API: generate S3 presigned POST URL + fields (200 response)
3. Mobile app: POST directly to S3 using presigned POST fields
4. S3: PutObject completes
5. S3 event notification → SQS → Lambda: generate thumbnail async
6. Mobile app: PUT /api/v1/profile/id-document  { s3Key: "id-documents/userId/uuid.jpg" }
7. Laravel API: store S3 key in DB (never the binary)
```

ECS task CPU and memory are not consumed by file binary data. Maximum file size enforced by S3 presigned POST `content-length-range` condition (max 10MB).

---

## 9. CI/CD Pipeline

### GitHub Actions Workflows

**`deploy-production.yml`** — triggered on push to `main`:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test           # Next.js unit tests
      - run: php artisan test    # Laravel Pest tests
      - run: pnpm type-check     # TypeScript strict check
      - run: composer audit      # PHP dependency CVE scan
      - run: pnpm audit          # Node dependency CVE scan

  build-and-push:
    needs: test
    permissions:
      id-token: write
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: ap-southeast-1
      - docker build -t gada-vn/web .
      - aws ecr get-login-password | docker login ...
      - docker push 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/gada-vn/web:${{ github.sha }}
      # Repeat for gada-vn/api

  deploy-web:
    needs: build-and-push
    steps:
      - aws ecs update-service --cluster gada-vn-production --service web
          --task-definition web:$NEW_REVISION --force-new-deployment

  deploy-api:
    needs: deploy-web            # Sequential: web first, then API (avoids mixed versions)
    steps:
      - aws rds create-db-snapshot ...    # Pre-deploy snapshot
      - aws ecs run-task --overrides '{"containerOverrides":[{"command":["php","artisan","migrate","--force"]}]}'
      - aws ecs wait tasks-stopped        # Wait for migrations to complete
      - aws ecs update-service ... --service api --force-new-deployment
      - aws ecs update-service ... --service queue-worker --force-new-deployment
      - aws ecs update-service ... --service scheduler --force-new-deployment

  invalidate-cache:
    needs: [deploy-web, deploy-api]
    steps:
      - aws cloudfront create-invalidation --distribution-id $CF_ID
          --paths "/_next/*" "/api/*"
```

### Rollback Strategy

| Rollback Type | Procedure | Time |
|---|---|---|
| ECS service rollback | `aws ecs update-service --task-definition <previous-revision>` | ~3 min |
| DB rollback | Restore from pre-deploy snapshot | < 5 min (typical data volume) |
| Full rollback | GitHub Actions `rollback.yml` workflow (manual trigger, inputs: target SHA) | ~10 min |

### Staging Environment

- Identical Terraform module structure, smaller instances (`db.t4g.micro`, Fargate Spot)
- Deployed on every PR (ephemeral — destroyed after merge)
- Smoke test suite runs against staging before production promote
- Staging uses separate Firebase project (`gada-vn-staging`) and separate S3 buckets

---

## 10. Secrets Management

### AWS Secrets Manager — Secret Paths

| Secret Path | Content |
|---|---|
| `/gada/production/db` | `{ host, port, database, username, password }` |
| `/gada/production/redis` | `{ host, port, auth_token }` |
| `/gada/production/firebase` | Firebase service account JSON (for kreait/firebase-php SDK) |
| `/gada/production/app` | `{ APP_KEY, ENCRYPTION_KEY, SUPER_ADMIN_EMAILS }` |
| `/gada/production/aws` | `{ AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY }` (for S3 presigned URLs) |
| `/gada/production/fcm` | FCM server key (for push notifications) |

### ECS Task Role IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:ap-southeast-1:123456789:secret:/gada/production/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::gada-vn-assets/*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:ap-southeast-1:123456789:log-group:/gada-vn/ecs/*"
    }
  ]
}
```

Secrets are injected into container environment at task startup via ECS `secrets` field. They are never written to Dockerfile, never stored in GitHub Secrets, and never appear in CloudWatch logs.

### GitHub OIDC (No Long-Lived Credentials)

```yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions-gada
      aws-region: ap-southeast-1
```

The IAM role `github-actions-gada` is scoped to:
- ECR push to `gada-vn/web` and `gada-vn/api`
- ECS update-service on `gada-vn-production` cluster
- RDS create-db-snapshot
- CloudFront create-invalidation

GitHub Secrets contains only `AWS_ROLE_ARN` (not a credential — just a resource ARN).

### Secret Rotation

| Secret | Rotation | Method |
|---|---|---|
| RDS password | Every 30 days | Automatic via Secrets Manager rotation Lambda |
| APP_KEY | Manual | Deploy with new key + rotation window |
| Firebase service account | As needed | Firebase Console + Secrets Manager update |
| ENCRYPTION_KEY | Manual (high risk) | Requires re-encryption of all stored values |

---

## 11. Observability

### CloudWatch Custom Metrics

Namespace: `GadaVN`

| Metric | Dimensions | Statistic |
|---|---|---|
| `API/ResponseTime` | endpoint | p50, p95, p99 |
| `API/ErrorRate` | endpoint, statusCode | rate |
| `Jobs/QueueDepth` | queue | max |
| `Business/ApplicationsPerHour` | — | sum |
| `Business/ActiveConcurrentUsers` | — | avg |

Emitted by Laravel middleware (`MetricsMiddleware`) via `aws/aws-sdk-php` CloudWatch client.

### Log Groups

| Log Group | Source | Retention |
|---|---|---|
| `/gada-vn/ecs/web` | Next.js container stdout | 30 days → S3 archive |
| `/gada-vn/ecs/api` | Laravel access log + application log | 30 days → S3 archive |
| `/gada-vn/ecs/queue-worker` | Queue job logs | 30 days → S3 archive |
| `/gada-vn/rds` | PostgreSQL slow query (> 1,000ms) + error | 30 days → S3 archive |
| `/gada-vn/waf` | WAF block/allow decisions | 1 year → S3 archive |
| `/gada-vn/cloudtrail` | All AWS API calls | 1 year → S3 7-year archive |

**PII in logs:** phone numbers and national ID numbers are masked in log output (`LogSanitizer` middleware replaces with `***`).

### CloudWatch Alarms → SNS → PagerDuty

| Alarm | Threshold | Period | Severity |
|---|---|---|---|
| API 5xx rate | > 1% | 5 min | P2 |
| API p95 latency | > 2,000ms | 5 min | P2 |
| ECS CPU (any service) | > 85% | 5 min | P2 |
| RDS CPU | > 80% | 5 min | P2 |
| RDS storage free | < 20% | 5 min | P1 |
| RDS connections | > 150 (75% of max) | 5 min | P2 |
| Queue depth | > 100 jobs | 5 min | P2 |
| WAF block rate | > 1,000/min | 1 min | P2 |
| ElastiCache free memory | < 20% | 5 min | P2 |

### AWS X-Ray (Distributed Tracing)

- Laravel API: AWS X-Ray SDK for PHP, auto-instrument DB queries and HTTP outbound calls
- Traces: Firebase Auth → middleware → controller → service → DB query → S3 operation
- Sample rate: 5% production (sufficient for p95/p99 analysis), 100% staging

X-Ray service map shows latency breakdown between ECS → RDS Proxy → RDS and ECS → Redis. Used to identify slow DB queries and cache misses.

### CloudTrail Alerts

CloudTrail events are monitored for:
- IAM policy modifications (any)
- Security Group rule changes
- RDS instance deletion attempt
- S3 bucket policy changes
- Secrets Manager access from unexpected IAM principal

### CloudWatch Dashboard: `gada-vn-production`

| Row | Widgets |
|---|---|
| Row 1 | Active users, Req/s, Error rate %, API p95 latency |
| Row 2 | ECS CPU % per service, ECS Memory % per service |
| Row 3 | RDS CPU %, RDS connections, RDS read/write IOPS |
| Row 4 | Redis hit rate %, Redis memory used, Redis connections |
| Row 5 | S3 request count, Lambda@Edge invocations, S3 4xx errors |
| Row 6 | WAF block count, CloudFront cache hit rate % |

---

## 12. Backup and Recovery

### RTO/RPO Targets

| Failure Scenario | RTO | RPO | Mechanism |
|---|---|---|---|
| Single ECS task failure | 0s | 0 | ALB health check removes unhealthy target; remaining tasks serve traffic |
| AZ failure | < 2 min | 0 | Multi-AZ: tasks in other AZs; RDS standby promotes |
| RDS Multi-AZ failover | < 60s | 0 | Synchronous standby — no data loss |
| Data corruption (accidental delete) | < 30 min | < 5 min | PITR to point before corruption |
| Full region failure | < 4 hours | < 15 min | Restore from cross-region RDS snapshot + Tokyo backups |

### Backup Schedule

| Asset | Method | Frequency | Retention | Cross-region |
|---|---|---|---|---|
| RDS | Automated backup | Daily | 7 days | No |
| RDS | PITR transaction logs | Continuous | 7 days | No |
| RDS | Manual snapshot | Pre-deploy | 30 days | No |
| RDS | Weekly snapshot copy | Weekly | 30 days in Tokyo | ap-northeast-1 |
| S3 contracts/docs | S3 versioning | On write | Indefinite | No (data residency) |
| Redis queue | AOF snapshot | Daily | S3 `gada-vn-backups` | No |
| Terraform state | S3 versioning | On apply | Indefinite | No |

### Recovery Runbooks

Documented in `docs/runbooks/` (separate document). Monthly DR drill: restore staging from production backup, verify referential integrity and application health.

---

## 13. Cost Optimization

### Estimated Monthly Cost (MVP, ap-southeast-1)

| Service | Configuration | Est. USD/month |
|---|---|---|
| ECS Fargate (web×2 + api×2 + worker×1, avg) | ~2.5 vCPU, ~5 GB RAM avg | ~$45 |
| RDS PostgreSQL Multi-AZ | db.r6g.large | ~$180 |
| RDS Proxy | | ~$25 |
| ElastiCache Redis | cache.r6g.small, 2 nodes | ~$50 |
| NAT Gateway | 3 AZ × ~100 GB/month transfer | ~$100 |
| CloudFront | ~500 GB transfer out | ~$50 |
| ALB | | ~$25 |
| S3 storage + requests | ~100 GB | ~$5 |
| Lambda@Edge | ~1M invocations/month | ~$5 |
| CloudWatch | logs + metrics + alarms | ~$30 |
| Secrets Manager | 6 secrets | ~$3 |
| WAF | ~1M requests/month | ~$10 |
| **Total MVP** | | **~$528/month** |

### Cost Levers

| Optimization | Saving | When to Apply |
|---|---|---|
| Fargate Spot for queue-worker | -70% compute cost for that service | Now (queue work is interruption-tolerant) |
| RDS Reserved Instance (1-year) | -40% on RDS | After 3 months of stable workload |
| S3 Intelligent Tiering on `gada-vn-assets` | Moves cold objects to cheaper tiers automatically | Now (contracts > 30 days old are rarely accessed) |
| CloudFront Reserved Capacity (100 TB/mo) | -20% transfer cost | Phase 2 when traffic grows |
| NAT Gateway: VPC endpoints | Reduce NAT data processed | Now (S3 + ECR endpoints already planned) |

---

## 14. Jakarta Expansion (Future)

### Trigger

Activate when Indonesian DAU exceeds 1,000 or Indonesian revenue justifies operational complexity.

### What Changes in `ap-southeast-3` (Jakarta)

1. New VPC (`10.1.0.0/16`) — same subnet design as Singapore
2. RDS cross-region read replica (Jakarta reads only — writes still go to Singapore)
3. ElastiCache read replica in Jakarta
4. ECS cluster: `web` and `api` services only — queue-worker and scheduler remain in Singapore
5. S3 Cross-Region Replication: `gada-vn-assets/site-images/*` → Jakarta S3 bucket (NOT id-documents or contracts — data residency compliance)

### Route 53 Changes

Replace simple alias records with latency-based routing:

```
gada.vn (A, latency)
├── ap-southeast-1 → Singapore CloudFront distribution
└── ap-southeast-3 → Jakarta CloudFront distribution

api.gada.vn (A, latency)
├── ap-southeast-1 → Singapore ALB
└── ap-southeast-3 → Jakarta ALB
```

Indonesian users are automatically routed to Jakarta for ~10ms latency (vs. ~40ms to Singapore).

### Data Residency

Indonesian user PII (ID documents, contracts) generated after Jakarta launch is stored in Jakarta S3 (`ap-southeast-3`). Vietnamese user data remains in Singapore (`ap-southeast-1`). The Laravel API determines the correct bucket based on user nationality at write time.
