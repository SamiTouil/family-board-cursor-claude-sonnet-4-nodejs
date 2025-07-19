# Setting Up Domain Access for NAS-hosted Family Board

## Prerequisites
- Family Board running on your NAS
- Access to Livebox admin panel
- AWS Route53 access
- Domain name (e.g., mabt.eu)

## Step 1: Configure Livebox Port Forwarding

1. Access Livebox admin: `http://192.168.1.1`
2. Go to **Configuration** → **Réseau** → **NAT/PAT**
3. Add port forwarding rules:
   - External Port 80 → NAS_IP:80 (TCP)
   - External Port 443 → NAS_IP:443 (TCP)
4. Save configuration

## Step 2: Get Your Public IP

```bash
curl ifconfig.me
```

Note: Orange typically provides dynamic IPs. Consider:
- Setting up DuckDNS for automatic updates
- Or manually update when IP changes

## Step 3: Configure Route53

1. Log into AWS Console → Route53
2. Select your hosted zone (mabt.eu)
3. Create/Update A record:
   - Name: `@` or `nas`
   - Type: A
   - Value: Your public IP
   - TTL: 300

## Step 4: Update NAS Configuration

1. SSH into your NAS
2. Navigate to project directory
3. Update `.env.nas`:
   ```env
   VITE_API_URL=https://mabt.eu
   ```

## Step 5: Set Up SSL Certificates

1. First-time setup:
   ```bash
   # On your NAS
   cd /path/to/family-board
   ./scripts/setup-ssl-nas.sh
   ```

2. Update email in the script first!

## Step 6: Deploy with SSL

```bash
# Stop current deployment
docker-compose -f docker-compose.nas.yml down

# Copy nginx config
cp nginx/nginx-nas.conf nginx/nginx-ssl.conf

# Start with SSL
docker-compose -f docker-compose.nas.yml up -d
```

## Step 7: Test Access

1. Test HTTP redirect: `http://mabt.eu` → should redirect to HTTPS
2. Test HTTPS: `https://mabt.eu` → should show your app
3. Test API: `https://mabt.eu/api/health`

## Troubleshooting

### "Connection Refused"
- Check Livebox port forwarding
- Verify NAS firewall allows 80/443
- Check Docker containers are running

### "SSL Certificate Error"
- Ensure domain DNS has propagated (can take up to 48h)
- Check certbot logs: `docker logs family-board-certbot`

### Dynamic IP Changes
Set up a cron job on your NAS:
```bash
# Add to crontab
*/30 * * * * /path/to/family-board/scripts/update-route53.sh
```

## Security Considerations

1. **Enable Livebox Firewall**
   - Only allow ports 80 and 443
   - Block all other incoming connections

2. **Use Strong Passwords**
   - Update all default passwords in `.env.nas`
   - Use strong JWT secret

3. **Regular Updates**
   - Keep Docker images updated
   - Monitor security advisories

## Maintenance

### Renew SSL Certificates
Certbot container handles this automatically, but you can force renewal:
```bash
docker-compose -f docker-compose.nas.yml exec certbot certbot renew --force-renewal
docker-compose -f docker-compose.nas.yml restart nginx
```

### Monitor Logs
```bash
docker-compose -f docker-compose.nas.yml logs -f nginx certbot
```