# GADA VN Staging — Server Command Sequence

Exact commands in exact order. Run from an SSM session as `ssm-user` unless noted otherwise.

**Connect first**:
```bash
# Local machine
aws ssm start-session \
  --target i-060b635518a854b74 \
  --region ap-southeast-1 \
  --profile wonyuep
```

---

## Phase A — Verify Bootstrap (run once, right after instance launch)

```bash
# A1. Check bootstrap completed without fatal errors
sudo grep -E "=== \[|WARN|Bootstrap complete" /var/log/user-data.log

# A2. Confirm Docker is running
docker --version             # Docker version 25.x.x
docker compose version       # Docker Compose version v2.x.x
systemctl is-active docker   # active

# A3. Confirm swap is active
swapon --show
# NAME      TYPE SIZE USED PRIO
# /swapfile file   2G   0B   -2

# A4. Confirm AWS CLI is available
aws --version
aws sts get-caller-identity --region ap-southeast-1
# → shows account ID and role ARN (instance profile)

# A5. Confirm ec2-user is in docker group
groups ec2-user
# → ec2-user : ec2-user docker
```

---

## Phase B — Git Repository Setup (run once)

```bash
# B1. Switch to ec2-user for all git and deploy operations
sudo su - ec2-user

# B2. Generate deploy key (skip if repo is public)
ssh-keygen -t ed25519 -C "gada-staging-deploy" -f ~/.ssh/id_ed25519 -N ""

# B3. Print public key → add to GitHub repo deploy keys (read-only)
cat ~/.ssh/id_ed25519.pub

# B4. Test GitHub access (after adding deploy key)
ssh -T git@github.com
# → Hi YOUR_ORG/gada-vn! You have authenticated...

# B5. Clone repo
git clone git@github.com:YOUR_ORG/gada-vn.git /opt/gada

# B6. Verify key files exist
ls /opt/gada/deploy/staging/scripts/
# deploy.sh  fetch-secrets.sh  restart.sh  rollback.sh

ls /opt/gada/deploy/staging/
# docker-compose.staging.yml  nginx/  scripts/  .env.staging.example

# B7. Exit ec2-user shell
exit
```

---

## Phase C — Secrets Provisioning (run once, from local machine)

> Run from your local machine, not EC2.

```bash
REGION="ap-southeast-1"
P="/gada/staging"

# C1. Verify all secret slots exist (created by terraform apply)
aws secretsmanager list-secrets \
  --region $REGION \
  --query "SecretList[?starts_with(Name,'/gada/staging')].Name" \
  --output text

# C2. Set each secret (replace placeholders with real values)
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/database-url"       --secret-string "jdbc:postgresql://HOST:5432/gada_staging"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/database-user"      --secret-string "gada_app"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/database-password"  --secret-string "$(openssl rand -base64 32)"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/redis-url"          --secret-string "redis://:PASSWORD@HOST:6379"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/firebase-credentials" \
  --secret-string "$(base64 -i /path/to/firebase-service-account.json)"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/firebase-project-id"  --secret-string "gada-vn"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/firebase-web-api-key" --secret-string "YOUR_WEB_API_KEY"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/jwt-secret"           --secret-string "$(openssl rand -hex 32)"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/admin-service-key"    --secret-string "$(openssl rand -base64 48)"
aws secretsmanager put-secret-value --region $REGION \
  --secret-id "$P/anthropic-api-key"    --secret-string "sk-ant-api03-YOUR_KEY"

# C3. Verify all 10 secrets have values
for name in database-url database-user database-password redis-url \
            firebase-credentials firebase-project-id firebase-web-api-key \
            jwt-secret admin-service-key anthropic-api-key; do
  VAL=$(aws secretsmanager get-secret-value --region $REGION \
    --secret-id "/gada/staging/$name" --query SecretString --output text 2>/dev/null || echo "")
  [[ -z "$VAL" ]] && echo "MISSING  /gada/staging/$name" \
                  || echo "SET      /gada/staging/$name (${#VAL} chars)"
done
```

---

## Phase D — Secrets Fetch on EC2 (run before first deploy, and after any secret rotation)

> Back on EC2 via SSM.

