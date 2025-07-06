#!/bin/bash

echo "🚀 Starting Family Board - PRODUCTION MODE"
echo "==========================================="
echo ""

echo "📱 App Name: Family Board"
echo "🔗 API Server: https://mabt.eu/api (Production)"
echo "🌐 Environment: Production"
echo "🔔 Push Notifications: Enabled (Project ID: 83ccd68d-755d-4d43-99e8-afde30ef3cb6)"
echo ""

# Check if production server is running
echo "🔍 Checking production server status..."
if curl -s https://mabt.eu/api/health > /dev/null 2>&1; then
    echo "✅ Production server is online!"
else
    echo "❌ Production server is not responding!"
    echo "   Please check https://mabt.eu/api/health"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled."
        exit 1
    fi
fi

echo ""
echo "📱 Starting mobile app in PRODUCTION mode..."
echo ""

# Set production environment
export NODE_ENV=production
export EXPO_PUBLIC_ENV=production

# Clear Expo cache to ensure fresh start
echo "🧹 Clearing Expo cache..."
npx expo start --clear

echo ""
echo "📱 PRODUCTION MODE FEATURES:"
echo "   • App name: 'Family Board'"
echo "   • Connects to production server (mabt.eu)"
echo "   • Separate from development app"
echo "   • Production optimized"
echo "   • Real user data"
echo "   • Push notifications configured" 