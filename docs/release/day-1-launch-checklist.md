# Day-1 Launch Checklist — GADA VN MVP

**Date**: To be filled on launch day
**Environment**: Production (`gada.vn`)
**Coordinator**: ___________________________
**Start time**: _______________ KST

**Pre-condition**: All P0 blockers in `docs/release/blockers.md` are RESOLVED. Staging smoke tests passed. UAT P0 items passed.

---

## Instructions

- Work through sections in order.
- Each person performing a step signs off with their initials and the time.
- If any P0 step fails, **HALT** and escalate before proceeding.
- Estimated total time (first launch): 4–6 hours including stabilisation period.

---

## T-48h: Pre-Launch Preparation (2 days before)

| # | Task | Owner | Done |
|---|------|-------|------|
| P1 | Confirm all P0 blockers in `blockers.md` are RESOLVED | Release coordinator | ⬜ |
| P2 | Final staging smoke test run — all P0/P1 items pass | QA lead | ⬜ |
| P3 | UAT sign-off documents complete for all three user groups | QA lead | ⬜ |
| P4 | Production AWS secrets confirmed in Secrets Manager | DevOps | ⬜ |
| P5 | Production SSM parameters confirmed (APP_KEY, ADMIN_PANEL_PASSWORD, REDIS_HOST, DB_HOST, etc.) | DevOps | ⬜ |
| P6 | Production RDS snapshot taken manually | DevOps | ⬜ |
| P7 | Production Firebase project (`gada-vn`) Phone Auth enabled for real numbers | Backend | ⬜ |
| P8 | Production Firebase credentials JSON uploaded to AWS Secrets Manager | DevOps | ⬜ |
| P9 | Production S3 bucket `gada-vn-production-uploads` exists with correct bucket policy | DevOps | ⬜ |
| P10 | Production CDN bucket `gada-vn-production-cdn` exists with CloudFront OAC | DevOps | ⬜ |
| P11 | Production Google Maps API key restricted to `gada.vn/*` domain | Backend | ⬜ |
| P12 | Production Facebook OAuth app set to Live mode | Backend | ⬜ |
| P13 | `ADMIN_PANEL_PASSWORD` in production SSM is NOT the default `gadaAdmin2026!` | DevOps | ⬜ |
| P14 | DNS records created: `gada.vn`, `api.gada.vn`, `admin.gada.vn`, `cdn.gada.vn` → correct ALB/CloudFront targets | DevOps | ⬜ |
| P15 | SSL certificates issued and validated in ACM for all production domains | DevOps | ⬜ |
| P16 | CloudWatch alarms configured for production cluster | DevOps | ⬜ |
| P17 | EAS production build (`eas build --platform all --profile production`) queued or completed | Mobile | ⬜ |
| P18 | Next.js web Docker image built with production `NEXT_PUBLIC_*` env vars baked in | DevOps | ⬜ |
| P19 | All team members briefed on incident response procedure | Release coordinator | ⬜ |
| P20 | Support channels (KakaoTalk `@gadavn`, Zalo OA) active and monitored | Operations | ⬜ |

---

## T-0: Production Deployment

### Step 1 — Database

| # | Task | Command / Action | Owner | Time | Result |
|---|------|-----------------|-------|------|--------|
| 1.1 | Confirm production RDS instance status is `available` | `aws rds describe-db-instances --db-instance-identifier gada-vn-prod-postgres --query 'DBInstances[0].DBInstanceStatus'` | DevOps | | |
| 1.2 | Run database migrations on production | ECS one-shot task: `php artisan migrate --force` | DevOps | | |
| 1.3 | Verify migration completed without errors | Check ECS task exit code = 0 and CloudWatch logs | DevOps | | |
| 1.4 | Confirm row counts are as expected (reference data seeded) | `SELECT COUNT(*) FROM ref.construction_trades; SELECT COUNT(*) FROM ref.vn_provinces;` | DevOps | | |
| 1.5 | Take a post-migration RDS snapshot | `aws rds create-db-snapshot --db-instance-identifier gada-vn-prod-postgres --db-snapshot-identifier gada-vn-prod-pre-launch` | DevOps | | |

**HALT if**: Step 1.3 fails. Do not proceed to Step 2.

---

### Step 2 — Backend API (Laravel)

