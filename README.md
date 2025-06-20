# Family Board

A minimalistic family task planner application built with modern web technologies.

## 🚀 Tech Stack

- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Vitest
- **E2E Testing**: Playwright (Chromium only)
- **Containerization**: Docker + Docker Compose
- **Database Admin**: Adminer
- **CI/CD**: GitHub Actions
- **Internationalization**: i18next (English & French)

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- Docker and Docker Compose
- Git

## 🛠️ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd family-board-cursor-claude-sonnet-4-nodejs
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup.sh
   npm run setup
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database Admin (Adminer): http://localhost:8080
   - API Health Check: http://localhost:3001/health

## 📁 Project Structure

```
├── backend/                 # Node.js + TypeScript backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── locales/        # i18n translations
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── __tests__/      # Unit tests
│   ├── prisma/             # Database schema and migrations
│   └── Dockerfile
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── i18n/          # Internationalization
│   │   └── test/          # Test setup
│   └── Dockerfile
├── e2e-tests/             # Playwright E2E tests
├── scripts/               # Setup and utility scripts
└── docker-compose.yml    # Docker services configuration
```

## 🧪 Testing

- **Unit Tests (Backend)**: `npm run test:backend`
- **Unit Tests (Frontend)**: `npm run test:frontend`
- **E2E Tests**: `npm run test:e2e`
- **All Tests**: `npm run test:all`

## 🔧 Development Commands

- `npm run dev` - Start all services in development mode
- `npm run dev:detached` - Start services in background
- `npm run down` - Stop all services
- `npm run clean` - Clean up Docker resources

## 🌐 Environment Variables

Copy `.env.example` to `.env` and configure:

- Database settings (PostgreSQL)
- JWT secret for authentication
- Port configurations
- Language settings

## 🎨 Design Philosophy

- **Minimalistic UI**: Clean, white background with purple accents (#7c3aed)
- **Single Page Application**: Everything in one screen
- **No Dark Mode**: Fixed, consistent UX
- **Deliveroo-inspired**: Simple and functional design

## 🌍 Internationalization

Supports English (default) and French with automatic language detection.

## 🐳 Docker Services

- **postgres**: PostgreSQL 15 database
- **adminer**: Database administration interface
- **backend**: Node.js API server
- **frontend**: React development server

## 🔄 CI/CD

GitHub Actions workflow automatically:
- Runs all tests (unit + E2E)
- Performs linting
- Builds applications
- Validates Docker containers

## 📝 User Entity

Initial simple user model includes:
- First Name
- Last Name
- Email (unique)
- Password (hashed)
- Avatar URL (optional)
- Timestamps (created/updated)

## 🚦 Getting Started with Development

1. Make sure Docker is running
2. Run `npm run setup` (one-time setup)
3. Use `npm run dev` for development
4. Access Adminer at http://localhost:8080 for database management
5. Run tests with `npm run test:all`

## 🔧 Local CI Testing

Use ACT to test GitHub Actions locally:
```bash
# Stop Docker containers first to avoid port conflicts
npm run down

# Run CI locally (non-interactive)
npx act
```

---

**Note**: This is a clone-and-go project. The setup script handles all initialization automatically. If you encounter issues in Cursor with Github CLI commands, please run this command : gh config set pager cat
