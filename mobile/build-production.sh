#!/bin/bash

# Family Board TRUE Standalone Production Build Script
# This script builds a true standalone production app using EAS Build

set -e

echo "🚀 Family Board TRUE Standalone Production Build"
echo "================================================"
echo ""
echo "🎯 Building: TRUE STANDALONE APP (not development client)"
echo "📡 API Endpoint: https://mabt.eu/api"
echo "🔔 Background notifications: ENABLED (native iOS)"
echo "⏱️  Build time: ~10-15 minutes (cloud build)"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
    echo "✅ EAS CLI installed"
fi

# Check if user is logged in to EAS
echo "🔐 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please log in:"
    eas login
fi

EAS_USER=$(eas whoami)
echo "✅ Logged in as: $EAS_USER"
echo ""

# Parse command line arguments
BUILD_PROFILE="production-local"
PLATFORM="ios"

if [ "$1" = "--simulator" ]; then
    BUILD_PROFILE="local"
    echo "🎯 Building for: iOS Simulator (standalone)"
else
    echo "🎯 Building for: iOS Device (standalone)"
fi

# Load production environment
if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | grep -v '^$' | xargs)
    echo "✅ Loaded production environment variables"
else
    export NODE_ENV=production
    export EXPO_PUBLIC_ENV=production
    export EXPO_PUBLIC_API_URL=https://mabt.eu/api
    export EXPO_PUBLIC_PUSH_NOTIFICATIONS=true
    export EXPO_PUBLIC_BACKGROUND_REFRESH=true
    export EXPO_PUBLIC_DEBUG_MODE=false
    echo "✅ Set production environment variables"
fi

echo ""
echo "🏗️  Starting EAS Build..."
echo "   📋 Profile: $BUILD_PROFILE"
echo "   📱 Platform: $PLATFORM"
echo "   🌐 This will build in the cloud and may take 10-15 minutes"
echo "   ☕ Perfect time for a coffee break!"
echo ""

# Start the EAS build (interactive mode for credential setup)
eas build --platform $PLATFORM --profile $BUILD_PROFILE

echo ""
echo "🎉 TRUE Standalone Production Build Complete!"
echo ""
echo "🚀 Standalone App Features:"
echo "   ✅ TRUE standalone app (no Expo Go dependency)"
echo "   ✅ Native iOS background fetch (background notifications work!)"
echo "   ✅ Connects to https://mabt.eu/api"
echo "   ✅ Real-time WebSocket with polling transport"
echo "   ✅ Local notifications with background support"
echo "   ✅ Optimized performance and battery usage"
echo "   ✅ Bundle ID: com.familyboard.app"
echo ""
echo "📱 Installation:"
echo "   1. Download the .ipa file from the EAS build page"
echo "   2. Install it on your iPhone using Xcode or Apple Configurator"
echo "   3. Look for 'Family Board' on your device"
echo ""
echo "🔔 Background notifications should now work properly!"
echo "   - Foreground: Immediate via WebSocket"
echo "   - Background: Native iOS background fetch every 15+ minutes"
echo ""
echo "🧪 Test by putting the app in background and reassigning tasks from web!"
