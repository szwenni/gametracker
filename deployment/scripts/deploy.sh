#!/bin/bash
# Deploy / update the application
#
# Usage:
#   ./deploy.sh          # Build and start all services
#   ./deploy.sh --ssl    # Also start certbot for SSL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DEPLOY_DIR"

if [ ! -f .env ]; then
  echo "Error: .env file not found in $DEPLOY_DIR"
  echo "Copy .env.example to .env and configure it first."
  exit 1
fi

echo "Building images..."
docker compose -f docker-compose.prod.yml build

echo "Starting services..."
if [ "${1:-}" = "--ssl" ]; then
  docker compose -f docker-compose.prod.yml --profile ssl up -d
else
  docker compose -f docker-compose.prod.yml up -d
fi

echo ""
echo "Waiting for health checks..."
sleep 10

docker compose -f docker-compose.prod.yml ps

echo ""
echo "Deployment complete. Check service health:"
echo "  docker compose -f docker-compose.prod.yml ps"
echo "  docker compose -f docker-compose.prod.yml logs -f"
