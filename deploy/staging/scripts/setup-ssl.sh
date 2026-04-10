#!/bin/bash
# setup-ssl.sh — Obtain a Let's Encrypt certificate and switch staging to HTTPS.
#
# Usage: ./setup-ssl.sh <domain> [email]
#   <domain>  Fully-qualified domain name pointing to this EC2 instance (e.g. stage.gadavn.com)
#   [email]   Contact email for Let's Encrypt expiry notices (default: devops@gadavn.com)
#
# Prerequisites:
#   - Domain DNS must already point to this EC2 public IP.
#   - Port 80 must be reachable from the internet (AWS security group).
#   - Docker must be installed.
#   - Run as root or with sudo.
#
# After running this script:
#   1. Add the domain to Firebase Authorized Domains:
#      Firebase Console → Authentication → Settings → Authorized domains
#   2. Add the domain to Facebook Login Valid OAuth Redirect URIs:
#      Facebook Developer Console → App → Facebook Login → Settings
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-devops@gadavn.com}"

if [[ -z "$DOMAIN" ]]; then
    echo "Usage: $0 <domain> [email]"
    echo "Example: $0 stage.gadavn.com devops@gadavn.com"
    exit 1
fi

REPO_DIR="/opt/gada"
DEPLOY_DIR="$REPO_DIR/deploy/staging"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.staging.yml"
CERTBOT_WEBROOT="/var/www/certbot"
LETSENCRYPT_DIR="/etc/letsencrypt"

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

# ── 1. Verify domain resolves to this machine ─────────────────────────────────
log "Verifying domain $DOMAIN..."
PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org || echo "")
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -1 || echo "")
if [[ -n "$PUBLIC_IP" && -n "$DOMAIN_IP" && "$PUBLIC_IP" != "$DOMAIN_IP" ]]; then
    log "WARNING: $DOMAIN resolves to $DOMAIN_IP but this machine's IP is $PUBLIC_IP."
    log "Let's Encrypt validation may fail. Proceed? (y/N)"
    read -r confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

# ── 2. Ensure webroot directory exists ────────────────────────────────────────
log "Creating webroot at $CERTBOT_WEBROOT..."
mkdir -p "$CERTBOT_WEBROOT/.well-known/acme-challenge"

# ── 3. Make sure nginx is running (serves the ACME challenge on port 80) ──────
log "Ensuring nginx is running..."
docker compose -f "$COMPOSE_FILE" up -d nginx 2>/dev/null || true
sleep 3

# ── 4. Obtain certificate via webroot challenge ───────────────────────────────
log "Requesting Let's Encrypt certificate for $DOMAIN (webroot challenge)..."
docker run --rm \
    -v "$LETSENCRYPT_DIR:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    -v "$CERTBOT_WEBROOT:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "$DOMAIN"
log "Certificate obtained successfully."

# ── 5. Generate nginx HTTPS config from template ──────────────────────────────
log "Generating HTTPS nginx config for $DOMAIN..."
STAGING_DOMAIN="$DOMAIN" \
    envsubst '${STAGING_DOMAIN}' \
    < "$DEPLOY_DIR/nginx/staging.conf.template" \
    > "$DEPLOY_DIR/nginx/staging.conf"
log "nginx config written: $DEPLOY_DIR/nginx/staging.conf"

# ── 6. Persist the domain for fetch-secrets.sh ───────────────────────────────
echo "$DOMAIN" > "$DEPLOY_DIR/.staging-domain"
log "Domain persisted to $DEPLOY_DIR/.staging-domain"

# ── 7. Reload nginx with new config ──────────────────────────────────────────
log "Reloading nginx..."
docker compose -f "$COMPOSE_FILE" up -d nginx
docker exec staging-nginx-1 nginx -s reload 2>/dev/null || \
    docker compose -f "$COMPOSE_FILE" restart nginx
log "nginx reloaded."

# ── 8. Update .env.web to use HTTPS ──────────────────────────────────────────
if [[ -f "$DEPLOY_DIR/.env.web" ]]; then
    log "Updating .env.web to use HTTPS..."
    sed -i "s|NEXT_PUBLIC_API_BASE_URL=http://|NEXT_PUBLIC_API_BASE_URL=https://|g" "$DEPLOY_DIR/.env.web"
    sed -i "s|NEXT_PUBLIC_SITE_URL=http://|NEXT_PUBLIC_SITE_URL=https://|g"         "$DEPLOY_DIR/.env.web"
    log ".env.web updated."
fi

# ── 9. Set up monthly auto-renewal cron ──────────────────────────────────────
CRON_JOB="0 3 1 * * docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/lib/letsencrypt:/var/lib/letsencrypt -v $CERTBOT_WEBROOT:/var/www/certbot certbot/certbot renew --quiet && docker exec staging-nginx-1 nginx -s reload"
(crontab -l 2>/dev/null | grep -v "certbot/certbot renew"; echo "$CRON_JOB") | crontab -
log "Auto-renewal cron set (runs monthly on the 1st at 03:00 UTC)."

# ── Done ──────────────────────────────────────────────────────────────────────
log ""
log "✓ HTTPS is now active for https://${DOMAIN}"
log ""
log "IMPORTANT — Manual steps required for social login:"
log "  1. Firebase Console → Authentication → Settings → Authorized domains"
log "     Add: $DOMAIN"
log "  2. Facebook Developer Console → App → Facebook Login → Settings"
log "     Add to Valid OAuth Redirect URIs: https://${DOMAIN}/__/auth/handler"
log ""
log "Then redeploy the web app so NEXT_PUBLIC_* env vars are rebuilt:"
log "  cd $REPO_DIR && bash $DEPLOY_DIR/scripts/fast-deploy.sh web"
