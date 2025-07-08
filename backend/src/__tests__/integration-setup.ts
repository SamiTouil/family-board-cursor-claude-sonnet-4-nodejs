import { initI18n } from '../config/i18n';
import { prisma } from '../lib/prisma';

let isDatabaseAvailable = false;

beforeAll(async () => {
  // Set test environment variables
  process.env['JWT_SECRET'] = 'test-jwt-secret-for-integration-tests';
  process.env['NODE_ENV'] = 'test';

  // Initialize i18n for all tests
  await initI18n();

  // Check if we should skip integration tests
  if (process.env['SKIP_INTEGRATION_TESTS'] === 'true') {
    console.warn('⚠️  Integration tests are being skipped (SKIP_INTEGRATION_TESTS=true)');
    isDatabaseAvailable = false;
    return;
  }

  // Try to connect to database, but don't fail if it's not available
  try {
    await prisma.$connect();
    isDatabaseAvailable = true;
    console.log('✅ Test database connected successfully');
  } catch (error) {
    console.warn('⚠️  Database not available for integration tests. Tests will be skipped.');
    console.warn('To run integration tests, start PostgreSQL with: docker-compose up postgres -d');
    isDatabaseAvailable = false;
  }
});

beforeEach(async () => {
  // Clean database before each test, but only if database is available
  if (isDatabaseAvailable) {
    await cleanDatabase();
  }
});

afterAll(async () => {
  // Final cleanup and disconnect, but only if database is available
  if (isDatabaseAvailable) {
    await cleanDatabase();
    await prisma.$disconnect();
  }
});

async function cleanDatabase() {
  // Delete in correct order to respect foreign key constraints
  const tablenames = [
    'task_overrides',
    'week_overrides',
    'week_template_days',
    'week_templates',
    'day_template_items',
    'day_templates',
    'tasks',
    'family_join_requests',
    'family_invites',
    'family_members',
    'families',
    'users',
  ];
  
  for (const tablename of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
    } catch (error) {
      console.warn(`Failed to truncate ${tablename}:`, error);
    }
  }
}

// Global test counter to ensure unique emails across all test files
let globalTestCounter = 0;

export const getUniqueTestEmail = (): string => {
  return `test.user.${++globalTestCounter}.${Date.now()}@example.com`;
};

export const getMockUser = () => ({
  firstName: 'John',
  lastName: 'Doe',
  email: getUniqueTestEmail(),
  password: 'Password123!',
});

// Helper function to check if database is available for tests
export const isDatabaseAvailableForTests = () => isDatabaseAvailable;

// Helper function to skip tests when database is not available
export const skipIfNoDatabaseAvailable = () => {
  if (!isDatabaseAvailable) {
    console.log('⏭️  Skipping test - database not available');
    return true;
  }
  return false;
};

// Helper function to conditionally run integration tests
export const itWithDatabase = (name: string, fn: () => Promise<void>) => {
  it(name, async () => {
    if (skipIfNoDatabaseAvailable()) return;
    await fn();
  });
};

// Helper function to conditionally run describe blocks
export const describeWithDatabase = (name: string, fn: () => void) => {
  describe(name, () => {
    beforeAll(() => {
      if (!isDatabaseAvailable) {
        console.log(`⏭️  Skipping "${name}" tests - database not available`);
      }
    });

    if (isDatabaseAvailable) {
      fn();
    } else {
      it('should skip all tests when database is not available', () => {
        console.log('⏭️  Database not available - tests skipped');
      });
    }
  });
};