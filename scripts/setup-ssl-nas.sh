#!/bin/bash
# Setup SSL certificates for NAS deployment

set -e

DOMAIN="mabt.eu"
EMAIL="your-email@example.com"  # Change this!

echo "🔐 Setting up SSL certificates for $DOMAIN"

# Stop nginx to free port 80
docker-compose -f docker-compose.nas.yml stop nginx

# Run certbot
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN \
  -d nas.$DOMAIN

# Update nginx config to use the new certificate
cp nginx/nginx-nas.conf nginx/nginx-ssl.conf

# Start services with SSL
docker-compose -f docker-compose.nas.yml up -d

echo "✅ SSL setup complete!"
echo "Your site should now be accessible at https://$DOMAIN"