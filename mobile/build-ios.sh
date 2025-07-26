#!/bin/bash

# Family Board iOS Production Build Script
# This script builds and installs the production app on your iPhone via USB

set -e

echo "🍎 Family Board iOS Production Build & Install Script"
echo "===================================================="

# Check if device is connected
echo "📱 Checking for connected iOS devices..."
if ! ios-deploy -c > /dev/null 2>&1; then
    echo "❌ No iOS device found. Please:"
    echo "   1. Connect your iPhone via USB"
    echo "   2. Trust this computer on your iPhone"
    echo "   3. Make sure your iPhone is unlocked"
    exit 1
fi

echo "✅ iOS device detected!"

# Build the production app
echo "🏗️  Building production iOS app..."
echo "📡 API Endpoint: https://mabt.eu/api"
echo "🔔 Push notifications: ENABLED"
echo "This may take a few minutes on first build..."

# Set production environment and build
export NODE_ENV=production
export EXPO_PUBLIC_ENV=production

# Use Expo to create a production build
npx expo run:ios --device --configuration Release

echo "🎉 Production build complete!"
echo ""
echo "📱 The app should now be installed on your iPhone!"
echo "   Look for 'Family Board' on your home screen"
echo ""
echo "🚀 Production Features:"
echo "   - Connects to https://mabt.eu/api"
echo "   - Push notifications enabled"
echo "   - Optimized performance"
echo "   - No development server needed"
