import { initI18n } from '../config/i18n';

beforeAll(async () => {
  // Set test environment variables
  process.env['JWT_SECRET'] = 'test-jwt-secret-for-unit-tests';
  process.env['NODE_ENV'] = 'test';
  
  // Initialize i18n for all tests
  await initI18n();
});

// Reset all mocks between tests
afterEach(() => {
  jest.clearAllMocks();
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
  password: 'Password123!',
});