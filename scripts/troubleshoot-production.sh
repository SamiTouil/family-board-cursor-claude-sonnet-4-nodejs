#!/bin/bash

echo "🔍 Family Board Production Troubleshooting Script"
echo "=================================================="

cd /home/ubuntu/family-board

echo ""
echo "📊 Current Container Status:"
echo "----------------------------"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🔍 Backend Health Check:"
echo "------------------------"
echo "Testing backend health endpoint..."
curl -v http://localhost:3001/api/health 2>&1 || echo "❌ Backend health check failed"

echo ""
echo "🔍 Frontend Health Check:"
echo "-------------------------"
echo "Testing frontend..."
curl -v http://localhost:3000 2>&1 || echo "❌ Frontend health check failed"

echo ""
echo "📋 Backend Logs (last 30 lines):"
echo "----------------------------------"
docker compose -f docker-compose.prod.yml logs backend --tail=30

echo ""
echo "📋 Frontend Logs (last 30 lines):"
echo "-----------------------------------"
docker compose -f docker-compose.prod.yml logs frontend --tail=30

echo ""
echo "📋 Database Migration Logs:"
echo "----------------------------"
docker compose -f docker-compose.prod.yml logs db-migrate --tail=20

echo ""
echo "📋 Database Check Logs:"
echo "------------------------"
docker compose -f docker-compose.prod.yml logs db-check --tail=20

echo ""
echo "🔍 Environment Variables Check:"
echo "--------------------------------"
echo "Checking if required environment variables are set..."
if [ -f .env.production ]; then
    echo "✅ .env.production file exists"
    echo "Environment variables:"
    grep -v "PASSWORD\|SECRET\|KEY" .env.production | head -10
else
    echo "❌ .env.production file not found"
fi

echo ""
echo "🔍 Disk Space:"
echo "---------------"
df -h

echo ""
echo "🔍 Memory Usage:"
echo "----------------"
free -h

echo ""
echo "🔍 Docker System Info:"
echo "-----------------------"
docker system df

echo ""
echo "🔧 Quick Fix Commands:"
echo "======================"
echo "1. Restart all services:"
echo "   docker compose -f docker-compose.prod.yml restart"
echo ""
echo "2. Rebuild and restart:"
echo "   docker compose -f docker-compose.prod.yml down"
echo "   docker compose -f docker-compose.prod.yml up --build -d"
echo ""
echo "3. Check specific service logs:"
echo "   docker compose -f docker-compose.prod.yml logs [service-name] -f"
echo ""
echo "4. Check environment variables:"
echo "   cat .env.production" 