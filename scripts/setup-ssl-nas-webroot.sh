#!/bin/bash
# Setup SSL certificates for NAS deployment using webroot mode

set -e

DOMAIN="mabt.eu"
EMAIL="your-email@example.com"  # Change this!

echo "🔐 Setting up SSL certificates for $DOMAIN using webroot mode"

# Create certbot directories
mkdir -p certbot/conf
mkdir -p certbot/www

# First, ensure nginx is running with HTTP only config
echo "📝 Creating initial HTTP-only nginx config..."
cat > nginx/nginx-http-only.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    # HTTP server for ACME challenge
    server {
        listen 80;
        server_name mabt.eu www.mabt.eu;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Update docker-compose to use HTTP-only config temporarily
sed -i.bak 's|./nginx/nginx-ssl.conf:|./nginx/nginx-http-only.conf:|' docker-compose.nas.yml

# Start services with HTTP-only config
echo "🚀 Starting services with HTTP-only configuration..."
docker-compose -f docker-compose.nas.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Run certbot in webroot mode
echo "🔒 Obtaining SSL certificates..."
docker-compose -f docker-compose.nas.yml exec -T nginx certbot certonly \
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
    echo "Please check:"
    echo "1. Port 80 is forwarded from your router to your NAS"
    echo "2. Firewall allows incoming connections on port 80"
    echo "3. DNS records for $DOMAIN point to your public IP"
    exit 1
fi

# Revert to SSL config
echo "✅ Certificates obtained! Switching to SSL configuration..."
sed -i.bak 's|./nginx/nginx-http-only.conf:|./nginx/nginx-ssl.conf:|' docker-compose.nas.yml
cp nginx/nginx-nas.conf nginx/nginx-ssl.conf

# Restart services with SSL
docker-compose -f docker-compose.nas.yml up -d

echo "✅ SSL setup complete!"
echo "Your site should now be accessible at https://$DOMAIN"
echo ""
echo "⚠️  Important: Make sure port 443 is also forwarded to your NAS!"