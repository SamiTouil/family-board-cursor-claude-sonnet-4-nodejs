# 📱 Background Notifications Fix Guide

## ❌ Problem
- App notifications work when app is open (foreground)
- System notifications don't appear when app is in background
- No notification banners/alerts on iPhone lock screen

## ✅ Solution Applied

### 1. Enhanced Notification Handler
```javascript
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Handling notification:', notification.request.content.title);
    
    // Always show notifications, especially when app is in background
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});
```

### 2. Enhanced iOS Permissions
- Added comprehensive permission request with all iOS options
- Better logging to track permission status
- Clear error messages for troubleshooting

### 3. Background Mode Configuration
```javascript
ios: {
  backgroundModes: ["background-fetch", "background-processing"],
  infoPlist: {
    UIBackgroundModes: ["background-fetch", "background-processing"],
    NSUserNotificationUsageDescription: "This app uses notifications to keep you updated about family activities and schedules."
  }
}
```

### 4. Notification Configuration
```javascript
notifications: {
  icon: "./assets/icon.png",
  color: "#3B82F6",
  sounds: ["default"],
  iosDisplayInForeground: true  // KEY: Show notifications even in foreground
}
```

### 5. Background Test Function
- Automatic test notification scheduled 3 seconds after app start
- Helps verify background notification delivery

## 🧪 How to Test Background Notifications

### Step 1: Restart App with New Configuration
```bash
cd mobile
./start-dev.sh  # This clears cache automatically
```

### Step 2: Check Console Logs
Look for these messages:
- ✅ `🔔 Initializing NotificationService...`
- ✅ `📋 Current permission status: granted`
- ✅ `🧪 Testing background notification capability...`
- ✅ `📅 Test notification scheduled: [id]`

### Step 3: Test Background Delivery
1. **Open the app** and wait for initialization
2. **Put app in background** (press home button)
3. **Wait 3 seconds** - you should see test notification
4. **Trigger a real notification** from the web app

### Step 4: Verify iPhone Settings
Go to: **Settings → Expo Go → Notifications**
- ✅ Allow Notifications: ON
- ✅ Lock Screen: ON
- ✅ Notification Center: ON
- ✅ Banners: ON
- ✅ Sounds: ON
- ✅ Badges: ON

## 🔧 Troubleshooting Background Notifications

### Issue 1: Still No Background Notifications

**Check iPhone Do Not Disturb:**
- Settings → Focus → Do Not Disturb
- Make sure it's OFF or allows notifications from Expo Go

**Check Notification Delivery:**
- Settings → Screen Time → App Limits
- Make sure Expo Go isn't restricted

**Force Reset Notification Permissions:**
1. Delete Expo Go app completely
2. Reinstall from App Store
3. Run app again - it will re-request permissions

### Issue 2: Notifications Work Sometimes

**Check iPhone Background App Refresh:**
- Settings → General → Background App Refresh
- Make sure it's ON for Expo Go

**Check iPhone Low Power Mode:**
- Settings → Battery → Low Power Mode
- Turn OFF (limits background activity)

### Issue 3: Test Notification Doesn't Appear

**Check Console Logs:**
```
🧪 Testing background notification capability...
📅 Test notification scheduled: [notification-id]
💡 Put the app in background to test system notifications
```

If you don't see these logs, the NotificationService isn't initializing properly.

### Issue 4: Real Notifications Don't Work

**Check Push Token:**
Look for: `Push token: ExponentPushToken[...]` in console

**Check Backend Integration:**
- Verify backend is sending notifications to correct push token
- Check backend logs for notification sending errors

## 📱 iPhone-Specific Issues

### Silent Notifications
Some notifications might be delivered silently. Check:
- **Notification History**: Settings → Notifications → Siri & Search → Notification History
- **Delivered Quietly**: Long-press notification → Settings → Deliver Quietly (turn OFF)

### Notification Grouping
- **Settings → Notifications → Expo Go → Notification Grouping**
- Set to "Off" or "By App" for individual notifications

### Critical Alerts
For important family notifications, we've enabled:
- `allowCriticalAlerts: true` in permission request
- These can bypass Do Not Disturb mode

## ✅ Expected Behavior After Fix

1. **App Start**: See initialization logs with test notification
2. **Background Test**: Receive test notification when app backgrounded
3. **Real Notifications**: System notifications appear on lock screen
4. **Foreground**: Notifications still work when app is open
5. **Badges**: App icon shows notification count

## 🎯 Testing Checklist

- [ ] App starts without errors
- [ ] Console shows notification initialization
- [ ] Test notification appears in background
- [ ] iPhone notification settings are correct
- [ ] Real notifications from backend work
- [ ] Notifications appear on lock screen
- [ ] Sound and vibration work
- [ ] Badge count updates

## 🚨 Common Expo Go Limitations

**Important**: Expo Go has some limitations with background notifications:

1. **App Must Be Recently Used**: iOS may stop delivering notifications if app hasn't been used recently
2. **Limited Background Time**: iOS limits how long apps can run in background
3. **System Resource Management**: iOS may prioritize other apps

**For Production**: Consider building a standalone app instead of using Expo Go for better background notification reliability.

## 📋 Files Modified

- ✅ `src/services/NotificationService.ts` - Enhanced permissions and background testing
- ✅ `app.config.js` - Added background modes and iOS notification config
- ✅ Enhanced logging and error handling
- ✅ Automatic background notification testing

The background notification system should now work much better! 🎉 