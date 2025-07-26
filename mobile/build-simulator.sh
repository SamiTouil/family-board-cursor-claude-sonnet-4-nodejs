#!/bin/bash

# Family Board iOS Simulator Build Script
# This script builds and runs the app in iOS Simulator (easier for testing)

set -e

echo "📱 Family Board iOS Simulator Build Script"
echo "=========================================="

echo "🏗️  Building for iOS Simulator..."
echo "This may take a few minutes on first build..."

# Build and run in simulator
npx expo run:ios

echo "🎉 Build complete!"
echo ""
echo "📱 The app should now be running in iOS Simulator!"
echo ""
echo "💡 Tips:"
echo "   - The simulator will auto-reload when you make changes"
echo "   - Press Cmd+D to open the developer menu"
echo "   - Use Cmd+R to reload the app manually"
