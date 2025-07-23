#!/bin/bash

# Family Board QNAP Update Script
# Quick update to latest images without full redeployment

set -e

echo "🔄 Family Board QNAP Update"
echo "============================"

COMPOSE_FILE="docker-compose.qnap.yml"

echo "📦 Pulling latest images from GHCR..."
docker-compose -f $COMPOSE_FILE pull

echo "🔄 Recreating containers with new images..."
docker-compose -f $COMPOSE_FILE up -d --force-recreate

echo "⏳ Waiting for services to stabilize..."
sleep 20

echo "🔍 Checking service status..."
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "✅ Update complete!"
echo "🌐 Application should be available shortly."
