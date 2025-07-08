# Claude Opus 4 Project Context for Family Board

This document contains all the memories, rules, and learnings accumulated during the development of the Family Board application. This context is essential for maintaining consistency and quality when working on this project.

## Project Overview

Family Board is a comprehensive family task and schedule management application with:
- Web frontend (React + TypeScript + Vite)
- Backend API (Node.js + Express + Prisma + PostgreSQL)
- Mobile app (React Native + Expo)
- Real-time updates via WebSockets
- Docker containerization
- CI/CD pipeline with GitHub Actions

## Critical Development Rules

### 1. Environment Management: Local Speed, Docker Truth
- Run and test code locally for quick feedback during initial experiments and UI development
- **ALWAYS verify** that all code runs correctly within the project's Docker container before considering it stable
- Use `docker compose` (not `docker-compose`) as it is more reliable
- Before any commit, test thoroughly in Docker environment
- Regularly switch to Docker for validation to catch environment-specific issues early

### 2. Version Control & Git Workflow: User Command, AI Assistance
- **CRITICAL: ALWAYS obtain explicit user confirmation BEFORE executing any `git commit` or `git push` command**
- Only push code changes via Pull Requests (PRs) from feature branches
- **NEVER commit or push directly to `main`, `develop`, or protected branches**
- Proactively assist by:
  - Staging relevant changes for commits
  - Suggesting clear commit messages
  - Helping draft PR descriptions
- Always perform complete cleanup after PR merge:
  1. Ensure on main and pull latest: `git pull origin main`
  2. Delete local feature branch: `git branch -d [branch-name]`
  3. Delete remote feature branch: `git push origin --delete [branch-name]`
  4. Create new feature branch for next work
  5. Never develop on main branch

### 3. Testing Strategy
- Write meaningful tests covering critical paths and core business logic
- Ensure **100% test pass rate** before considering PR merge
- Run all tests locally before creating PR:
  - Backend: `cd backend && npm test`
  - Frontend: `cd frontend && npm test`
  - Linting: `npm run lint` in both directories
  - Build validation: `npm run build` in both directories
- Use ACT for local CI testing when possible: `act --container-architecture linux/amd64`
- Stop Docker containers first to avoid port conflicts
- Backend unit tests may fail locally on M1 Macs due to Prisma architecture (works fine in GitHub Actions)

### 4. Database Management
- During experimental phases, direct schema modifications allowed with explicit user permission
- Once data model stabilizes, **ALWAYS use Prisma migrations**:
  - Development: `npx prisma migrate dev`
  - Production: `npx prisma migrate deploy`
- **NEVER use `npx prisma db push` in production** - it can cause data loss
- Never create or apply migrations autonomously - always present for review

### 5. AI Interaction & Code Quality
- Always use non-interactive flags in commands (`-y`, `--force`, `--assume-yes`, etc.)
- Strive for minimal, clear, efficient code
- Maintain excellent code hygiene:
  - Remove unused variables, functions, imports
  - Flag dead code blocks
  - Clean up experimental code
- Never use `gh run view --log` (opens interactive mode) - use `--log-failed` or pipe to `cat`

## Key Technical Implementations

### 1. Week Schedule System (Virtual Schedule with Override Pattern)
- Reduces database storage by ~95% compared to individual TaskAssignment records
- Components:
  - WeekOverride and TaskOverride models in Prisma
  - TaskOverrideAction enum (ADD, REMOVE, REASSIGN, MODIFY_TIME)
  - WeekScheduleService for virtual schedule resolution
  - Merges templates with overrides on-demand
- Coexists with existing TaskAssignment system for gradual migration

