#!/bin/bash

# Family Board - Quick Production Update Script
# This script quickly updates to the latest version without full deployment setup
# Use this for regular updates after initial deployment

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo "🔄 Family Board Quick Update"
echo "============================"

print_status "Pulling latest images..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull

print_status "Restarting services with new images..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

print_status "Waiting for services to be ready..."
sleep 10

print_status "Running any pending database migrations..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec backend npx prisma db push || true

print_success "🎉 Update completed!"
print_status "Services are running at http://localhost:3000"
