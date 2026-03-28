# Security Checklist — GADA VN

Pre-launch security gate and ongoing security verification for the Vietnamese construction worker marketplace.

**Severity legend:**
- `[CRITICAL]` — blocks production launch. Must be ✓ before go-live.
- `[HIGH]` — 80% must be ✓ before launch; remainder within 30 days post-launch.
- `[MEDIUM]` — within 60 days post-launch.
- `[LOW]` — best effort, next quarter.

---

## Pre-Launch Gate Summary

| Status | Count | Action Required |
|---|---|---|
| CRITICAL items | 25 | ALL must be ✓ before launch |
| HIGH items | 34 | 80% (27+) must be ✓ before launch |
| MEDIUM items | 21 | Within 60 days post-launch |
| LOW items | 4 | Next quarter |

---

## 1. Identity Document Security

ID document photos (passport, national ID scans) are PII under Vietnamese personal data regulations. Highest protection priority.

- [ ] [CRITICAL] S3 bucket `gada-vn-assets` has "Block all public access" enabled — all 4 block settings true
- [ ] [CRITICAL] No S3 bucket policy contains `s3:GetObject` with `Principal: "*"` (public) — verify with `aws s3api get-bucket-policy`
- [ ] [CRITICAL] ID document photos served only via presigned URLs with 15-minute TTL — never via static CloudFront URLs
- [ ] [CRITICAL] Presigned URLs generated server-side only in `S3Service::presignedUrl()` — mobile app never generates presigned URLs directly
- [ ] [CRITICAL] S3 bucket policy denies all non-TLS requests: `Condition: { Bool: { "aws:SecureTransport": false } }` → `Deny`
- [ ] [HIGH] S3 key includes `userId` in path to prevent enumeration: `id-documents/{userId}/{uuid}.jpg` — never `id-documents/{uuid}.jpg`
- [ ] [HIGH] UUID (v4) used in S3 key — not sequential database ID — prevents path traversal guessing
- [ ] [HIGH] `IdDocumentController` verifies requesting user's `firebase_uid` matches `userId` in S3 key before generating presigned URL
- [ ] [HIGH] S3 server-side encryption uses SSE-KMS with customer-managed CMK — not SSE-S3 default key
- [ ] [HIGH] AWS CloudTrail data events enabled on `gada-vn-assets` bucket — logs every `GetObject` and `PutObject`
- [ ] [MEDIUM] EXIF metadata stripped from photos before S3 storage — removes embedded GPS coordinates from camera photos
- [ ] [MEDIUM] MIME type validated server-side on upload (not just file extension): `finfo_file()` or `getimagesize()` in Laravel
- [ ] [MEDIUM] File size limit enforced server-side in Laravel (`max:10240` validation rule) — not just client-side JS check

---

## 2. Contract Security

Employment contracts (PDF) contain worker full name, national ID number, bank account, salary terms, and employer information.

- [ ] [CRITICAL] Contract PDFs served only via presigned URLs with 15-minute TTL — never stored as public CDN URLs in DB
- [ ] [CRITICAL] `WorkerContractController::show()` verifies the requesting user is one of: (a) the worker named on the contract, (b) the manager of the job site, or (c) admin role — before generating presigned URL
- [ ] [HIGH] S3 versioning enabled on `gada-vn-assets` bucket — accidental deletion creates a delete marker, not permanent loss
- [ ] [HIGH] Contract S3 key format: `contracts/{hireId}/{uuid}.pdf` — hireId scopes access check; UUID prevents enumeration
- [ ] [HIGH] Contract PDF generation runs in isolated `queue-worker` container — not in the web request lifecycle
- [ ] [MEDIUM] Contract PDF metadata does not embed database primary key IDs (use opaque identifiers only)
- [ ] [MEDIUM] Every contract presigned URL generation is written to `ops.audit_logs` with `user_id`, `hire_id`, `action: contract_viewed`, `ip_address`, `timestamp`

---

## 3. API Authentication

