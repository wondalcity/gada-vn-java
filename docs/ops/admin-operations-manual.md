# Admin Operations Manual — GADA VN

**Product**: GADA VN
**Date**: 2026-03-21
**Version**: MVP
**Audience**: Platform administrators
**Admin panel**: `https://admin.gada.vn` (production) · `https://admin-staging.gada.vn` (staging)

---

## 1. Daily Operations Checklist

Run this checklist every business day (Monday–Saturday, KST 09:00).

### Morning Check (09:00–09:30)

| Task | Where | What to look for |
|------|-------|-----------------|
| Check pending manager approvals | Admin → Manager Approvals → Filter: 대기 중 | Process any requests received overnight; target < 24h response |
| Review dashboard stats | Admin → Dashboard | Unusual spike or drop in active users, new user count |
| Check for system alerts | AWS CloudWatch → `gada-vn-prod` alarm group | Any ECS unhealthy task, RDS CPU > 80%, Redis evictions |
| Review error rate | CloudWatch Logs → `/ecs/gada-vn-prod/api` | Error log rate; any 5xx spikes in the past 12 hours |
| Check failed jobs queue | Redis (via CloudWatch metrics) | `queue:failed` key — if > 0, investigate worker logs |

### End-of-Day Check (18:00)

| Task | Where |
|------|-------|
| Confirm all pending manager approvals from that day were processed | Admin → Manager Approvals |
| Check attendance summary for any anomalies (e.g., 100% absent for a large site) | Admin → Attendance |
| Review any unread support escalations | Support inbox / escalation channel |
| Verify daily DB backup completed | AWS RDS → Automated backups |

---

## 2. Manager Approval Workflow

### 2.1 Standard Approval

1. Navigate to **Admin → Manager Approvals** (or click the pending count on the dashboard).
2. Review each pending application:
   - Company name (사업체명)
   - Representative name (대표자명)
   - Contact phone number
   - Business type
   - First construction site name and address
