#!/bin/bash

# System Cleanup Script for EC2 t2.micro instances
# Automatically manages disk space by cleaning up caches and unnecessary files

set -e

echo "🧹 Starting comprehensive system cleanup..."

# Function to display disk usage
show_disk_usage() {
    echo "💽 Current disk usage:"
    df -h /
    echo ""
}

# Function to clean Docker resources
cleanup_docker() {
    echo "🐳 Cleaning Docker resources..."
    
    # Stop all containers gracefully
    docker-compose -f docker-compose.prod.yml down --timeout 30 2>/dev/null || true
    
    # Remove unused containers, networks, images, and build cache
    docker system prune -af --volumes 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -af 2>/dev/null || true
    
    # Remove unused volumes
    docker volume prune -f 2>/dev/null || true
    
    echo "✅ Docker cleanup completed"
}

# Function to clean APT cache
cleanup_apt() {
    echo "📦 Cleaning APT cache..."
    
    # Clean package cache
    sudo apt-get clean
    
    # Remove orphaned packages
    sudo apt-get autoremove -y
    
    # Remove old kernels (keep current and one previous)
    sudo apt-get autoremove --purge -y
    
    echo "✅ APT cleanup completed"
}

# Function to clean system logs
cleanup_logs() {
    echo "📋 Cleaning system logs..."
    
    # Clean systemd journal logs (keep last 3 days)
    sudo journalctl --vacuum-time=3d
    
    # Clean old log files
    sudo find /var/log -name "*.log.1" -delete 2>/dev/null || true
    sudo find /var/log -name "*.log.*.gz" -delete 2>/dev/null || true
    
    # Clean Docker logs
    sudo find /var/lib/docker/containers -name "*.log" -exec truncate -s 0 {} \; 2>/dev/null || true
    
    echo "✅ Log cleanup completed"
}

# Function to clean temporary files
cleanup_temp() {
    echo "🗑️  Cleaning temporary files..."
    
    # Clean /tmp (files older than 7 days)
    sudo find /tmp -type f -atime +7 -delete 2>/dev/null || true
    
    # Clean user cache
    rm -rf ~/.cache/* 2>/dev/null || true
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
    
    echo "✅ Temporary files cleanup completed"
}

# Function to optimize snap packages
cleanup_snap() {
    echo "📱 Optimizing snap packages..."
    
    # Remove old snap revisions (keep only 2 most recent)
    set +e  # Don't exit on error for this section
    LANG=en_US.UTF-8 snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
        sudo snap remove "$snapname" --revision="$revision" 2>/dev/null || true
    done
    set -e
    
    echo "✅ Snap cleanup completed"
}

# Function to configure Docker for space efficiency
configure_docker() {
    echo "⚙️  Configuring Docker for space efficiency..."
    
    # Create Docker daemon configuration
    sudo mkdir -p /etc/docker
    
    # Configure Docker with storage optimization
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
    
    # Restart Docker to apply configuration
    sudo systemctl restart docker || true
    
    echo "✅ Docker configuration optimized"
}

# Function to set up automatic cleanup cron job
setup_auto_cleanup() {
    echo "⏰ Setting up automatic cleanup schedule..."
    
    # Create cron job for weekly cleanup
    (crontab -l 2>/dev/null; echo "0 2 * * 0 /home/ubuntu/family-board/scripts/system-cleanup.sh > /tmp/cleanup.log 2>&1") | crontab -
    
    echo "✅ Automatic cleanup scheduled for every Sunday at 2 AM"
}

# Main cleanup sequence
main() {
    echo "🚀 Starting system cleanup on $(date)"
    
    show_disk_usage
    
    cleanup_docker
    cleanup_apt
    cleanup_logs
    cleanup_temp
    cleanup_snap
    configure_docker
    
    echo ""
    echo "🎉 System cleanup completed!"
    show_disk_usage
    
    # Calculate space freed
    echo "📊 Cleanup summary:"
    echo "   - Docker resources cleaned"
    echo "   - APT cache cleared"
    echo "   - System logs rotated"
    echo "   - Temporary files removed"
    echo "   - Snap packages optimized"
    echo "   - Docker configured for efficiency"
    
    setup_auto_cleanup
}

# Run main function
main "$@" 