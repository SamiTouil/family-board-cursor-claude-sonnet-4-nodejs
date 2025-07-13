#!/bin/bash

# Fast E2E test runner with optimizations

echo "🚀 Starting optimized E2E tests..."

# Set environment variables for speed
export NODE_ENV=test
export CI=true

# Start services with test optimizations
echo "📦 Starting services..."
docker-compose -f ../docker-compose.yml -f ../docker-compose.test.yml up -d db backend frontend

# Wait for services to be ready
echo "⏳ Waiting for services..."
../scripts/wait-for-it.sh localhost:5432 -- echo "✅ Database ready"
../scripts/wait-for-it.sh localhost:5001 -- echo "✅ Backend ready"  
../scripts/wait-for-it.sh localhost:3000 -- echo "✅ Frontend ready"

# Run tests in parallel
echo "🧪 Running tests in parallel..."
npx playwright test --workers=4 --reporter=list

# Capture exit code
TEST_EXIT_CODE=$?

# Stop services
echo "🛑 Stopping services..."
docker-compose -f ../docker-compose.yml -f ../docker-compose.test.yml down

# Exit with test status
exit $TEST_EXIT_CODE