3. **Identity verification**: GADA VN MVP does not integrate a business registration API. Manual verification is required for suspicious applications:
   - Cross-reference the company name in [사업자등록정보 진위확인 (국세청)](https://www.hometax.go.kr/)
   - If phone number is uncontactable or company is unknown, reject with reason.
4. Click **승인 (Approve)** for legitimate applications.
5. The manager receives an in-app notification and can immediately begin posting jobs.

### 2.2 Rejection

1. Click **거부 (Reject)**.
2. Enter a rejection reason in the dialog. Standard reasons:
   - `사업자등록번호 확인 불가` — business registration could not be verified
   - `연락처 불통` — phone number unreachable
   - `중복 계정 의심` — suspected duplicate account
   - `정보 불충분` — insufficient information provided
3. The manager receives an in-app notification with the reason text.
4. A rejected manager **cannot** post jobs but their account remains accessible for reapplication after correcting their profile.

> **Re-application**: Rejected managers may update their profile and resubmit. This does not require a new phone number — the manager clicks "재신청" from their dashboard. A new pending entry appears in the admin queue.

### 2.3 Bulk Approval

Use bulk approval only when processing a batch of clearly legitimate applications (e.g., verified enterprise partners onboarded offline).

1. Select multiple managers using checkboxes.
2. Click **일괄 승인**.
3. Confirm the dialog — this action cannot be undone.
4. Maximum batch size: 100.

### 2.4 Approval SLA

| Request type | Target response time |
|--------------|---------------------|
| Standard application | Within 24 business hours |
| Applications submitted Friday–Sunday | By Monday 12:00 |
| Enterprise / verified partner | Same day, coordinated with sales |

---

## 3. User Management

### 3.1 Searching Users

Navigate to **Admin → User Management**.

- Search by **phone number** (exact or partial): most reliable lookup method.
- Search by **name**: supports partial match; returns workers and managers.
- Filter by **role**: Worker / Manager.
- Filter by **status**: ACTIVE / SUSPENDED / DELETED.

### 3.2 Suspending an Account

Use suspension for accounts that violate terms of service but where permanent deletion is not warranted.

1. Open the user's detail page.
2. Click **계정 정지 (Suspend)**.
3. Enter a reason (logged internally, not shown to user).
4. Confirm.

**Effect**: The user's Firebase token remains valid until it naturally expires, but all API calls return `403 Account not active`. On next login attempt, OTP verification fails.

> **Note (SEC-P0-01 fix required)**: Until the `FirebaseAuthMiddleware` fix is deployed, the middleware only blocks users with status `'deleted'` (lowercase). A suspended user may still make API calls with a valid JWT. Ensure SEC-P0-01 is patched before suspending accounts in production.

### 3.3 Restoring a Suspended Account

1. Open the suspended user's detail page.
2. Click **정지 해제 (Unsuspend)**.
3. User status returns to ACTIVE; they can log in immediately.

### 3.4 Deleting an Account

Account deletion is soft-delete only. User data is retained in the database for legal/contract record requirements.

1. Open the user's detail page.
2. Click **계정 삭제 (Delete)**.
3. Read the warning dialog listing any active contracts or pending jobs.
4. Confirm.

**Effect**: Status set to `DELETED`. User cannot log in. Their signed contracts remain accessible to the other party.

> **Restriction**: You cannot delete your own admin account. The system blocks this action.

**When NOT to delete**:
- Worker has a FULLY_SIGNED contract that is ongoing — coordinate with manager first.
- Manager has OPEN jobs with accepted applicants — close the jobs first or reassign.

### 3.5 Handling a Deceased Worker

If notified that a worker account belongs to a deceased individual:
1. Suspend the account immediately.
2. Document the notification source and date in the internal note field.
3. Do not delete — retain for legal compliance.
4. Notify the legal/compliance team.

---

## 4. Job and Site Oversight

### 4.1 Reviewing Active Jobs

Navigate to **Admin → Jobs**.

Admins can view but not edit job postings. If a job contains prohibited content:
1. Note the job ID and the manager who posted it.
2. Contact the manager via phone or the internal messaging system.
3. If the manager does not resolve within 24 hours, suspend the manager's account.

### 4.2 Force-Closing a Job

There is no direct "force close" button in the admin panel MVP. To close a job:
1. Suspend the manager's account (which prevents new applicants).
2. File a support ticket with the development team to execute a DB update: `UPDATE app.jobs SET status = 'CLOSED' WHERE id = '{job_id}'`.
3. Restore the manager's account after the job is closed.

> **Post-MVP**: A job-level admin action (force close, flag, hide) is planned for v1.1.

### 4.3 Construction Site Oversight

Navigate to **Admin → Sites**.

- Filter by province to review regional activity.
- Sites cannot be deleted from the admin panel without deleting the owning manager.
- Report suspicious site addresses to the operations team.

---

## 5. Contract Oversight

Navigate to **Admin → Contracts**.

Admins can view all contracts regardless of status. Read-only access only — contracts cannot be modified.

| Contract status | Meaning |
|----------------|---------|
| `PENDING_WORKER_SIGN` | Generated, waiting for worker to sign |
| `PENDING_MANAGER_SIGN` | Worker signed, waiting for manager to sign |
| `FULLY_SIGNED` | Both parties signed; legally effective |
| `VOID` | Cancelled before full execution |

**Viewing a contract**: Click the contract row → the rendered HTML contract opens in a new pane. Both signature blocks are visible when `FULLY_SIGNED`.

**Privacy note**: Contract HTML contains worker and manager PII (names, phone numbers, addresses). Do not screenshot or share contract content outside of authorised channels. Access to contracts is logged (see section 7).

---

## 6. Privacy-Sensitive Data Handling

### 6.1 Identity Documents (Worker ID Cards)

Worker ID card images are stored in a private S3 bucket (`gada-vn-production-uploads`). Access requires a time-limited presigned URL generated by the Laravel API.

**Admin access policy**:
- Access worker ID documents only when required for dispute resolution or legal compliance.
- Do not download or forward ID document images.
- Each access generates an audit log entry (when audit logging is enabled — SEC-P1-01).
- ID documents are never displayed inline in the admin user list — they are only accessible from the individual user detail page.

**Data retention**: Per Vietnamese personal data protection requirements, ID document images should be retained for a minimum of 3 years from account creation, then purged upon user request or scheduled deletion.

### 6.2 Bank Account Data

Bank account information (account number, bank name) is stored encrypted in the database (AES-256-GCM). Only the last 4 digits are displayed in the admin panel.

- Do not request full bank account numbers from users via support channels.
- If a payment dispute requires the full account number, it must be retrieved via a secure internal DB query with audit trail — contact the engineering team.

### 6.3 Signature Data

Worker and manager signature images (base64 PNG) are stored in the contracts table and in the S3 uploads bucket. Access is governed by the same presigned URL mechanism as ID documents.

### 6.4 Data Subject Requests (GDPR/PDPA equivalent)

If a user requests deletion of their personal data:
1. Verify identity via phone OTP (send OTP to registered number, confirm verbally).
2. Suspend the account.
3. File a request with the engineering team for a data purge (removes: profile name, phone, ID document, signature data).
4. Signed contracts containing the user's PII must be retained for legal compliance — they are excluded from the purge but redacted in future displays.
5. Confirm completion to the user within 30 days of request.

---

## 7. Audit Log Access

Audit logs are stored in `sec.audit_log` in the database. Until an admin UI is built:

```sql
-- View recent admin actions
SELECT actor_id, action, resource_type, resource_id, created_at, metadata
FROM sec.audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;
```

Access the DB via:
- AWS RDS Query Editor (requires IAM permission) — staging only
- Bastion host SSH tunnel — production (requires 2-person approval)

---

## 8. Routine Monitoring

### CloudWatch Alarms (check daily)

| Alarm | Threshold | Action if triggered |
|-------|-----------|---------------------|
| `gada-api-5xx-rate` | > 1% of requests | Check `/ecs/gada-vn-prod/api` logs, escalate to engineering |
| `gada-rds-cpu` | > 80% for 5 min | Check for slow query log, escalate to engineering |
| `gada-redis-evictions` | > 100/min | Check queue depth and session store, escalate |
| `gada-ecs-unhealthy-task` | Any | Trigger incident response (see incident guide) |
| `gada-queue-dead-letter` | > 0 | Investigate failed job in queue:failed; escalate |

### Weekly Review (every Monday)

- New manager registrations vs approvals ratio (low approval rate may indicate UX friction)
- Worker registration count and province distribution
- Job posting count vs application count (low ratio may indicate poor job quality)
- Contract completion rate (FULLY_SIGNED / total CONTRACTED)
- Push notification delivery failure rate (Firebase console)

---

## 9. Admin Account Management

### Adding a New Admin

1. Create a user account in the system via normal registration (phone OTP).
2. Manually set `is_admin = true` in the `auth.users` table (engineering team).
3. Add the phone number's associated email (if any) to `SUPER_ADMIN_EMAILS` in SSM.
4. Confirm the new admin can access the admin panel.

### Admin Password

The admin panel is protected by a shared password (`ADMIN_PANEL_PASSWORD` in SSM). This is separate from individual user accounts.

- The password must not be the default `gadaAdmin2026!`.
- Rotate the password quarterly or after any team member departure.
- Rotation procedure: update SSM parameter → redeploy ECS admin task (new deployment picks up the updated env var).

### Offboarding an Admin

1. Remove their phone number from `SUPER_ADMIN_EMAILS` in SSM.
2. Set `is_admin = false` on their user record.
3. Rotate the shared admin panel password.
4. Redeploy the admin ECS service.
