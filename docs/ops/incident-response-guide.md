# Incident Response Guide — GADA VN

**Product**: GADA VN
**Date**: 2026-03-21
**Version**: MVP
**Audience**: Engineering on-call, operations team

---

## 1. Severity Levels

| Severity | Definition | Examples | Response time | Commander |
|----------|-----------|---------|---------------|-----------|
| **P0 — Critical** | Full service outage; all users affected; data loss or breach | API down, DB unreachable, auth failure for all users, confirmed data breach | 30 min | Senior engineer on call |
| **P1 — High** | Core workflow broken for a significant user segment | Contract signing failing, OTP delivery down, ECS task restart loop, admin panel inaccessible | 2h | On-call engineer |
| **P2 — Medium** | Degraded performance or partial feature failure | Image upload slow (>10s), push notifications delayed >30 min, dashboard stats not loading | 4h | On-call engineer |
| **P3 — Low** | Minor issue, cosmetic, non-blocking | Translation key missing, minor UI misalignment, slow admin query | 1 BD | Standard sprint |

---

## 2. On-Call Contacts

| Role | Primary contact | Backup |
|------|----------------|--------|
| Engineering on-call | Slack `#gada-oncall` + PagerDuty | Engineering lead |
| DB / infrastructure | Engineering lead | AWS Support (Business plan) |
| Firebase issues | Engineering lead | Firebase support console |
| Security / breach | Engineering lead + management | Legal counsel |
| External comms (users) | Operations lead | Support team |

> **MVP note**: Formal PagerDuty rotation is not yet configured. For P0, contact the engineering lead directly via phone.

---

## 3. General Incident Response Process

```
1. DETECT — Alert fires (CloudWatch alarm, user report, self-detection)
            |
2. TRIAGE — Determine severity (P0/P1/P2/P3)
            |
3. DECLARE — Post in #gada-incidents Slack channel:
             "[P0 INCIDENT] <title> — investigating"
            |
4. INVESTIGATE — Follow the relevant playbook below
            |
5. MITIGATE — Restore service (rollback, restart, hotfix)
            |
6. COMMUNICATE — Update users if P0/P1:
             - Admin panel banner (if accessible)
             - KakaoTalk / Zalo channel notice
            |
7. RESOLVE — Post "[RESOLVED] <title>" in #gada-incidents
            |
8. POST-MORTEM — Complete within 72h of P0/P1 resolution
```

---

## 4. Playbooks

### 4.1 API Service Down (ECS Fargate Unhealthy)

**Symptoms**: All API calls return 502/503; CloudWatch alarm `gada-ecs-unhealthy-task` fires.

**Detection**: CloudWatch alarm → `gada-ecs-unhealthy-task` → Slack notification.

**Investigation steps**:

```bash
# 1. Check ECS service status
aws ecs describe-services \
  --cluster gada-vn-prod \
  --services gada-vn-prod-api \
  --region ap-southeast-1 \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount,deployments:deployments}'

# 2. Get recent task stop reason
aws ecs list-tasks \
  --cluster gada-vn-prod \
  --service-name gada-vn-prod-api \
  --desired-status STOPPED \
  --region ap-southeast-1

aws ecs describe-tasks \
  --cluster gada-vn-prod \
  --tasks <TASK_ARN> \
  --region ap-southeast-1 \
  --query 'tasks[0].{stopCode:stopCode,stoppedReason:stoppedReason,containers:containers[*].{name:name,reason:reason,exitCode:exitCode}}'

# 3. Check application logs (last 100 lines)
aws logs get-log-events \
  --log-group-name /ecs/gada-vn-prod/api \
  --log-stream-name $(aws logs describe-log-streams \
    --log-group-name /ecs/gada-vn-prod/api \
    --order-by LastEventTime --descending \
    --query 'logStreams[0].logStreamName' --output text) \
  --limit 100
```

**Common causes and fixes**:

| Stop reason | Fix |
|-------------|-----|
| `OutOfMemoryError` | Increase task memory in CDK (`memoryLimitMiB`) → redeploy |
| `CannotPullContainerError` | Check ECR credentials; verify task role has ECR pull permission |
| `DockerTimeoutError: Health check` | Check `/health` endpoint; verify DB connection in app startup |
| App crash on startup | Check logs for startup error; most likely bad env var or DB unreachable |
| Deployment in progress | Wait for new deployment to stabilise (2–5 min) |

**Rollback**:

```bash
# Get the previous task definition revision
aws ecs describe-task-definition \
  --task-definition gada-vn-prod-api \
  --region ap-southeast-1

# Update service to previous revision (N-1)
aws ecs update-service \
  --cluster gada-vn-prod \
  --service gada-vn-prod-api \
  --task-definition gada-vn-prod-api:<PREVIOUS_REVISION> \
  --region ap-southeast-1
```

---

### 4.2 Database Unreachable

**Symptoms**: API returns 500; logs show `SQLSTATE[08006]` or `Connection refused to RDS`; CloudWatch alarm `gada-rds-cpu` or connectivity check fails.

**Investigation steps**:

```bash
# 1. Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier gada-vn-prod-postgres \
  --region ap-southeast-1 \
  --query 'DBInstances[0].{status:DBInstanceStatus,endpoint:Endpoint.Address,iops:Iops}'

# 2. Check RDS events (last 1 hour)
aws rds describe-events \
  --source-identifier gada-vn-prod-postgres \
  --source-type db-instance \
  --duration 60 \
  --region ap-southeast-1

# 3. Check if it's a VPC security group issue
# Verify the ECS task security group has outbound to RDS security group on port 5432
```

**Common causes**:

| Cause | Fix |
|-------|-----|
| RDS instance in maintenance window | Wait; RDS restarts take 1–3 min; enable Multi-AZ for prod |
| Storage full | Check `FreeStorageSpace` CloudWatch metric; increase allocated storage |
| Max connections exceeded | Check `DatabaseConnections` metric; review connection pool settings |
| Security group rule missing | Add inbound rule to RDS SG: source = ECS SG, port 5432 |
| RDS rebooting after patching | Wait 2–3 min; monitor status |

**Mitigation**: If RDS is unavailable for > 5 min during business hours, trigger user communication (P0):
- Post to KakaoTalk / Zalo: "서비스 일시 장애 안내 — 현재 기술팀이 복구 작업 중입니다. 불편을 드려서 죄송합니다."

---

### 4.3 Authentication Failure (Firebase)

**Symptoms**: Users cannot log in; OTP never arrives or fails verification; all auth endpoints return 401 or 403.

**Detection**: Support spike (W-1/W-2 tickets) or CloudWatch metric `gada-api-auth-failure-rate` > threshold.

**Investigation steps**:

```bash
# 1. Test OTP endpoint directly (replace with test number)
curl -X POST https://api.gada.vn/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"+84900000001"}'

# 2. Check Firebase project status
# → console.firebase.google.com → project gada-vn → check for quota exceeded or outage

# 3. Check Firebase credentials in container
# ECS exec into running task (requires ECS Exec enabled):
aws ecs execute-command \
  --cluster gada-vn-prod \
  --task <TASK_ARN> \
  --container api \
  --interactive \
  --command "ls /run/secrets/"

# 4. Check Firebase Admin SDK errors in logs
aws logs filter-log-events \
  --log-group-name /ecs/gada-vn-prod/api \
  --filter-pattern "Firebase" \
  --start-time $(date -d '1 hour ago' +%s000)
```

**Common causes**:

| Cause | Fix |
|-------|-----|
| Firebase project quota exceeded (SMS) | Check Firebase console → Authentication → Usage; request quota increase |
| Firebase service account credentials expired | Rotate service account key in GCP console; update secret in AWS Secrets Manager; redeploy |
| Firebase project ID mismatch (wrong env var) | Verify `FIREBASE_PROJECT_ID` in SSM matches deployed environment |
| Firebase outage | Check [Firebase status page](https://status.firebase.google.com/); wait for Firebase resolution |
| Rate limiting triggered (SEC-P0-02) | Verify throttle config; if false positive, temporarily increase limit |

---

### 4.4 Image / File Upload Failure (S3)

**Symptoms**: Workers cannot upload ID documents; manager signature images not saving; 500 errors on upload endpoints.

**Investigation steps**:

```bash
# 1. Test S3 connectivity from ECS task role
aws s3 ls s3://gada-vn-production-uploads/ --region ap-southeast-1

# 2. Check S3 bucket policy (should deny public access)
aws s3api get-bucket-acl --bucket gada-vn-production-uploads

# 3. Check ECS task role has S3 permissions
aws iam simulate-principal-policy \
  --policy-source-arn <TASK_ROLE_ARN> \
  --action-names s3:PutObject s3:GetObject \
  --resource-arns "arn:aws:s3:::gada-vn-production-uploads/*"
```

**Common causes**:

| Cause | Fix |
|-------|-----|
| Task role missing S3 permission | Add `s3:PutObject`/`s3:GetObject` to task role in CDK; redeploy |
| Bucket in different region | Ensure bucket is in `ap-southeast-1`; check `AWS_DEFAULT_REGION` env var |
| File too large (>5MB for ID docs) | Application-level validation should reject; if bypassed, check SEC-P0-03 fix |
| CORS misconfiguration | Review CDK CdnStack CORS rules; allow `api.gada.vn` as origin |

---

### 4.5 Data Breach or Privacy Incident

**Symptoms**: Unauthorised access to user PII; S3 bucket publicly accessible; ID documents exposed; contract data leaked.

**Immediate response (first 30 minutes)**:

1. **Contain**: Identify the vector.
   - If S3 bucket is public: immediately revoke public access via `aws s3api put-public-access-block`
   - If API endpoint is leaking data: disable the endpoint (ECS task env var + force redeploy)
   - If DB credentials are compromised: rotate immediately in Secrets Manager + RDS
2. **Assess scope**: How many users affected? What data was exposed?
3. **Preserve evidence**: Take CloudWatch log snapshots; do NOT delete logs.
4. **Notify management and legal**: Within 1 hour of detection.
5. **Do not communicate publicly** until legal review is complete.

**Notification obligations**:
- Vietnamese PDPA requires notification to users within **72 hours** of confirmed breach if sensitive personal data (ID documents, financial data) is involved.
- Notification must include: what data was affected, when the incident occurred, what actions have been taken.

**Post-breach**:
1. Rotate all secrets (APP_KEY, ENCRYPTION_KEY, Firebase credentials, DB password).
2. Audit `sec.audit_log` for access patterns.
3. Review and patch the vulnerability.
4. Deploy a hotfix.
5. File incident report per legal requirements.

---

### 4.6 Redis / Queue Failure

**Symptoms**: Job notifications delayed or missing; session-dependent flows fail; queue worker logs show connection errors.

**Investigation**:

```bash
# Check ElastiCache cluster status
aws elasticache describe-replication-groups \
  --replication-group-id gada-vn-prod \
  --region ap-southeast-1 \
  --query 'ReplicationGroups[0].{status:Status,endpoint:NodeGroups[0].PrimaryEndpoint}'

# Check queue depth via Redis CLI (through bastion)
redis-cli -h <REDIS_HOST> info keyspace
redis-cli -h <REDIS_HOST> llen queue:default
redis-cli -h <REDIS_HOST> llen queue:failed
```

**Mitigation**: If Redis is unavailable and sessions are affected, set `SESSION_DRIVER=cookie` temporarily (requires redeployment). Queue jobs will accumulate and retry when Redis recovers.

---

## 5. Rollback Procedure

### Application Rollback (ECS)

```bash
# Get previous task definition revision
PREV_REVISION=$(aws ecs describe-task-definition \
  --task-definition gada-vn-prod-api \
  --query 'taskDefinition.revision' \
  --output text)
PREV_REVISION=$((PREV_REVISION - 1))

# Roll back API service
aws ecs update-service \
  --cluster gada-vn-prod \
  --service gada-vn-prod-api \
  --task-definition gada-vn-prod-api:${PREV_REVISION} \
  --region ap-southeast-1

# Roll back Web service
aws ecs update-service \
  --cluster gada-vn-prod \
  --service gada-vn-prod-web \
  --task-definition gada-vn-prod-web:${PREV_REVISION} \
  --region ap-southeast-1
```

### Database Rollback

Database migrations are one-directional. Rolling back requires:
1. Restore from the most recent automated RDS snapshot (1-day granularity minimum).
2. Identify snapshot: `aws rds describe-db-snapshots --db-instance-identifier gada-vn-prod-postgres`
3. Restore to a new DB instance; update the `DB_HOST` SSM parameter; redeploy.

> **Warning**: DB restore causes data loss for the period between snapshot and incident. Evaluate carefully before proceeding.

---

## 6. Post-Mortem Template

Complete within 72 hours of P0/P1 resolution. File in `docs/incidents/YYYY-MM-DD-title.md`.

```markdown
# Incident Post-Mortem: <title>

**Date**: YYYY-MM-DD
**Severity**: P0 / P1
**Duration**: HH:MM — HH:MM (total: X hours Y minutes)
**Author**: <name>
**Status**: Draft / Final

## Summary
One paragraph: what happened, user impact, root cause.

## Timeline
| Time (KST) | Event |
|------------|-------|
| HH:MM | Alert fired / issue reported |
| HH:MM | Engineering notified |
| HH:MM | Root cause identified: <cause> |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |
| HH:MM | Incident closed |

## Root Cause
<Detailed explanation of the technical root cause>

## Contributing Factors
- <factor 1>
- <factor 2>

## Impact
- Users affected: ~N workers, ~N managers
- Features unavailable: <list>
- Data lost/corrupted: <none / describe>

## Mitigation Steps Taken
1.
2.

## Action Items
| Action | Owner | Due date |
|--------|-------|----------|
| <preventive fix> | <engineer> | YYYY-MM-DD |
| <monitoring improvement> | <engineer> | YYYY-MM-DD |

## Lessons Learned
- What worked well
- What could be improved
```

---

## 7. Communication Templates

### User-Facing Outage Notice (Korean / Vietnamese)

**KakaoTalk / Zalo (short)**:

Korean:
```
[GADA VN 공지] 현재 서비스 접속 장애가 발생하였습니다. 기술팀이 빠르게 복구 중입니다. 불편을 드려 죄송합니다.
```

Vietnamese:
```
[Thông báo GADA VN] Hiện tại dịch vụ đang gặp sự cố. Đội kỹ thuật đang khắc phục ngay lập tức. Xin lỗi vì sự bất tiện này.
```

**Resolved notice**:

Korean:
```
[GADA VN 공지] 서비스가 정상 복구되었습니다. 이용해 주셔서 감사합니다.
```

Vietnamese:
```
[Thông báo GADA VN] Dịch vụ đã được khôi phục bình thường. Cảm ơn bạn đã kiên nhẫn chờ đợi.
```

---

## 8. Monitoring Quick Reference

| Metric | CloudWatch namespace | Alarm name |
|--------|---------------------|-----------|
| ECS unhealthy task | AWS/ECS | `gada-ecs-unhealthy-task` |
| API 5xx rate | AWS/ApplicationELB | `gada-api-5xx-rate` |
| RDS CPU | AWS/RDS | `gada-rds-cpu` |
| RDS free storage | AWS/RDS | `gada-rds-storage` |
| Redis evictions | AWS/ElastiCache | `gada-redis-evictions` |
| Queue dead letter | Custom/Gada | `gada-queue-dead-letter` |

Log groups:
- `/ecs/gada-vn-prod/api` — Laravel API
- `/ecs/gada-vn-prod/web` — Next.js Web
- `/ecs/gada-vn-prod/admin` — PHP Admin