| # | Task | Command / Action | Owner | Time | Result |
|---|------|-----------------|-------|------|--------|
| 2.1 | Deploy API ECS service (push new task definition or trigger CI deploy) | `aws ecs update-service --cluster gada-vn-prod --service gada-vn-prod-api --force-new-deployment` | DevOps | | |
| 2.2 | Wait for ECS service to reach steady state (running = desired) | `aws ecs wait services-stable --cluster gada-vn-prod --services gada-vn-prod-api` | DevOps | | |
| 2.3 | Verify health check endpoint responds 200 | `curl -s -o /dev/null -w "%{http_code}" https://api.gada.vn/health` → expect `200` | DevOps | | |
| 2.4 | Verify API version endpoint | `curl -s https://api.gada.vn/api/v1/version` → expect JSON with current version | DevOps | | |
| 2.5 | Check CloudWatch logs for startup errors | `/ecs/gada-vn-prod/api` — no ERROR level logs in first 2 minutes | DevOps | | |
| 2.6 | Test OTP send (staging number, if available) | `curl -X POST https://api.gada.vn/api/v1/auth/otp/send -d '{"phone":"+84900000001"}'` | Backend | | |

**HALT if**: 2.2 fails (service does not stabilise within 10 minutes) or 2.3 returns non-200.

---

### Step 3 — Admin Panel (PHP)

| # | Task | Command / Action | Owner | Time | Result |
|---|------|-----------------|-------|------|--------|
| 3.1 | Deploy admin ECS service | `aws ecs update-service --cluster gada-vn-prod --service gada-vn-prod-admin --force-new-deployment` | DevOps | | |
| 3.2 | Wait for steady state | `aws ecs wait services-stable --cluster gada-vn-prod --services gada-vn-prod-admin` | DevOps | | |
| 3.3 | Navigate to `https://admin.gada.vn` | Admin login page loads | Operations | | |
| 3.4 | Log in with production admin password | Dashboard loads, pending approvals count shows 0 | Operations | | |
| 3.5 | Verify dashboard stats render without errors | Active users, jobs, sites counts visible | Operations | | |

---

### Step 4 — Web App (Next.js)

| # | Task | Command / Action | Owner | Time | Result |
|---|------|-----------------|-------|------|--------|
| 4.1 | Deploy web ECS service | `aws ecs update-service --cluster gada-vn-prod --service gada-vn-prod-web --force-new-deployment` | DevOps | | |
| 4.2 | Wait for steady state | `aws ecs wait services-stable --cluster gada-vn-prod --services gada-vn-prod-web` | DevOps | | |
| 4.3 | Navigate to `https://gada.vn` | Landing page loads in Korean | Frontend | | |
| 4.4 | Navigate to `https://gada.vn/vi` | Landing page loads in Vietnamese | Frontend | | |
| 4.5 | Navigate to `https://gada.vn/ko/jobs` | Public job listing renders (may be empty) | Frontend | | |
| 4.6 | Check page source for `NEXT_PUBLIC_API_BASE_URL` | Should be `https://api.gada.vn/api/v1` (not staging URL) | Frontend | | |
| 4.7 | Verify no console errors (open browser DevTools) | 0 errors in console | Frontend | | |
| 4.8 | Verify `https://gada.vn/robots.txt` accessible | Returns valid robots.txt content | Frontend | | |
| 4.9 | Verify `https://gada.vn/sitemap.xml` accessible | Returns XML sitemap | Frontend | | |

---

### Step 5 — End-to-End Critical Path Smoke Test

Perform a complete critical path through all user types. Requires test accounts.

| # | Flow | Expected result | Owner | Time | Result |
|---|------|----------------|-------|------|--------|
| 5.1 | **Worker registration**: Register a new worker with a test Vietnamese phone number | OTP received within 60s; worker profile created | QA | | |
| 5.2 | **Worker profile**: Complete profile with name, trade, ID document upload | Profile saved; ID document visible | QA | | |
| 5.3 | **Manager registration**: Register a new manager with a test Korean phone number | Manager profile created with status PENDING | QA | | |
| 5.4 | **Admin approval**: Log in as admin, approve the test manager | Manager status → APPROVED | Operations | | |
| 5.5 | **Site creation**: Log in as manager, create a construction site in Ho Chi Minh City | Site created and visible in manager dashboard | QA | | |
| 5.6 | **Job posting**: Post a job with 2 slots, ₫500,000 daily wage | Job visible on public listing at `gada.vn` | QA | | |
| 5.7 | **Worker apply**: Worker applies for the posted job | Application status → PENDING for manager | QA | | |
| 5.8 | **Manager accept**: Manager accepts the worker application | Application status → ACCEPTED; worker notified | QA | | |
| 5.9 | **Contract generation**: Manager generates contract for the accepted worker | Contract status → PENDING_WORKER_SIGN | QA | | |
| 5.10 | **Worker sign**: Worker signs the contract | Status → PENDING_MANAGER_SIGN | QA | | |
| 5.11 | **Manager sign**: Manager signs the contract | Status → FULLY_SIGNED | QA | | |
| 5.12 | **Attendance mark**: Manager marks worker as attended for today | Attendance record visible to both parties | QA | | |

