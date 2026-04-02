# GADA VN Staging — Smoke Test Checklist

Run after every deploy or rollback to confirm the staging environment is healthy.

**Instance**: `ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com`
**Base URL**: `http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com`

---

## 1. Automated Smoke Tests (built into `deploy.sh`)

`deploy.sh` runs these automatically at the end of every deploy:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost/v1/health    # expects 200
curl -s -o /dev/null -w "%{http_code}" http://localhost/              # expects 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health   # expects 200
```

If any return non-200, the deploy script prints `[ERROR]` and exits.

---

## 2. Manual Smoke Tests (run from your local machine)

Substitute `$EC2_HOST` with `ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com`.

### 2.1 API Health

```bash
curl -s http://$EC2_HOST/v1/health | jq .
```

Expected response:
```json
{ "status": "ok" }
```

### 2.2 Web App

```bash
curl -s -o /dev/null -w "%{http_code}" http://$EC2_HOST/
```

Expected: `200`

Open in browser: `http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com/`

### 2.3 Admin Panel

```bash
curl -s -o /dev/null -w "%{http_code}" http://$EC2_HOST:8080/health
```

Expected: `200`

Open in browser: `http://ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com:8080/`

---

## 3. Docker Container Health (on EC2 via SSM)

```bash
COMPOSE=/opt/gada/deploy/staging/docker-compose.staging.yml

docker compose -f $COMPOSE ps
```

All services should show `healthy` or `running`:

```
NAME      STATUS          PORTS
nginx     running (healthy)   0.0.0.0:80->80/tcp, 0.0.0.0:8080->8080/tcp
api       running (healthy)   7001/tcp
admin     running (healthy)   8081/tcp
web       running (healthy)   3000/tcp
```

---

## 4. API Functional Tests

### 4.1 Public endpoints (no auth)

```bash
BASE=http://$EC2_HOST/v1

# Health
curl -s $BASE/health | jq .

# Job listing (public)
curl -s "$BASE/jobs?page=1&limit=5" | jq '{statusCode,count:.data|length}'
```

### 4.2 Auth endpoint

```bash
# POST /v1/auth/verify — expects 400 (missing body), not 500
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://$EC2_HOST/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{}'
# → 400 (bad request, not 500)
```

---

## 5. Infrastructure Checks (on EC2 via SSM)

```bash
# Docker daemon
systemctl is-active docker        # → active

# SSM agent
systemctl is-active amazon-ssm-agent  # → active

# Disk space (warn if > 80%)
df -h / | awk 'NR==2{print $5, $4" free"}'

# Memory
free -m | awk 'NR==2{printf "Used: %dMB / Total: %dMB\n", $3, $2}'

# Docker disk usage
docker system df
```

---

## 6. Log Spot-Check (on EC2 via SSM)

```bash
COMPOSE=/opt/gada/deploy/staging/docker-compose.staging.yml

# Check for ERROR or WARN in api logs since last deploy
docker compose -f $COMPOSE logs --since=10m api | grep -iE "ERROR|Exception|WARN" | head -20

# Check nginx access log
docker compose -f $COMPOSE logs --since=5m nginx | tail -20
```

No `ERROR` or Java stack traces = good.

---

## 7. Smoke Test Pass/Fail Criteria

| Check | Pass | Fail Action |
|-------|------|-------------|
| `GET /v1/health` → 200 | `{"status":"ok"}` | Rollback immediately |
| `GET /` → 200 | HTML response | Restart web; rollback if persists |
| `GET :8080/health` → 200 | `{"status":"ok"}` | Restart admin |
| All containers `healthy` | No `(unhealthy)` | Check logs → rollback |
| Disk < 80% | `df -h` shows < 80% | `docker image prune -af` |
| No ERROR in api logs | 0 exceptions | Investigate, may not need rollback |

---

## 8. Full Smoke Test Script

Save as `/tmp/smoke-test.sh` and run after each deploy:

```bash
#!/bin/bash
set -euo pipefail
HOST="${1:-ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com}"
PASS=0; FAIL=0

check() {
  local desc="$1" url="$2" expect="$3"
  local got
  got=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  if [[ "$got" == "$expect" ]]; then
    echo "  PASS  $desc ($got)"
    ((PASS++))
  else
    echo "  FAIL  $desc — got $got, expected $expect"
    ((FAIL++))
  fi
}

echo "=== GADA VN Staging Smoke Tests ==="
echo "Host: $HOST"
echo ""

check "API health"    "http://$HOST/v1/health" "200"
check "Web home"      "http://$HOST/"           "200"
check "Admin health"  "http://$HOST:8080/health" "200"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
```

Run:
```bash
bash /tmp/smoke-test.sh
# or with a different host:
bash /tmp/smoke-test.sh ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com
```