```bash
# D1. Dry-run first — verifies IAM access and all secrets are reachable
sudo bash /opt/gada/deploy/staging/scripts/fetch-secrets.sh --dry-run
# Expected: "All secrets fetched." with no [ERROR] lines

# D2. Run for real — writes .env files and firebase JSON
sudo bash /opt/gada/deploy/staging/scripts/fetch-secrets.sh

# D3. Verify generated files
ls -la /opt/gada/deploy/staging/.env.*
# -rw------- 1 ec2-user ec2-user ... .env.api
# -rw------- 1 ec2-user ec2-user ... .env.admin
# -rw------- 1 ec2-user ec2-user ... .env.web

ls -la /opt/gada/deploy/staging/secrets/
# -rw------- 1 ec2-user ec2-user ... firebase-service-account.json

# D4. Spot-check one env file (no passwords visible in log)
head -5 /opt/gada/deploy/staging/.env.api
# PORT=7001
# SPRING_PROFILES_ACTIVE=staging
# DATABASE_URL=jdbc:postgresql://...
# ...
```

---

## Phase E — First Deploy

```bash
# E1. Ensure we're in the repo root
cd /opt/gada

# E2. Run deploy (pulls origin/main, builds all images, rolling restart)
sudo bash deploy/staging/scripts/deploy.sh

# Expected log output:
# [HH:MM:SS] Current SHA: none
# [HH:MM:SS] Deploying SHA: <40-char> (tag: <8-char>)
# [HH:MM:SS] Fetching secrets...
# [HH:MM:SS] Building images (tag: <8-char>)...
# [HH:MM:SS] api healthy ✓
# [HH:MM:SS] admin healthy ✓
# [HH:MM:SS] web healthy ✓
# [HH:MM:SS] API:   200
# [HH:MM:SS] Web:   200
# [HH:MM:SS] Admin: 200
# [HH:MM:SS] Deploy complete. SHA: <8-char>

# E3. Verify containers are running
docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml ps
# NAME      STATUS              PORTS
# nginx     running (healthy)   0.0.0.0:80->80/tcp, 0.0.0.0:8080->8080/tcp
# api       running (healthy)   7001/tcp
# admin     running (healthy)   8081/tcp
# web       running (healthy)   3000/tcp

# E4. Quick health checks
curl -s http://localhost/v1/health        # {"statusCode":200,"data":{"status":"ok",...}}
curl -s -o /dev/null -w "%{http_code}" http://localhost/            # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health # 200
```

---

## Phase F — Ongoing Operations Reference

```bash
# Redeploy (new code from main)
cd /opt/gada && sudo bash deploy/staging/scripts/deploy.sh

# Rollback to previous SHA
sudo bash /opt/gada/deploy/staging/scripts/rollback.sh

# Rollback to specific SHA
sudo bash /opt/gada/deploy/staging/scripts/rollback.sh abc12345

# Restart single service
sudo bash /opt/gada/deploy/staging/scripts/restart.sh api
sudo bash /opt/gada/deploy/staging/scripts/restart.sh web
sudo bash /opt/gada/deploy/staging/scripts/restart.sh nginx

# Restart all services
sudo bash /opt/gada/deploy/staging/scripts/restart.sh

# View logs
COMPOSE=/opt/gada/deploy/staging/docker-compose.staging.yml
docker compose -f $COMPOSE logs -f --tail=50 api
docker compose -f $COMPOSE logs -f --tail=50 web
docker compose -f $COMPOSE logs --since=1h | grep -i error

# After rotating a secret
sudo bash /opt/gada/deploy/staging/scripts/fetch-secrets.sh
sudo bash /opt/gada/deploy/staging/scripts/restart.sh api

# Disk cleanup (keep last 24h of images)
docker image prune -f --filter "until=24h"
docker system df
```

---

## Summary: Order of Operations (first-time setup)

```
Local machine                          EC2 (via SSM)
─────────────────────────────────────────────────────────
terraform apply
                                       user_data.sh runs automatically (~3 min)
                                       └─ SSM agent, Docker, swap, /opt/gada
aws ssm start-session ──────────────→
                                       Phase A: verify bootstrap
                                       Phase B: git clone /opt/gada
← exit SSM
Phase C: provision all 10 secrets
aws ssm start-session ──────────────→
                                       Phase D: fetch-secrets.sh --dry-run
                                       Phase D: fetch-secrets.sh (writes .env files)
                                       Phase E: deploy.sh (first deploy)
                                       Phase E: verify health checks
← exit SSM
```
