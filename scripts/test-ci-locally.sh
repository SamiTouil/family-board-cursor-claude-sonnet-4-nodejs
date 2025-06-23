#!/bin/bash

# Test CI Workflow Locally
# This script tests our GitHub Actions workflow using ACT

set -e

echo "🧪 Testing CI/CD Workflow Locally with ACT"
echo "=========================================="

# Stop any running containers first
echo "🛑 Stopping any running Docker containers..."
docker-compose down -v 2>/dev/null || true

echo ""
echo "📋 Available Jobs:"
echo "  - lint                 (Lint Code)"
echo "  - unit-tests-frontend  (Frontend Unit Tests)"
echo "  - unit-tests-backend   (Backend Unit Tests)"
echo "  - build                (Build Applications)"
echo "  - e2e-tests           (E2E Tests)"
echo ""

# Function to test a specific job
test_job() {
    local job_name=$1
    local description=$2
    
    echo "🧪 Testing: $description"
    echo "   Command: act --job $job_name --dryrun"
    
    if act --job "$job_name" --dryrun --container-architecture linux/amd64; then
        echo "✅ $description - PASSED"
    else
        echo "❌ $description - FAILED"
        return 1
    fi
    echo ""
}

# Test individual jobs
echo "🚀 Testing Individual Jobs (Dry Run)"
echo "======================================"

test_job "lint" "Lint Code"
test_job "unit-tests-frontend" "Frontend Unit Tests"
test_job "unit-tests-backend" "Backend Unit Tests"
test_job "build" "Build Applications"

echo "🎉 All basic jobs tested successfully!"
echo ""

# Note about E2E tests
echo "📝 Note: E2E tests require full Docker stack and are complex to test with ACT."
echo "   They will be tested in the actual GitHub Actions environment."
echo ""

echo "✅ Local CI testing completed successfully!"
echo ""
echo "💡 To run actual tests locally:"
echo "   npm run test:all        # Run all unit tests + E2E tests"
echo "   npm run test:e2e        # Run E2E tests only"
echo "   npm run dev             # Start full application stack" 