#!/bin/bash
# Initialize SSL setup for NAS - handles the chicken-and-egg problem

set -e

DOMAIN="mabt.eu"
EMAIL="your-email@example.com"  # IMPORTANT: Change this to your email!

echo "🚀 Initializing SSL setup for Family Board on NAS"
echo "=================================================="
echo ""

# Check if email was changed
if [ "$EMAIL" = "your-email@example.com" ]; then
    echo "❌ ERROR: Please edit this script and set your email address!"
    echo "   Edit line 7 of this script and replace 'your-email@example.com' with your actual email"
    exit 1
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p nginx

# Step 1: Start with HTTP-only configuration
echo "🔧 Step 1: Starting services with HTTP-only configuration..."
# Backup current docker-compose if it exists
if [ -f docker-compose.nas.yml ]; then
    cp docker-compose.nas.yml docker-compose.nas.yml.backup
fi

# Temporarily modify docker-compose to use HTTP-only config
sed -i.tmp 's|./nginx/nginx-ssl.conf:|./nginx/nginx-http-only.conf:|' docker-compose.nas.yml

# Stop any running services
docker-compose -f docker-compose.nas.yml down

# Start services with HTTP-only config
docker-compose -f docker-compose.nas.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if nginx is running
if ! docker-compose -f docker-compose.nas.yml ps | grep -q "nginx.*Up"; then
    echo "❌ ERROR: Nginx failed to start. Check logs with:"
    echo "   docker-compose -f docker-compose.nas.yml logs nginx"
    exit 1
fi

# Step 2: Test HTTP connectivity
echo ""
echo "🔍 Step 2: Testing HTTP connectivity..."
echo "Testing local connectivity..."
if curl -f -s -o /dev/null http://localhost/.well-known/acme-challenge/test; then
    echo "✅ Local HTTP connectivity OK"
else
    echo "⚠️  Local HTTP connectivity failed - nginx might not be properly configured"
fi

echo ""
echo "Testing external connectivity to $DOMAIN..."
if timeout 10 curl -f -s -o /dev/null http://$DOMAIN/.well-known/acme-challenge/test 2>/dev/null; then
    echo "✅ External HTTP connectivity OK"
else
    echo "❌ ERROR: Cannot reach $DOMAIN from the internet"
    echo ""
    echo "Please check:"
    echo "1. Port 80 is forwarded from your router to your NAS"
    echo "2. Your firewall allows incoming connections on port 80"
    echo "3. DNS records for $DOMAIN point to your public IP"
    echo ""
    echo "Run ./scripts/diagnose-ssl-setup.sh for more details"
    exit 1
fi

# Step 3: Obtain SSL certificates
echo ""
echo "🔐 Step 3: Obtaining SSL certificates..."
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  --network family-board-network \
  certbot/certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d $DOMAIN \
  -d www.$DOMAIN

# Check if certificates were obtained
if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ Failed to obtain SSL certificates!"
    exit 1
fi

echo "✅ SSL certificates obtained successfully!"

# Step 4: Switch to SSL configuration
echo ""
echo "🔄 Step 4: Switching to SSL configuration..."
# Create the SSL nginx config
cp nginx/nginx-nas.conf nginx/nginx-ssl.conf

# Update docker-compose to use SSL config
sed -i.tmp 's|./nginx/nginx-http-only.conf:|./nginx/nginx-ssl.conf:|' docker-compose.nas.yml

# Restart services with SSL
docker-compose -f docker-compose.nas.yml down
docker-compose -f docker-compose.nas.yml up -d

# Wait for services to restart
echo "⏳ Waiting for services to restart with SSL..."
sleep 10

# Verify SSL is working
echo ""
echo "🔍 Verifying SSL setup..."
if curl -f -s -o /dev/null https://$DOMAIN 2>/dev/null; then
    echo "✅ HTTPS is working!"
else
    echo "⚠️  HTTPS might not be working yet. This could be normal if DNS is still propagating."
fi

echo ""
echo "✅ SSL setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure port 443 is forwarded from your router to your NAS"
echo "2. Your site should be accessible at:"
echo "   - https://$DOMAIN"
echo "   - https://www.$DOMAIN"
echo ""
echo "🔄 Certificates will auto-renew via the certbot container"
echo ""
echo "📝 To check service status:"
echo "   docker-compose -f docker-compose.nas.yml ps"
echo ""
echo "📝 To view logs:"
echo "   docker-compose -f docker-compose.nas.yml logs"

# Cleanup
rm -f docker-compose.nas.yml.tmp nginx/*.tmp