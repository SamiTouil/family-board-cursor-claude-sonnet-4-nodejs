#!/bin/bash

# QNAP Tools Installation Script
# This script helps install required container orchestration tools on QNAP

set -e

echo "🔧 QNAP Container Tools Installation"
echo "===================================="

# Check if we're running on QNAP
if [ ! -f /etc/init.d/opkg.sh ]; then
    echo "⚠️  Warning: This doesn't appear to be a QNAP system."
    echo "   This script is designed for QNAP NAS systems."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🔍 Checking current container tools..."

# Check what's already available
if command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose is already installed"
    docker-compose --version
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "✅ docker compose (V2) is already available"
    docker compose version
elif command -v podman-compose &> /dev/null; then
    echo "✅ podman-compose is already installed"
    podman-compose --version
else
    echo "❌ No container orchestration tool found"
    
    echo ""
    echo "📦 Installation Options:"
    echo "1. Install docker-compose via pip (recommended)"
    echo "2. Use Container Station's built-in Docker"
    echo "3. Install via QNAP package manager"
    echo ""
    
    read -p "Choose option (1-3): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            echo "📦 Installing docker-compose via pip..."
            
            # Check if python/pip is available
            if command -v pip3 &> /dev/null; then
                pip3 install docker-compose
            elif command -v pip &> /dev/null; then
                pip install docker-compose
            else
                echo "❌ pip not found. Please install Python and pip first."
                echo "   You can install Python via QNAP App Center."
                exit 1
            fi
            
            echo "✅ docker-compose installed successfully!"
            docker-compose --version
            ;;
        2)
            echo "📦 Using Container Station's Docker..."
            echo ""
            echo "Container Station should provide Docker. Try using:"
            echo "  docker compose (note: space, not hyphen)"
            echo ""
            echo "If that doesn't work, you may need to:"
            echo "1. Enable SSH in QNAP Control Panel"
            echo "2. Install Container Station from App Center"
            echo "3. Restart your QNAP system"
            ;;
        3)
            echo "📦 QNAP Package Manager Installation..."
            echo ""
            echo "Please install Docker or Container Station from:"
            echo "1. QNAP App Center"
            echo "2. Search for 'Container Station'"
            echo "3. Install and enable the application"
            echo ""
            echo "After installation, Container Station will provide Docker tools."
            ;;
        *)
            echo "❌ Invalid option selected"
            exit 1
            ;;
    esac
fi

echo ""
echo "🔍 Final check of available tools..."

if command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose: $(docker-compose --version)"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "✅ docker compose: $(docker compose version)"
elif command -v podman-compose &> /dev/null; then
    echo "✅ podman-compose: $(podman-compose --version)"
else
    echo "❌ Still no container orchestration tool found"
    echo ""
    echo "Manual installation steps:"
    echo "1. Install Container Station from QNAP App Center"
    echo "2. Enable SSH access in QNAP Control Panel"
    echo "3. Install Python and pip if needed"
    echo "4. Run: pip install docker-compose"
    exit 1
fi

echo ""
echo "✅ Container tools are ready!"
echo "You can now run the deployment scripts."
