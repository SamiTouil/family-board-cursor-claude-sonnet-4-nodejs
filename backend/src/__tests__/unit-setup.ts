import { initI18n } from '../config/i18n';

beforeAll(async () => {
  // Initialize i18n for all tests
  await initI18n();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Mock data generators for unit tests
export const getMockUser = () => ({
  id: 'mock-user-id',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'hashedPassword123',
  avatarUrl: null,
  isVirtual: false,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
});

export const getMockUserResponse = () => ({
  id: 'mock-user-id',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  avatarUrl: null,
  isVirtual: false,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
});

export const getMockFamily = () => ({
  id: 'mock-family-id',
  name: 'Test Family',
  description: 'A test family',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
});

export const getMockTask = () => ({
  id: 'mock-task-id',
  title: 'Test Task',
  description: 'A test task',
  isCompleted: false,
  assignedToId: 'mock-user-id',
  familyId: 'mock-family-id',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
});

// JWT token for testing
export const getMockJwtToken = () => 'mock.jwt.token';
