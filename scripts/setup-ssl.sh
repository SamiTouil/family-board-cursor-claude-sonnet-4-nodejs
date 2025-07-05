#!/bin/bash

# SSL Setup Script for Family Board
# This script sets up SSL certificates using Let's Encrypt

set -e

echo "🔒 Setting up SSL certificates for Family Board..."

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  This script should not be run as root. Please run as a regular user with sudo access."
   exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found! Please create it first with SSL_EMAIL variable."
    echo "Example: SSL_EMAIL=your-email@example.com"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if SSL_EMAIL is set
if [ -z "$SSL_EMAIL" ]; then
    echo "❌ SSL_EMAIL not found in .env file!"
    echo "Please add: SSL_EMAIL=your-email@example.com"
    exit 1
fi

echo "📧 Using email: $SSL_EMAIL"
echo "🌐 Setting up certificates for: mabt.eu, www.mabt.eu"

# Step 1: Start nginx in HTTP-only mode for initial certificate request
echo "🚀 Step 1: Starting services for initial certificate request..."

# Create a temporary nginx config for HTTP-only (for initial setup)
cp nginx/nginx.conf nginx/nginx.conf.backup

cat > nginx/nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    server {
        listen 80;
        server_name mabt.eu www.mabt.eu;
        
        # Let's Encrypt challenge location
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
            try_files $uri =404;
        }
        
        # Temporary: serve the app over HTTP during setup
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /api/ {
            proxy_pass http://backend:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Use temporary config
cp nginx/nginx-temp.conf nginx/nginx.conf

# Start services without SSL
echo "📦 Starting services..."
docker-compose -f docker-compose.prod.yml up -d nginx frontend backend

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Step 2: Request SSL certificates
echo "🔐 Step 2: Requesting SSL certificates from Let's Encrypt..."

# Run certbot to get certificates
if docker-compose -f docker-compose.prod.yml run --rm certbot; then
    echo "✅ SSL certificates obtained successfully!"
else
    echo "❌ Failed to obtain SSL certificates!"
    echo "🔄 Restoring original nginx config..."
    cp nginx/nginx.conf.backup nginx/nginx.conf
    rm -f nginx/nginx-temp.conf
    exit 1
fi

# Step 3: Switch to HTTPS configuration
echo "🔄 Step 3: Switching to HTTPS configuration..."

# Restore the full HTTPS nginx config
cp nginx/nginx.conf.backup nginx/nginx.conf
rm -f nginx/nginx-temp.conf

# Restart nginx with SSL configuration
echo "🔄 Restarting nginx with SSL configuration..."
docker-compose -f docker-compose.prod.yml restart nginx

# Wait a moment for nginx to restart
sleep 10

# Step 4: Test HTTPS
echo "🧪 Step 4: Testing HTTPS configuration..."

if curl -f -s https://mabt.eu/api/health > /dev/null; then
    echo "✅ HTTPS is working correctly!"
    echo "🎉 SSL setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Your site is now available at https://mabt.eu"
    echo "   2. HTTP traffic will automatically redirect to HTTPS"
    echo "   3. Set up automatic certificate renewal (see setup-ssl-renewal.sh)"
else
    echo "⚠️  HTTPS test failed. Check nginx logs:"
    docker-compose -f docker-compose.prod.yml logs nginx
fi

# Cleanup
rm -f nginx/nginx.conf.backup

echo "🔒 SSL setup script completed!" 