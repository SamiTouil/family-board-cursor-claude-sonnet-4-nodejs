#!/bin/bash

# Family Board Database Workflow Script
# This script helps manage database state during development

set -e  # Exit on any error

echo "🎯 Family Board Database Workflow"
echo "================================="

# Function to export current DB state
export_db() {
    echo "📤 Exporting current database state..."
    cd backend
    npm run db:export
    cd ..
    echo "✅ Database state exported successfully!"
}

# Function to reset DB with current seed (migration-aware)
reset_db() {
    echo "🔄 Resetting database with seed data (migration-aware)..."
    cd backend
    npm run db:reset
    cd ..
    echo "✅ Database reset completed!"
}

# Function to safely push schema changes
safe_push() {
    echo "🛡️  Safely pushing schema changes with automatic reseed..."
    cd backend
    npm run db:safe-push
    cd ..
    echo "✅ Schema pushed and database reseeded!"
}

# Function to show current DB stats
show_stats() {
    echo "📊 Current database statistics:"
    cd backend
    npm run db:export 2>/dev/null | grep -E "Users:|Families:|Family Members:|Family Invites:|Join Requests:"
    cd ..
}

# Main menu
case "${1:-}" in
    "export")
        export_db
        ;;
    "reset")
        reset_db
        ;;
    "safe-push")
        safe_push
        ;;
    "stats")
        show_stats
        ;;
    "full")
        echo "🔄 Full workflow: Export current state, then reset with seed"
        export_db
        echo ""
        reset_db
        ;;
    *)
        echo "Usage: $0 {export|reset|safe-push|stats|full}"
        echo ""
        echo "Commands:"
        echo "  export     - Export current database state to JSON"
        echo "  reset      - Reset database using current seed data"
        echo "  safe-push  - Export data, push schema changes, then reseed (RECOMMENDED)"
        echo "  stats      - Show current database statistics"
        echo "  full       - Export current state, then reset with seed"
        echo ""
        echo "Examples:"
        echo "  $0 safe-push  # Safely apply schema changes (RECOMMENDED)"
        echo "  $0 export     # Save current DB state"
        echo "  $0 reset      # Reset DB with saved state"
        exit 1
        ;;
esac

echo "🎉 Operation completed successfully!" 