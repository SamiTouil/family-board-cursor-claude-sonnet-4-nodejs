#!/bin/bash

# SSL Certificate Renewal Setup Script
# This script sets up automatic renewal of Let's Encrypt certificates

set -e

echo "🔄 Setting up automatic SSL certificate renewal..."

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  This script should not be run as root. Please run as a regular user with sudo access."
   exit 1
fi

# Get the current directory (should be the project root)
PROJECT_DIR=$(pwd)

echo "📁 Project directory: $PROJECT_DIR"

# Create the renewal script
cat > /tmp/renew-ssl.sh << EOF
#!/bin/bash

# SSL Certificate Renewal Script for Family Board
# This script is run automatically by cron

set -e

# Change to project directory
cd $PROJECT_DIR

# Log file for renewal attempts
LOG_FILE="$PROJECT_DIR/logs/ssl-renewal.log"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

echo "\$(date): Starting SSL certificate renewal check..." >> \$LOG_FILE

# Try to renew certificates
if docker-compose -f docker-compose.prod.yml run --rm certbot renew --quiet; then
    echo "\$(date): Certificate renewal check completed successfully" >> \$LOG_FILE
    
    # Check if certificates were actually renewed (certbot exit code 0 means success, but not necessarily renewed)
    # We'll restart nginx anyway to be safe
    echo "\$(date): Reloading nginx to ensure new certificates are used..." >> \$LOG_FILE
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
    
    echo "\$(date): Nginx reloaded successfully" >> \$LOG_FILE
else
    echo "\$(date): ERROR - Certificate renewal failed!" >> \$LOG_FILE
    exit 1
fi
EOF

# Make the renewal script executable
chmod +x /tmp/renew-ssl.sh

# Move it to a permanent location
sudo mv /tmp/renew-ssl.sh /usr/local/bin/renew-family-board-ssl.sh

echo "✅ Renewal script created at /usr/local/bin/renew-family-board-ssl.sh"

# Create a cron job to run renewal twice daily
CRON_JOB="0 12,0 * * * /usr/local/bin/renew-family-board-ssl.sh"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "renew-family-board-ssl.sh"; then
    echo "⚠️  Cron job already exists. Updating it..."
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v "renew-family-board-ssl.sh" | crontab -
fi

# Add the cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added successfully!"
echo "📅 Certificates will be checked for renewal twice daily (12:00 PM and 12:00 AM)"

# Test the renewal script
echo "🧪 Testing the renewal script..."

if /usr/local/bin/renew-family-board-ssl.sh; then
    echo "✅ Renewal script test successful!"
else
    echo "❌ Renewal script test failed. Check the logs:"
    tail -10 "$PROJECT_DIR/logs/ssl-renewal.log" 2>/dev/null || echo "No log file found"
fi

# Show current cron jobs
echo "📋 Current cron jobs:"
crontab -l

echo ""
echo "🎉 SSL certificate auto-renewal setup completed!"
echo ""
echo "📋 Summary:"
echo "   • Renewal script: /usr/local/bin/renew-family-board-ssl.sh"
echo "   • Cron schedule: Twice daily at 12:00 PM and 12:00 AM"
echo "   • Log file: $PROJECT_DIR/logs/ssl-renewal.log"
echo "   • Certificates will be automatically renewed when they expire in 30 days or less"
echo ""
echo "💡 Tips:"
echo "   • Check logs regularly: tail -f $PROJECT_DIR/logs/ssl-renewal.log"
echo "   • Test renewal manually: /usr/local/bin/renew-family-board-ssl.sh"
echo "   • Let's Encrypt certificates are valid for 90 days" 