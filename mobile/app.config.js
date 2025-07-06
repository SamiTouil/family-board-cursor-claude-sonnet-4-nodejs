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
      bundleIdentifier: IS_PRODUCTION ? "com.familyboard.app" : "com.familyboard.dev"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: IS_PRODUCTION ? "com.familyboard.app" : "com.familyboard.dev"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      apiUrl: IS_PRODUCTION ? "https://mabt.eu/api" : "http://192.168.1.24:3001/api",
      environment: IS_PRODUCTION ? "production" : "development"
    }
  }
}; 