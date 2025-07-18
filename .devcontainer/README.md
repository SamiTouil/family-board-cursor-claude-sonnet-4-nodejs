# Family Board Development Container

This development container provides a consistent, fully-featured development environment for the Family Board project.

## Features

- **Alpine Linux base** for minimal footprint
- **All development tools pre-installed**: Node.js 18, Git, TypeScript, Prisma, Playwright, Expo CLI
- **Automatic dependency installation** on container creation
- **VSCode extensions** automatically installed for optimal development experience
- **Persistent volumes** for node_modules (better performance) and VSCode extensions
- **Database integration** with automatic migrations
- **Hot-reload support** for all services

## Quick Start

1. Install VSCode and the "Dev Containers" extension
2. Open the project folder in VSCode
3. When prompted, click "Reopen in Container" (or use Command Palette: "Dev Containers: Reopen in Container")
4. Wait for the container to build and post-create script to run
5. All services are now ready!

## Services

The devcontainer automatically starts these services:
- PostgreSQL database (port 5432)
- Adminer database UI (port 8080)
- Backend API (port 3001)
- Frontend web app (port 3000)

## Development Commands

Inside the container, you can run:

```bash
# Backend development
cd /workspace/backend && npm run dev

# Frontend development
cd /workspace/frontend && npm run dev

# Mobile development
cd /workspace/mobile && npm start

# Run E2E tests
cd /workspace/e2e-tests && npm test

# Database operations
cd /workspace/backend
npx prisma migrate dev   # Create new migration
npx prisma studio        # Open Prisma Studio
```

## Environment Variables

The container automatically creates `.env` files for each service if they don't exist. You can modify these as needed.

## Troubleshooting

### Container fails to start
- Ensure Docker is running
- Check that ports 3000, 3001, 5432, and 8080 are not in use

### Database connection issues
- The database credentials are: `postgres:postgres`
- Database name: `family_board`
- Host: `postgres` (from within containers)

### Performance issues
- The container uses volume mounts for node_modules to improve performance
- If you experience slow file watching, the container sets `CHOKIDAR_USEPOLLING=true`

## Benefits

1. **No local Node.js installation required** - Everything runs in the container
2. **Consistent environment** - Same versions across all developers
3. **Isolated dependencies** - No conflicts with other projects
4. **Easy onboarding** - New developers can start coding immediately
5. **Symbol resolution** - Full IntelliSense and type checking work perfectly