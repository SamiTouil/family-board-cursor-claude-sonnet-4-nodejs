# 🚀 Family Board - Production Deployment Guide

This guide explains how to deploy Family Board to production using **GitHub Container Registry** and **Docker**. No source code is needed on the production machine!

## 📋 Overview

**What this setup provides:**
- ✅ **No source code on production** - Only Docker images
- ✅ **Automatic CI/CD** - Push to main → Build → Deploy
- ✅ **Easy updates** - One command to get latest version
- ✅ **Professional deployment** - Using GitHub Container Registry
- ✅ **Zero cost** - GitHub Container Registry is free for public repos

## 🏗️ Architecture

```
Developer Machine          GitHub Actions              Production Machine
     │                           │                           │
     ├─ Push to main ────────────┤                           │
     │                           ├─ Build Docker images      │
     │                           ├─ Push to ghcr.io         │
     │                           │                           │
     │                           │                           ├─ Pull images
     │                           │                           ├─ Run containers
     │                           │                           └─ Serve application
```

## 🔧 Setup Instructions

### 1. Initial Setup on Production Machine (Windows)

**Prerequisites:**
- Windows 10/11 with Docker Desktop installed
- Git (optional, for cloning deployment files)

**Step 1: Get deployment files**
```bash
# Option A: Clone just the deployment files (recommended)
git clone --depth 1 --filter=blob:none --sparse https://github.com/SamiTouil/family-board-cursor-claude-sonnet-4-nodejs.git family-board-production
cd family-board-production
git sparse-checkout set docker-compose.production.yml .env.production.example scripts nginx/nginx.production.conf

# Option B: Download files manually from GitHub
# Download these files to a folder called 'family-board-production':
# - docker-compose.production.yml
# - .env.production.example
# - scripts/deploy-production.bat
# - scripts/update-production.bat
# - nginx/nginx.production.conf
```

**Step 2: Configure environment**
```bash
# Copy and edit the environment file
copy .env.production.example .env.production
# Edit .env.production with your actual values (see configuration section below)
```

**Step 3: Initial deployment**
```bash
# Run the deployment script
scripts\deploy-production.bat
```

### 2. Configuration (.env.production)

Edit `.env.production` with your actual values:

```env
# Database (change the password!)
POSTGRES_PASSWORD=your-super-secure-database-password-here

# Security (generate a strong JWT secret)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long

# Your domain or IP
FRONTEND_URL=http://192.168.1.100:3000
ALLOWED_ORIGINS=http://192.168.1.100:3000,exp://192.168.1.100:8081

# Optional: Disable CSRF during initial setup
DISABLE_CSRF_VALIDATION=true
```

**🔐 Security Tips:**
- Generate JWT secret: `openssl rand -base64 32` (or use online generator)
- Use strong database password
- Set `DISABLE_CSRF_VALIDATION=false` after testing

## 🚀 Deployment Workflow

### For Developers (Automatic)

1. **Make changes** to your code
2. **Commit and push** to main branch
3. **GitHub Actions automatically:**
   - Runs tests
   - Builds Docker images
   - Pushes to GitHub Container Registry
   - Creates a release

### For Production Updates (Manual)

**Quick Update (recommended):**
```bash
# On your Windows production machine
scripts\update-production.bat
```

**Full Deployment (if needed):**
```bash
# On your Windows production machine
scripts\deploy-production.bat
```

## 📁 File Structure on Production Machine

```
family-board-production/
├── docker-compose.production.yml    # Main deployment configuration
├── .env.production                  # Your environment variables
├── nginx/
│   └── nginx.production.conf        # Nginx configuration
├── scripts/
│   ├── deploy-production.bat        # Full deployment script
│   └── update-production.bat        # Quick update script
├── backups/                         # Database backups (auto-created)
└── ssl/                            # SSL certificates (optional)
```

## 🔍 Monitoring & Management

### Check Service Status
```bash
docker-compose -f docker-compose.production.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
```

### Access Points
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Database Admin:** http://localhost:8080 (if enabled)

### Database Backup
Backups are automatically created during deployment in the `backups/` folder.

**Manual backup:**
```bash
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U postgres familyboard > backup.sql
```

## 🛠️ Troubleshooting

### Common Issues

**1. Docker not running**
```
[ERROR] Docker is not running
```
**Solution:** Start Docker Desktop

**2. Environment file missing**
```
[ERROR] Environment file .env.production not found
```
**Solution:** Copy `.env.production.example` to `.env.production` and configure it

**3. Port conflicts**
```
Error: Port 3000 is already in use
```
**Solution:** Stop other services or change ports in docker-compose file

**4. Health check failures**
```
[ERROR] Backend health check timeout
```
**Solution:** Check logs with `docker-compose logs backend`

### Reset Everything
```bash
# Stop and remove all containers
docker-compose -f docker-compose.production.yml down -v

# Remove images (optional)
docker image prune -a

# Start fresh
scripts\deploy-production.bat
```

## 🔄 Update Process

### When New Version is Available

1. **Check for updates** on GitHub releases page
2. **Run update script:**
   ```bash
   scripts\update-production.bat
   ```
3. **Verify deployment** at http://localhost:3000

### Rollback (if needed)
```bash
# Pull specific version
docker pull ghcr.io/samitouil/family-board-cursor-claude-sonnet-4-nodejs/backend:v123
docker pull ghcr.io/samitouil/family-board-cursor-claude-sonnet-4-nodejs/frontend:v123

# Update docker-compose.yml to use specific tags
# Then restart services
```

## 🎯 Benefits of This Setup

✅ **Clean separation** - No source code on production
✅ **Professional CI/CD** - Automated build and deployment
✅ **Easy updates** - One command to update
✅ **Reliable** - Uses proven Docker registry approach
✅ **Scalable** - Can easily add more production machines
✅ **Secure** - Images are built in controlled environment
✅ **Free** - No additional costs for container registry

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs`
2. Verify environment configuration
3. Ensure Docker Desktop is running
4. Check GitHub Actions for build failures

---

**🎉 Congratulations!** You now have a professional production deployment setup that's easy to maintain and update!