- [ ] [CRITICAL] All non-public API endpoints require `Authorization: Bearer <Firebase ID Token>` — no token = 401
- [ ] [CRITICAL] Firebase ID Token verified via Firebase Admin SDK `verifyIdToken()` — not manually decoded with `base64_decode()` or JWT library without signature verification
- [ ] [CRITICAL] Token expiry enforced — Firebase tokens expire in 1 hour; reject expired tokens even if signature is valid
- [ ] [CRITICAL] `firebase_uid` column has unique constraint in `auth.users` table (migration-level constraint, not just application-level)
- [ ] [HIGH] `FirebaseAuthMiddleware` calls `DB::statement("SET app.current_user_id = ?", [$user->id])` to set PostgreSQL session variable for RLS
- [ ] [HIGH] PostgreSQL RLS enabled and tested on tables: `app.sites`, `app.jobs`, `app.applications`, `app.hires`, `app.attendance`, `app.contracts`
- [ ] [HIGH] Admin panel uses separate session-based authentication (`auth:admin` guard) — Firebase ID tokens are not accepted on admin routes
- [ ] [HIGH] OTP rate limit enforced at two layers: (1) WAF rule 100 req/5min/IP on `/api/v1/auth/otp/send`, (2) application-level Redis counter `gada:otp:{phone}:{attempt}` — 5 attempts per phone per 15 minutes
- [ ] [MEDIUM] Login lockout: 10 failed OTP attempts in 1 hour → 15-minute account lockout stored in Redis
- [ ] [MEDIUM] Logout endpoint calls Firebase Admin SDK `revokeRefreshTokens($uid)` to invalidate tokens on all devices, not just the current session

---

## 4. Authorization (RBAC)

Role-based access control as defined in `docs/architecture/rbac-model.md`.

- [ ] [CRITICAL] Manager-only endpoints check `hasRole('manager')` which verifies `user_roles.status = 'active'` AND `user_roles.revoked_at IS NULL` — not just role name
- [ ] [CRITICAL] All mutation endpoints (create/update/delete) check resource ownership via Laravel Policies before executing — e.g., `$site->manager_user_id === $user->id` in `SitePolicy::update()`
- [ ] [CRITICAL] Worker user can only access their own data: own applications, own hires, own contracts — RLS row-level policy enforces this at DB layer, application Policy enforces at app layer (defense in depth)
- [ ] [HIGH] Admin-only routes protected by `role:admin` middleware — applied at route group level, not per-route
- [ ] [HIGH] Past attendance records (prior to today) editable only by admin — `AttendancePolicy::correctPast()` returns false for manager role
- [ ] [HIGH] Contract voiding (status → voided) restricted to admin only — `ContractPolicy::void()` returns false for manager and worker roles
- [ ] [MEDIUM] `super_admin_emails` loaded from `config/app.php` (env var at boot time) — not from database to prevent privilege escalation via DB compromise
- [ ] [MEDIUM] Every role grant (`user_roles` insert) and role revocation (`revoked_at` update) written to `ops.audit_logs` with acting admin user ID

---

## 5. Sensitive Data Storage

Bank account numbers and national ID numbers are stored encrypted. The encryption key must never be co-located with the encrypted data.

- [ ] [CRITICAL] Bank account numbers encrypted at application layer (AES-256-GCM) before write to `app.hires` or `app.workers` — plaintext never reaches PostgreSQL
- [ ] [CRITICAL] National ID numbers encrypted at application layer (AES-256-GCM) before write to `auth.users` or related tables
- [ ] [CRITICAL] `ENCRYPTION_KEY` (64 hex characters = 256 bits) loaded from AWS Secrets Manager at runtime — not from `.env` file, not hardcoded
- [ ] [CRITICAL] No credentials, API keys, or secrets in any Dockerfile or Docker layer — verified with `docker history --no-trunc <image>` in CI
- [ ] [CRITICAL] No secrets in GitHub repository — verify with `git log --all --full-history -- '*.env'` and `trufflehog git` scan
- [ ] [HIGH] RDS encryption at rest uses customer-managed CMK (not AWS default key `aws/rds`) — separate KMS key allows independent key rotation and access control
- [ ] [HIGH] ElastiCache in-transit encryption enabled (TLS 1.2+) and at-rest encryption enabled
- [ ] [HIGH] RDS master password managed by Secrets Manager with automatic rotation Lambda (every 30 days) — `gada_app` user password also rotated
- [ ] [HIGH] All RDS connections use SSL: Laravel `DB_SSL_MODE=require` in configuration; Laravel `pdo_options: [PDO::MYSQL_ATTR_SSL_CA => '/etc/ssl/cert.pem']` equivalent for PostgreSQL
- [ ] [MEDIUM] No PII in CloudWatch log groups — `LogSanitizer` middleware masks phone numbers (`+84*****XXX`) and national IDs before writing to log
- [ ] [MEDIUM] S3 presigned URL keys in access logs do not reveal readable PII in the path — UUID-based keys prevent this by design

---

## 6. Transport Security

