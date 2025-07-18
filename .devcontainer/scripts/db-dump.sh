#!/bin/bash
# Database dump script for devcontainer

set -e

# Default values
DB_HOST="${DB_HOST:-postgres}"
DB_NAME="${DB_NAME:-family_board}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
BACKUP_DIR="/workspace/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/familyboard_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Dumping database..."
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   Output: $BACKUP_FILE"

# Export password for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Perform the dump
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

echo "✅ Database dumped successfully to: ${BACKUP_FILE}.gz"
echo ""
echo "To restore this backup, run:"
echo "  .devcontainer/scripts/db-restore.sh ${BACKUP_FILE}.gz"