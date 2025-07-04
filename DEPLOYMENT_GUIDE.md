# 🚀 Family Board Production Deployment Guide

This guide will help you deploy the Family Board application to AWS with automatic CI/CD using GitHub Actions.

## 📋 Prerequisites

- AWS Account with Free Tier access
- GitHub repository with the application code
- Basic knowledge of AWS services

## 🏗️ Architecture Overview

```
GitHub → GitHub Actions → EC2 Instance → RDS PostgreSQL
                           ↓
                        Docker Containers
                        (Frontend + Backend + Nginx)
```

## 💰 Cost Estimate

With AWS Free Tier:
- **EC2 t2.micro**: Free for 12 months (750 hours/month)
- **RDS db.t2.micro**: Free for 12 months (750 hours/month)
- **Route 53**: $0.50/month for hosted zone
- **Data Transfer**: Minimal for <10 users
- **Total**: ~$0.50-$5/month

## 🔧 Step-by-Step Deployment

### Phase 1: AWS Infrastructure Setup

#### 1. Create RDS PostgreSQL Database

```bash
# In AWS Console:
# 1. Go to RDS → Create Database
# 2. Choose PostgreSQL
# 3. Select "Free tier" template
# 4. Configure:
#    - DB instance identifier: family-board-db
#    - Master username: familyboard
#    - Master password: [secure password]
#    - DB instance class: db.t2.micro
#    - Storage: 20 GB (Free tier)
#    - Public access: Yes (for initial setup)
#    - VPC security group: Create new → family-board-db-sg
#    - Port: 5432
```

#### 2. Create EC2 Instance

```bash
# In AWS Console:
# 1. Go to EC2 → Launch Instance
# 2. Choose Ubuntu Server 22.04 LTS
# 3. Instance type: t2.micro (Free tier)
# 4. Key pair: Create new or use existing
# 5. Security group: Create new → family-board-app-sg
#    - Port 22 (SSH): Your IP
#    - Port 80 (HTTP): 0.0.0.0/0
#    - Port 443 (HTTPS): 0.0.0.0/0
# 6. Storage: 8 GB (Free tier)
# 7. Launch instance
```

#### 3. Configure Security Groups

```bash
# family-board-db-sg (RDS):
# - Port 5432: Source = family-board-app-sg

# family-board-app-sg (EC2):
# - Port 22: Your IP address
# - Port 80: 0.0.0.0/0
# - Port 443: 0.0.0.0/0
```

#### 4. Set up Route 53 (Optional)

```bash
# If you have a domain:
# 1. Create hosted zone for your domain
# 2. Create A record pointing to EC2 public IP
# 3. Update domain registrar nameservers
```

### Phase 2: GitHub Secrets Configuration

Add these secrets to your GitHub repository:

```bash
# Go to: Repository → Settings → Secrets and variables → Actions

PROD_EC2_HOST=your-ec2-public-ip
PROD_EC2_USER=ubuntu
PROD_EC2_SSH_KEY=your-private-key-content
PROD_EC2_PORT=22
```

### Phase 3: EC2 Instance Setup

#### 1. Connect to EC2 Instance

```bash
# From your local machine:
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

#### 2. Run Initial Setup

```bash
# On EC2 instance:
curl -fsSL https://raw.githubusercontent.com/SamiTouil/family-board-cursor-claude-sonnet-4-nodejs/main/scripts/deploy-to-ec2.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

#### 3. Configure Environment Variables

```bash
# Edit the .env file:
nano /home/ubuntu/family-board/.env

# Update these values:
DATABASE_URL="postgresql://familyboard:your-password@your-rds-endpoint.region.rds.amazonaws.com:5432/familyboard"
JWT_SECRET="your-super-secure-jwt-secret-key-here"
VITE_API_URL="http://your-domain-or-ip.com"
```

### Phase 4: Test the Deployment

#### 1. Manual Test

```bash
# On EC2 instance:
cd /home/ubuntu/family-board
docker-compose -f docker-compose.prod.yml ps
curl http://localhost/api/health
```

#### 2. External Test

```bash
# From your local machine:
curl http://your-ec2-public-ip/api/health
```

### Phase 5: Enable Auto-Deployment

The GitHub Actions workflow will automatically:
1. Run all tests when you push to main
2. Deploy to production if tests pass
3. Run health checks
4. Rollback if deployment fails

## 🔄 CD Workflow

```yaml
PR Merged → GitHub Actions Triggers → Tests Run → Deploy to EC2 → Health Check → Success/Rollback
```

### Workflow Features:

- ✅ **Automated Testing**: All tests must pass before deployment
- ✅ **Database Migrations**: Automatically run Prisma migrations
- ✅ **Health Checks**: Verify deployment success
- ✅ **Graceful Rollback**: Automatic rollback on failure
- ✅ **Zero Downtime**: Docker containers restart gracefully
- ✅ **Backup**: Logs are backed up before deployment

## 🛠️ Maintenance Commands

### On EC2 Instance:

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart application
sudo systemctl restart family-board

# Update application (manual)
cd /home/ubuntu/family-board
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# View system status
sudo systemctl status family-board
docker-compose -f docker-compose.prod.yml ps

# Database operations
docker-compose -f docker-compose.prod.yml exec backend npx prisma studio
```

### Monitoring:

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
htop

# Check application health
curl http://localhost/api/health
```

## 🔒 Security Considerations

1. **SSH Key Management**: Use strong SSH keys and rotate regularly
2. **Database Security**: Keep RDS in private subnet for production
3. **Environment Variables**: Never commit secrets to git
4. **Updates**: Regularly update system packages
5. **Monitoring**: Set up CloudWatch alarms for resource usage

## 🚨 Troubleshooting

### Common Issues:

1. **Deployment Fails**:
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Check disk space
   df -h
   
   # Check memory
   free -h
   ```

2. **Database Connection Issues**:
   ```bash
   # Test database connection
   docker-compose -f docker-compose.prod.yml run --rm backend npx prisma db pull
   
   # Check security groups
   # Ensure EC2 can reach RDS on port 5432
   ```

3. **GitHub Actions Fails**:
   ```bash
   # Check GitHub secrets are set correctly
   # Verify SSH key has correct permissions
   # Check EC2 instance is running
   ```

## 📈 Scaling Considerations

For growth beyond 10 users:
- Upgrade to larger EC2 instance (t3.small, t3.medium)
- Move RDS to private subnet
- Add Application Load Balancer
- Implement SSL/TLS certificates
- Add CloudWatch monitoring
- Consider multi-AZ deployment

## 🎉 You're Done!

Your Family Board application is now:
- ✅ **Deployed to production** on AWS
- ✅ **Automatically updated** when you merge PRs
- ✅ **Monitored** with health checks
- ✅ **Backed up** with proper logging
- ✅ **Secure** with proper configurations
- ✅ **Cost-effective** using Free Tier resources

Access your application at: `http://your-ec2-public-ip`

Happy coding! 🚀 