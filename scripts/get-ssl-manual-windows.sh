#!/bin/bash
# Manual SSL certificate generation script - Windows compatible

DOMAIN="mabt.eu"
EMAIL="your-email@example.com"  # CHANGE THIS!

echo "Manual SSL Certificate Generation (Windows)"
echo "=========================================="
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

echo "📁 Creating test file to verify webroot..."
mkdir -p certbot/www/.well-known/acme-challenge
echo "test-123" > certbot/www/.well-known/acme-challenge/test

echo "🧪 Testing webroot access..."
if curl -s http://localhost/.well-known/acme-challenge/test | grep -q "test-123"; then
    echo "✅ Webroot is accessible!"
    rm certbot/www/.well-known/acme-challenge/test
else
    echo "❌ Webroot is not accessible. Check nginx configuration."
    exit 1
fi

echo ""
echo "🔐 Obtaining SSL certificates..."
echo ""

# Create temporary docker-compose file for certbot
cat > docker-compose.certbot-manual.yml << EOF
services:
  certbot-manual:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    network_mode: "container:family-board-nginx"
    stdin_open: true
    tty: true
    command: certonly --webroot --webroot-path /var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN -d www.$DOMAIN
EOF

# Run certbot
docker-compose -f docker-compose.certbot-manual.yml run --rm certbot-manual

# Clean up
rm -f docker-compose.certbot-manual.yml

# Check if successful
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "✅ SSL certificates obtained successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Copy the SSL nginx config:"
    echo "   cp nginx/nginx-nas.conf nginx/nginx-ssl.conf"
    echo ""
    echo "2. Restart services with SSL:"
    echo "   docker-compose -f docker-compose.nas.yml down"
    echo "   docker-compose -f docker-compose.nas.yml up -d"
    echo ""
    echo "3. Test HTTPS access:"
    echo "   curl https://$DOMAIN"
else
    echo ""
    echo "❌ Failed to obtain certificates"
    echo "Check the error messages above"
fi