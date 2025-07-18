#!/bin/bash

echo "🧪 Testing devcontainer setup..."

# Test if we can build the devcontainer
echo "📦 Building devcontainer..."
cd .devcontainer
docker-compose build

# Test if we can start the services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if postgres is running
echo "🗄️ Checking PostgreSQL..."
docker-compose exec -T postgres pg_isready -U postgres

# Check if workspace container is running
echo "🔍 Checking workspace container..."
docker-compose exec -T workspace echo "Workspace is running!"

# Show running containers
echo "📋 Running containers:"
docker-compose ps

echo "✅ Devcontainer test complete!"
echo ""
echo "To clean up test containers, run:"
echo "cd .devcontainer && docker-compose down -v"