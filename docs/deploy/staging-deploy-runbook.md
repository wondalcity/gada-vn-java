# GADA VN Staging — Deploy Runbook

**Environment**: Staging
**Instance**: `i-060b635518a854b74` (`ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com`)
**Region**: `ap-southeast-1`
**Access**: AWS SSM Session Manager (no SSH key required)

---

## Prerequisites

Local machine:
- AWS CLI v2 configured with profile `wonyuep`
- `session-manager-plugin` installed (`brew install --cask session-manager-plugin`)
- IAM permissions: SSM StartSession on the staging instance

---

## 1. Connect to the Instance

```bash
aws ssm start-session \
  --target i-060b635518a854b74 \
  --region ap-southeast-1 \
  --profile wonyuep
```

All subsequent commands run **inside the SSM session** as `ssm-user`.

---

## 2. Deploy Latest `main`

```bash
cd /opt/gada
sudo bash deploy/staging/scripts/deploy.sh
```

### What `deploy.sh` does (in order)

| Step | Action |
|------|--------|
| 1 | Saves `HEAD` SHA to `.rollback-sha` |
| 2 | `git fetch origin && git reset --hard origin/main` |
| 3 | Fetches secrets from AWS Secrets Manager → writes `.env.api`, `.env.admin`, `.env.web` |
| 4 | Sources `.env.web` for `NEXT_PUBLIC_*` build-time vars |
| 5 | `docker compose build --parallel` (all 3 app images) |
| 6 | Tags images: `gada-api:<sha>`, `gada-admin:<sha>`, `gada-web:<sha>` |
| 7 | Rolling restart: **api** → wait healthy → **admin** → wait healthy → **web** → wait healthy |
| 8 | `nginx` config reload |
| 9 | Smoke tests: HTTP 200 on `/v1/health`, `/`, `:8080/health` |
| 10 | Prunes dangling images older than 24h |
| 11 | Writes new SHA to `.current-sha` |

### Expected output (success)

```
[HH:MM:SS] Current SHA: abcd1234efgh5678...
[HH:MM:SS] Deploying SHA: <new-sha> (tag: <8-char>)
[HH:MM:SS] Fetching secrets...
[HH:MM:SS] All secrets fetched.
[HH:MM:SS] Building images (tag: <8-char>)...
[HH:MM:SS] api healthy ✓
[HH:MM:SS] admin healthy ✓
[HH:MM:SS] web healthy ✓
[HH:MM:SS] API:   200
[HH:MM:SS] Web:   200
[HH:MM:SS] Admin: 200
[HH:MM:SS] Deploy complete. SHA: <8-char>
```

---

## 3. Deploy a Specific Git Ref

```bash
sudo bash deploy/staging/scripts/deploy.sh origin/feature/my-branch
# or a specific commit
sudo bash deploy/staging/scripts/deploy.sh abc12345
```

---

## 4. Deploy to a Specific Service Only (Skip Full Deploy)

If only one service changed and a full redeploy is too slow:

```bash
cd /opt/gada
# Rebuild and restart only web
IMAGE_TAG=$(cat deploy/staging/.current-sha)
export IMAGE_TAG

docker compose -f deploy/staging/docker-compose.staging.yml \
  build --no-cache web

docker tag gada-web:latest "gada-web:$IMAGE_TAG"

docker compose -f deploy/staging/docker-compose.staging.yml \
  up -d --no-deps web
```

---

## 5. Verify Services After Deploy

```bash
# Container status
docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml ps

# Quick HTTP check
curl -s -o /dev/null -w "%{http_code}" http://localhost/v1/health    # → 200
curl -s -o /dev/null -w "%{http_code}" http://localhost/              # → 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health   # → 200

# Tail logs
docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml logs -f --tail=50 api
```

---

## 6. If Deploy Fails

The script aborts with `[ERROR]` on first failure. The previous containers remain running — **no automatic rollback**.

Check what went wrong:
```bash
docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml logs --tail=100 api
docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml logs --tail=100 web
docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml logs --tail=100 admin
```

Then either:
- Fix the underlying issue and re-run `deploy.sh`
- Roll back to previous version (see [staging-rollback-runbook.md](staging-rollback-runbook.md))

---

## 7. Update Secrets

If a secret value changed in AWS Secrets Manager:

```bash
cd /opt/gada
sudo bash deploy/staging/scripts/fetch-secrets.sh

# Then restart the affected service
sudo bash deploy/staging/scripts/restart.sh api
```

---

## 8. Common Operations

| Task | Command |
|------|---------|
| Restart all | `sudo bash /opt/gada/deploy/staging/scripts/restart.sh` |
| Restart api | `sudo bash /opt/gada/deploy/staging/scripts/restart.sh api` |
| Restart web | `sudo bash /opt/gada/deploy/staging/scripts/restart.sh web` |
| Reload nginx | `sudo bash /opt/gada/deploy/staging/scripts/restart.sh nginx` |
| View all logs | `docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml logs -f` |
| Current SHA | `cat /opt/gada/deploy/staging/.current-sha` |
| Rollback SHA | `cat /opt/gada/deploy/staging/.rollback-sha` |

---

## Appendix: File Locations on EC2

| Path | Purpose |
|------|---------|
| `/opt/gada/` | Git repo root |
| `/opt/gada/deploy/staging/` | Staging deploy config |
| `/opt/gada/deploy/staging/.env.api` | API env vars (generated, 600) |
| `/opt/gada/deploy/staging/.env.admin` | Admin env vars (generated, 600) |
| `/opt/gada/deploy/staging/.env.web` | Web env vars (generated, 600) |
| `/opt/gada/deploy/staging/secrets/` | Firebase credentials JSON (700) |
| `/opt/gada/deploy/staging/.current-sha` | Currently running 8-char SHA |
| `/opt/gada/deploy/staging/.rollback-sha` | Previous SHA (set by deploy.sh) |
| `/var/log/user-data.log` | EC2 bootstrap log |
