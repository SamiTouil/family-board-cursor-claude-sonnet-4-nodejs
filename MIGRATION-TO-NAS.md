# Migration Guide: AWS to Home NAS

## Overview
This guide will help you migrate your Family Board application from AWS EC2 to your home NAS (lsultra).

## Prerequisites
- SSH access to your EC2 instance
- Admin access to your Orange Livebox
- Docker installed on your NAS
- A stable home internet connection

## Step 1: Backup Production Data

### 1.1 Connect to EC2 and Create Database Backup
```bash
# SSH into your EC2 instance
ssh ubuntu@mabt.eu

# Navigate to project directory
cd /home/ubuntu/family-board

# Create backup directory
mkdir -p backups

# Backup PostgreSQL database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres familyboard > backups/familyboard_$(date +%Y%m%d_%H%M%S).sql

# Copy the backup to your local machine
exit
scp ubuntu@mabt.eu:/home/ubuntu/family-board/backups/familyboard_*.sql ~/Desktop/
```

### 1.2 Backup Environment Configuration
```bash
# Copy production environment file
scp ubuntu@mabt.eu:/home/ubuntu/family-board/.env ~/Desktop/production.env.backup
```

## Step 2: Setup NAS Environment

### 2.1 Connect to NAS and Prepare Directory
```bash
# SSH into your NAS
ssh your-nas-user@lsultra

# Create project directory
mkdir -p ~/family-board
cd ~/family-board

# Clone the repository
git clone https://github.com/SamiTouil/family-board-cursor-claude-sonnet-4-nodejs.git .
```

### 2.2 Create Docker Compose for NAS
Create a new file `docker-compose.nas.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: family-board-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: familyboard
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
      target: production
    container_name: family-board-backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-postgres}@postgres:5432/familyboard
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      DISABLE_CSRF_VALIDATION: ${DISABLE_CSRF_VALIDATION:-true}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile.prod
    container_name: family-board-frontend
    ports:
      - "3000:80"
    environment:
      VITE_API_URL: ${VITE_API_URL}
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: family-board-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  default:
    name: family-board-network
```

### 2.3 Setup Environment File
```bash
# Copy from backup and modify
cp ~/Desktop/production.env.backup .env

# Edit the .env file
nano .env
```

Update these values:
```env
# Change API URL to use dynamic DNS (we'll set this up)
VITE_API_URL=https://mabt.eu

# Keep the same JWT_SECRET from production
JWT_SECRET=your-existing-jwt-secret

# Database password (use a strong one)
DB_PASSWORD=your-secure-password

# SSL email
SSL_EMAIL=your-email@example.com
```

## Step 3: Configure Orange Livebox Port Forwarding

### 3.1 Access Livebox Admin Panel
1. Open browser and go to: http://192.168.1.1
2. Login with admin credentials

### 3.2 Setup Port Forwarding Rules
Navigate to: Network > NAT/PAT > Add Rule

Create these rules:
- **HTTP**: External Port 80 → Internal IP (NAS IP) → Internal Port 80
- **HTTPS**: External Port 443 → Internal IP (NAS IP) → Internal Port 443
- **SSH** (optional): External Port 2222 → Internal IP (NAS IP) → Internal Port 22

### 3.3 Reserve Static IP for NAS
Navigate to: Network > DHCP > Static Leases
- Add your NAS MAC address
- Assign a fixed IP (e.g., 192.168.1.100)

## Step 4: Setup Dynamic DNS

### 4.1 Get Your Current WAN IP
```bash
curl -s https://api.ipify.org
```

### 4.2 Option A: Use Orange Dynamic DNS (if available)
Check if your Livebox supports DynDNS in the admin panel.

### 4.2 Option B: Use DuckDNS (free alternative)
1. Sign up at https://www.duckdns.org
2. Create a subdomain
3. Install on NAS:
```bash
# Create update script
mkdir -p ~/duckdns
cd ~/duckdns

cat > duck.sh << 'EOF'
#!/bin/bash
TOKEN="your-duckdns-token"
DOMAIN="your-subdomain"
curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip="
EOF

chmod +x duck.sh

# Add to crontab
crontab -e
# Add: */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

## Step 5: Update Route53 DNS

### 5.1 Update A Records
1. Login to AWS Console → Route53
2. Find hosted zone for mabt.eu
3. Update A records:
   - `mabt.eu` → Your home WAN IP
   - `www.mabt.eu` → Your home WAN IP
4. Set TTL to 300 seconds (5 minutes) for faster updates

### 5.2 Consider Using CNAME (if using DuckDNS)
Instead of A records, you could use:
- `mabt.eu` → CNAME → `your-subdomain.duckdns.org`

## Step 6: Deploy on NAS

### 6.1 Import Database Backup
```bash
# Start only PostgreSQL
docker-compose -f docker-compose.nas.yml up -d postgres

