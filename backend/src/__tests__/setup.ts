import { PrismaClient } from '@prisma/client';
import { initI18n } from '../config/i18n';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Initialize i18n for all tests
  await initI18n();
});

beforeEach(async () => {
  // Clean database before each test, but handle connection errors gracefully
  try {
    await prisma.user.deleteMany();
  } catch (error) {
    // If database is not available, skip cleanup (for unit tests with mocks)
    console.warn('Database not available for test cleanup, skipping...');
  }
});

afterAll(async () => {
  // Clean up and disconnect, but handle connection errors gracefully
  try {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  } catch (error) {
    // If database is not available, skip cleanup (for unit tests with mocks)
    console.warn('Database not available for test cleanup, skipping...');
  }
});

// Global test counter to ensure unique emails across all test files
let globalTestCounter = 0;

export const getUniqueTestEmail = (): string => {
  return `test.user.${++globalTestCounter}.${Date.now()}@example.com`;
};

export const getMockUser = () => ({
  firstName: 'John',
  lastName: 'Doe',
  email: getUniqueTestEmail(),
  password: 'password123',
}); 