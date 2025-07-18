#!/bin/bash
# Database restore script for devcontainer

set -e

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "❌ Error: Please provide a backup file"
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -la /workspace/backups/*.sql.gz 2>/dev/null || echo "No backups found in /workspace/backups/"
    exit 1
fi

BACKUP_FILE="$1"

# Default values
DB_HOST="${DB_HOST:-postgres}"
DB_NAME="${DB_NAME:-family_board}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will drop and recreate the database!"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   Backup: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# Export password for psql/pg_restore
export PGPASSWORD="$DB_PASSWORD"

echo "🔄 Restoring database..."

# Drop existing connections and recreate database
psql -h "$DB_HOST" -U "$DB_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF

# Restore the backup
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Decompressing and restoring backup..."
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"
else
    echo "📦 Restoring backup..."
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"
fi

echo "✅ Database restored successfully!"
echo ""
echo "You may need to run migrations:"
echo "  cd backend && npx prisma migrate deploy"