#!/bin/bash

# Family Board - Production Deployment Script
# This script handles deployment on your Windows production machine
# Run this script whenever you want to update to the latest version

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    print_status "Checking Docker status..."
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if environment file exists
check_environment() {
    print_status "Checking environment configuration..."
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found!"
        print_status "Please copy .env.production.example to $ENV_FILE and configure it."
        exit 1
    fi
    print_success "Environment file found"
}

# Function to create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        print_status "Creating backup directory..."
        mkdir -p "$BACKUP_DIR"
        print_success "Backup directory created"
    fi
}

# Function to backup database
backup_database() {
    print_status "Creating database backup..."
    
    # Load environment variables
    source "$ENV_FILE"
    
    # Create backup filename with timestamp
    BACKUP_FILE="$BACKUP_DIR/family_board_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create backup
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"; then
        print_success "Database backup created: $BACKUP_FILE"
    else
        print_warning "Database backup failed (this is normal if database is empty)"
    fi
}

# Function to pull latest images
pull_images() {
    print_status "Pulling latest Docker images..."
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull; then
        print_success "Latest images pulled successfully"
    else
        print_error "Failed to pull images"
        exit 1
    fi
}

# Function to start services
start_services() {
    print_status "Starting services..."
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Function to wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for backend to be healthy
    print_status "Checking backend health..."
    for i in {1..30}; do
        if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
            print_success "Backend is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Backend health check timeout"
            exit 1
        fi
        sleep 2
    done
    
    # Wait for frontend to be healthy
    print_status "Checking frontend health..."
    for i in {1..30}; do
        if curl -f http://localhost:3000/health >/dev/null 2>&1; then
            print_success "Frontend is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Frontend health check timeout"
            exit 1
        fi
        sleep 2
    done
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec backend npx prisma db push; then
        print_success "Database migrations completed"
    else
        print_warning "Database migrations failed (this might be normal for first deployment)"
    fi
}

# Function to show deployment status
show_status() {
    print_success "🎉 Deployment completed successfully!"
    echo ""
    print_status "Services are running at:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Backend API: http://localhost:3001"
    echo "  • Database Admin: http://localhost:8080 (if enabled)"
    echo ""
    print_status "To check service status:"
    echo "  docker-compose -f $COMPOSE_FILE ps"
    echo ""
    print_status "To view logs:"
    echo "  docker-compose -f $COMPOSE_FILE logs -f"
    echo ""
    print_status "To stop services:"
    echo "  docker-compose -f $COMPOSE_FILE down"
}

# Main deployment function
main() {
    echo "🚀 Family Board Production Deployment"
    echo "======================================"
    
    check_docker
    check_environment
    create_backup_dir
    backup_database
    pull_images
    start_services
    wait_for_services
    run_migrations
    show_status
}

# Run main function
main "$@"
