#!/bin/bash

# Script to run Prisma commands with host database URL
# This script loads the DATABASE_URL_HOST from .env and uses it for Prisma commands

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep 'DATABASE_URL_HOST=' | xargs)
fi

# Set DATABASE_URL to the host URL for this command
export DATABASE_URL="$DATABASE_URL_HOST"

# Run the command passed as arguments
exec "$@"
