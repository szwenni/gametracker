#!/bin/bash
# Database backup script
#
# Usage:
#   ./backup-db.sh                    # Creates timestamped backup
#   ./backup-db.sh --restore FILE     # Restores from backup file
#
# Cron example (daily at 2 AM):
#   0 2 * * * /path/to/deployment/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${DEPLOY_DIR}/backups"
RETENTION_DAYS=30

if [ -f "${DEPLOY_DIR}/.env" ]; then
  set -a
  source "${DEPLOY_DIR}/.env"
  set +a
fi

DB_USER="${POSTGRES_USER:-app}"
DB_NAME="${POSTGRES_DB:-app}"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"

mkdir -p "$BACKUP_DIR"

if [ "${1:-}" = "--restore" ]; then
  RESTORE_FILE="${2:-}"
  if [ -z "$RESTORE_FILE" ] || [ ! -f "$RESTORE_FILE" ]; then
    echo "Error: Provide a valid backup file path"
    echo "Usage: $0 --restore /path/to/backup.sql.gz"
    exit 1
  fi

  echo "[$(date -Iseconds)] Restoring from: $RESTORE_FILE"
  gunzip -c "$RESTORE_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME"
  echo "[$(date -Iseconds)] Restore complete"
  exit 0
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Starting backup..."
docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup created: $BACKUP_FILE ($SIZE)"

DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date -Iseconds)] Removed $DELETED backups older than ${RETENTION_DAYS} days"
fi
