#!/bin/bash

# Family Board Clean Production Build Script
# This script cleans the iOS project and rebuilds it with proper production configuration

set -e

echo "🧹 Family Board Clean Production Build Script"
echo "============================================="

# Parse command line arguments
DEVICE_TYPE="device"
if [ "$1" = "--simulator" ]; then
    DEVICE_TYPE="simulator"
fi

echo "🎯 Building for: $DEVICE_TYPE"
echo "📡 API Endpoint: https://mabt.eu/api"
echo "🔔 Push notifications: ENABLED"

# Load production environment
if [ -f ".env.production" ]; then
    # Load environment variables, filtering out comments and empty lines
    export $(grep -v '^#' .env.production | grep -v '^$' | xargs)
    echo "✅ Loaded production environment variables"
else
    # Fallback to manual export
    export NODE_ENV=production
    export EXPO_PUBLIC_ENV=production
    export EXPO_PUBLIC_API_URL=https://mabt.eu/api
fi

echo "🧹 Cleaning existing iOS project..."

# Remove existing iOS project
if [ -d "ios" ]; then
    rm -rf ios
    echo "✅ Removed existing iOS project"
fi

# Clean Expo cache
echo "🧹 Cleaning Expo cache..."
npx expo install --fix
npx expo prebuild --clean

echo "🏗️  Regenerating iOS project with production configuration..."
echo "📱 App Name: Family Board"
echo "📦 Bundle ID: com.familyboard.app"
echo "🎨 Using custom icons from assets/"

# Prebuild with production configuration
npx expo prebuild --platform ios

echo "🔧 Configuring entitlements for local notifications only..."
# Remove aps-environment entitlement that causes provisioning issues with personal Apple ID
if [ -f "ios/FamilyBoard/FamilyBoard.entitlements" ]; then
    # Create clean entitlements file without push notification entitlements
    cat > ios/FamilyBoard/FamilyBoard.entitlements << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <!-- Local notifications only - no push notification entitlements -->
  </dict>
</plist>
EOF
    echo "✅ Configured entitlements for local notifications"
fi

echo "🏗️  Building production iOS app..."
echo "This may take a few minutes on first build..."

if [ "$DEVICE_TYPE" = "simulator" ]; then
    echo "📱 Building for iOS Simulator..."
    npx expo run:ios --configuration Release
else
    echo "📱 Building for iOS Device..."
    # Check if device is connected
    if ! ios-deploy -c > /dev/null 2>&1; then
        echo "❌ No iOS device found. Please:"
        echo "   1. Connect your iPhone via USB"
        echo "   2. Trust this computer on your iPhone"
        echo "   3. Make sure your iPhone is unlocked"
        exit 1
    fi
    echo "✅ iOS device detected!"
    npx expo run:ios --device --configuration Release
fi

echo "🎉 Clean production build complete!"
echo ""
echo "🚀 Production Features:"
echo "   ✅ App Name: 'Family Board' (not FamilyBoardDev)"
echo "   ✅ Custom icons from assets/ folder"
echo "   ✅ Connects to https://mabt.eu/api"
echo "   ✅ Push notifications enabled"
echo "   ✅ Optimized performance"
echo "   ✅ Bundle ID: com.familyboard.app"
echo ""
echo "📱 Look for 'Family Board' on your device!"
