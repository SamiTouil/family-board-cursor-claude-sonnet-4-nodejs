import { test, expect } from '@playwright/test';

test.describe('Basic App Tests', () => {
  test('has correct title', async ({ page }) => {
    await page.goto('/');
    
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Family Board/);
  });

  test('displays app branding on auth page', async ({ page }) => {
    await page.goto('/');
    
    // Should show the app title in the branding section
    await expect(page.getByRole('heading', { name: 'Family Board' })).toBeVisible();
  });

  test('shows authentication form by default', async ({ page }) => {
    await page.goto('/');
    
    // Should show login form since user is not authenticated
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('requires authentication to access app content', async ({ page }) => {
    await page.goto('/');
    
    // Should not show dashboard content without authentication
    await expect(page.getByText('Welcome back,')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).not.toBeVisible();
    
    // Should show authentication form instead
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });
}); 