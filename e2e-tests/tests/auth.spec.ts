import { test, expect } from '@playwright/test';

// Test data
const validUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: `test-${Date.now()}@example.com`,
  password: 'password123',
};

test.describe('Authentication & Family Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/');
  });

  test.describe('Initial State & Form Switching', () => {
    test('should show login form by default', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign up here' })).toBeVisible();
    });

    test('should switch from login to signup', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
    });

    test('should switch from signup back to login', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByRole('button', { name: 'Login here' }).click();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty login fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();
    });

    test('should show validation errors for empty signup fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      await expect(page.getByText('First name is required')).toBeVisible();
      await expect(page.getByText('Last name is required')).toBeVisible();
      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Test');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('differentpassword');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });
  });

  test.describe('Authentication Success Flow', () => {
    test('should successfully register a new user and show family onboarding', async ({ page }) => {
      const timestamp = Date.now();
      const email = `success-${timestamp}@example.com`;
      
      // Switch to signup form first
      await page.getByRole('button', { name: 'Sign up here' }).click();
      
      // Fill signup form
      await page.getByLabel('First Name').fill('Test');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      // Debug: Take a screenshot to see what's actually happening
      await page.screenshot({ path: 'debug-after-signup.png', fullPage: true });
      
      // Debug: Log the current URL and page content
      console.log('Current URL after signup:', page.url());
      const pageContent = await page.textContent('body');
      console.log('Page content:', pageContent?.substring(0, 500));

      // Should be redirected to family onboarding
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Create New Family')).toBeVisible();
      await expect(page.getByText('Join Existing Family')).toBeVisible();
    });

    test('should successfully login with existing user and show family onboarding', async ({ page }) => {
      const timestamp = Date.now() + Math.random(); // Add randomness to avoid duplicates
      const email = `login-${timestamp}@example.com`;
      
      // First register a user
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Login');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Wait a bit for the response to be processed
      await page.waitForTimeout(3000);
      
      // Wait for family onboarding to appear
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 15000 });
      
      // Create family to get to dashboard so we can logout
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();
      
      // Should be at dashboard
      await expect(page.getByRole('heading', { name: 'Login User' })).toBeVisible({ timeout: 10000 });
      
      // Logout (click user avatar first, then logout)
      await page.locator('.user-menu-avatar').click();
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Wait for logout to complete
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible({ timeout: 10000 });
      
      // Now login with the same credentials
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password').fill('password123');
      
      await page.getByRole('button', { name: 'Login' }).click();
      
      // Wait a bit for the response to be processed
      await page.waitForTimeout(3000);
      
      // Should be redirected to dashboard since user already has a family
      await expect(page.getByRole('heading', { name: 'Login User' })).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.user-summary-card-family-name')).toContainText('Test Family');
    });

    test('should persist authentication and show family onboarding across page reloads', async ({ page }) => {
      const timestamp = Date.now();
      const email = `persist-test-${timestamp}@example.com`;
      
      // Register and login
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Persist');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Should be at family onboarding
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible();
      
      // Reload the page
      await page.reload();
      
      // Should still be at family onboarding (authenticated)
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible();
    });
  });

  test.describe('Authentication Error Handling', () => {
    test('should show error for invalid login credentials', async ({ page }) => {
      await page.getByLabel('Email Address').fill('invalid@example.com');
      await page.getByLabel('Password', { exact: true }).fill('wrongpassword');
      await page.getByRole('button', { name: 'Login' }).click();
      
      // Should show error message
      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });

    test('should show error for duplicate email during signup', async ({ page }) => {
      const timestamp = Date.now();
      const email = `duplicate-${timestamp}@example.com`;
      
      // Create first user
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('First');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Should be at family onboarding
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible();
      
      // Create family to get to dashboard, then logout
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();
      
      // Should be at dashboard
      await expect(page.getByRole('heading', { name: 'First User' })).toBeVisible({ timeout: 10000 });
      
      // Logout
      await page.locator('.user-menu-avatar').click();
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Try to create another user with same email
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Second');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Should show error
      await expect(page.getByText('An account with this email already exists')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/auth/login', route => route.abort());
      
      await page.getByLabel('Email Address').fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByRole('button', { name: 'Login' }).click();
      
      // Should show network error
      await expect(page.getByText('Network error. Please try again.')).toBeVisible();
    });
  });

  test.describe('Family Onboarding Flow', () => {
    test('should show family onboarding after authentication', async ({ page }) => {
      const timestamp = Date.now();
      const email = `onboarding-${timestamp}@example.com`;
      
      // Register new user
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Onboarding');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Should show family onboarding
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible();
      await expect(page.getByText('To get started, you need to either create a new family or join an existing one.')).toBeVisible();
      await expect(page.getByText('Create New Family')).toBeVisible();
      await expect(page.getByText('Join Existing Family')).toBeVisible();
    });

    test('should allow creating a family and access dashboard', async ({ page }) => {
      const timestamp = Date.now();
      const email = `family-${timestamp}@example.com`;
      
      // Register and get to family onboarding
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Family');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Create family
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Test Family');
      await page.getByLabel('Description (Optional)').fill('A test family for E2E testing');
      await page.getByRole('button', { name: 'Create Family' }).click();
      
      // Should now access dashboard - check for UserSummaryCard elements
      await page.waitForTimeout(2000);
      await expect(page.getByRole('heading', { name: 'Family User' })).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.user-summary-card-family-name')).toContainText('Test Family');
    });

    test('should not access dashboard without completing family onboarding', async ({ page }) => {
      const timestamp = Date.now();
      const email = `no-family-${timestamp}@example.com`;
      
      // Register but don't create/join family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('No');
      await page.getByLabel('Last Name').fill('Family');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Should be stuck at family onboarding
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible();
      
      // Try to access dashboard directly (this would be through routing if we had proper routing)
      // For now, just verify we're still at onboarding
      await page.reload();
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible();
    });
  });

  test.describe('Dashboard and Logout', () => {
    test.beforeEach(async ({ page }) => {
      const timestamp = Date.now();
      const email = `dashboard-${timestamp}@example.com`;
      
      // Register and create family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Dashboard');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Create family
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Dashboard Family');
      await page.getByRole('button', { name: 'Create Family' }).click();
      
      // Wait for dashboard to load
      await page.waitForTimeout(2000);
    });

    test('should display user information in dashboard', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Dashboard User' })).toBeVisible();
      await expect(page.locator('.user-summary-card-email')).toBeVisible();
      await expect(page.locator('.user-summary-card-family-name')).toContainText('Dashboard Family');
    });

    test('should display family name in dashboard title', async ({ page }) => {
      // Check that the document title is updated
      await expect(page).toHaveTitle('Dashboard Family Board');
    });

    test('should successfully logout', async ({ page }) => {
      // Click on user avatar to open menu
      await page.locator('.user-menu-avatar').click();
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Should redirect to login page
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    });

    test('should not access dashboard when logged out', async ({ page }) => {
      // Logout first
      await page.locator('.user-menu-avatar').click();
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Wait for logout to complete
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      
      // Try to access dashboard directly (if we had routing)
      await page.goto('/');
      
      // Should be redirected to login
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    });
  });
}); 