#!/bin/bash

# SSL Certificate Renewal Script
# Run this script to renew Let's Encrypt certificates

set -e

echo "🔒 SSL Certificate Renewal"
echo "=========================="

COMPOSE_FILE="docker-compose.qnap-ssl.yml"

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

echo "🔄 Renewing SSL certificates..."
$COMPOSE_CMD -f $COMPOSE_FILE run --rm certbot renew

echo "🔄 Reloading nginx configuration..."
$COMPOSE_CMD -f $COMPOSE_FILE exec nginx nginx -s reload

echo "✅ SSL certificate renewal complete!"

# Check certificate expiry
echo "📅 Certificate expiry information:"
$COMPOSE_CMD -f $COMPOSE_FILE run --rm certbot certificates
