module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/unit/',
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/unit-setup.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/prisma/seed.ts',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration-setup.ts'],
  testTimeout: 10000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  passWithNoTests: true, // Allow tests to pass even if they're skipped
};