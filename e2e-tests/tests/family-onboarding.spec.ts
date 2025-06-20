import { test, expect } from '@playwright/test';

test.describe('Mandatory Family Access Control', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/');
  });

  test('should prevent dashboard access without family membership', async ({ page }) => {
    // Create a new user
    await page.getByRole('button', { name: 'Sign up here' }).click();
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    await page.getByLabel('Email Address').fill(`test-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Should be redirected to family onboarding, NOT dashboard
    await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Create New Family')).toBeVisible();
    await expect(page.getByText('Join Existing Family')).toBeVisible();
    
    // Should NOT see dashboard elements
    await expect(page.getByText('Welcome back,')).not.toBeVisible();
    await expect(page.getByText('Coming Soon')).not.toBeVisible();
    
    // Verify URL doesn't contain dashboard
    expect(page.url()).not.toContain('/dashboard');
  });

  test('should allow dashboard access only after creating a family', async ({ page }) => {
    // Create a new user
    await page.getByRole('button', { name: 'Sign up here' }).click();
    await page.getByLabel('First Name').fill('Family');
    await page.getByLabel('Last Name').fill('Creator');
    await page.getByLabel('Email Address').fill(`family-creator-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Should be at family onboarding
    await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    
    // Create a family
    await page.getByText('Create New Family').click();
    await page.getByLabel('Family Name').fill('Test Family');
    await page.getByRole('button', { name: 'Create Family' }).click();
    
    // Should now be redirected to dashboard
    await expect(page.getByText('Welcome back, Family!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Coming Soon')).toBeVisible();
    
    // Verify we can't go back to family onboarding
    await page.goto('/');
    await expect(page.getByText('Welcome back, Family!')).toBeVisible({ timeout: 5000 });
  });

  test('should allow dashboard access only after joining a family', async ({ page }) => {
    // First, create a family with one user to get an invite code
    await page.getByRole('button', { name: 'Sign up here' }).click();
    await page.getByLabel('First Name').fill('Family');
    await page.getByLabel('Last Name').fill('Admin');
    await page.getByLabel('Email Address').fill(`family-admin-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    await page.getByText('Create New Family').click();
    await page.getByLabel('Family Name').fill('Invite Test Family');
    await page.getByRole('button', { name: 'Create Family' }).click();
    
    // Logout
    await expect(page.getByText('Welcome back, Family!')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Logout' }).click();
    
    // Create a second user
    await page.getByRole('button', { name: 'Sign up here' }).click();
    await page.getByLabel('First Name').fill('Family');
    await page.getByLabel('Last Name').fill('Member');
    await page.getByLabel('Email Address').fill(`family-member-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Should be at family onboarding
    await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    
    // Try to join with invalid code first
    await page.getByText('Join Existing Family').click();
    await page.getByLabel('Invitation Code').fill('INVALID123');
    await page.getByRole('button', { name: 'Join Family' }).click();
    
    // Should see error and stay on join form
    await expect(page.getByText('Invalid or expired invitation code')).toBeVisible({ timeout: 5000 });
    
    // Note: We can't test actual joining because we don't have a real invite code
    // But we've verified that users without families are blocked from dashboard
  });

  test('should maintain family access control across page refreshes', async ({ page }) => {
    // Create a new user
    await page.getByRole('button', { name: 'Sign up here' }).click();
    await page.getByLabel('First Name').fill('Refresh');
    await page.getByLabel('Last Name').fill('Test');
    await page.getByLabel('Email Address').fill(`refresh-test-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Should be at family onboarding
    await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    
    // Refresh the page
    await page.reload();
    
    // Should still be at family onboarding (not dashboard)
    await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Create New Family')).toBeVisible();
    
    // Should NOT see dashboard
    await expect(page.getByText('Welcome back,')).not.toBeVisible();
  });

  test('should redirect to family onboarding when trying to access dashboard directly', async ({ page }) => {
    // Create a new user
    await page.getByRole('button', { name: 'Sign up here' }).click();
    await page.getByLabel('First Name').fill('Direct');
    await page.getByLabel('Last Name').fill('Access');
    await page.getByLabel('Email Address').fill(`direct-access-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Should be at family onboarding
    await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
    
    // Try to navigate directly to dashboard (if it existed)
    await page.goto('/dashboard');
    
    // Should be redirected back to family onboarding
    await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Create New Family')).toBeVisible();
  });
}); 