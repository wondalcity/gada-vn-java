# GADA VN Staging — First Deploy Checklist

Complete this checklist top-to-bottom before declaring staging operational.
Each item must pass before moving to the next section.

---

## Section 1 — Infrastructure Ready

- [ ] **Terraform applied**
  ```bash
  cd infra/terraform/staging
  terraform apply
  terraform output
  ```
  Expected: `instance_id`, `public_ip` (`52.76.20.8`), `uploads_bucket` in output.

- [ ] **EC2 instance running**
  ```bash
  aws ec2 describe-instances \
    --instance-ids i-060b635518a854b74 \
    --region ap-southeast-1 \
    --query 'Reservations[].Instances[].State.Name' \
    --output text
  ```
  Expected: `running`

- [ ] **SSM agent reachable** (instance shows `Online` in Fleet Manager)
  ```bash
  aws ssm describe-instance-information \
    --region ap-southeast-1 \
    --query "InstanceInformationList[?InstanceId=='i-060b635518a854b74'].PingStatus" \
    --output text
  ```
  Expected: `Online`

- [ ] **Bootstrap completed** (connect and verify)
  ```bash
  aws ssm start-session --target i-060b635518a854b74 --region ap-southeast-1
  sudo grep "Bootstrap complete" /var/log/user-data.log
  ```
  Expected: line with `Bootstrap complete` timestamp.

---

## Section 2 — Server Dependencies

> Run inside SSM session.

- [ ] **Docker running**
  ```bash
  docker --version && systemctl is-active docker
  ```
  Expected: version 25+, `active`

- [ ] **Docker Compose plugin available**
  ```bash
  docker compose version
  ```
  Expected: `Docker Compose version v2.x.x`

