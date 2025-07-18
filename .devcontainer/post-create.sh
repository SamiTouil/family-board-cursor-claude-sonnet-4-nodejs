#!/bin/bash
set -e

echo "🚀 Setting up development environment..."

# Install PostgreSQL client tools
echo "🐘 Installing PostgreSQL client tools..."
sudo apt-get update
sudo apt-get install -y postgresql-client

# Ensure we're in the workspace
cd /workspace

# Create env files if they don't exist
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env 2>/dev/null || echo "DATABASE_URL=postgresql://postgres:postgres@postgres:5432/family_board" > backend/.env
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install
cd ../frontend && npm install  
cd ../mobile && npm install

# Setup database
echo "🗄️ Setting up database..."
cd ../backend
npx prisma generate
sleep 5  # Wait for postgres to be ready
npx prisma db push || true

echo "✅ Development environment ready!"