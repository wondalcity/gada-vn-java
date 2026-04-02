# GADA VN Staging — Rollback Runbook

**Use this when**: A deploy broke staging and you need to restore the previous working version fast.

---

## Decision Tree

```
Something is broken after deploy?
│
├─ Services still starting? → wait 30s and re-check
│
├─ Only one service broken?
│   └─ Restart that service first: restart.sh <service>
│       └─ Still broken? → Roll back (Section 1)
│
└─ Multiple services broken OR API health failing?
    └─ Roll back immediately (Section 1)
```

---

## 1. Immediate Rollback (to Previous Deploy)

Connect to the instance:
```bash
aws ssm start-session \
  --target i-060b635518a854b74 \
  --region ap-southeast-1 \
  --profile wonyuep
```

Run rollback (uses `.rollback-sha` saved by the last `deploy.sh`):
```bash
cd /opt/gada
sudo bash deploy/staging/scripts/rollback.sh
```

Expected output:
```
[HH:MM:SS] Current: <broken-sha> → Rolling back to: <prev-sha>
[HH:MM:SS] Images found locally — using cached images for <prev-sha>.
[HH:MM:SS] Switching to IMAGE_TAG=<prev-sha>...
[HH:MM:SS] API health after rollback: HTTP 200
[HH:MM:SS] Rollback complete → <prev-sha>
```

Verify:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost/v1/health  # → 200
```

---

## 2. Rollback to a Specific SHA

If `.rollback-sha` points to a bad commit (e.g., two bad deploys in a row):

```bash
# Check git log for a good SHA
cd /opt/gada
git log --oneline -10

# Roll back to a specific commit
sudo bash deploy/staging/scripts/rollback.sh abc12345
```

The script accepts either a full SHA or an 8-char short SHA.

---

## 3. What `rollback.sh` Does

1. Reads target SHA from `.rollback-sha` (or CLI argument)
2. Checks if `gada-api:<sha>`, `gada-admin:<sha>`, `gada-web:<sha>` images exist locally
3. **If images exist**: checks out code at that SHA, switches containers to cached images
4. **If images are missing**: fetches Git, re-runs `fetch-secrets.sh`, rebuilds Docker images from source
5. Runs `docker compose up -d --no-deps api admin web`
6. Waits 10s and checks `GET /v1/health` → logs result
7. Writes short SHA to `.current-sha`

---

## 4. If Rollback Also Fails

Check logs for the previous-version containers:
```bash
COMPOSE=/opt/gada/deploy/staging/docker-compose.staging.yml

docker compose -f $COMPOSE logs --tail=100 api
docker compose -f $COMPOSE logs --tail=100 web
docker compose -f $COMPOSE logs --tail=100 admin
docker compose -f $COMPOSE logs --tail=100 nginx
```

Check secrets are up to date:
```bash
sudo bash /opt/gada/deploy/staging/scripts/fetch-secrets.sh --dry-run
```

Check disk space (builds fail silently when full):
```bash
df -h /
docker system df
```

---

## 5. Emergency: Restore from Known-Good SHA

If you need to go back more than one deploy and don't know the SHA:

```bash
cd /opt/gada
# List all locally cached image tags
docker images | grep gada-

# Pick a good sha8
sudo bash deploy/staging/scripts/rollback.sh <sha8>
```

If no local images remain for the target SHA:
```bash
sudo bash deploy/staging/scripts/rollback.sh <full-git-sha>
# Script will rebuild from git at that SHA
```

---

## 6. Post-Rollback Steps

After a successful rollback:

1. **Notify the team** that staging is rolled back to `<sha>`
2. **File a GitHub issue** with the broken SHA and symptoms
3. **Investigate** the broken deploy before pushing again:
   ```bash
   git diff <rollback-sha>..<broken-sha>
   docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml logs --since=<broken-time> api
   ```
4. **Fix the issue** on a branch, redeploy after review

---

## Quick Reference

| Situation | Command |
|-----------|---------|
| Roll back to previous | `sudo bash /opt/gada/deploy/staging/scripts/rollback.sh` |
| Roll back to SHA | `sudo bash /opt/gada/deploy/staging/scripts/rollback.sh abc12345` |
| Check current SHA | `cat /opt/gada/deploy/staging/.current-sha` |
| Check rollback target | `cat /opt/gada/deploy/staging/.rollback-sha` |
| List cached images | `docker images \| grep gada-` |
| API health | `curl -s http://localhost/v1/health` |
| All service status | `docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml ps` |
