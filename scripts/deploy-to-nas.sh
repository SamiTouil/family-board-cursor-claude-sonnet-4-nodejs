#!/bin/bash

# Deploy Family Board to NAS

echo "Family Board NAS Deployment Script"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing docker-compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Copy environment file
if [ ! -f .env ]; then
    echo "Setting up environment file..."
    cp .env.nas .env
    echo "IMPORTANT: Edit .env file with your actual values!"
    echo "Especially the JWT_SECRET from your production environment."
    exit 1
fi

# Create necessary directories
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p backups

# Build and start services
echo "Building Docker images..."
docker-compose -f docker-compose.nas.yml build

echo "Starting PostgreSQL..."
docker-compose -f docker-compose.nas.yml up -d postgres

echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Import database backup if exists
if ls backups/familyboard_backup_*.sql 1> /dev/null 2>&1; then
    echo "Found database backup. Importing..."
    BACKUP_FILE=$(ls -t backups/familyboard_backup_*.sql | head -1)
    docker exec -i family-board-db psql -U postgres -c "CREATE DATABASE familyboard;" 2>/dev/null || true
    docker exec -i family-board-db psql -U postgres familyboard < "$BACKUP_FILE"
    echo "Database imported successfully!"
else
    echo "No database backup found in backups/ directory"
fi

# Run migrations
echo "Running database migrations..."
docker-compose -f docker-compose.nas.yml run --rm backend npx prisma migrate deploy

# Start all services
echo "Starting all services..."
docker-compose -f docker-compose.nas.yml up -d

echo ""
echo "Deployment complete!"
echo ""
echo "Services running:"
echo "- PostgreSQL: localhost:5432"
echo "- Backend API: localhost:3001"
echo "- Frontend: localhost:3000"
echo "- Nginx: localhost:80/443"
echo ""
echo "Next steps:"
echo "1. Configure port forwarding on your router"
echo "2. Update DNS records"
echo "3. Setup SSL certificates"
echo ""
echo "Check logs with: docker-compose -f docker-compose.nas.yml logs -f"