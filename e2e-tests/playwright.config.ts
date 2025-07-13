import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined, // Increase workers in CI
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Reduce timeout for faster failures
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },
  
  // Global timeout for the whole test run (5 minutes)
  globalTimeout: 5 * 60 * 1000,
  
  // Timeout for each test (30 seconds instead of default 30s)
  timeout: 30000,

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Speed up animations
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
        },
      },
    },
  ],

  // Use test fixtures for shared setup
  use: {
    // Disable animations for faster tests
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});