### 2. Mobile App Architecture
- Complete authentication with AuthContext and AsyncStorage
- Family onboarding flow with FamilyContext
- React Navigation with conditional routing
- Gradient background matching web app (#667eea to #764ba2)
- Custom SVG components using react-native-svg
- API integration with production backend (https://mabt.eu)
- Cross-platform using expo-linear-gradient
- TypeScript throughout

### 3. UI/UX Standardization
- Unified Button component with 8 variants and 3 sizes
- Consistent modal design with blue gradient headers
- Standardized page widths (1452px max-width)
- Header alignment with content edges
- WeeklyCalendar with orange "• modified" indicator
- CustomSelect component for all dropdowns
- Task icons with flexbox layout
- Avatar grid for member selection in modals

### 4. Testing Infrastructure
- Comprehensive unit tests for all services and routes
- E2E tests with Playwright covering critical workflows
- WebSocket testing for real-time features
- Proper test isolation and cleanup
- Mock implementations for external dependencies

## Project-Specific Learnings

### Authentication & Navigation
- Users with existing families redirect to dashboard, not onboarding
- Add `waitForTimeout(3000)` after auth operations in E2E tests for React state updates
- User avatars only exist on dashboard, not onboarding pages

### E2E Testing Best Practices
- Install dependencies locally in CI: `cd e2e-tests && npm install`
- Use network response listeners to verify API calls
- Log page content and URL for debugging
- Check for console errors
- Verify element availability before interactions

### WebSocket & Real-time Updates
- Family-updated notifications refresh FamilyContext
- 30-second periodic refresh for join request status changes
- Task-schedule-updated events trigger shift info refresh

### Mobile Development
- Bottom tab navigation with 4 main tabs matching web structure
- Day-focused navigation (1 day on phone, 3 on tablet)
- Touch-optimized controls and visual indicators
- Placeholder alerts for admin controls
- Loading states and error handling throughout

### Deployment & CI/CD
- GitHub Actions CD workflow for automatic deployment
- Production Docker Compose with health checks
- Multi-stage frontend Dockerfile with Nginx
- Reverse proxy with rate limiting
- Comprehensive health check endpoint
- EC2 deployment script for AWS Free Tier

## Common Pitfalls to Avoid

1. **Never create files unless absolutely necessary** - prefer editing existing files
2. **Never proactively create documentation** unless explicitly requested
3. **Don't add testing tasks** unless asked - avoid overfocusing on testing
4. **Always escape regex special characters** in grep searches
5. **Use search_replace for files > 2500 lines**, edit_file otherwise
6. **Never loop more than 3 times** fixing linter errors - ask for help
7. **Always cite memories** when using them: [[memory:MEMORY_ID]]

## Git Workflow Checklist

Before creating any PR:
- [ ] Run backend tests: `cd backend && npm test`
- [ ] Run frontend tests: `cd frontend && npm test`
- [ ] Run backend linting: `cd backend && npm run lint`
- [ ] Run frontend linting: `cd frontend && npm run lint`
- [ ] Validate backend build: `cd backend && npm run build`
- [ ] Validate frontend build: `cd frontend && npm run build`
- [ ] Test in Docker environment
- [ ] Get user approval for git operations

After PR merge:
- [ ] Pull latest from main
- [ ] Delete local feature branch
- [ ] Delete remote feature branch
- [ ] Create new feature branch for next work

## Memory Management

- Update memories immediately when user corrects something
- Delete memories rather than update when user contradicts
- Never create memories for implementation plans or task-specific info
- Always cite memories in responses using [[memory:ID]] format

## Key Technical Decisions

1. **Virtual Schedule Pattern**: Chosen for efficiency and flexibility
2. **Modal-based Forms**: Consistent UX across all management interfaces
3. **Docker Compose**: Reliable containerization for development and production
4. **TypeScript**: Type safety throughout the stack
5. **Prisma**: Type-safe database access with migrations
6. **React Native with Expo**: Cross-platform mobile development
7. **GitHub Actions**: Automated CI/CD pipeline

## Production Considerations

- Database migrations required for all schema changes
- Health checks validate database connectivity
- Rate limiting on reverse proxy
- Security headers configured
- Automatic deployment on PR merge to main
- Rollback capabilities built into deployment

This context represents the accumulated knowledge from developing the Family Board application. Following these guidelines ensures consistency, quality, and maintainability of the codebase. 