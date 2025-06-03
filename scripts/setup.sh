#!/bin/bash

set -e

echo "🚀 Setting up Family Board project..."

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Copying .env.example to .env..."
    cp .env.example .env
    echo "✅ Environment file created. Please review and update .env with your settings."
else
    echo "⚠️  .env file already exists, skipping copy."
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Install e2e test dependencies
echo "📦 Installing E2E test dependencies..."
cd e2e-tests && npm install && cd ..

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
cd e2e-tests && npx playwright install chromium && cd ..

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose run --rm backend npx prisma migrate dev --name init

# Stop services
echo "🛑 Stopping services..."
docker-compose down

echo "✅ Setup complete! You can now run:"
echo "   npm run dev          - Start all services"
echo "   npm run test:all     - Run all tests"
echo "   npm run clean        - Clean up Docker resources" 