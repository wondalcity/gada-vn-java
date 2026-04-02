# GADA VN Staging — Server Bootstrap Guide

**Instance**: `i-060b635518a854b74`
**OS**: Amazon Linux 2023 (arm64, t4g.small)
**Architecture**: All services run in Docker containers. Host has no nginx, no Node.js, no JVM.

---

## What `user_data.sh` Does Automatically (on first boot)

When Terraform provisions the EC2 instance, `user_data.sh` runs once and handles:

| # | Step | Result |
|---|------|--------|
| 0 | Install + start SSM agent | Instance reachable via Session Manager immediately |
| 1 | `dnf update -y` | OS patched |
| 2 | Install `git jq curl wget unzip amazon-cloudwatch-agent` | Build tools + observability |
| 3 | Install Docker + Docker Compose plugin | Container runtime ready |
| 3 | `usermod -aG docker ec2-user` | Deploy scripts run without sudo |
| 4 | Create 2 GB swap file | Prevents OOM during `docker build` on 2 GB instance |
| 5 | Create `/opt/gada/` directory skeleton | Repo root ready for git clone |
| 6 | Write `/etc/docker/daemon.json` | Log rotation (50 MB × 5 files), live-restore |
| 7 | Start CloudWatch agent | Logs and metrics shipping to CloudWatch |

**What it does NOT do** (must be done manually after first boot):
- Clone the git repository
- Set up SSH deploy key (if private repo)
- Provision AWS Secrets Manager values
- Run the first deploy

Check bootstrap logs:
```bash
aws ssm start-session --target i-060b635518a854b74 --region ap-southeast-1
sudo cat /var/log/user-data.log | tail -50
```

---

## Architecture: Why No Host nginx or Node.js?

```
EC2 Host (AL2023)
├── Docker daemon
│   ├── nginx container  ← port 80, 8080 exposed to host
│   ├── api container    ← Spring Boot, internal only
│   ├── admin container  ← Spring Boot, internal only
│   └── web container    ← Next.js, internal only
└── /opt/gada/           ← git repo + generated .env files
```

- **nginx** is containerized — routing config lives in `deploy/staging/nginx/staging.conf`
- **Node.js** is only inside the web container — not on the host
- **Java/JVM** is only inside api/admin containers — not on the host
- **AWS CLI** is pre-installed on AL2023 — used by `fetch-secrets.sh`

---

## Manual Steps After First Boot

These run once, after `user_data.sh` completes.

### Step 1 — Connect via SSM

From your local machine:
```bash
aws ssm start-session \
  --target i-060b635518a854b74 \
  --region ap-southeast-1 \
  --profile wonyuep
```

### Step 2 — Verify Bootstrap Completed

```bash
# Check bootstrap log for errors
sudo grep -E "\[WARN\]|\[OK\]|Bootstrap complete" /var/log/user-data.log

# Verify Docker is running
docker --version
docker compose version
systemctl is-active docker

# Verify swap exists
swapon --show
free -h
```

Expected:
- Docker 25.x or later
- Docker Compose v2.x
- `docker` service: active
- 2.0G swap

### Step 3 — Set Up Git Deploy Key (private repo)

```bash
# Generate deploy key on EC2
ssh-keygen -t ed25519 -C "gada-staging-deploy" -f /home/ec2-user/.ssh/id_ed25519 -N ""

# Print public key — add this to GitHub → Repo → Settings → Deploy Keys (read-only)
cat /home/ec2-user/.ssh/id_ed25519.pub

# Test GitHub access (after adding the key)
ssh -T git@github.com
```

### Step 4 — Clone the Repository

```bash
cd /opt/gada
sudo chown ec2-user:ec2-user /opt/gada

# Clone as ec2-user
sudo -u ec2-user git clone git@github.com:YOUR_ORG/gada-vn.git /opt/gada

# Verify
ls /opt/gada/deploy/staging/
```

### Step 5 — Verify ec2-user Can Run Docker

```bash
# Switch to ec2-user (deploy scripts run as this user)
sudo -u ec2-user docker ps

# If permission denied, the group membership hasn't propagated yet
# Log out and back in, or run:
newgrp docker
```

### Step 6 — Verify AWS CLI Reaches Secrets Manager

```bash
aws sts get-caller-identity --region ap-southeast-1
aws secretsmanager list-secrets \
  --region ap-southeast-1 \
  --query "SecretList[?starts_with(Name,'/gada/staging')].Name" \
  --output text
```

Expected: lists all `/gada/staging/*` secret names.

### Step 7 — Provision Secrets (if not yet done)

See `docs/security/staging-provisioning-checklist.md` — Phase 2.

### Step 8 — Run First Deploy

```bash
cd /opt/gada
sudo bash deploy/staging/scripts/deploy.sh
```

See `docs/deploy/staging-first-deploy-checklist.md` for the complete checklist.

---

## Directory Structure on EC2

```
/
├── etc/docker/daemon.json              ← log rotation, live-restore
├── opt/
│   ├── gada/                           ← git repo root (ec2-user owns)
│   │   ├── apps/
│   │   │   ├── api-kotlin/             ← Spring Boot API source + Dockerfile
│   │   │   ├── admin/                  ← Spring Boot Admin source + Dockerfile
│   │   │   └── web-next/               ← Next.js source + Dockerfile
│   │   ├── deploy/staging/
│   │   │   ├── docker-compose.staging.yml
│   │   │   ├── nginx/staging.conf
│   │   │   ├── scripts/
│   │   │   │   ├── deploy.sh
│   │   │   │   ├── rollback.sh
│   │   │   │   ├── restart.sh
│   │   │   │   └── fetch-secrets.sh
│   │   │   ├── .env.api                ← generated (chmod 600, NOT in git)
│   │   │   ├── .env.admin              ← generated (chmod 600, NOT in git)
│   │   │   ├── .env.web                ← generated (chmod 600, NOT in git)
│   │   │   └── secrets/
│   │   │       └── firebase-service-account.json  ← decoded (chmod 600, NOT in git)
│   │   ├── .current-sha                ← running 8-char SHA
│   │   └── .rollback-sha               ← previous SHA (for rollback)
│   └── aws/amazon-cloudwatch-agent/    ← CW agent config + binary
├── swapfile                            ← 2 GB swap
└── var/log/
    ├── user-data.log                   ← bootstrap log
    └── messages                        ← system log
```

---

## Re-bootstrapping (if instance is replaced)

Terraform will run `user_data.sh` automatically on a new instance.

After replacement:
1. Wait ~3 min for bootstrap to complete
2. Connect via SSM (new instance ID from `terraform output instance_id`)
3. Run Steps 3–8 above (repo clone, secrets fetch, deploy)

The EIP stays the same after replacement — no DNS change needed.

---

## Troubleshooting

**Bootstrap didn't finish / Docker not installed**
```bash
sudo cat /var/log/user-data.log | grep -E "WARN|ERROR|==="
```

**`docker` command not found after login**
```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# Log out and back in
```

**SSM session closes immediately**
→ SSM agent may not have started. Check via EC2 console → Actions → Get system log.

**`docker compose` not found**
```bash
docker compose version
# If missing:
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL \
  "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-aarch64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```
