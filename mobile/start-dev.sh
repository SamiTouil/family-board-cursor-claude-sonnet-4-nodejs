#!/bin/bash

echo "🚀 Starting Family Board - DEVELOPMENT MODE"
echo "============================================="
echo ""

echo "📱 App Name: Family Board (Dev)"
echo "🔗 API Server: http://192.168.1.24:3001/api (Local)"
echo "🌐 Environment: Development"
echo "🔔 Push Notifications: Enabled (Project ID: 83ccd68d-755d-4d43-99e8-afde30ef3cb6)"
echo ""

# Check if backend is running
echo "🔍 Checking if backend server is running..."
if curl -s http://192.168.1.24:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend server is running!"
else
    echo "❌ Backend server is not running!"
    echo ""
    echo "🔧 Starting backend server..."
    echo "   Opening new terminal for backend..."
    
    # Start backend in new terminal
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/../backend && npm run dev"'
    
    echo "⏳ Waiting for backend to start..."
    sleep 5
    
    # Check again
    if curl -s http://192.168.1.24:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend server started successfully!"
    else
        echo "⚠️  Backend might still be starting up..."
        echo "   Check the backend terminal window"
    fi
fi

echo ""
echo "📱 Starting mobile app in DEVELOPMENT mode..."
echo ""

# Set development environment
export NODE_ENV=development
export EXPO_PUBLIC_ENV=development

# Clear Expo cache to ensure fresh start
echo "🧹 Clearing Expo cache..."
npx expo start --clear

echo ""
echo "📱 DEVELOPMENT MODE FEATURES:"
echo "   • App name: 'Family Board (Dev)'"
echo "   • Connects to local server (192.168.1.24:3001)"
echo "   • Separate from production app"
echo "   • Hot reload enabled"
echo "   • Debug mode active"
echo "   • Push notifications configured" 