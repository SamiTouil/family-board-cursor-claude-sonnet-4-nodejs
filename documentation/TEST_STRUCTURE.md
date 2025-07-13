# Test Structure Documentation

## Overview

The backend tests have been reorganized into proper **Unit Tests** and **Integration Tests** to follow testing best practices.

## Test Structure

```
backend/src/__tests__/
├── unit/                    # Unit tests (mocked dependencies)
│   ├── user.service.test.ts
│   ├── family.service.test.ts
│   ├── task.service.test.ts
│   ├── family.routes.test.ts
│   ├── week-template.service.test.ts
│   ├── week-schedule.service.test.ts
│   ├── day-template-application.test.ts
│   ├── day-template.routes.test.ts
│   └── task-override-schema.test.ts
├── integration/             # Integration tests (real database)
│   ├── auth.service.test.ts
│   ├── user.service.test.ts
│   ├── auth.routes.test.ts
│   └── auth.middleware.test.ts
├── unit-setup.ts           # Setup for unit tests
├── integration-setup.ts    # Setup for integration tests
└── setup.ts               # Legacy setup (deprecated)
```

## Unit Tests

**Characteristics:**
- Use mocked dependencies (Prisma, bcrypt, JWT, etc.)
- Fast execution (no database operations)
- Test business logic in isolation
- Run in parallel for speed
- Located in `src/__tests__/unit/`

**Setup:** Uses `unit-setup.ts` which provides:
- Mock data generators
- i18n initialization
- Mock clearing between tests

**Configuration:** `jest.unit.config.js`
- Timeout: 5 seconds
- Parallel execution (50% workers)
- Coverage collection enabled

## Integration Tests

**Characteristics:**
- Use real database connections
- Test full workflows end-to-end
- Slower execution (database operations)
- Run sequentially to avoid conflicts
- Located in `src/__tests__/integration/`

**Setup:** Uses `integration-setup.ts` which provides:
- Real Prisma client
- Database cleanup between tests
- Unique test data generators
- i18n initialization

**Configuration:** `jest.integration.config.js`
- Timeout: 30 seconds
- Sequential execution (maxWorkers: 1)
- Comprehensive database cleanup

## Running Tests

```bash
# Run unit tests (default - fast, no database required)
npm test

# Run only unit tests (same as above)
npm run test:unit

# Run only integration tests (requires database connection)
npm run test:integration

# Run both unit and integration tests (requires database)
npm run test:all

# Watch mode for unit tests
npm run test:watch

# Coverage report for unit tests
npm run test:coverage
```

## Test Categories

### Unit Tests (Mocked)
- **Service Logic:** Business logic with mocked database
- **Route Handlers:** HTTP endpoints with mocked services
- **Schema Validation:** Input validation without dependencies
- **Utility Functions:** Pure functions and helpers

### Integration Tests (Real DB)
- **Authentication Flow:** Login, signup, token refresh
- **Database Operations:** CRUD operations with real data
- **Middleware:** Authentication and authorization
- **End-to-End Routes:** Full request/response cycles

## Best Practices

1. **Unit Tests Should:**
   - Mock all external dependencies
   - Test one unit of functionality
   - Be fast and reliable
   - Focus on business logic

2. **Integration Tests Should:**
   - Use real dependencies
   - Test complete workflows
   - Verify data persistence
   - Test error scenarios

3. **Test Data:**
   - Unit tests use static mock data
   - Integration tests use unique generated data
   - Database is cleaned between integration tests

## Migration Notes

The previous tests were actually integration tests disguised as unit tests because they used real database connections. This reorganization provides:

- **True unit tests** that are fast and isolated
- **Proper integration tests** that verify real functionality
- **Better test organization** with clear separation of concerns
- **Improved CI/CD performance** with parallel unit test execution
