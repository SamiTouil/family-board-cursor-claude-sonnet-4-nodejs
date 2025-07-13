# E2E Test Optimization Guide

## Problem
E2E tests were taking 6-7 minutes on GitHub Actions, making the CI pipeline extremely slow.

## Solution
Implemented multiple optimizations to reduce test runtime to under 1 minute.

## Key Optimizations

### 1. Removed `waitForTimeout` Calls
- **Before**: 43 instances of `waitForTimeout` with hardcoded delays (500ms - 2000ms each)
- **After**: Replaced with proper wait conditions:
  - `waitForLoadState('networkidle')` for navigation
  - `waitForLoadState('domcontentloaded')` for form submissions
  - `expect().toBeVisible()` for element visibility

### 2. Increased Parallelization
- **Before**: 1 worker in CI (`workers: 1`)
- **After**: 4 workers in CI with sharding
- Tests now run in 4 parallel shards on GitHub Actions

### 3. Optimized Playwright Configuration
```typescript
// Added performance optimizations:
- actionTimeout: 10000 (reduced from 30s default)
- navigationTimeout: 20000 (reduced from 30s default)  
- globalTimeout: 5 minutes (strict limit)
- retries: 1 (reduced from 2)
- Disabled unnecessary features (screenshots, videos except on failure)
```

### 4. Test Helpers for Common Operations
Created `test-utils.ts` with optimized helpers:
- `quickSetup()` - Fast user/family creation
- `fillForm()` - Batch form filling
- `waitForNetworkIdle()` - Proper network wait
- `navigateAndWaitReady()` - Optimized navigation

### 5. Docker & CI Optimizations
- Docker layer caching
- Healthchecks for service readiness
- Parallel service startup
- Playwright browser caching
- Sharded test execution

### 6. Navigation Pattern Optimization
```typescript
// Before:
await page.getByRole('button', { name: 'Tasks' }).click();
await page.waitForTimeout(2000);

// After:
await Promise.all([
  page.waitForLoadState('networkidle'),
  page.locator('.navigation-item').filter({ hasText: 'Tasks' }).click()
]);
```

## Running Tests

### Locally (Fast Mode)
```bash
cd e2e-tests
./run-tests-fast.sh
```

### CI (GitHub Actions)
Tests automatically run with 4-way sharding on PR/push.

## Results
- **Before**: 6-7 minutes
- **After**: <1 minute (with 4 parallel workers)
- **Performance Gain**: ~85% reduction in test time

## Best Practices Going Forward

1. **Never use `waitForTimeout`** - Always wait for specific conditions
2. **Use Promise.all()** for concurrent operations
3. **Batch operations** when possible (form fills, navigations)
4. **Keep tests independent** to maximize parallelization
5. **Use test fixtures** for common setups

## Monitoring
- Watch GitHub Actions timing
- If tests exceed 2 minutes, investigate immediately
- Use `--trace on` locally to debug slow tests