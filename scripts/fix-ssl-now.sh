#!/bin/bash
# Quick fix for SSL setup - creates necessary directories and test files

set -e

echo "🔧 Quick SSL fix script"
echo "======================"

# Create the webroot directory structure on the host
echo "📁 Creating certbot directories..."
mkdir -p certbot/www/.well-known/acme-challenge
mkdir -p certbot/conf

# Create a test file
echo "test-123" > certbot/www/.well-known/acme-challenge/test

# Test if nginx can serve the file
echo "🧪 Testing nginx webroot access..."
if curl -s http://localhost/.well-known/acme-challenge/test | grep -q "test-123"; then
    echo "✅ Nginx can serve files from webroot!"
    rm certbot/www/.well-known/acme-challenge/test
else
    echo "❌ Nginx cannot access webroot. Checking configuration..."
    docker-compose -f docker-compose.nas.yml exec nginx ls -la /var/www/certbot/
    exit 1
fi

echo ""
echo "✅ Webroot is properly configured!"
echo ""
echo "Now you can run the SSL setup. Choose one of these options:"
echo ""
echo "Option 1 - Using docker-compose (recommended):"
echo "  docker-compose -f docker-compose.nas.yml run --rm certbot certonly \\"
echo "    --webroot --webroot-path /var/www/certbot \\"
echo "    --email YOUR_EMAIL --agree-tos --no-eff-email \\"
echo "    -d mabt.eu -d www.mabt.eu"
echo ""
echo "Option 2 - Using standalone docker:"
echo "  docker run -it --rm \\"
echo "    -v \$(pwd)/certbot/conf:/etc/letsencrypt \\"
echo "    -v \$(pwd)/certbot/www:/var/www/certbot \\"
echo "    -p 80:80 \\"
echo "    certbot/certbot certonly --webroot \\"
echo "    --webroot-path /var/www/certbot \\"
echo "    --email YOUR_EMAIL --agree-tos --no-eff-email \\"
echo "    -d mabt.eu -d www.mabt.eu"
echo ""
echo "Don't forget to replace YOUR_EMAIL with your actual email address!"