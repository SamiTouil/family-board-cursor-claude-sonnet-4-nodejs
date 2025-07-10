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
    // Clean in order to respect foreign key constraints
    await prisma.taskOverride.deleteMany();
    await prisma.weekOverride.deleteMany();
    await prisma.weekTemplateDay.deleteMany();
    await prisma.weekTemplate.deleteMany();
    await prisma.dayTemplateItem.deleteMany();
    await prisma.dayTemplate.deleteMany();
    await prisma.task.deleteMany();
    await prisma.familyJoinRequest.deleteMany();
    await prisma.familyInvite.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Database cleanup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  // Clean up and disconnect
  try {
    // Clean in order to respect foreign key constraints
    await prisma.taskOverride.deleteMany();
    await prisma.weekOverride.deleteMany();
    await prisma.weekTemplateDay.deleteMany();
    await prisma.weekTemplate.deleteMany();
    await prisma.dayTemplateItem.deleteMany();
    await prisma.dayTemplate.deleteMany();
    await prisma.task.deleteMany();
    await prisma.familyJoinRequest.deleteMany();
    await prisma.familyInvite.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  } catch (error) {
    console.error('Database cleanup failed:', error);
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
