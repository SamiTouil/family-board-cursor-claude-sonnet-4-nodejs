import { Page, expect } from '@playwright/test';

/**
 * Wait for network to be idle (no requests for 500ms)
 */
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for a specific element to be stable (no changes for 500ms)
 */
export async function waitForElementStable(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  // Wait for element to stop moving/changing
  await expect(element).toBeVisible();
}

/**
 * Fast navigation helper that waits for the page to be ready
 */
export async function navigateAndWaitReady(page: Page, selector: string) {
  await page.locator(selector).click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * Fill form field and wait for any reactions
 */
export async function fillFormField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label);
  await field.fill(value);
  // Small delay for form validations
  await page.waitForTimeout(100);
}

/**
 * Create a user and family quickly for testing
 */
export async function quickSetup(page: Page, testName: string) {
  const timestamp = Date.now();
  const email = `test-${testName}-${timestamp}@example.com`;
  
  // Fast signup
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign up here' }).click();
  
  // Fill all fields at once
  await page.getByLabel('First Name').fill('Test');
  await page.getByLabel('Last Name').fill(testName);
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm Password').fill('password123');
  
  // Submit and wait for navigation
  await Promise.all([
    page.waitForURL('**/onboarding', { waitUntil: 'domcontentloaded' }),
    page.getByRole('button', { name: 'Sign Up' }).click()
  ]);
  
  // Create family
  await page.getByText('Create New Family').click();
  await page.getByLabel('Family Name').fill(`${testName} Family`);
  
  // Submit and wait for dashboard
  await Promise.all([
    page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded' }),
    page.getByRole('button', { name: 'Create Family' }).click()
  ]);
  
  // Wait for dashboard to be ready
  await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible();
  
  return { email };
}

/**
 * Batch fill multiple form fields
 */
export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(label).fill(value);
  }
}

/**
 * Wait for modal to be fully open
 */
export async function waitForModal(page: Page) {
  await expect(page.locator('.modal-overlay')).toBeVisible();
  // Wait for animation to complete
  await page.waitForTimeout(200);
}

/**
 * Close modal and wait for it to be gone
 */
export async function closeModal(page: Page) {
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.modal-overlay')).not.toBeVisible();
}