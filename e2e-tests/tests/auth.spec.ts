import { test, expect } from '@playwright/test';

// Test data
const validUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: `test-${Date.now()}@example.com`,
  password: 'password123',
};

const existingUser = {
  email: 'existing@example.com',
  password: 'password123',
};

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/');
  });

  test.describe('Initial State', () => {
    test('should show login form by default', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign up here' })).toBeVisible();
    });

    test('should show app title and branding', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Family Board' })).toBeVisible();
      await expect(page.getByText('Sign in to your account').first()).toBeVisible();
    });

    test('should have correct page title', async ({ page }) => {
      await expect(page).toHaveTitle('Family Board');
    });
  });

  test.describe('Form Switching', () => {
    test('should switch from login to signup', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
    });

    test('should switch from signup back to login', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByRole('button', { name: 'Already have an account? Login here' }).click();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    });
  });

  test.describe('Login Form Validation', () => {
    test('should show validation errors for empty fields', async ({ page }) => {
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
      
      await page.getByLabel('First Name').fill('John');
      await page.getByLabel('Last Name').fill('Doe');
      await page.getByLabel('Email Address').fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password456');
      
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.getByLabel('Email Address').fill('invalid-email');
      await page.getByRole('button', { name: 'Login' }).click();
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('should clear validation errors when user starts typing', async ({ page }) => {
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Email is required')).toBeVisible();
      
      await page.getByLabel('Email Address').fill('test@example.com');
      await expect(page.getByText('Email is required')).not.toBeVisible();
    });

    test('should disable form during submission', async ({ page }) => {
      await page.getByLabel('Email Address').fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      
      const loginButton = page.getByRole('button', { name: 'Login' });
      await loginButton.click();
      
      // Button should be disabled during submission
      await expect(loginButton).toBeDisabled();
    });
  });

  test.describe('Signup Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      await expect(page.getByText('First name is required')).toBeVisible();
      await expect(page.getByText('Last name is required')).toBeVisible();
      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();
    });

    test('should show validation error for short password', async ({ page }) => {
      await page.getByLabel('Password', { exact: true }).fill('123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.getByLabel('Email Address').fill('invalid-email');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('should have proper form layout on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByLabel('First Name')).toBeVisible();
      await expect(page.getByLabel('Last Name')).toBeVisible();
    });
  });

  test.describe('Authentication Success Flow', () => {
    test('should successfully register a new user and show family onboarding', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      
      await page.getByLabel('First Name').fill(validUser.firstName);
      await page.getByLabel('Last Name').fill(validUser.lastName);
      await page.getByLabel('Email Address').fill(validUser.email);
      await page.getByLabel('Password', { exact: true }).fill(validUser.password);
      await page.getByLabel('Confirm Password').fill(validUser.password);
      
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Wait for navigation and check for family onboarding (NOT dashboard)
      await page.waitForTimeout(2000);
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Create New Family')).toBeVisible();
      await expect(page.getByText('Join Existing Family')).toBeVisible();
      
      // Should NOT see dashboard elements
      await expect(page.locator('.dashboard-welcome')).not.toBeVisible();
    });

    test('should successfully login with existing user and show family onboarding', async ({ page }) => {
      const testEmail = `login-test-${Date.now()}@example.com`;
      
      // First create a user
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Jane');
      await page.getByLabel('Last Name').fill('Smith');
      await page.getByLabel('Email Address').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Wait for signup to complete and verify family onboarding
      await page.waitForTimeout(2000);
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      
      // Logout
      await page.getByRole('button', { name: 'Back' }).click(); // Go back to choice screen
      await page.getByRole('button', { name: 'Back' }).click(); // Go back to auth (this should logout)
      
      // Now login
      await page.getByLabel('Email Address').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByRole('button', { name: 'Login' }).click();
      
      // Wait for login and check for family onboarding (NOT dashboard)
      await page.waitForTimeout(2000);
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    });

    test('should persist authentication and show family onboarding across page reloads', async ({ page }) => {
      // Register and login
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Persistent');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(`persistent-${Date.now()}@example.com`);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Wait for signup to complete
      await page.waitForTimeout(2000);
      
      // Reload page
      await page.reload();
      
      // Should still be authenticated and show family onboarding
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Authentication Error Handling', () => {
    test('should show error for invalid login credentials', async ({ page }) => {
      await page.getByLabel('Email Address').fill('nonexistent@example.com');
      await page.getByLabel('Password', { exact: true }).fill('wrongpassword');
      await page.getByRole('button', { name: 'Login' }).click();
      
      // Wait for API response and check for error
      await page.waitForTimeout(1000);
      await expect(page.locator('.auth-form-error').filter({ hasText: 'Invalid email or password' })).toBeVisible({ timeout: 5000 });
    });

    test('should show error for duplicate email during signup', async ({ page }) => {
      // First create a user
      await page.getByRole('button', { name: 'Sign up here' }).click();
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;
      
      await page.getByLabel('First Name').fill('First');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(duplicateEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Wait for signup to complete and verify family onboarding
      await page.waitForTimeout(2000);
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      
      // Go back to auth (logout)
      await page.getByRole('button', { name: 'Back' }).click();
      await page.getByRole('button', { name: 'Back' }).click();
      
      // Try to create another user with same email
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Second');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(duplicateEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Wait for API response and check for error
      await page.waitForTimeout(1000);
      await expect(page.locator('.auth-form-error').filter({ hasText: 'An account with this email already exists' })).toBeVisible({ timeout: 5000 });
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/auth/login', (route) => {
        route.abort('failed');
      });
      
      await page.getByLabel('Email Address').fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByRole('button', { name: 'Login' }).click();
      
      await expect(page.locator('.auth-form-error').filter({ hasText: 'Network error. Please try again.' })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Family Onboarding Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Create and login a user for family onboarding tests
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Family');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(`family-${Date.now()}@example.com`);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Wait for signup to complete and verify family onboarding
      await page.waitForTimeout(2000);
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    });

    test('should show family onboarding after authentication', async ({ page }) => {
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible();
      await expect(page.getByText('Create New Family')).toBeVisible();
      await expect(page.getByText('Join Existing Family')).toBeVisible();
    });

    test('should allow creating a family and access dashboard', async ({ page }) => {
      // Click create family
      await page.getByText('Create New Family').click();
      
      // Fill family creation form
      await page.getByLabel('Family Name').fill('Test Family');
      await page.getByLabel('Description (Optional)').fill('A test family for E2E testing');
      await page.getByRole('button', { name: 'Create Family' }).click();
      
      // Should now access dashboard
      await page.waitForTimeout(2000);
      await expect(page.locator('.dashboard-welcome').filter({ hasText: 'Welcome back, Family!' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Family User')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    });

    test('should not access dashboard without completing family onboarding', async ({ page }) => {
      // Try to access dashboard directly (if we had routing)
      await page.goto('/');
      
      // Should show family onboarding, not dashboard
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible();
      await expect(page.locator('.dashboard-welcome')).not.toBeVisible();
    });
  });

  test.describe('Dashboard and Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Create and login a user, then create a family for dashboard tests
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Dashboard');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(`dashboard-${Date.now()}@example.com`);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Wait for signup and complete family onboarding
      await page.waitForTimeout(2000);
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      
      // Create a family to access dashboard
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Dashboard Family');
      await page.getByRole('button', { name: 'Create Family' }).click();
      
      // Wait for dashboard to load
      await page.waitForTimeout(2000);
    });

    test('should display user information in dashboard', async ({ page }) => {
      await expect(page.getByText('Dashboard User')).toBeVisible();
      await expect(page.getByText(/dashboard-.*@example\.com/)).toBeVisible();
      await expect(page.locator('.dashboard-welcome').filter({ hasText: 'Welcome back, Dashboard!' })).toBeVisible();
    });

    test('should successfully logout', async ({ page }) => {
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Should redirect to login page
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    });

    test('should not access dashboard when logged out', async ({ page }) => {
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Try to access dashboard directly (if we had routing)
      await page.goto('/');
      
      // Should show auth page, not dashboard
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      // Check login form
      await expect(page.getByLabel('Email Address')).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      
      // Check signup form
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await expect(page.getByLabel('First Name')).toBeVisible();
      await expect(page.getByLabel('Last Name')).toBeVisible();
      await expect(page.getByLabel('Email Address')).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Confirm Password')).toBeVisible();
    });

    test('should show error messages with proper ARIA attributes', async ({ page }) => {
      await page.getByRole('button', { name: 'Login' }).click();
      
      const emailError = page.getByText('Email is required');
      const passwordError = page.getByText('Password is required');
      
      await expect(emailError).toHaveAttribute('role', 'alert');
      await expect(passwordError).toHaveAttribute('role', 'alert');
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Focus on the first input explicitly
      await page.getByLabel('Email Address').focus();
      await expect(page.getByLabel('Email Address')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Password field
      await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
      
      await page.keyboard.press('Tab'); // Login button
      await expect(page.getByRole('button', { name: 'Login' })).toBeFocused();
      
      await page.keyboard.press('Tab'); // Sign up link
      await expect(page.getByRole('button', { name: 'Sign up here' })).toBeFocused();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await expect(page.getByRole('heading', { name: 'Family Board' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      
      // Check form responsiveness
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await expect(page.getByLabel('First Name')).toBeVisible();
      await expect(page.getByLabel('Last Name')).toBeVisible();
    });

    test('should work correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      
      await expect(page.getByRole('heading', { name: 'Family Board' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      
      // Check signup form layout
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await expect(page.getByLabel('First Name')).toBeVisible();
      await expect(page.getByLabel('Last Name')).toBeVisible();
    });
  });
}); 