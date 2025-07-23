#!/bin/bash

# Family Board QNAP Deployment Script
# This script deploys the latest images from GHCR to your QNAP NAS

set -e

echo "🚀 Family Board QNAP Deployment"
echo "================================"

# Configuration
COMPOSE_FILE="docker-compose.qnap.yml"
ENV_FILE=".env"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    echo "Please copy .env.qnap to .env and configure your settings."
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found!"
    exit 1
fi

echo "📦 Pulling latest images from GHCR..."
docker-compose -f $COMPOSE_FILE pull

echo "🔄 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

echo "🗄️ Running database migrations..."
docker-compose -f $COMPOSE_FILE up -d postgres
sleep 10

# Wait for postgres to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres; do
    echo "Waiting for postgres..."
    sleep 2
done

# Run migrations
echo "🔧 Running Prisma migrations..."
docker-compose -f $COMPOSE_FILE run --rm backend npx prisma migrate deploy

echo "🚀 Starting all services..."
docker-compose -f $COMPOSE_FILE up -d

echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your Family Board application should be available at:"
echo "   Frontend: $(grep FRONTEND_URL $ENV_FILE | cut -d'=' -f2)"
echo ""
echo "📊 To check logs:"
echo "   docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🔄 To update to latest version:"
echo "   ./scripts/deploy-qnap.sh"
