# SSL Setup Guide for Family Board

This guide will help you set up HTTPS/SSL certificates for your Family Board application using Let's Encrypt.

## 🔒 Overview

We'll implement:
- **Let's Encrypt SSL certificates** (free, trusted by all browsers)
- **Automatic HTTP to HTTPS redirect**
- **Strong SSL security configuration**
- **Automatic certificate renewal** (certificates expire every 90 days)
- **Security headers** for enhanced protection

## 📋 Prerequisites

1. **Domain pointing to your server**: Ensure `mabt.eu` and `www.mabt.eu` point to your EC2 instance
2. **Application deployed**: Your Family Board app should be running on the server
3. **Ports 80 and 443 open**: Make sure your EC2 security group allows these ports
4. **Valid email address**: For Let's Encrypt notifications

## 🚀 Step-by-Step Setup

### Step 1: Update Environment Configuration

On your production server, add your email to the `.env` file:

```bash
# Add this line to /home/ubuntu/family-board/.env
SSL_EMAIL="your-email@example.com"
```

### Step 2: Run SSL Setup Script

Execute the SSL setup script:

```bash
cd /home/ubuntu/family-board
./scripts/setup-ssl.sh
```

This script will:
1. ✅ Start services in HTTP-only mode
2. ✅ Request SSL certificates from Let's Encrypt
3. ✅ Switch to HTTPS configuration
4. ✅ Test the HTTPS setup

### Step 3: Set Up Automatic Renewal

Run the renewal setup script:

```bash
./scripts/setup-ssl-renewal.sh
```

This will:
1. ✅ Create a renewal script
2. ✅ Set up cron job for automatic renewal
3. ✅ Test the renewal process

## 🔧 Configuration Details

### Nginx SSL Configuration

The nginx configuration includes:

- **TLS 1.2 and 1.3 support**
- **Strong cipher suites**
- **OCSP stapling** for faster certificate validation
- **Security headers**:
  - `Strict-Transport-Security` (HSTS)
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `X-XSS-Protection`

### Certificate Locations

- **Certificates**: `/etc/letsencrypt/live/mabt.eu/`
- **Renewal logs**: `/home/ubuntu/family-board/logs/ssl-renewal.log`
- **Renewal script**: `/usr/local/bin/renew-family-board-ssl.sh`

## 🔄 Automatic Renewal

Certificates are automatically renewed:
- **Schedule**: Twice daily (12:00 PM and 12:00 AM)
- **Renewal threshold**: 30 days before expiration
- **Nginx reload**: Automatically reloaded after renewal

## 🧪 Testing

### Test HTTPS Setup

```bash
# Check if HTTPS is working
curl -I https://mabt.eu

# Test redirect from HTTP to HTTPS
curl -I http://mabt.eu

# Check SSL certificate details
openssl s_client -connect mabt.eu:443 -servername mabt.eu
```

### Test Renewal Process

```bash
# Test renewal manually
/usr/local/bin/renew-family-board-ssl.sh

# Check renewal logs
tail -f /home/ubuntu/family-board/logs/ssl-renewal.log
```

## 🛠️ Troubleshooting

### Common Issues

1. **Domain not resolving**
   ```bash
   # Check DNS resolution
   nslookup mabt.eu
   dig mabt.eu
   ```

2. **Port 80/443 blocked**
   ```bash
   # Check if ports are open
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :443
   ```

3. **Certificate request failed**
   ```bash
   # Check nginx logs
   docker-compose -f docker-compose.prod.yml logs nginx
   
   # Check certbot logs
   docker-compose -f docker-compose.prod.yml logs certbot
   ```

4. **Nginx won't start with SSL**
   ```bash
   # Test nginx configuration
   docker-compose -f docker-compose.prod.yml exec nginx nginx -t
   ```

### Manual Certificate Request

If the automatic setup fails, you can request certificates manually:

```bash
# Stop nginx
docker-compose -f docker-compose.prod.yml stop nginx

# Run certbot standalone
docker run --rm -it \
  -v certbot-etc:/etc/letsencrypt \
  -v certbot-var:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot \
  certonly --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d mabt.eu -d www.mabt.eu

# Start nginx
docker-compose -f docker-compose.prod.yml start nginx
```

## 🔍 Monitoring

### Check Certificate Status

```bash
# Check certificate expiration
docker run --rm -it \
  -v certbot-etc:/etc/letsencrypt \
  certbot/certbot \
  certificates
```

### View Renewal Logs

```bash
# View recent renewal attempts
tail -50 /home/ubuntu/family-board/logs/ssl-renewal.log

# Follow renewal logs in real-time
tail -f /home/ubuntu/family-board/logs/ssl-renewal.log
```

### Check Cron Jobs

```bash
# List current cron jobs
crontab -l

# Edit cron jobs if needed
crontab -e
```

## 🎉 Success!

Once setup is complete, your Family Board application will be:

- ✅ **Accessible via HTTPS**: `https://mabt.eu`
- ✅ **HTTP automatically redirected**: `http://mabt.eu` → `https://mabt.eu`
- ✅ **Secure**: Strong SSL configuration with security headers
- ✅ **Automatically renewed**: Certificates renewed before expiration
- ✅ **Trusted**: Let's Encrypt certificates trusted by all browsers

## 📚 Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration Guide](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/) - Test your SSL configuration 