- [ ] **ec2-user in docker group** (deploy scripts don't need sudo for docker)
  ```bash
  groups ec2-user | grep -q docker && echo "OK" || echo "MISSING"
  ```
  Expected: `OK`

- [ ] **Swap active**
  ```bash
  swapon --show | grep swapfile
  ```
  Expected: `2G` swap file listed

- [ ] **AWS CLI works with instance role**
  ```bash
  aws sts get-caller-identity --region ap-southeast-1
  ```
  Expected: JSON with `Account` and `Arn` containing `gada-vn-staging-app-role`

- [ ] **Disk space adequate** (builds need ~5 GB free)
  ```bash
  df -h / | awk 'NR==2{print $4, "free ("$5" used)"}'
  ```
  Expected: at least 5 GB free

---

## Section 3 — Git Repository

- [ ] **Repo cloned to `/opt/gada`**
  ```bash
  ls /opt/gada/.git/
  ```
  Expected: git metadata files present

- [ ] **On correct branch**
  ```bash
  git -C /opt/gada branch --show-current
  ```
  Expected: `main`

- [ ] **Deploy scripts present and executable**
  ```bash
  ls -la /opt/gada/deploy/staging/scripts/
  ```
  Expected: `deploy.sh`, `rollback.sh`, `restart.sh`, `fetch-secrets.sh`

- [ ] **Docker Compose file present**
  ```bash
  test -f /opt/gada/deploy/staging/docker-compose.staging.yml && echo "OK"
  ```
  Expected: `OK`

---

## Section 4 — Secrets

> Run from local machine (AWS CLI).

- [ ] **All 10 secrets exist in Secrets Manager**
  ```bash
  aws secretsmanager list-secrets \
    --region ap-southeast-1 \
    --query "length(SecretList[?starts_with(Name,'/gada/staging')])" \
    --output text
  ```
  Expected: `10`

- [ ] **All 10 secrets have values set** (run verification script)
  ```bash
  for name in database-url database-user database-password redis-url \
              firebase-credentials firebase-project-id firebase-web-api-key \
              jwt-secret admin-service-key anthropic-api-key; do
    VAL=$(aws secretsmanager get-secret-value --region ap-southeast-1 \
      --secret-id "/gada/staging/$name" --query SecretString --output text 2>/dev/null || echo "")
    [[ -z "$VAL" ]] && echo "MISSING  $name" || echo "SET      $name"
  done
  ```
  Expected: all 10 show `SET`

---

## Section 5 — Secrets Fetch on EC2

> Run inside SSM session.

- [ ] **Dry-run passes** (IAM access + all secrets reachable)
  ```bash
  sudo bash /opt/gada/deploy/staging/scripts/fetch-secrets.sh --dry-run
  ```
  Expected: `All secrets fetched.` — zero `[ERROR]` lines

- [ ] **Real fetch succeeds** (writes .env files)
  ```bash
  sudo bash /opt/gada/deploy/staging/scripts/fetch-secrets.sh
  ```
  Expected: `.env.api`, `.env.admin`, `.env.web` written; Firebase JSON decoded

- [ ] **Generated files have correct permissions**
  ```bash
  stat -c "%a %n" /opt/gada/deploy/staging/.env.api \
                  /opt/gada/deploy/staging/.env.admin \
                  /opt/gada/deploy/staging/.env.web
  ```
  Expected: all `600`

  ```bash
  stat -c "%a %n" /opt/gada/deploy/staging/secrets/firebase-service-account.json
  ```
  Expected: `600`

- [ ] **Firebase credentials are valid JSON**
  ```bash
  python3 -m json.tool \
    /opt/gada/deploy/staging/secrets/firebase-service-account.json \
    > /dev/null && echo "valid JSON"
  ```
  Expected: `valid JSON`

---

## Section 6 — First Deploy

- [ ] **Deploy script runs without errors**
  ```bash
  cd /opt/gada
  sudo bash deploy/staging/scripts/deploy.sh 2>&1 | tee /tmp/deploy-output.txt
  echo "Exit: $?"
  ```
  Expected: exit code `0`, output ends with `Deploy complete. SHA: <8-char>`

- [ ] **Build completed for all 3 images**
  ```bash
  docker images | grep -E "^gada-(api|admin|web)"
  ```
  Expected: 3 images with matching SHA tags

- [ ] **All containers in `healthy` state**
  ```bash
  docker compose -f /opt/gada/deploy/staging/docker-compose.staging.yml ps
  ```
  Expected: `nginx`, `api`, `admin`, `web` all `running (healthy)`

---

## Section 7 — Health Checks

- [ ] **API health** (internal)
  ```bash
  curl -s http://localhost/v1/health | python3 -m json.tool
  ```
  Expected: `"status": "ok"`

- [ ] **Web home page** (internal)
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost/
  ```
  Expected: `200`

- [ ] **Admin health** (internal)
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
  ```
  Expected: `200`

- [ ] **API reachable from the internet** (run from local machine)
  ```bash
  curl -s http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com/v1/health
  ```
  Expected: `{"statusCode":200,"data":{"status":"ok",...}}`

- [ ] **Web reachable from the internet**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" \
    http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com/
  ```
  Expected: `200`

- [ ] **Admin reachable from the internet**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" \
    http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com:8080/health
  ```
  Expected: `200`

---

## Section 8 — Security Hygiene

- [ ] **Generated env files NOT in git**
  ```bash
  git -C /opt/gada status deploy/staging/
  ```
  Expected: no `.env.api`, `.env.admin`, `.env.web`, no `secrets/` directory listed

- [ ] **No secrets in deploy logs**
  ```bash
  grep -iE "password|secret|sk-ant|jwt" /tmp/deploy-output.txt
  ```
  Expected: no output (no secret values leaked into deploy log)

- [ ] **Docker images contain no secrets**
  ```bash
  docker history gada-api:latest --no-trunc | grep -iE "password|secret|sk-ant"
  ```
  Expected: no output

- [ ] **`.current-sha` written**
  ```bash
  cat /opt/gada/deploy/staging/.current-sha
  ```
  Expected: 8-char hex SHA

---

## Section 9 — Rollback Smoke Test (optional but recommended)

Verify rollback works before the first real incident.

- [ ] **`.rollback-sha` file exists** (written by deploy.sh)
  ```bash
  cat /opt/gada/deploy/staging/.rollback-sha
  ```
  Expected: SHA value (may be `none` on very first deploy — that's OK)

- [ ] **Rollback script is valid** (dry run — just check it exits cleanly)
  ```bash
  bash -n /opt/gada/deploy/staging/scripts/rollback.sh && echo "syntax OK"
  ```
  Expected: `syntax OK`

---

## ✅ Staging Operational

All sections complete → staging is ready.

**Bookmark these URLs:**
- Web: `http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com/`
- API: `http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com/v1/health`
- Admin: `http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com:8080/`

**Share with the team:**
- Instance ID: `i-060b635518a854b74`
- Access: SSM only (no SSH key required)
- Deploy: `cd /opt/gada && sudo bash deploy/staging/scripts/deploy.sh`
- Runbook: `docs/deploy/staging-deploy-runbook.md`
