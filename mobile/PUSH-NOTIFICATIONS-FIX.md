# 🔔 Push Notifications Fix Guide

## ❌ Problem
- iPhone shows "No ProjectId found" error when launching app
- Push notifications don't work
- Error: "can't be inferred from the manifest"

## ✅ Solution Applied

### 1. Added Expo Project Configuration
- **Project ID**: `83ccd68d-755d-4d43-99e8-afde30ef3cb6`
- **Project Name**: `@sami.touil/family-board-dev`
- **EAS Integration**: Properly configured

### 2. Updated `app.config.js`
```javascript
extra: {
  apiUrl: IS_PRODUCTION ? "https://mabt.eu/api" : "http://192.168.1.24:3001/api",
  environment: IS_PRODUCTION ? "production" : "development",
  eas: {
    projectId: "83ccd68d-755d-4d43-99e8-afde30ef3cb6"
  }
}
```

### 3. Added Notification Configuration
```javascript
notifications: {
  icon: "./assets/icon.png",
  color: "#3B82F6",
  sounds: ["default"]
},
plugins: [
  [
    "expo-notifications",
    {
      icon: "./assets/icon.png",
      color: "#3B82F6",
      sounds: ["default"]
    }
  ]
]
```

### 4. Enhanced NotificationService
- Added proper project ID validation
- Better error handling for missing configuration
- Clear console logging for debugging

### 5. Updated Startup Scripts
- Added cache clearing (`--clear` flag)
- Display project ID in startup info
- Confirm push notification status

## 🚀 How to Test

### Step 1: Clear Everything and Restart
```bash
cd mobile
./start-dev.sh  # or ./start-prod.sh
```

### Step 2: Check Console Logs
Look for these messages in Expo logs:
- ✅ `Using Expo project ID: 83ccd68d-755d-4d43-99e8-afde30ef3cb6`
- ✅ `Push token: ExponentPushToken[...]`
- ❌ `No Expo project ID found` (should NOT appear)

### Step 3: Test Notification Permissions
In the app, notifications should:
1. Request permissions on first launch
2. Generate push token successfully
3. Show in console: "Push token: ExponentPushToken[...]"

## 🔧 Troubleshooting

### If Still Getting "No ProjectId" Error:

1. **Force Clear Cache**:
   ```bash
   npx expo start --clear
   rm -rf .expo
   npx expo start --clear
   ```

2. **Verify Configuration**:
   ```bash
   npx expo config --type public
   ```
   Should show `projectId: "83ccd68d-755d-4d43-99e8-afde30ef3cb6"`

3. **Check Environment Variables**:
   Make sure you're running the correct script:
   - Development: `./start-dev.sh`
   - Production: `./start-prod.sh`

4. **Restart Expo Go**:
   - Close Expo Go completely on iPhone
   - Restart the app
   - Scan QR code again

### If Notifications Still Don't Work:

1. **Check iPhone Settings**:
   - Settings → Expo Go → Notifications → Allow Notifications

2. **Verify Physical Device**:
   - Push notifications don't work on simulator
   - Must use real iPhone

3. **Check Console for Errors**:
   - Look for "Push token" in logs
   - Check for permission denied errors

## ✅ Expected Behavior After Fix

1. **App Launch**: No "ProjectId" error
2. **Console Logs**: Shows project ID and push token
3. **Permissions**: App requests notification permissions
4. **Notifications**: Should work for real events

## 📋 Files Modified

- ✅ `app.config.js` - Added EAS project ID and notification config
- ✅ `src/services/NotificationService.ts` - Enhanced error handling
- ✅ `start-dev.sh` - Added cache clearing and status info
- ✅ `start-prod.sh` - Added cache clearing and status info
- ✅ `eas.json` - Created EAS configuration

## 🎯 Next Steps

1. Test the app with the updated configuration
2. Verify push token generation in console
3. Test actual notifications from backend
4. Confirm notifications appear on iPhone

The push notification error should now be resolved! 🎉 