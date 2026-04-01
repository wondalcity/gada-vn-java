#!/bin/bash
# Bootstrap: GADA VN staging server (AL2023, arm64)
# Each major section is isolated — a failure in one section does not abort others.

LOG=/var/log/user-data.log
exec > >(tee -a "$LOG") 2>&1

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
section() { echo ""; echo "=== [$( ts)] $* ==="; }
ok()      { echo "  [OK] $*"; }
warn()    { echo "  [WARN] $*"; }

section "GADA VN staging bootstrap start"

###############################################################################
# 0. SSM Agent — install + start FIRST so the instance is immediately reachable
#    via Session Manager, regardless of what else happens below.
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
dnf update -y --quiet && ok "dnf update done" || warn "dnf update failed (non-fatal)"

###############################################################################
# 2. Essential packages
###############################################################################
section "2. Essential packages"
dnf install -y git jq curl wget unzip nginx amazon-cloudwatch-agent --quiet \
  && ok "packages installed" \
  || warn "some packages failed"

###############################################################################
# 3. Node.js 20 LTS
###############################################################################
section "3. Node.js 20"
if curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && dnf install -y nodejs --quiet; then
  ok "Node.js $(node --version) installed"
  npm install -g pnpm@9 && ok "pnpm installed" || warn "pnpm install failed"
else
  warn "Node.js install failed"
fi

###############################################################################
# 4. Swap (2 GB)
###############################################################################
section "4. Swap"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile \
    && echo '/swapfile none swap sw 0 0' >> /etc/fstab \
    && ok "2 GB swap created" \
    || warn "swap creation failed"
else
  ok "swap already exists"
fi

###############################################################################
# 5. Nginx
###############################################################################
section "5. Nginx"
systemctl enable nginx && systemctl start nginx && ok "nginx started" || warn "nginx failed"

cat > /etc/nginx/conf.d/gada.conf << 'NGINX'
server {
    listen 80 default_server;
    server_name _;

    location /api/ {
        proxy_pass         http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location / {
        return 200 'GADA VN staging OK\n';
        add_header Content-Type text/plain;
    }
}
NGINX

nginx -t && systemctl reload nginx && ok "nginx config loaded" || warn "nginx config failed"

###############################################################################
# 6. CloudWatch agent
###############################################################################
section "6. CloudWatch agent"
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWA'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/gada-api.log",
            "log_group_name": "/gada/staging/api",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/gada/staging/nginx",
            "log_stream_name": "{instance_id}/error"
          },
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/gada/staging/bootstrap",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "GADA/Staging",
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "swap": { "measurement": ["swap_used_percent"] },
      "disk": { "measurement": ["disk_used_percent"], "resources": ["/"] }
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
# 7. App directory + systemd service
###############################################################################
section "7. App skeleton"
mkdir -p /opt/gada/{api,web,releases}
chown -R ec2-user:ec2-user /opt/gada
ok "directories created"

cat > /etc/systemd/system/gada-api.service << 'UNIT'
[Unit]
Description=GADA VN NestJS API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/gada/api
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/gada-api.log
StandardError=append:/var/log/gada-api.log
EnvironmentFile=-/opt/gada/api/.env

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload && ok "systemd reloaded" || warn "systemd reload failed"

###############################################################################
# Done
###############################################################################
section "Bootstrap complete"
echo "SSM agent status: $(systemctl is-active amazon-ssm-agent 2>/dev/null || echo unknown)"
echo "Nginx status:     $(systemctl is-active nginx 2>/dev/null || echo unknown)"
echo "Node version:     $(node --version 2>/dev/null || echo not installed)"
