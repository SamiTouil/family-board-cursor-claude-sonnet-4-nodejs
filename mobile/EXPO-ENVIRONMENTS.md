# Family Board - Expo Go Environments

This setup provides **two separate apps** in Expo Go - one for development and one for production.

## 🔄 Two Environment Setup

### 📱 Development Environment
- **App Name**: "Family Board (Dev)"
- **API Server**: `http://192.168.1.24:3001/api` (Local)
- **Bundle ID**: `com.familyboard.dev`
- **Purpose**: Testing with local backend server

### 🌐 Production Environment  
- **App Name**: "Family Board"
- **API Server**: `https://mabt.eu/api` (Production)
- **Bundle ID**: `com.familyboard.app`
- **Purpose**: Using live production data

## 🚀 Quick Start

### For Development (Local Testing)
```bash
cd mobile
./start-dev.sh
```

### For Production (Live Data)
```bash
cd mobile  
./start-prod.sh
```

## 📱 In Expo Go

You'll see **TWO separate apps**:
1. **"Family Board (Dev)"** - Development version
2. **"Family Board"** - Production version

Each app connects to its respective server automatically.

## 🔧 What Each Script Does

### `start-dev.sh`
- ✅ Checks if local backend is running
- 🚀 Starts backend automatically if needed
- 📱 Launches Expo with development config
- 🔗 App connects to local server (192.168.1.24:3001)

### `start-prod.sh`
- ✅ Checks if production server is online
- 📱 Launches Expo with production config  
- 🔗 App connects to production server (mabt.eu)

## 🎯 Benefits

- **Separate Apps**: Dev and prod don't interfere with each other
- **Automatic Backend**: Dev script starts backend if needed
- **Clear Identification**: App names clearly show which environment
- **Easy Switching**: Just run different scripts
- **Real-time Updates**: Both support Expo Go hot reload

## 📋 Usage Examples

**Daily Development:**
```bash
./start-dev.sh
# Opens "Family Board (Dev)" in Expo Go
# Uses local test data
```

**Testing Production:**
```bash
./start-prod.sh  
# Opens "Family Board" in Expo Go
# Uses real production data
```

## 🔍 Troubleshooting

**Backend Not Starting:**
- Check if port 3001 is available
- Verify backend dependencies are installed
- Check backend terminal window for errors

**Production Server Issues:**
- Verify https://mabt.eu/api/health responds
- Check internet connection
- Production script will ask before continuing

**App Not Updating:**
- Close and reopen Expo Go
- Restart the appropriate script
- Check console logs for environment confirmation 