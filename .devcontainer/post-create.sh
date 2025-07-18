#!/bin/bash
set -e

echo "🚀 Setting up Family Board development environment..."

# Get the workspace folder
WORKSPACE_FOLDER=$(pwd)

# Configure git
echo "📝 Setting up git configuration..."
git config --global --add safe.directory "$WORKSPACE_FOLDER"

# Create .env files if they don't exist
if [ ! -f "$WORKSPACE_FOLDER/backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cat > "$WORKSPACE_FOLDER/backend/.env" << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/family_board
JWT_SECRET=dev-secret-key-change-in-production
PORT=3001
NODE_ENV=development
EOF
fi

if [ ! -f "$WORKSPACE_FOLDER/frontend/.env" ]; then
    echo "📝 Creating frontend .env file..."
    cat > "$WORKSPACE_FOLDER/frontend/.env" << EOF
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
EOF
fi

if [ ! -f "$WORKSPACE_FOLDER/mobile/.env" ]; then
    echo "📝 Creating mobile .env file..."
    cat > "$WORKSPACE_FOLDER/mobile/.env" << EOF
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001
EOF
fi

# Install dependencies for all projects
echo "📦 Installing dependencies..."
echo "📦 Backend..."
cd "$WORKSPACE_FOLDER/backend" && npm install

echo "📦 Frontend..."
cd "$WORKSPACE_FOLDER/frontend" && npm install

echo "📦 Mobile..."
cd "$WORKSPACE_FOLDER/mobile" && npm install

if [ -d "$WORKSPACE_FOLDER/e2e-tests" ]; then
    echo "📦 E2E Tests..."
    cd "$WORKSPACE_FOLDER/e2e-tests" && npm install
fi

# Set up Prisma
echo "🗄️ Setting up Prisma..."
cd "$WORKSPACE_FOLDER/backend"
npx prisma generate

# Wait for database
echo "🗄️ Waiting for database..."
for i in {1..30}; do
    if pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    fi
    echo "Waiting for database... ($i/30)"
    sleep 2
done

# Run migrations
echo "🗄️ Running database migrations..."
cd "$WORKSPACE_FOLDER/backend"
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "📋 Quick commands:"
echo "  Backend:   cd backend && npm run dev"
echo "  Frontend:  cd frontend && npm run dev"
echo "  Mobile:    cd mobile && npm start"
echo ""
echo "🎉 Happy coding!"