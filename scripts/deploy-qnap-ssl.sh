#!/bin/bash

# Family Board QNAP SSL Deployment Script
# This script deploys with SSL/HTTPS support using Let's Encrypt

set -e

echo "🔒 Family Board QNAP SSL Deployment"
echo "===================================="

# Configuration
COMPOSE_FILE="docker-compose.qnap-ssl.yml"
ENV_FILE=".env"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    echo "Please copy .env.qnap to .env and configure your SSL settings."
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found!"
    exit 1
fi

# Load environment variables
source $ENV_FILE

# Validate SSL configuration
if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ]; then
    echo "❌ Error: DOMAIN_NAME and SSL_EMAIL must be set in $ENV_FILE"
    echo "Please configure your domain and email for Let's Encrypt."
    exit 1
fi

echo "🌐 Domain: $DOMAIN_NAME"
echo "📧 Email: $SSL_EMAIL"

# Check if domain resolves to this server
echo "🔍 Checking DNS resolution..."
DOMAIN_IP=$(dig +short $DOMAIN_NAME | tail -n1)
if [ -z "$DOMAIN_IP" ]; then
    echo "⚠️  Warning: Domain $DOMAIN_NAME does not resolve to an IP address."
    echo "   Make sure your domain DNS is configured correctly."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Pulling latest images from GHCR..."
docker-compose -f $COMPOSE_FILE pull

echo "🔄 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

echo "🗄️ Starting database..."
docker-compose -f $COMPOSE_FILE up -d postgres

# Wait for postgres to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres; do
    echo "Waiting for postgres..."
    sleep 2
done

echo "🔧 Running database migrations..."
docker-compose -f $COMPOSE_FILE run --rm backend npx prisma migrate deploy

echo "🌐 Starting web services (HTTP only for certificate generation)..."
docker-compose -f $COMPOSE_FILE up -d backend frontend nginx

echo "⏳ Waiting for services to start..."
sleep 10

# Check if certificate already exists
if [ ! -f "/var/lib/docker/volumes/$(basename $(pwd))_certbot_certs/_data/live/$DOMAIN_NAME/fullchain.pem" ]; then
    echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
    
    # First, try to get the certificate
    docker-compose -f $COMPOSE_FILE run --rm certbot || {
        echo "❌ Certificate generation failed!"
        echo "Common issues:"
        echo "1. Domain $DOMAIN_NAME doesn't point to this server"
        echo "2. Port 80 is not accessible from the internet"
        echo "3. Firewall blocking HTTP traffic"
        echo ""
        echo "Please check your DNS and firewall settings."
        exit 1
    }
    
    echo "✅ SSL certificate obtained successfully!"
else
    echo "✅ SSL certificate already exists"
fi

echo "🔄 Restarting nginx with SSL configuration..."
docker-compose -f $COMPOSE_FILE restart nginx

echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "✅ SSL Deployment complete!"
echo ""
echo "🌐 Your Family Board application is available at:"
echo "   HTTPS: https://$DOMAIN_NAME"
echo "   HTTP:  Redirects to HTTPS"
echo ""
echo "🔒 SSL Certificate Info:"
echo "   Domain: $DOMAIN_NAME"
echo "   Issuer: Let's Encrypt"
echo "   Auto-renewal: Configured"
echo ""
echo "📊 To check logs:"
echo "   docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🔄 To update to latest version:"
echo "   ./scripts/update-qnap-ssl.sh"
echo ""
echo "🔒 To renew SSL certificate:"
echo "   ./scripts/renew-ssl.sh"
