#!/bin/bash

# Family Board Production Deployment Script
# Run this script on your EC2 instance to set up the application

set -e  # Exit on any error

echo "🚀 Family Board Production Deployment"
echo "======================================"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "⚠️  Please log out and log back in for Docker permissions to take effect"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install additional tools
echo "🛠️  Installing additional tools..."
sudo apt install -y git curl htop nginx-common

# Create application directory
APP_DIR="/home/ubuntu/family-board"
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Creating application directory..."
    mkdir -p "$APP_DIR"
fi

# Clone repository if not exists
if [ ! -d "$APP_DIR/.git" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/SamiTouil/family-board-cursor-claude-sonnet-4-nodejs.git "$APP_DIR"
else
    echo "🔄 Repository already exists, pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
fi

cd "$APP_DIR"

# Set up environment variables
if [ ! -f ".env" ]; then
    echo "⚙️  Setting up environment variables..."
    cp env.production.example .env
    echo ""
    echo "🔧 IMPORTANT: Edit the .env file with your actual values:"
    echo "   - DATABASE_URL: Your RDS PostgreSQL connection string"
    echo "   - JWT_SECRET: A secure random string"
    echo "   - VITE_API_URL: Your domain URL"
    echo ""
    echo "📝 Run: nano .env"
    echo ""
    read -p "Press Enter after you've configured the .env file..."
fi

# Check if .env is configured
if grep -q "your-rds-endpoint" .env; then
    echo "❌ Please configure your .env file before proceeding!"
    echo "📝 Run: nano .env"
    exit 1
fi

# Create nginx SSL directory
sudo mkdir -p nginx/ssl

# Set up systemd service for auto-start
echo "🔧 Setting up systemd service..."
sudo tee /etc/systemd/system/family-board.service > /dev/null << EOF
[Unit]
Description=Family Board Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable family-board.service

# Build and start the application
echo "🏗️  Building and starting the application..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Running health check..."
if curl -f -s http://localhost/api/health > /dev/null; then
    echo "✅ Application is running successfully!"
    echo ""
    echo "🌐 Your application should be accessible at:"
    echo "   http://$(curl -s http://checkip.amazonaws.com)"
    echo ""
    echo "📊 To monitor the application:"
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "🔄 To restart the application:"
    echo "   sudo systemctl restart family-board"
else
    echo "❌ Health check failed. Check the logs:"
    echo "   docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

echo "🎉 Deployment completed successfully!" 