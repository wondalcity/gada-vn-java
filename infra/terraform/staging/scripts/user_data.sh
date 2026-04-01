#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "=== GADA VN staging bootstrap $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

###############################################################################
# 1. System updates
###############################################################################
dnf update -y --quiet

###############################################################################
# 2. Essential packages
###############################################################################
dnf install -y \
  git \
  jq \
  curl \
  wget \
  unzip \
  nginx \
  amazon-cloudwatch-agent \
  --quiet

###############################################################################
# 3. Java 21 Corretto (for NestJS compiled JAR or future Spring services)
#    NestJS runs on Node.js, not JVM — but install Java as a future-proof choice.
###############################################################################
dnf install -y java-21-amazon-corretto-headless --quiet

###############################################################################
# 4. Node.js 20 LTS via NodeSource
###############################################################################
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs --quiet
npm install -g pnpm@9

###############################################################################
# 5. Swap (2 GB) — critical on t3.small (2 GB RAM) for npm/pnpm build steps
###############################################################################
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap created and enabled."
fi

###############################################################################
# 6. Nginx — reverse proxy placeholder (configure per-app after deploy)
###############################################################################
systemctl enable nginx
systemctl start nginx

cat > /etc/nginx/conf.d/gada.conf << 'NGINX'
server {
    listen 80 default_server;
    server_name _;

    # NestJS API
    location /api/ {
        proxy_pass         http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location / {
        return 200 'GADA VN staging OK\n';
        add_header Content-Type text/plain;
    }
}
NGINX

nginx -t && systemctl reload nginx

###############################################################################
# 7. CloudWatch agent — basic config (logs + instance metrics)
###############################################################################
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
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"]
      }
    }
  }
}
CWA

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

###############################################################################
# 8. App directory skeleton
###############################################################################
mkdir -p /opt/gada/{api,web,releases}
chown -R ec2-user:ec2-user /opt/gada

###############################################################################
# 9. Systemd service placeholder for the API
###############################################################################
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

systemctl daemon-reload
# Do not enable yet — no binary deployed

echo "=== Bootstrap complete $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
