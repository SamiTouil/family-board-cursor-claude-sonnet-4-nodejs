# Agent Comprehensive Guide for Family Board Project

## 📋 Table of Contents
1. [General Agent Rules](#general-agent-rules)
2. [Project-Specific Rules](#project-specific-rules)
3. [Stored Memories](#stored-memories)
4. [Project Documentation](#project-documentation)

---

## 🤖 General Agent Rules

### Code Quality & Implementation
- **Immediate Execution**: Always use code edit tools to implement changes rather than outputting code to the user
- **Runnable Code**: Generated code must be immediately executable with all necessary imports, dependencies, and endpoints
- **Modern UI**: When building web apps from scratch, create beautiful, modern UIs with best UX practices
- **No Binary Content**: Never generate extremely long hashes or non-textual/binary code
- **Linter Error Handling**: Fix clear linter errors but don't loop more than 3 times on the same file
- **Tool Selection**: Use `search_replace` for files larger than 2500 lines, otherwise prefer `edit_file`

### File Management
- **Edit Over Create**: Always prefer editing existing files to creating new ones
- **Minimal File Creation**: Never create files unless absolutely necessary for the goal
- **No Proactive Documentation**: Never create documentation files (*.md) or README files unless explicitly requested

### Tool Usage
- **Parallel Tool Calls**: Execute multiple operations simultaneously rather than sequentially whenever possible
- **Comprehensive Context**: Be thorough when gathering information; ensure full picture before replying
- **Semantic Search**: Use broad, high-level queries first, then narrow down with specific searches

---

## 🏗️ Project-Specific Rules

### Environment & Development Workflow
- **Local + Docker Validation**: Run and test code locally for quick feedback, but always verify in Docker containers before considering features stable
- **Docker Command**: Use `docker compose` (not `docker-compose`) for better reliability
- **Non-Interactive Commands**: Always use non-interactive flags (`-y`, `--force`, `--assume-yes`) for terminal commands

### Version Control & Git Workflow
- **Explicit Confirmation Required**: MUST obtain explicit user confirmation before executing any `git commit` or `git push` commands
- **Pull Request Only**: Only push code changes via Pull Requests from feature branches
- **Never Direct Push**: NEVER commit or push directly to `main`, `develop`, or protected branches
- **Proactive Git Assistance**: Help with staging changes, suggesting commit messages, and drafting PR descriptions

### Database Management
- **No Migrations**: Never create database migrations; always update Prisma schema directly
- **Safe Push Only**: Always use `npm run db:safe-push` (exports data, applies changes, reseeds) instead of raw `prisma db push`
- **Data Preservation**: The safe-push workflow prevents data loss during development iterations

### Testing Strategy
- **100% Pass Rate**: Ensure ALL tests (Unit and E2E) achieve 100% pass rate before merging PRs
- **Comprehensive Testing**: Create unit tests for business logic, integration tests for API endpoints, E2E tests for complete workflows
- **Local CI Validation**: Use ACT to run GitHub Actions locally before pushing changes
- **Test-Driven Development**: Never consider backend work complete without corresponding unit tests

### Code Quality Standards
- **Minimal & Efficient**: Strive for clear, efficient code; be prepared to refactor for conciseness
- **Code Hygiene**: Help identify and remove unused variables, functions, methods, classes, and imports
- **Dead Code Cleanup**: Flag potentially redundant code blocks, especially after experimentation phases

---

## 🧠 Stored Memories

### Critical Workflow Rules
- **Pre-PR Testing Protocol**: Never create a PR without first running and passing ALL local tests and linting checks:
  1. Backend tests: `cd backend && npm test`
  2. Frontend tests: `cd frontend && npm test`
  3. Linting: `cd backend && npm run lint` and `cd frontend && npm run lint`
  4. Build validation: `cd backend && npm run build` and `cd frontend && npm run build`

- **Git Cleanup Process**: After merging PRs, always follow complete cleanup:
  1. Switch to main and pull latest: `git pull origin main`
  2. Delete local feature branch: `git branch -d [branch-name]`
  3. Delete remote feature branch: `git push origin --delete [branch-name]`
  4. Create new feature branch for next work

### Technical Implementation Achievements
- **UX Standardization**: Successfully completed combo box standardization across the application, replacing 6 native HTML select elements with CustomSelect component (PR #92)

- **Week Schedule System**: Implemented efficient "virtual schedule with override pattern" reducing database storage by ~95%:
  - Added WeekOverride and TaskOverride models with TaskOverrideAction enum
  - Created WeekScheduleService with on-demand schedule resolution
  - Added API routes with proper family membership validation
  - Comprehensive TypeScript types and unit tests

- **Family Management E2E**: Implemented comprehensive E2E tests with 12 test scenarios covering virtual member management, family details editing, and access control

### Testing & CI/CD Insights
- **E2E Authentication**: Use systematic debugging approach with network response listeners, page content logging, and element availability verification

- **Playwright Module Resolution**: Install dependencies locally in CI workflows to avoid "Cannot find module" errors:
  1. `cd e2e-tests`
  2. `npm install`
  3. `npx playwright install chromium`
  4. `npx playwright test`

- **GitHub Actions Logs**: Never use `gh run view --log` (hangs in interactive mode); use `gh run view [run-id] --log-failed` or append `| cat`

- **ACT Local Testing**: Use `act --container-architecture linux/amd64` and stop Docker containers first to avoid port conflicts

### User Experience Fixes
- **Onboarding Flow**: Fixed critical issue where users got stuck on "Request Submitted!" screen when admin rejected join requests
- **Family Context**: Implemented proper state management with periodic refresh to detect status changes
- **WebSocket Notifications**: Fixed family-updated notifications and FamilyContext currentFamily refresh

---

## 📚 Project Documentation

### Project Overview
**Family Board** is a minimalistic family task planner application built with modern web technologies, featuring a clean design with purple accents (#7c3aed) and Deliveroo-inspired UI.

#### Tech Stack
- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Vitest
- **E2E Testing**: Playwright (Chromium only)
- **Containerization**: Docker + Docker Compose
- **Database Admin**: Adminer
- **CI/CD**: GitHub Actions
- **Internationalization**: i18next (English & French)

#### Quick Start
1. Clone repository
2. Run `chmod +x scripts/setup.sh && npm run setup`
3. Start with `npm run dev`
4. Access at http://localhost:3000

### Database Workflow
The project uses a safe database workflow to prevent data loss during development:

#### Safe Commands
- `npm run db:safe-push` - Apply schema changes with automatic backup and reseed
- `npm run db:export` - Export current database state
- `npm run db:reset` - Reset database with seed data

#### Critical Rules
- ✅ Always use `npm run db:safe-push` for schema changes
- ✅ Export data before any manual database operations
- ❌ Never use `prisma db push` alone without reseeding
- ❌ Don't use `--force-reset` without backing up data

### Week Schedule Implementation
The project features an advanced week schedule system using a "virtual schedule with override pattern":

#### Architecture Benefits
- **Storage Efficiency**: ~95% reduction in database records
- **Template Updates**: Automatic propagation to all weeks using templates
- **Flexibility**: Support for ADD, REMOVE, REASSIGN, MODIFY_TIME operations
- **Performance**: Fast queries with minimal database joins
- **Audit Trail**: Clear history of changes with source tracking

#### Core Models
- `WeekOverride`: Stores week-specific overrides and customizations
- `TaskOverride`: Stores specific task assignment overrides with actions
- `TaskOverrideAction`: Enum for ADD, REMOVE, REASSIGN, MODIFY_TIME

#### API Endpoints
- `GET /api/families/:familyId/week-schedule` - Get resolved week schedule
- `POST /api/families/:familyId/week-schedule/override` - Apply overrides (admin only)
- `DELETE /api/families/:familyId/week-schedule/override` - Remove overrides (admin only)

### Component Cleanup Status
Recent audit identified unused components that can be safely removed:

#### Unused Components (Safe to Remove)
- `FamilyManagement.tsx` - Functionality integrated into `UserProfile.tsx`
- `NotificationCenter.tsx` - Functionality integrated into `UserMenu.tsx`

#### Benefits of Cleanup
- Reduces bundle size by ~30KB
- Eliminates maintenance overhead
- Improves code clarity and navigation
- No breaking changes (components not used in application)

### Testing Strategy
- **Unit Tests**: Backend (70+ tests) and Frontend (41+ tests)
- **E2E Tests**: Comprehensive family management scenarios (12 tests)
- **CI/CD**: GitHub Actions with parallel execution and comprehensive coverage
- **Local Testing**: ACT integration for workflow validation

### Development Commands
- `npm run dev` - Start all services in development mode
- `npm run test:all` - Run all tests (unit + E2E)
- `npm run test:ci` - Validate GitHub Actions workflow locally
- `npm run down` - Stop all services
- `npm run clean` - Clean up Docker resources

### Environment Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database Admin (Adminer): http://localhost:8080
- API Health Check: http://localhost:3001/health

---

## 🎯 Current Project Status

### Completed Features
- ✅ User authentication and authorization
- ✅ Family management with role-based access control
- ✅ Task and template management systems
- ✅ Week schedule system with override pattern
- ✅ Comprehensive testing suite (Unit + E2E)
- ✅ UX standardization (CustomSelect components)
- ✅ WebSocket real-time notifications
- ✅ Internationalization (English/French)

### Integration Points
- Family membership validation
- Task template system
- Real-time WebSocket notifications
- Role-based access control
- Database audit trails

### Next Steps
1. Frontend integration of week schedule system
2. WebSocket notifications for schedule changes
3. Data migration from TaskAssignment to new system
4. Performance optimization and caching
5. Advanced features (recurring patterns, bulk operations)

---

*This guide serves as a comprehensive reference for any agent working on the Family Board project. It aggregates all rules, memories, and documentation to ensure consistent development practices and project understanding.* 