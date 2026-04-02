#!/bin/bash
# Bootstrap: GADA VN staging server (AL2023, arm64)
# Architecture: Docker Compose — nginx, api, admin, web all run as containers.
# Host nginx is NOT installed. Node.js is NOT installed (Docker handles runtimes).
# Each section is isolated — a failure in one section does not abort others.

LOG=/var/log/user-data.log
exec > >(tee -a "$LOG") 2>&1

ts()      { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
section() { echo ""; echo "=== [$(ts)] $* ==="; }
ok()      { echo "  [OK] $*"; }
warn()    { echo "  [WARN] $*"; }

section "GADA VN staging bootstrap start"
echo "Instance: $(curl -s -H "X-aws-ec2-metadata-token: $(curl -s -X PUT \
  'http://169.254.169.254/latest/api/token' \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')" \
  http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo unknown)"

###############################################################################
# 0. SSM Agent — FIRST so the instance is reachable via Session Manager
#    regardless of what else happens below.
###############################################################################
section "0. SSM Agent"
if dnf install -y amazon-ssm-agent --quiet; then
  ok "amazon-ssm-agent installed"
else
  warn "amazon-ssm-agent install failed — SSM access unavailable"
fi

if systemctl enable amazon-ssm-agent && systemctl start amazon-ssm-agent; then
  ok "amazon-ssm-agent started"
else
  warn "amazon-ssm-agent start failed"
fi

###############################################################################
# 1. System update
###############################################################################
section "1. System update"
dnf update -y --quiet \
  && ok "dnf update done" \
  || warn "dnf update failed (non-fatal)"

###############################################################################
# 2. Essential packages
#    Note: awscli v2 is pre-installed on AL2023 — no separate install needed.
#    Note: nginx is containerized — NOT installed on the host.
#    Note: Node.js is NOT installed — Docker handles all runtimes.
###############################################################################
section "2. Essential packages"
dnf install -y git jq curl wget unzip amazon-cloudwatch-agent --quiet \
  && ok "packages installed: git jq curl wget unzip amazon-cloudwatch-agent" \
  || warn "some packages failed"

# Verify AWS CLI (pre-installed on AL2023)
if aws --version &>/dev/null; then
  ok "aws cli: $(aws --version 2>&1 | head -1)"
else
  warn "aws cli not found — installing"
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/awscliv2.zip /tmp/aws \
    && ok "aws cli installed" \
    || warn "aws cli install failed"
fi

###############################################################################
# 3. Docker Engine + Docker Compose plugin
###############################################################################
section "3. Docker"
if ! command -v docker &>/dev/null; then
  dnf install -y docker --quiet \
    && ok "docker installed" \
    || warn "docker install failed"
else
  ok "docker already installed: $(docker --version)"
fi

# Docker Compose plugin (ships with docker package on AL2023; verify)
if docker compose version &>/dev/null; then
  ok "docker compose plugin: $(docker compose version)"
else
  warn "docker compose plugin not found — installing manually"
  mkdir -p /usr/local/lib/docker/cli-plugins
  COMPOSE_VERSION="v2.27.1"
  curl -fsSL \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose \
    && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose \
    && ok "docker compose ${COMPOSE_VERSION} installed" \
    || warn "docker compose manual install failed"
fi

# Enable + start Docker daemon
if systemctl enable docker && systemctl start docker; then
  ok "docker daemon started"
else
  warn "docker daemon start failed"
fi

# Add ec2-user to docker group (no sudo needed for deploy scripts)
usermod -aG docker ec2-user \
  && ok "ec2-user added to docker group" \
  || warn "usermod docker failed"

###############################################################################
# 4. Swap (2 GB) — t4g.small has 2 GB RAM; swap prevents OOM during builds
###############################################################################
section "4. Swap"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile \
    && chmod 600 /swapfile \
    && mkswap /swapfile \
    && swapon /swapfile \
    && echo '/swapfile none swap sw 0 0' >> /etc/fstab \
    && ok "2 GB swap created and enabled" \
    || warn "swap creation failed"
else
  ok "swap already exists"
fi

###############################################################################
# 5. App directory structure
#    /opt/gada                            — git repo root (cloned manually post-bootstrap)
#    /opt/gada/deploy/staging/.env.*      — generated by fetch-secrets.sh (chmod 600)
#    /opt/gada/deploy/staging/secrets/    — Firebase JSON (chmod 700)
###############################################################################
section "5. App directory"
mkdir -p /opt/gada
mkdir -p /opt/gada/deploy/staging/secrets
chown -R ec2-user:ec2-user /opt/gada
chmod 700 /opt/gada/deploy/staging/secrets
ok "created /opt/gada directory structure"

# Repo clone must happen manually after bootstrap via SSM.
# Private repo requires a deploy key at /home/ec2-user/.ssh/id_ed25519.
# See: docs/deploy/staging-server-bootstrap.md
warn "Repo not cloned — connect via SSM and run the bootstrap steps"

###############################################################################
# 6. Docker daemon hardening
###############################################################################
section "6. Docker daemon config"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKERD'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  },
  "live-restore": true
}
DOCKERD

systemctl reload-or-restart docker \
  && ok "docker daemon config applied" \
  || warn "docker daemon reload failed"

###############################################################################
# 7. CloudWatch agent
###############################################################################
section "7. CloudWatch agent"
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWA'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/gada/staging/bootstrap",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/gada/staging/system",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "GADA/Staging",
    "metrics_collected": {
      "mem":  { "measurement": ["mem_used_percent"] },
      "swap": { "measurement": ["swap_used_percent"] },
      "disk": { "measurement": ["disk_used_percent"], "resources": ["/"] },
      "cpu":  { "measurement": ["cpu_usage_idle"], "totalcpu": true }
    },
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}"
    }
  }
}
CWA

if /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s; then
  ok "CloudWatch agent started"
else
  warn "CloudWatch agent failed (non-fatal)"
fi

###############################################################################
# Done
###############################################################################
section "Bootstrap complete"
echo "SSM agent:      $(systemctl is-active amazon-ssm-agent 2>/dev/null || echo unknown)"
echo "Docker:         $(systemctl is-active docker 2>/dev/null || echo unknown)"
echo "Docker version: $(docker --version 2>/dev/null || echo not available)"
echo "Compose plugin: $(docker compose version 2>/dev/null || echo not available)"
echo "AWS CLI:        $(aws --version 2>&1 | head -1 || echo not available)"
echo "Swap:           $(swapon --show 2>/dev/null | tail -n +2 | wc -l) swap file(s)"
echo ""
echo "NEXT: Connect via SSM and follow docs/deploy/staging-server-bootstrap.md"
echo "  aws ssm start-session --target <instance-id> --region ap-southeast-1"