- [ ] [CRITICAL] HTTPS enforced everywhere: ALB HTTP listener (port 80) redirects to HTTPS (port 443); CloudFront `ViewerProtocolPolicy: redirect-to-https`
- [ ] [CRITICAL] HSTS header on all responses: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (applied via CloudFront response headers policy)
- [ ] [HIGH] TLS minimum version TLSv1.2_2021 on CloudFront; TLS 1.2 on ALB HTTPS listener — TLS 1.0/1.1 disabled
- [ ] [HIGH] Security headers on all responses via CloudFront response headers policy:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] [HIGH] CORS policy on Laravel API: `allowed_origins` in `config/cors.php` restricted to `["https://gada.vn", "gada://"]` — wildcard `*` never used
- [ ] [MEDIUM] Certificate pinning in Capacitor mobile app to prevent MITM on compromised networks (post-MVP — requires app update to change)
- [ ] [MEDIUM] `Content-Security-Policy` header configured for Next.js web app: `default-src 'self'; img-src 'self' data: https://gada-vn-assets.s3.amazonaws.com; script-src 'self' 'nonce-{nonce}'`

---

## 7. Infrastructure Security

- [ ] [CRITICAL] RDS instance in private data subnet (10.0.21.0/24–10.0.23.0/24) — no route to internet gateway, no public accessibility
- [ ] [CRITICAL] ElastiCache in private data subnet — same as RDS, no public route
- [ ] [CRITICAL] Security groups enforce least privilege: `sg-rds` inbound only from `sg-ecs-api` on port 5432; `sg-redis` inbound only from `sg-ecs-api` on port 6379
- [ ] [HIGH] VPC Flow Logs enabled — logs all accepted and rejected traffic; stored in `gada-vn-logs` S3 bucket
- [ ] [HIGH] AWS CloudTrail enabled for all regions — logs all AWS API calls; stored in `gada-vn-logs/cloudtrail/`
- [ ] [HIGH] ECS task IAM role scoped to minimum: `secretsmanager:GetSecretValue` on `/gada/production/*` paths only; `s3:GetObject/PutObject` on `gada-vn-assets/*` only
- [ ] [HIGH] ECR image scanning on push enabled — Amazon Inspector scans for OS-level CVEs; CI pipeline fails on HIGH+ findings
- [ ] [HIGH] WAF WebACL enabled on CloudFront distribution — OWASP Common Rules + SQLi Rules + rate limits active
- [ ] [HIGH] RDS deletion protection enabled — `terraform destroy` will fail without explicitly disabling first
- [ ] [MEDIUM] AWS Config rules active: `s3-bucket-public-read-prohibited`, `restricted-ssh`, `vpc-sg-open-only-to-authorized-ports`
- [ ] [MEDIUM] AWS GuardDuty enabled in `ap-southeast-1` — threat detection for unusual API patterns, crypto mining, compromised EC2/ECS activity
- [ ] [MEDIUM] AWS Security Hub enabled — aggregates findings from Inspector, GuardDuty, Config, and IAM Access Analyzer into single console
- [ ] [LOW] All human AWS access via IAM Identity Center (SSO) — no IAM users with long-lived access keys for humans

---

## 8. Application-Level Security

- [ ] [CRITICAL] SQL injection prevention: Laravel QueryBuilder with parameterized queries for all DB access; no string interpolation in raw SQL — search codebase for `DB::statement("... $` to verify
- [ ] [CRITICAL] No unescaped output in Blade templates: use `{{ $var }}` (auto-escaped via `htmlspecialchars`), never `{!! $var !!}` except for pre-sanitized HTML
- [ ] [HIGH] CSRF protection on all admin panel forms: `@csrf` directive on every `<form>` in Blade; `VerifyCsrfToken` middleware active on web routes
- [ ] [HIGH] Mass assignment protection on all Eloquent models: every model has explicit `$fillable` array or restrictive `$guarded = ['id']`; no model has `$guarded = []`
- [ ] [HIGH] File upload validation server-side: MIME type checked via `Storage::mimeType()`, size via `$request->file()->getSize()`, extension against allowlist `['jpg','jpeg','png','pdf']`
- [ ] [HIGH] No `eval()`, `exec()`, `shell_exec()`, `system()`, or dynamic code execution — verified with `grep -r 'eval\|exec\|shell_exec' app/`
- [ ] [MEDIUM] Rate limiting on all state-changing endpoints: Laravel `throttle:60,1` middleware on API routes; tighter limits on auth and file upload routes
- [ ] [MEDIUM] Request body size limit: ALB max request size 10MB; nginx/php-fpm `client_max_body_size 10M` in ECS container config
- [ ] [MEDIUM] Dependency scanning in CI pipeline: `composer audit` (Laravel) and `pnpm audit` (Next.js) run on every PR; fail on HIGH+ CVEs
- [ ] [MEDIUM] Contract PDF downloads served with `Content-Disposition: attachment; filename="contract-{hireId}.pdf"` — prevents browser from rendering PDF inline (which could allow PDF XSS)

