import { Page } from '@playwright/test';

/**
 * Quick setup helper for creating a user and family
 */
export async function quickSetup(page: Page, prefix: string = 'test') {
  const timestamp = Date.now();
  const email = `${prefix}-${timestamp}@example.com`;
  
  // Quick registration
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign up here' }).click();
  await page.getByLabel('First Name').fill(prefix);
  await page.getByLabel('Last Name').fill('User');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm Password').fill('password123');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  
  // Create family quickly
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
  await page.getByText('Create New Family').click();
  await page.getByLabel('Family Name').fill(`${prefix} Family`);
  await page.getByRole('button', { name: 'Create Family' }).click();
  
  await page.waitForLoadState('networkidle');
  // Ensure we're actually on the dashboard before returning
  await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible({ timeout: 10000 });
  
  return { email, familyName: `${prefix} Family` };
}

/**
 * Navigate to a page and wait for it to be ready
 */
export async function navigateAndWaitReady(page: Page, linkText: string) {
  // Wait for navigation to be ready first
  await page.waitForSelector('.navigation-item', { timeout: 10000 });
  
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.locator('.navigation-item').filter({ hasText: linkText }).click()
  ]);
}

/**
 * Fill form fields in batch for better performance
 */
export async function fillForm(page: Page, fields: Record<string, string>) {
  const promises = Object.entries(fields).map(([label, value]) => 
    page.getByLabel(label).fill(value)
  );
  await Promise.all(promises);
}

/**
 * Wait for network to be idle with a reasonable timeout
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}