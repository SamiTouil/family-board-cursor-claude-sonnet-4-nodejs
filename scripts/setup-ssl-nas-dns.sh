#!/bin/bash
# Setup SSL certificates using DNS validation (no port 80 required)

set -e

DOMAIN="mabt.eu"
EMAIL="your-email@example.com"  # Change this!

echo "🔐 Setting up SSL certificates for $DOMAIN using DNS validation"
echo "This method doesn't require port 80 to be open!"
echo ""

# Create certbot directories
mkdir -p certbot/conf
mkdir -p certbot/www

# Run certbot with DNS challenge
echo "🔒 Starting DNS validation process..."
echo "You will need to add TXT records to your DNS configuration."
echo ""

docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --manual \
  --preferred-challenges dns \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN \
  -d www.$DOMAIN \
  -d "*.${DOMAIN}"

# Check if certificates were obtained
if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ Failed to obtain SSL certificates!"
    exit 1
fi

# Copy nginx SSL config
cp nginx/nginx-nas.conf nginx/nginx-ssl.conf

# Start services with SSL
echo "✅ Certificates obtained! Starting services with SSL..."
docker-compose -f docker-compose.nas.yml up -d

echo "✅ SSL setup complete!"
echo "Your site should now be accessible at https://$DOMAIN"
echo ""
echo "⚠️  Important: Make sure port 443 is forwarded to your NAS!"