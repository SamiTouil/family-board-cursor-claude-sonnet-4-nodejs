#!/bin/bash

# Family Board QNAP Update Script
# Quick update to latest images without full redeployment

set -e

echo "🔄 Family Board QNAP Update"
echo "============================"

COMPOSE_FILE="docker-compose.qnap.yml"

# Detect available container orchestration tool
COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v podman-compose &> /dev/null; then
    COMPOSE_CMD="podman-compose"
else
    echo "❌ Error: No container orchestration tool found!"
    exit 1
fi

echo "📦 Pulling latest images from GHCR..."
$COMPOSE_CMD -f $COMPOSE_FILE pull

echo "🔄 Recreating containers with new images..."
$COMPOSE_CMD -f $COMPOSE_FILE up -d --force-recreate

echo "⏳ Waiting for services to stabilize..."
sleep 20

echo "🔍 Checking service status..."
$COMPOSE_CMD -f $COMPOSE_FILE ps

echo ""
echo "✅ Update complete!"
echo "🌐 Application should be available shortly."
