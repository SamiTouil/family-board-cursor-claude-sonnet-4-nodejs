#!/bin/bash
# Check health of NAS deployment

echo "🔍 Checking NAS deployment health..."
echo "===================================="
echo ""

# Check if all containers are running
echo "📦 Container status:"
docker-compose -f docker-compose.nas.yml ps
echo ""

# Check frontend health
echo "🎨 Frontend health:"
if docker-compose -f docker-compose.nas.yml exec -T frontend wget -q -O- http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding"
    echo "Checking frontend logs:"
    docker-compose -f docker-compose.nas.yml logs --tail=20 frontend
fi
echo ""

# Check backend health
echo "🔧 Backend health:"
if docker-compose -f docker-compose.nas.yml exec -T backend wget -q -O- http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is responding"
else
    echo "❌ Backend is not responding"
    echo "Checking backend logs:"
    docker-compose -f docker-compose.nas.yml logs --tail=20 backend
fi
echo ""

# Check nginx connectivity
echo "🌐 Nginx connectivity:"
echo "Local HTTP test:"
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "301\|200"; then
    echo "✅ HTTP is working"
else
    echo "❌ HTTP is not working"
fi

if [ -f "certbot/conf/live/mabt.eu/fullchain.pem" ]; then
    echo "Local HTTPS test:"
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost | grep -q "200"; then
        echo "✅ HTTPS is working"
    else
        echo "❌ HTTPS is not working"
    fi
fi
echo ""

# Check for security scan attempts
echo "🛡️  Recent security scan attempts:"
docker-compose -f docker-compose.nas.yml logs nginx | grep -E "(\.git|\.env|\.svn)" | tail -5 || echo "No recent scan attempts found"
echo ""

# Recommendations
echo "📋 Recommendations:"
echo "1. If frontend is not responding, restart it:"
echo "   docker-compose -f docker-compose.nas.yml restart frontend"
echo ""
echo "2. To use the secure nginx config:"
echo "   cp nginx/nginx-nas-secure.conf nginx/nginx-ssl.conf"
echo "   docker-compose -f docker-compose.nas.yml restart nginx"
echo ""
echo "3. Monitor logs for issues:"
echo "   docker-compose -f docker-compose.nas.yml logs -f"