# Wait for it to be ready
sleep 10

# Import the backup
docker exec -i family-board-db psql -U postgres familyboard < ~/Desktop/familyboard_*.sql

# Run migrations (if needed)
docker-compose -f docker-compose.nas.yml run --rm backend npx prisma migrate deploy
```

### 6.2 Build and Start All Services
```bash
# Build images
docker-compose -f docker-compose.nas.yml build

# Start all services
docker-compose -f docker-compose.nas.yml up -d

# Check logs
docker-compose -f docker-compose.nas.yml logs -f
```

## Step 7: Setup SSL with Let's Encrypt

### 7.1 Initial Certificate
```bash
# Stop nginx temporarily
docker-compose -f docker-compose.nas.yml stop nginx

# Get certificate
docker run -it --rm \
  -v ./certbot/conf:/etc/letsencrypt \
  -v ./certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --preferred-challenges http \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d mabt.eu \
  -d www.mabt.eu

# Start nginx again
docker-compose -f docker-compose.nas.yml start nginx
```

### 7.2 Setup Auto-Renewal
```bash
# Create renewal script
cat > ~/family-board/renew-ssl.sh << 'EOF'
#!/bin/bash
cd ~/family-board
docker-compose -f docker-compose.nas.yml run --rm certbot renew
docker-compose -f docker-compose.nas.yml exec nginx nginx -s reload
EOF

chmod +x ~/family-board/renew-ssl.sh

# Add to crontab
crontab -e
# Add: 0 3 * * * ~/family-board/renew-ssl.sh >/dev/null 2>&1
```

## Step 8: Monitoring and Maintenance

### 8.1 Setup Health Monitoring
```bash
# Create monitoring script
cat > ~/family-board/check-health.sh << 'EOF'
#!/bin/bash
if ! curl -sf https://mabt.eu/api/health > /dev/null; then
  echo "Family Board is down!" | mail -s "Alert: Family Board Down" your-email@example.com
  cd ~/family-board && docker-compose -f docker-compose.nas.yml restart
fi
EOF

chmod +x ~/family-board/check-health.sh

# Add to crontab (every 5 minutes)
# */5 * * * * ~/family-board/check-health.sh
```

### 8.2 Backup Script
```bash
# Create backup script
cat > ~/family-board/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/family-board-backups/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Backup database
docker exec family-board-db pg_dump -U postgres familyboard > $BACKUP_DIR/database.sql

# Backup environment
cp ~/family-board/.env $BACKUP_DIR/

# Keep only last 7 days
find ~/family-board-backups -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x ~/family-board/backup.sh

# Add daily backup to crontab
# 0 2 * * * ~/family-board/backup.sh
```

## Step 9: Shutdown AWS Resources

Once everything is working on your NAS:

1. **Stop EC2 Instance**
   - AWS Console → EC2 → Instances
   - Select your instance → Actions → Stop

2. **Create AMI Backup** (just in case)
   - Actions → Image → Create Image
   - Wait for completion

3. **Terminate Instance** (after testing for a week)
   - Actions → Terminate

4. **Delete RDS Instance**
   - Take final snapshot first
   - Then delete the instance

5. **Review Other AWS Services**
   - Check for any EBS volumes
   - Remove unused Elastic IPs
   - Delete old snapshots

## Troubleshooting

### Port Forwarding Not Working
- Check Windows Firewall on NAS
- Verify NAS has static IP
- Test with: `telnet your-wan-ip 80`

### SSL Certificate Issues
- Ensure ports 80/443 are accessible
- Check DNS propagation: `nslookup mabt.eu`
- Verify certbot can reach Let's Encrypt

### Performance Issues
- Monitor NAS resources: `docker stats`
- Adjust memory limits in docker-compose
- Consider adding swap space on NAS

## Cost Savings

Moving from AWS to home hosting will save:
- EC2 instance costs (~$5-20/month)
- RDS database costs (~$15-30/month)
- Data transfer costs
- Elastic IP costs

New costs:
- Slightly higher electricity bill (~$2-5/month)
- Need stable internet connection
- No SLA or automatic failover

## Security Considerations

1. **Firewall**: Only open required ports
2. **Updates**: Keep NAS and Docker updated
3. **Backups**: Regular automated backups
4. **Monitoring**: Set up alerts for downtime
5. **DDoS**: Consider Cloudflare free tier if needed