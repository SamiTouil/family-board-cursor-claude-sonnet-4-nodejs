#!/bin/bash
set -e

echo "🚀 Setting up Family Board development environment..."

# Fix permissions for node_modules volumes (run as root)
echo "🔧 Fixing permissions for node_modules volumes..."
sudo chown -R developer:developer /workspace/backend/node_modules /workspace/frontend/node_modules /workspace/mobile/node_modules /workspace/e2e-tests/node_modules 2>/dev/null || true

# Configure git if needed
if [ -f /home/developer/.gitconfig ]; then
    echo "✅ Git configuration found"
else
    echo "📝 Setting up basic git configuration..."
    git config --global user.name "Developer"
    git config --global user.email "developer@localhost"
fi

# Install dependencies for all projects
echo "📦 Installing backend dependencies..."
cd /workspace/backend && npm install

echo "📦 Installing frontend dependencies..."
cd /workspace/frontend && npm install

echo "📦 Installing mobile dependencies..."
cd /workspace/mobile && npm install

echo "📦 Installing e2e-tests dependencies..."
cd /workspace/e2e-tests && npm install

# Set up Prisma
echo "🗄️ Setting up Prisma..."
cd /workspace/backend
npx prisma generate

# Check if database is ready and run migrations
echo "🗄️ Waiting for database..."
while ! pg_isready -h postgres -p 5432 -U postgres; do
    echo "Waiting for database to be ready..."
    sleep 2
done

echo "🗄️ Running database migrations..."
npx prisma migrate deploy || echo "⚠️ Migrations may already be applied"

# Create .env files if they don't exist
if [ ! -f /workspace/backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cat > /workspace/backend/.env << EOF
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/family_board
JWT_SECRET=dev-secret-key-change-in-production
PORT=3001
NODE_ENV=development
EOF
fi

if [ ! -f /workspace/frontend/.env ]; then
    echo "📝 Creating frontend .env file..."
    cat > /workspace/frontend/.env << EOF
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
EOF
fi

if [ ! -f /workspace/mobile/.env ]; then
    echo "📝 Creating mobile .env file..."
    cat > /workspace/mobile/.env << EOF
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001
EOF
fi

echo "✅ Development environment setup complete!"
echo ""
echo "📋 Quick commands:"
echo "  Backend:   cd /workspace/backend && npm run dev"
echo "  Frontend:  cd /workspace/frontend && npm run dev"
echo "  Mobile:    cd /workspace/mobile && npm start"
echo "  E2E Tests: cd /workspace/e2e-tests && npm test"
echo ""
echo "🎉 Happy coding!"