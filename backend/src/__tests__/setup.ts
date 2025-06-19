import { PrismaClient } from '@prisma/client';
import { initI18n } from '../config/i18n';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Initialize i18n for all tests
  await initI18n();
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.user.deleteMany();
});

afterAll(async () => {
  // Clean up and disconnect
  await prisma.user.deleteMany();
  await prisma.$disconnect();
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