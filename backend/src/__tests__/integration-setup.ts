import { initI18n } from '../config/i18n';
import { prisma } from '../lib/prisma';

beforeAll(async () => {
  // Set test environment variables
  process.env['JWT_SECRET'] = 'test-jwt-secret-for-integration-tests';
  process.env['NODE_ENV'] = 'test';
  
  // Initialize i18n for all tests
  await initI18n();
  
  // Ensure database is clean and connected
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw new Error('Test database is not available. Please ensure PostgreSQL is running.');
  }
});

beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();
});

afterAll(async () => {
  // Final cleanup and disconnect
  await cleanDatabase();
  await prisma.$disconnect();
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