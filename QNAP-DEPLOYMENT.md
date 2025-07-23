# Family Board QNAP Deployment Guide

This guide helps you deploy Family Board on your QNAP NAS using Container Station with automated GHCR image updates.

## 🎯 Overview

Your setup will be:
1. **GitHub Actions** → Builds and pushes images to GHCR automatically
2. **QNAP NAS** → Pulls and runs latest images from GHCR
3. **Container Station** → Manages the containers

## 📋 Prerequisites

- QNAP NAS with Container Station installed
- SSH access to your QNAP NAS
- GitHub Personal Access Token (for GHCR access)

## 🚀 Initial Setup

### 1. SSH to Your QNAP NAS

```bash
ssh admin@your-qnap-ip
```

### 2. Create Project Directory

```bash
mkdir -p /share/Container/family-board
cd /share/Container/family-board
```

### 3. Copy Files to QNAP

Copy these files from your project to the QNAP directory:
- `docker-compose.qnap.yml`
- `.env.qnap` → rename to `.env`
- `scripts/deploy-qnap.sh`
- `scripts/update-qnap.sh`

### 4. Configure Environment

```bash
# Copy and edit environment file
cp .env.qnap .env
vi .env
```

**Required configurations:**
```bash
# Database password (change this!)
POSTGRES_PASSWORD=your-secure-database-password

# JWT secret (generate a secure 32+ character string)
JWT_SECRET=your-super-secure-jwt-secret-32-chars-min

# Your QNAP's network configuration
FRONTEND_URL=http://192.168.1.100:8080  # Replace with your QNAP IP
FRONTEND_PORT=8080
```

### 5. Login to GitHub Container Registry

```bash
# Create GitHub Personal Access Token with packages:read permission
# Then login to GHCR
docker login ghcr.io -u YOUR_GITHUB_USERNAME -p YOUR_GITHUB_TOKEN
```

## 🐳 Deployment

### Initial Deployment

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy for the first time
./scripts/deploy-qnap.sh
```

### Regular Updates

When new code is pushed to main branch:

```bash
# Quick update to latest images
./scripts/update-qnap.sh
```

## 🔧 Management Commands

### View Logs
```bash
docker-compose -f docker-compose.qnap.yml logs -f
```

### Check Status
```bash
docker-compose -f docker-compose.qnap.yml ps
```

### Stop Services
```bash
docker-compose -f docker-compose.qnap.yml down
```

### Start Services
```bash
docker-compose -f docker-compose.qnap.yml up -d
```

### Database Backup
```bash
docker-compose -f docker-compose.qnap.yml exec postgres pg_dump -U postgres familyboard > backup.sql
```

## 🌐 Access Your Application

After deployment, access your Family Board at:
- **Local Network**: `http://your-qnap-ip:8080`
- **Example**: `http://192.168.1.100:8080`

## 🔄 Automated Updates

Your workflow:
1. **Push code to main branch** → GitHub Actions builds and pushes new images
2. **Run update script on QNAP** → Pulls latest images and restarts containers
3. **Application updated** → Latest version running on your NAS

## 🛠️ Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.qnap.yml logs backend
docker-compose -f docker-compose.qnap.yml logs frontend
```

### Database Issues
```bash
# Reset database (WARNING: This deletes all data)
docker-compose -f docker-compose.qnap.yml down -v
docker-compose -f docker-compose.qnap.yml up -d
```

### Permission Issues
```bash
# Re-login to GHCR
docker login ghcr.io -u YOUR_GITHUB_USERNAME -p YOUR_GITHUB_TOKEN
```

## 📊 Monitoring

### Health Checks
All services include health checks. Check status:
```bash
docker-compose -f docker-compose.qnap.yml ps
```

### Resource Usage
Monitor in Container Station web interface or:
```bash
docker stats
```

## 🔐 Security Notes

- Change default passwords in `.env`
- Use strong JWT secret (32+ characters)
- Consider setting up reverse proxy with SSL
- Regularly update images with `./scripts/update-qnap.sh`
- Keep QNAP system updated

## 🎉 Success!

Your Family Board application is now running on your QNAP NAS with automated updates from your GitHub pipeline!