**HALT if**: Any step 5.1–5.11 fails. The core platform loop is broken.

---

### Step 6 — Mobile App

| # | Task | Owner | Time | Result |
|---|------|-------|------|--------|
| 6.1 | Install production build on Android test device | Mobile | | |
| 6.2 | Install production build on iOS test device | Mobile | | |
| 6.3 | Register via phone OTP on Android | Mobile | | |
| 6.4 | Register via phone OTP on iOS | Mobile | | |
| 6.5 | Verify `EXPO_PUBLIC_API_URL` points to `api.gada.vn` (check network tab in Expo DevTools) | Mobile | | |
| 6.6 | Browse job listings on mobile (province filter works) | Mobile | | |
| 6.7 | Submit App Store / Play Store review submission (if day-1 is a store release) | Mobile | | |

---

## T+1h: Post-Deploy Monitoring

Observe for the first hour after all services are deployed.

| # | Check | Healthy threshold | Owner | Result |
|---|-------|-----------------|-------|--------|
| M1 | CloudWatch alarm status | All alarms GREEN | DevOps | |
| M2 | API 5xx rate | < 0.1% | DevOps | |
| M3 | ECS running task count | API: 2, Web: 2, Admin: 1 | DevOps | |
| M4 | RDS CPU | < 30% | DevOps | |
| M5 | Redis connection count | < 100 | DevOps | |
| M6 | API p95 response time | < 500ms | DevOps | |
| M7 | Support channel — incoming user errors | 0 critical issues reported | Operations | |
| M8 | Firebase console — OTP success rate | > 90% | Backend | |

**If any alarm fires during T+0h to T+1h**: treat as P1 incident. Follow `docs/ops/incident-response-guide.md`.

---

## T+4h: First-Hour Stability Sign-Off

After 4 hours of stable operation with no P0/P1 incidents:

| # | Task | Owner |
|---|------|-------|
| S1 | Confirm zero P0 incidents in the first 4 hours | Release coordinator |
| S2 | CloudWatch log error rate normal | DevOps |
| S3 | At least one real user registration confirmed (non-test account) | Operations |
| S4 | Publish launch announcement to KakaoTalk and Zalo channels | Operations |
| S5 | Update `STATUS.md` or internal wiki: MVP launched | Release coordinator |

---

## Rollback Decision Gate

If at any point before T+4h a P0 incident cannot be resolved within 30 minutes:

**Decision to rollback**:
1. Announce in `#gada-incidents`: "[ROLLBACK] Production release being rolled back"
2. Roll back each ECS service to the previous task definition revision:
   ```bash
   for svc in api web admin; do
     PREV=$(aws ecs describe-task-definition \
       --task-definition gada-vn-prod-${svc} \
       --query 'taskDefinition.revision' --output text)
     aws ecs update-service \
       --cluster gada-vn-prod \
       --service gada-vn-prod-${svc} \
       --task-definition gada-vn-prod-${svc}:$((PREV - 1))
   done
   ```
3. If DB migration was the issue: restore from `gada-vn-prod-pre-launch` snapshot.
4. Communicate to users: post to KakaoTalk / Zalo (use template in `docs/ops/incident-response-guide.md`).
5. Schedule post-mortem within 24 hours.

---

## Sign-Off

| Role | Name | Signature | Time |
|------|------|-----------|------|
| Release coordinator | | | |
| DevOps | | | |
| Backend lead | | | |
| Frontend / Mobile lead | | | |
| QA lead | | | |
| Operations lead | | | |

**Launch declared at**: _______________ KST

**Launch outcome**: ⬜ SUCCESSFUL · ⬜ PARTIAL (known issues) · ⬜ ROLLED BACK

**Known issues at launch** (if any):
-
-
