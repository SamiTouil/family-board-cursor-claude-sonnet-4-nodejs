#!/bin/bash
# Diagnose SSL setup issues

echo "🔍 Diagnosing SSL setup issues..."
echo "================================"

# Check public IP
echo "📡 Your public IP address:"
curl -s https://api.ipify.org
echo -e "\n"

# Check DNS records
echo "🌐 DNS records for mabt.eu:"
nslookup mabt.eu 8.8.8.8
echo ""
echo "🌐 DNS records for www.mabt.eu:"
nslookup www.mabt.eu 8.8.8.8
echo ""

# Test port 80 connectivity
echo "🔌 Testing port 80 connectivity from outside:"
echo "Running: curl -I http://mabt.eu/.well-known/acme-challenge/test"
timeout 10 curl -I http://mabt.eu/.well-known/acme-challenge/test || echo "❌ Port 80 appears to be blocked or unreachable"
echo ""

# Check local services
echo "🐳 Docker services status:"
docker-compose -f docker-compose.nas.yml ps
echo ""

# Check if nginx is listening on port 80
echo "🔍 Checking if nginx is listening on port 80:"
docker-compose -f docker-compose.nas.yml exec nginx netstat -tlnp | grep :80 || echo "Nginx might not be running"
echo ""

echo "📋 Checklist for SSL setup:"
echo "1. ✓ Is port 80 forwarded from your router to your NAS?"
echo "2. ✓ Is port 443 forwarded from your router to your NAS?"
echo "3. ✓ Are firewall rules allowing incoming HTTP/HTTPS traffic?"
echo "4. ✓ Do DNS records point to your public IP (shown above)?"
echo "5. ✓ Is your ISP blocking port 80? (some residential ISPs do this)"
echo ""
echo "💡 If your ISP blocks port 80, consider:"
echo "   - Using DNS validation instead of HTTP validation"
echo "   - Using a different port with a reverse proxy service"
echo "   - Contacting your ISP to unblock port 80"