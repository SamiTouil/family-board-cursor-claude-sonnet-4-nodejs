#!/bin/bash

# Family Board Production Build Script
# This script builds the production app for both simulator and device

set -e

echo "🚀 Family Board Production Build Script"
echo "======================================="

# Parse command line arguments
DEVICE_TYPE="device"
if [ "$1" = "--simulator" ]; then
    DEVICE_TYPE="simulator"
fi

echo "🎯 Building for: $DEVICE_TYPE"
echo "📡 API Endpoint: https://mabt.eu/api"
echo "🔔 Push notifications: ENABLED"
echo "🏗️  This may take a few minutes on first build..."

# Load production environment
if [ -f ".env.production" ]; then
    export $(cat .env.production | xargs)
    echo "✅ Loaded production environment variables"
else
    # Fallback to manual export
    export NODE_ENV=production
    export EXPO_PUBLIC_ENV=production
    export EXPO_PUBLIC_API_URL=https://mabt.eu/api
fi

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

echo "🎉 Production build complete!"
echo ""
echo "🚀 Production Features:"
echo "   ✅ Connects to https://mabt.eu/api"
echo "   ✅ Push notifications enabled"
echo "   ✅ Optimized performance"
echo "   ✅ No development server needed"
echo "   ✅ Fully autonomous operation"
echo ""
echo "📱 Look for 'Family Board' on your device!"
