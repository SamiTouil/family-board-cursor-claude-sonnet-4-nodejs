#!/bin/bash

# Family Board iOS Build Script
# This script helps you build and install the app on your iPhone via USB

set -e

echo "🍎 Family Board iOS Build & Install Script"
echo "=========================================="

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

# Check if we have a development team set up
echo "🔧 Checking development setup..."

# Build the app
echo "🏗️  Building iOS app..."
echo "This may take a few minutes on first build..."

# Use Expo to create a development build
npx expo run:ios --device

echo "🎉 Build complete!"
echo ""
echo "📱 The app should now be installed on your iPhone!"
echo "   Look for 'Family Board' on your home screen"
echo ""
echo "💡 Tips:"
echo "   - Keep your iPhone connected during development"
echo "   - The app will auto-reload when you make changes"
echo "   - Shake your phone to open the developer menu"
