# 📱 Family Board Build Scripts Explained

This document explains the different build scripts and when to use each one.

## 🔧 Build Scripts Overview

### `./build-production.sh` ⭐ **RECOMMENDED FOR PRODUCTION**
- **What it builds**: TRUE standalone production app
- **Technology**: EAS Build (cloud build)
- **Background notifications**: ✅ **WORKS** (native iOS)
- **Dependency**: None (completely standalone)
- **Build time**: 10-15 minutes
- **Result**: `.ipa` file you install on device
- **Use when**: You want the final production app with working background notifications

```bash
./build-production.sh           # For device
./build-production.sh --simulator  # For simulator
```

### `./build-dev-client-production.sh` 🔧 **FOR DEVELOPMENT/TESTING**
- **What it builds**: Development client with production API settings
- **Technology**: Expo development client
- **Background notifications**: ❌ **DOESN'T WORK** (Expo limitation)
- **Dependency**: Requires Expo Go or development client
- **Build time**: 2-5 minutes
- **Result**: Development app that connects to production API
- **Use when**: You want to test production API quickly during development

```bash
./build-dev-client-production.sh           # For device
./build-dev-client-production.sh --simulator  # For simulator
```

## 🎯 When to Use Which Script

### For **Final Testing & Production Use**:
```bash
./build-production.sh
```
- ✅ True standalone app
- ✅ Background notifications work
- ✅ No Expo dependency
- ✅ Ready for App Store or internal distribution

### For **Quick Development Testing**:
```bash
./build-dev-client-production.sh
```
- ✅ Fast builds
- ✅ Easy debugging
- ✅ Tests production API
- ❌ Background notifications don't work (Expo limitation)

## 🔔 Background Notifications Support

| Script | Foreground Notifications | Background Notifications | WebSocket |
|--------|-------------------------|-------------------------|-----------|
| `build-production.sh` | ✅ Works | ✅ **Works** | ✅ Works |
| `build-dev-client-production.sh` | ✅ Works | ❌ Doesn't work | ✅ Works |

## 🚀 Quick Start

**For the complete production experience with working background notifications:**

```bash
cd mobile
./build-production.sh
```

This will:
1. Build a true standalone app using EAS
2. Enable native iOS background fetch
3. Create an installable `.ipa` file
4. Support background notifications properly

**The background notification issue you experienced was because you were using the development client build instead of the true standalone build!**
