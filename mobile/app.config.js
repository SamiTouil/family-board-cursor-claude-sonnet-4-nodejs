const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_ENV === 'production';

export default {
  expo: {
    name: IS_PRODUCTION ? "Family Board" : "Family Board (Dev)",
    slug: IS_PRODUCTION ? "family-board" : "family-board-dev",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_PRODUCTION ? "com.familyboard.app" : "com.familyboard.dev",
      backgroundModes: ["background-fetch", "background-processing"],
      infoPlist: {
        UIBackgroundModes: ["background-fetch", "background-processing"],
        NSUserNotificationUsageDescription: "This app uses notifications to keep you updated about family activities and schedules.",
        NSNotificationUsageDescription: "This app uses notifications to keep you updated about family activities and schedules."
      }
    },
    notifications: {
      icon: "./assets/icon.png",
      color: "#3B82F6",
      sounds: ["default"],
      iosDisplayInForeground: true
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#3B82F6",
          sounds: ["default"],
          iosDisplayInForeground: true
        }
      ]
    ],
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: IS_PRODUCTION ? "com.familyboard.app" : "com.familyboard.dev",
      permissions: [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      apiUrl: IS_PRODUCTION ? "https://mabt.eu/api" : "http://192.168.1.24:3001/api",
      environment: IS_PRODUCTION ? "production" : "development",
      eas: {
        projectId: "83ccd68d-755d-4d43-99e8-afde30ef3cb6"
      }
    }
  }
}; 