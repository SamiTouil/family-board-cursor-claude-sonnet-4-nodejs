#!/bin/bash
# Initialize SSL setup for NAS - Windows compatible version

set -e

DOMAIN="mabt.eu"
EMAIL="your-email@example.com"  # IMPORTANT: Change this to your email!

echo "🚀 Initializing SSL setup for Family Board on NAS (Windows)"
echo "==========================================================="
echo ""

# Check if email was changed
if [ "$EMAIL" = "your-email@example.com" ]; then
    echo "❌ ERROR: Please edit this script and set your email address!"
    echo "   Edit line 7 of this script and replace 'your-email@example.com' with your actual email"
    exit 1
fi

# Convert Windows path to Unix path for Docker
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Running on Windows (Git Bash)
    WORKING_DIR=$(pwd -W | sed 's/\\/\//g' | sed 's/://g' | sed 's/^/\//')
    echo "📁 Detected Windows environment"
    echo "   Working directory: $WORKING_DIR"
else
    WORKING_DIR=$(pwd)
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p certbot/conf
mkdir -p certbot/www/.well-known/acme-challenge
mkdir -p nginx

# Step 1: Start with HTTP-only configuration
echo "🔧 Step 1: Starting services with HTTP-only configuration..."
# Ensure we're using HTTP-only config
if [ -f nginx/nginx-ssl.conf ]; then
    cp nginx/nginx-http-only.conf nginx/nginx-ssl.conf
fi

# Stop any running services
docker-compose -f docker-compose.nas.yml down

# Start services
docker-compose -f docker-compose.nas.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if nginx is running
if ! docker ps | grep -q "family-board-nginx.*Up"; then
    echo "❌ ERROR: Nginx failed to start. Check logs with:"
    echo "   docker-compose -f docker-compose.nas.yml logs nginx"
    exit 1
fi

# Step 2: Test HTTP connectivity
echo ""
echo "🔍 Step 2: Testing HTTP connectivity..."
# Create a test file to verify webroot is working
echo "test-content" > certbot/www/.well-known/acme-challenge/test

echo "Testing local connectivity..."
if curl -f -s http://localhost/.well-known/acme-challenge/test | grep -q "test-content"; then
    echo "✅ Local HTTP connectivity OK"
else
    echo "⚠️  Local HTTP connectivity failed - nginx might not be properly configured"
    echo "Checking nginx logs..."
    docker-compose -f docker-compose.nas.yml logs --tail=10 nginx
fi

echo ""
echo "Testing external connectivity to $DOMAIN..."
if timeout 10 curl -f -s http://$DOMAIN/.well-known/acme-challenge/test 2>/dev/null | grep -q "test-content"; then
    echo "✅ External HTTP connectivity OK"
    # Clean up test file
    rm -f certbot/www/.well-known/acme-challenge/test
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

# Step 3: Obtain SSL certificates using docker-compose
echo ""
echo "🔐 Step 3: Obtaining SSL certificates..."
echo "Using docker-compose to ensure proper volume mounting..."

# Create a temporary certbot service definition
cat > docker-compose.certbot-temp.yml << EOF
services:
  certbot-temp:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    network_mode: "container:family-board-nginx"
    command: certonly --webroot --webroot-path /var/www/certbot --email $EMAIL --agree-tos --no-eff-email --non-interactive -d $DOMAIN -d www.$DOMAIN
EOF

# Run certbot using docker-compose
docker-compose -f docker-compose.certbot-temp.yml run --rm certbot-temp

# Clean up temp file
rm -f docker-compose.certbot-temp.yml

# Check if certificates were obtained
if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ Failed to obtain SSL certificates!"
    echo "Check the error messages above for details."
    exit 1
fi

echo "✅ SSL certificates obtained successfully!"

# Step 4: Switch to SSL configuration
echo ""
echo "🔄 Step 4: Switching to SSL configuration..."
# Create the SSL nginx config
cp nginx/nginx-nas.conf nginx/nginx-ssl.conf

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