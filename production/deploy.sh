#!/bin/bash

# Family Board QNAP SSL Deployment Script
# This script deploys with SSL/HTTPS support using Let's Encrypt

set -e

echo "?~_~T~R Family Board QNAP SSL Deployment"
echo "===================================="

# Configuration
COMPOSE_FILE="docker-compose.qnap-ssl.yml"
ENV_FILE=".env"

# Detect available container orchestration tool
COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo "?~_~S? Using docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo "?~_~S? Using docker compose (V2)"
elif command -v podman-compose &> /dev/null; then
    COMPOSE_CMD="podman-compose"
    echo "?~_~S? Using podman-compose"
else
    echo "?~]~L Error: No container orchestration tool found!"
    echo "Please install one of: docker-compose, docker compose, or podman-compose"
    exit 1
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "?~]~L Error: $ENV_FILE not found!"
    echo "Please copy .env.qnap to .env and configure your SSL settings."
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "?~]~L Error: $COMPOSE_FILE not found!"
    exit 1
fi

# Load environment variables
source $ENV_FILE

# Validate SSL configuration
if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ]; then
    echo "?~]~L Error: DOMAIN_NAME and SSL_EMAIL must be set in $ENV_FILE"
    echo "Please configure your domain and email for Let's Encrypt."
    exit 1
fi

echo "?~_~L~P Domain: $DOMAIN_NAME"
echo "?~_~S? Email: $SSL_EMAIL"

# Check if domain resolves to this server
echo "?~_~T~M Checking DNS resolution..."
DOMAIN_IP=$(dig +short $DOMAIN_NAME | tail -n1)
if [ -z "$DOMAIN_IP" ]; then
    echo "?~Z| ?~O  Warning: Domain $DOMAIN_NAME does not resolve to an IP address."
    echo "   Make sure your domain DNS is configured correctly."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "?~_~S? Pulling latest images from GHCR..."
$COMPOSE_CMD -f $COMPOSE_FILE pull

echo "?~_~T~D Stopping existing containers..."
$COMPOSE_CMD -f $COMPOSE_FILE down

echo "?~_~W~D?~O Starting database..."
$COMPOSE_CMD -f $COMPOSE_FILE up -d postgres

# Wait for postgres to be ready
echo "?~O? Waiting for database to be ready..."
until $COMPOSE_CMD -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres; do
    echo "Waiting for postgres..."
    sleep 2
done

echo "?~_~T? Running database migrations..."
$COMPOSE_CMD -f $COMPOSE_FILE run --rm backend npx prisma migrate deploy

echo "?~_~L~P Starting web services (HTTP only for certificate generation)..."
$COMPOSE_CMD -f $COMPOSE_FILE up -d backend frontend nginx

echo "?~O? Waiting for services to start..."
sleep 10

# Check if certificate already exists
if [ ! -f "/var/lib/docker/volumes/$(basename $(pwd))_certbot_certs/_data/live/$DOMAIN_NAME/fullchain.pem" ]; then
    echo "?~_~T~R Obtaining SSL certificate from Let's Encrypt..."

    # First, try to get the certificate
    $COMPOSE_CMD -f $COMPOSE_FILE run --rm certbot || {
        echo "?~]~L Certificate generation failed!"
        echo "Common issues:"
        echo "1. Domain $DOMAIN_NAME doesn't point to this server"
        echo "2. Port 80 is not accessible from the internet"
        echo "3. Firewall blocking HTTP traffic"
        echo ""
        echo "Please check your DNS and firewall settings."
        exit 1
    }

    echo "?~\~E SSL certificate obtained successfully!"
else
    echo "?~\~E SSL certificate already exists"
fi

echo "?~_~T~D Restarting nginx with SSL configuration..."
$COMPOSE_CMD -f $COMPOSE_FILE restart nginx

echo "?~O? Waiting for services to be healthy..."
sleep 30

# Check service health
echo "?~_~T~M Checking service health..."
$COMPOSE_CMD -f $COMPOSE_FILE ps

echo ""
echo "?~\~E SSL Deployment complete!"
echo ""
echo "?~_~L~P Your Family Board application is available at:"
echo "   HTTPS: https://$DOMAIN_NAME"
echo "   HTTP:  Redirects to HTTPS"
echo ""
echo "?~_~T~R SSL Certificate Info:"
echo "   Domain: $DOMAIN_NAME"
echo "   Issuer: Let's Encrypt"
echo "   Auto-renewal: Configured"
echo ""
echo "?~_~S~J To check logs:"
echo "   $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
echo ""
echo "?~_~T~D To update to latest version:"
echo "   ./scripts/update-qnap-ssl.sh"
echo ""
echo "?~_~T~R To renew SSL certificate:"
echo "   ./scripts/renew-ssl.sh"