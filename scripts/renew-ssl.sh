#!/bin/bash

# SSL Certificate Renewal Script
# Run this script to renew Let's Encrypt certificates

set -e

echo "🔒 SSL Certificate Renewal"
echo "=========================="

COMPOSE_FILE="docker-compose.qnap-ssl.yml"

echo "🔄 Renewing SSL certificates..."
docker-compose -f $COMPOSE_FILE run --rm certbot renew

echo "🔄 Reloading nginx configuration..."
docker-compose -f $COMPOSE_FILE exec nginx nginx -s reload

echo "✅ SSL certificate renewal complete!"

# Check certificate expiry
echo "📅 Certificate expiry information:"
docker-compose -f $COMPOSE_FILE run --rm certbot certificates
