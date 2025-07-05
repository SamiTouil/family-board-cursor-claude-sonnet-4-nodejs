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

# Configure swap space for memory-constrained instances
echo "💾 Configuring swap space for optimal performance..."
SWAP_SIZE="2G"
SWAP_FILE="/swapfile"

# Check if swap is already configured
if ! swapon --show | grep -q "$SWAP_FILE"; then
    echo "🔧 Creating ${SWAP_SIZE} swap file..."
    
    # Create swap file
    sudo fallocate -l $SWAP_SIZE $SWAP_FILE
    
    # Set correct permissions
    sudo chmod 600 $SWAP_FILE
    
    # Set up swap space
    sudo mkswap $SWAP_FILE
    
    # Enable swap
    sudo swapon $SWAP_FILE
    
    # Make swap permanent
    if ! grep -q "$SWAP_FILE" /etc/fstab; then
        echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab
    fi
    
    echo "✅ Swap space configured successfully!"
else
    echo "✅ Swap space already configured"
fi

# Display memory status
echo "📊 Current memory status:"
free -h

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "🔧 Applying Docker permissions..."
    newgrp docker
fi

# Ensure Docker permissions are correct
if ! docker ps &> /dev/null; then
    echo "🔧 Fixing Docker permissions..."
    sudo usermod -aG docker $USER
    newgrp docker
    sudo systemctl restart docker
    sleep 5
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

# Check disk space and clean up if needed
echo "💽 Checking disk space..."
df -h

# Clean up Docker aggressively if disk usage is high (>80%)
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "⚠️  High disk usage detected (${DISK_USAGE}%), running comprehensive cleanup..."
  
  # Run system cleanup script if available
  if [ -f "./scripts/system-cleanup.sh" ]; then
    chmod +x ./scripts/system-cleanup.sh
    ./scripts/system-cleanup.sh
  else
    # Fallback aggressive cleanup
    echo "🐳 Running aggressive Docker cleanup..."
    docker system prune -af --volumes || true
    
    echo "📦 Cleaning APT cache..."
    sudo apt-get clean || true
    sudo apt-get autoremove -y || true
    
    echo "📋 Cleaning system logs..."
    sudo journalctl --vacuum-time=3d || true
    
    echo "📱 Cleaning snap packages..."
    set +e
    LANG=en_US.UTF-8 snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
        sudo snap remove "$snapname" --revision="$revision" 2>/dev/null || true
    done
    set -e
  fi
  
  echo "✅ Comprehensive cleanup completed"
  df -h
else
  echo "✅ Disk space is sufficient (${DISK_USAGE}% used)"
  # Light cleanup to free some space
  docker system prune -f || true
fi

# Configure Docker for space efficiency if not already done
if [ ! -f "/etc/docker/daemon.json" ]; then
  echo "⚙️  Configuring Docker for space efficiency..."
  sudo mkdir -p /etc/docker
  cat <<EOF | sudo tee /etc/docker/daemon.json
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "max-concurrent-downloads": 3,
    "max-concurrent-uploads": 3
}
EOF
  sudo systemctl restart docker || true
  echo "✅ Docker configuration optimized"
fi

# Build services sequentially to avoid memory issues
echo "🏗️  Building services sequentially..."
echo "📦 Building backend..."
docker-compose -f docker-compose.prod.yml build backend

echo "📦 Building frontend..."
docker-compose -f docker-compose.prod.yml build frontend

echo "📦 Building remaining services..."
docker-compose -f docker-compose.prod.yml build

# Start the application
echo "🚀 Starting the application..."
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