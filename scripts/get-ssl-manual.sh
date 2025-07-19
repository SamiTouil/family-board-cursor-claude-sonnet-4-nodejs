#!/bin/bash
# Manual SSL certificate generation script

DOMAIN="mabt.eu"
EMAIL="your-email@example.com"  # CHANGE THIS!

echo "Manual SSL Certificate Generation"
echo "================================="
echo ""
echo "This script will obtain SSL certificates using the running nginx container."
echo ""

# Check if email was changed
if [ "$EMAIL" = "your-email@example.com" ]; then
    echo "❌ ERROR: Please edit this script and set your email address!"
    exit 1
fi

# Check if nginx is running
if ! docker ps | grep -q family-board-nginx; then
    echo "❌ ERROR: Nginx container is not running!"
    echo "Start it with: docker-compose -f docker-compose.nas.yml up -d nginx"
    exit 1
fi

echo "Running certbot to obtain certificates..."
echo ""

# Run certbot
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  --network container:family-board-nginx \
  certbot/certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN \
  -d www.$DOMAIN

# Check if successful
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "✅ SSL certificates obtained successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update nginx config to use SSL (already done in nginx-nas.conf)"
    echo "2. Restart nginx with SSL config:"
    echo "   docker-compose -f docker-compose.nas.yml restart nginx"
else
    echo ""
    echo "❌ Failed to obtain certificates"
    echo "Check the error messages above"
fi