---

## 9. Monitoring and Incident Response

- [ ] [HIGH] CloudWatch alarms configured and tested: 5xx rate > 1% over 5 minutes → SNS → PagerDuty P2; WAF blocks > 1,000/min → SNS P2
- [ ] [HIGH] CloudTrail metric filters and alarms for: IAM policy changes, Security Group modifications, S3 bucket policy changes
- [ ] [HIGH] GuardDuty findings routed to SNS → PagerDuty: HIGH severity findings create P1 incident; MEDIUM creates P2
- [ ] [MEDIUM] Incident response runbook documented in `docs/runbooks/` covering: (a) suspected data breach, (b) account compromise, (c) DDoS/volumetric attack
- [ ] [MEDIUM] On-call rotation: at minimum 2 engineers have production access and are reachable 24/7; PagerDuty escalation policy defined
- [ ] [LOW] Annual security review: external penetration test (web app + API + mobile) by qualified vendor; findings tracked to resolution

---

## 10. Pre-Launch Security Gate

### CRITICAL Items Checklist

Before any production traffic is allowed, verify all 25 CRITICAL items are ✓:

**Identity Documents (5):**
- [ ] Block all public access on `gada-vn-assets`
- [ ] No public `s3:GetObject` bucket policy
- [ ] ID docs served via presigned URLs only
- [ ] Presigned URLs generated server-side only
- [ ] S3 bucket policy denies non-TLS

**Contracts (2):**
- [ ] Contracts via presigned URLs only
- [ ] `WorkerContractController` authorization check

**API Authentication (4):**
- [ ] All endpoints require auth token
- [ ] Firebase Admin SDK token verification
- [ ] Token expiry enforced
- [ ] `firebase_uid` unique constraint

**Authorization (3):**
- [ ] `hasRole('manager')` checks active + not revoked
- [ ] Resource ownership via Policies before mutation
- [ ] Worker can only access own data

**Sensitive Data Storage (5):**
- [ ] Bank accounts encrypted at application layer
- [ ] National IDs encrypted at application layer
- [ ] `ENCRYPTION_KEY` from Secrets Manager
- [ ] No credentials in Docker images
- [ ] No secrets in GitHub repository

**Transport Security (2):**
- [ ] HTTPS enforced everywhere (ALB + CloudFront)
- [ ] HSTS header on all responses

**Infrastructure Security (3):**
- [ ] RDS in private subnet (no internet)
- [ ] ElastiCache in private subnet (no internet)
- [ ] Security groups: least privilege (RDS/Redis from ECS only)

**Application Security (2):**
- [ ] SQL injection impossible (parameterized queries only)
- [ ] No unescaped Blade output (`{{ }}` not `{!! !!}`)

### Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Lead Developer | | | |
| DevOps Engineer | | | |
| Product Owner | | | |

All CRITICAL items must be signed off before production DNS cutover.

---

## Appendix: Security Verification Commands

```bash
# Verify S3 public access block
aws s3api get-public-access-block --bucket gada-vn-assets

# Verify no public bucket policy
aws s3api get-bucket-policy --bucket gada-vn-assets | jq '.Policy' | jq fromjson

# Check for secrets in git history
git log --all --full-history -- '*.env' '*.key' 'credentials*'
trufflehog git file://. --only-verified

# Scan Docker image for secrets
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image gada-vn/api:latest

# Verify RDS is not publicly accessible
aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier,PubliclyAccessible]'

# Check active WAF rules
aws wafv2 get-web-acl \
  --name gada-vn-waf \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --id <web-acl-id>

# Verify ECS task role permissions (should NOT include s3:*)
aws iam get-role-policy \
  --role-name gada-vn-ecs-task-role \
  --policy-name s3-access

# Search for eval/exec in PHP codebase
grep -rn 'eval\b\|shell_exec\|exec(\|system(' apps/api/app/ --include='*.php'

# Check for unescaped Blade output
grep -rn '{!!' apps/api/resources/views/ --include='*.blade.php'
```
