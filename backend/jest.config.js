// Default config that runs ALL tests sequentially
// For parallel execution, use npm run test:unit and npm run test:integration separately
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/unit-setup.ts',
    '<rootDir>/src/__tests__/integration-setup.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Run tests sequentially to avoid conflicts
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/prisma/seed.ts',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
}; 