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
      await expect(page.getByText("Don't have an account?")).toBeVisible();
    });

    test('should show app title and branding', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Family Board' })).toBeVisible();
      await expect(page.getByText('Sign in to your account')).toBeVisible();
    });

    test('should have correct page title', async ({ page }) => {
      await expect(page).toHaveTitle(/Family Board/);
    });
  });

  test.describe('Form Switching', () => {
    test('should switch from login to signup', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
      await expect(page.getByText('Already have an account?')).toBeVisible();
    });

    test('should switch from signup back to login', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByRole('button', { name: 'Sign in here' }).click();
      
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

    test('should show validation error for invalid email', async ({ page }) => {
      await page.getByLabel('Email Address').fill('invalid-email');
      await page.getByRole('button', { name: 'Login' }).click();
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('should clear validation errors when user starts typing', async ({ page }) => {
      // Trigger validation errors
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Email is required')).toBeVisible();
      
      // Start typing and check error clears
      await page.getByLabel('Email Address').fill('test@example.com');
      await expect(page.getByText('Email is required')).not.toBeVisible();
    });

    test('should disable form during submission', async ({ page }) => {
      await page.getByLabel('Email Address').fill('test@example.com');
      await page.getByLabel('Password').fill('password123');
      
      // Mock slow network to test loading state
      await page.route('**/api/auth/login', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });
      
      await page.getByRole('button', { name: 'Login' }).click();
      
      // Check loading state
      await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible();
      await expect(page.getByLabel('Email Address')).toBeDisabled();
      await expect(page.getByLabel('Password')).toBeDisabled();
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
      await page.getByLabel('Password').fill('123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.getByLabel('Email Address').fill('invalid-email');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('should have proper form layout on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      
      // Check that first name and last name stack vertically on mobile
      const firstNameField = page.getByLabel('First Name');
      const lastNameField = page.getByLabel('Last Name');
      
      const firstNameBox = await firstNameField.boundingBox();
      const lastNameBox = await lastNameField.boundingBox();
      
      // On mobile, last name should be below first name
      expect(lastNameBox!.y).toBeGreaterThan(firstNameBox!.y + firstNameBox!.height);
    });
  });

  test.describe('Authentication Success Flow', () => {
    test('should successfully register a new user', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign up here' }).click();
      
      await page.getByLabel('First Name').fill(validUser.firstName);
      await page.getByLabel('Last Name').fill(validUser.lastName);
      await page.getByLabel('Email Address').fill(validUser.email);
      await page.getByLabel('Password').fill(validUser.password);
      
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Should redirect to dashboard
      await expect(page.getByText(`Welcome back, ${validUser.firstName}!`)).toBeVisible();
      await expect(page.getByText(`${validUser.firstName} ${validUser.lastName}`)).toBeVisible();
      await expect(page.getByText(validUser.email)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    });

    test('should successfully login with existing user', async ({ page }) => {
      // First create a user
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Jane');
      await page.getByLabel('Last Name').fill('Smith');
      await page.getByLabel('Email Address').fill(`login-test-${Date.now()}@example.com`);
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Logout
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Now login
      await page.getByLabel('Email Address').fill(`login-test-${Date.now()}@example.com`);
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Login' }).click();
      
      // Should be back in dashboard
      await expect(page.getByText('Welcome back, Jane!')).toBeVisible();
    });

    test('should persist authentication across page reloads', async ({ page }) => {
      // Register and login
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Persistent');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(`persistent-${Date.now()}@example.com`);
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Reload page
      await page.reload();
      
      // Should still be authenticated
      await expect(page.getByText('Welcome back, Persistent!')).toBeVisible();
    });
  });

  test.describe('Authentication Error Handling', () => {
    test('should show error for invalid login credentials', async ({ page }) => {
      await page.getByLabel('Email Address').fill('nonexistent@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Login' }).click();
      
      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });

    test('should show error for duplicate email during signup', async ({ page }) => {
      // First create a user
      await page.getByRole('button', { name: 'Sign up here' }).click();
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;
      
      await page.getByLabel('First Name').fill('First');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(duplicateEmail);
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      // Logout
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Try to create another user with same email
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Second');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(duplicateEmail);
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
      
      await expect(page.getByText('An account with this email already exists')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/auth/login', (route) => {
        route.abort('failed');
      });
      
      await page.getByLabel('Email Address').fill('test@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Login' }).click();
      
      await expect(page.getByText('Network error. Please try again.')).toBeVisible();
    });
  });

  test.describe('Dashboard and Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Create and login a user for dashboard tests
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Dashboard');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(`dashboard-${Date.now()}@example.com`);
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();
    });

    test('should display user information in dashboard', async ({ page }) => {
      await expect(page.getByText('Dashboard User')).toBeVisible();
      await expect(page.getByText(/dashboard-.*@example\.com/)).toBeVisible();
      await expect(page.getByText('Welcome back, Dashboard!')).toBeVisible();
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
      await expect(page.getByLabel('Password')).toBeVisible();
      
      // Check signup form
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await expect(page.getByLabel('First Name')).toBeVisible();
      await expect(page.getByLabel('Last Name')).toBeVisible();
      await expect(page.getByLabel('Email Address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('should show error messages with proper ARIA attributes', async ({ page }) => {
      await page.getByRole('button', { name: 'Login' }).click();
      
      const emailError = page.getByText('Email is required');
      const passwordError = page.getByText('Password is required');
      
      await expect(emailError).toHaveAttribute('role', 'alert');
      await expect(passwordError).toHaveAttribute('role', 'alert');
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab'); // Email field
      await expect(page.getByLabel('Email Address')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Password field
      await expect(page.getByLabel('Password')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Login button
      await expect(page.getByRole('button', { name: 'Login' })).toBeFocused();
      
      await page.keyboard.press('Tab'); // Switch to signup link
      await expect(page.getByRole('button', { name: 'Sign up here' })).toBeFocused();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await expect(page.getByRole('heading', { name: 'Family Board' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      
      // Form should be usable
      await page.getByLabel('Email Address').fill('mobile@example.com');
      await page.getByLabel('Password').fill('password123');
      
      // Button should be clickable
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
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