#!/bin/bash
# Initialize SSL certificates with Let's Encrypt (certbot)
#
# Usage:
#   ./ssl-init.sh your-domain.com your@email.com

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: $0 <domain> <email>"
  echo "Example: $0 app.example.com admin@example.com"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DEPLOY_DIR"

echo "Requesting SSL certificate for $DOMAIN..."
echo ""
echo "NOTE: For wildcard certs (*.${DOMAIN}), you need DNS validation."
echo "Run this instead:"
echo "  docker compose -f docker-compose.prod.yml run --rm certbot certonly \\"
echo "    --manual --preferred-challenges dns \\"
echo "    -d ${DOMAIN} -d '*.${DOMAIN}' \\"
echo "    --email ${EMAIL} --agree-tos --no-eff-email"
echo ""
echo "Proceeding with HTTP challenge for base domain only..."
echo ""

docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

echo ""
echo "Certificate obtained. Now:"
echo "  1. Update YOUR_DOMAIN in nginx/nginx.prod.conf with: ${DOMAIN}"
echo "  2. Restart nginx: docker compose -f docker-compose.prod.yml restart nginx"
