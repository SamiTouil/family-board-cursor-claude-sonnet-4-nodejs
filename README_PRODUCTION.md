# 🏭 Family Board - Production Deployment

**Quick Start for Windows Production Machine**

## 📦 What You Need on Production Machine
- Windows 10/11
- Docker Desktop
- These files (no source code needed!)

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Deployment Files
Download these files to a folder called `family-board-production`:
- `docker-compose.production.yml`
- `.env.production.example`
- `scripts/setup-production.bat`
- `scripts/deploy-production.bat`
- `scripts/update-production.bat`
- `nginx/nginx.production.conf`

### Step 2: Initial Setup
```cmd
# Run setup script
scripts\setup-production.bat

# This will:
# ✅ Check Docker is running
# ✅ Create .env.production with your settings
# ✅ Create backup directories
```

### Step 3: Deploy
```cmd
# Run deployment
scripts\deploy-production.bat

# This will:
# ✅ Pull latest Docker images from GitHub
# ✅ Start all services
# ✅ Run database migrations
# ✅ Create automatic backup
```

### Step 4: Access Your App
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **Database Admin:** http://localhost:8080

## 🔄 Regular Updates

When developers push new code, just run:
```cmd
scripts\update-production.bat
```

## 🎯 Key Benefits

✅ **No source code** on production machine
✅ **Automatic updates** from GitHub Container Registry
✅ **Professional deployment** with Docker
✅ **Easy maintenance** with simple scripts
✅ **Automatic backups** before each deployment
✅ **Health checks** to ensure everything works

## 📞 Need Help?

1. **Check logs:** `docker-compose -f docker-compose.production.yml logs`
2. **Restart services:** `scripts\deploy-production.bat`
3. **Reset everything:** `docker-compose -f docker-compose.production.yml down -v`

---

**🎉 That's it!** Your production deployment is now professional-grade and easy to maintain.
