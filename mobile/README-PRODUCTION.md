# 🚀 Family Board - Production iOS Build Guide

This guide helps you build and install the **production version** of Family Board on your iPhone.

## 🎯 Production Features

✅ **Remote Backend**: Connects to `https://mabt.eu/api`  
✅ **Push Notifications**: Full background notification support  
✅ **Autonomous Operation**: No local server required  
✅ **Optimized Performance**: Release build with optimizations  
✅ **Background App Refresh**: Keeps data updated when backgrounded  

## 📱 Quick Start

### For iPhone (Physical Device)
```bash
cd mobile

# Build and install production app
npm run build:production

# Or use the script directly
./build-production.sh
```

### For iOS Simulator (Testing)
```bash
cd mobile

# Build production app for simulator
npm run build:production:simulator

# Or use the script with flag
./build-production.sh --simulator
```

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `npm run build:production` | Build production app for iPhone |
| `npm run build:production:simulator` | Build production app for simulator |
| `npm run ios:production` | Direct Expo production build for device |
| `npm run ios:production:simulator` | Direct Expo production build for simulator |

## 🔔 Push Notifications Setup

The app is configured for push notifications with:

- **Background modes**: `remote-notification`, `background-fetch`, `background-processing`
- **Permissions**: Alert, badge, sound, critical alerts
- **Background refresh**: Enabled for real-time updates
- **Notification channels**: Configured for high priority

### iOS Settings Required

After installation, ensure these iOS settings are enabled:

1. **Settings → Family Board → Notifications**: Enable all
2. **Settings → General → Background App Refresh**: Enable for Family Board
3. **Settings → Family Board → Background App Refresh**: Enable

## 🌐 Environment Configuration

Production builds use:
- **API URL**: `https://mabt.eu/api`
- **Bundle ID**: `com.familyboard.app`
- **App Name**: "Family Board"
- **Environment**: Production optimized

## 🚨 Troubleshooting

### Build Issues
- Ensure Xcode is installed and up to date
- Check that your Apple Developer account is configured
- Verify iPhone is connected and trusted

### Notification Issues
- Check iOS notification permissions
- Ensure background app refresh is enabled
- Verify the app has the latest push token

### Connection Issues
- Confirm `https://mabt.eu` is accessible
- Check network connectivity
- Verify API endpoints are responding

## 💡 Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| API URL | `http://192.168.1.24:3001/api` | `https://mabt.eu/api` |
| Bundle ID | `com.familyboard.dev` | `com.familyboard.app` |
| App Name | "Family Board (Dev)" | "Family Board" |
| Server Required | Yes (local) | No (remote) |
| Optimization | Debug | Release |

## 🎉 Success!

Once built and installed, the Family Board app will:
- Connect automatically to the production backend
- Receive push notifications even when backgrounded
- Work completely independently without any local servers
- Provide optimized performance and battery usage

Enjoy your fully autonomous Family Board experience! 🏠📱
