import { test, expect } from '@playwright/test';
import { quickSetup, fillForm, waitForModal, waitForNetworkIdle } from './helpers/test-utils';

test.describe('Task Management - Optimized', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should create, edit, and delete tasks', async ({ page }) => {
    // Quick setup
    await quickSetup(page, 'task-crud');
    
    // Navigate to Tasks - wait for navigation to complete
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.locator('.navigation-item').filter({ hasText: 'Tasks' }).click()
    ]);

    // Create task - fill all fields before clicking
    await page.getByRole('button', { name: 'Create Your First Task' }).click();
    await fillForm(page, {
      'Task Name': 'Morning Routine',
      'Description (Optional)': 'Complete morning routine tasks',
      'Default Start Time': '07:00',
      'Default Duration (minutes)': '45',
      'Color': '#ff6b6b'
    });
    
    // Submit and wait for task to appear
    await Promise.all([
      expect(page.getByText('Morning Routine')).toBeVisible(),
      page.getByRole('button', { name: 'Apply' }).click()
    ]);

    // Verify task details appear
    await expect(page.getByText('07:00')).toBeVisible();
    await expect(page.getByText('45m')).toBeVisible();

    // Edit task - open dropdown and edit in one go
    await page.locator('.dropdown-menu-trigger').first().click();
    await page.getByText('Edit task').click();
    
    // Update fields
    await fillForm(page, {
      'Task Name': 'Updated Morning Routine',
      'Description (Optional)': 'Updated description',
      'Default Start Time': '06:30',
      'Default Duration (minutes)': '60'
    });
    
    // Submit and verify updates
    await Promise.all([
      expect(page.getByText('Updated Morning Routine')).toBeVisible(),
      page.getByRole('button', { name: 'Apply' }).click()
    ]);

    // Delete task with dialog handling
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.dropdown-menu-trigger').first().click();
    await page.getByText('Remove task').click();
    
    // Verify task is removed
    await expect(page.getByText('Updated Morning Routine')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await quickSetup(page, 'task-validation');
    
    // Navigate to Tasks
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.locator('.navigation-item').filter({ hasText: 'Tasks' }).click()
    ]);

    // Try to create empty task
    await page.getByRole('button', { name: 'Create Your First Task' }).click();
    await page.getByRole('button', { name: 'Apply' }).click();
    
    // Check for validation error
    await expect(page.locator('.task-management-error')).toBeVisible();
    
    // Fill minimum required field
    await page.getByLabel('Task Name').fill('Valid Task');
    await page.getByRole('button', { name: 'Apply' }).click();
    
    // Verify task created
    await expect(page.getByText('Valid Task')).toBeVisible();
  });

  test('should handle multiple tasks efficiently', async ({ page }) => {
    await quickSetup(page, 'multi-tasks');
    
    // Navigate to Tasks
    await Promise.all([
      page.waitForLoadState('networkidle'),  
      page.locator('.navigation-item').filter({ hasText: 'Tasks' }).click()
    ]);

    // Create multiple tasks in rapid succession
    const tasks = [
      { name: 'Morning Exercise', time: '06:00', duration: '30' },
      { name: 'Breakfast', time: '07:30', duration: '20' },
      { name: 'Work Start', time: '09:00', duration: '480' }
    ];

    // Create first task
    await page.getByRole('button', { name: 'Create Your First Task' }).click();
    await fillForm(page, {
      'Task Name': tasks[0].name,
      'Default Start Time': tasks[0].time,
      'Default Duration (minutes)': tasks[0].duration
    });
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText(tasks[0].name)).toBeVisible();

    // Create remaining tasks
    for (let i = 1; i < tasks.length; i++) {
      await page.getByRole('button', { name: 'Create Task' }).click();
      await fillForm(page, {
        'Task Name': tasks[i].name,
        'Default Start Time': tasks[i].time,
        'Default Duration (minutes)': tasks[i].duration
      });
      await page.getByRole('button', { name: 'Apply' }).click();
      await expect(page.getByText(tasks[i].name)).toBeVisible();
    }

    // Verify all tasks are visible
    for (const task of tasks) {
      await expect(page.getByText(task.name)).toBeVisible();
    }
  });
});

// Run these tests in parallel groups
test.describe('Task Edge Cases - Parallel Group', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should handle midnight time', async ({ page }) => {
    await quickSetup(page, 'midnight');
    
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.locator('.navigation-item').filter({ hasText: 'Tasks' }).click()
    ]);

    await page.getByRole('button', { name: 'Create Your First Task' }).click();
    await fillForm(page, {
      'Task Name': 'Midnight Task',
      'Default Start Time': '00:00',
      'Default Duration (minutes)': '5'
    });
    
    await Promise.all([
      expect(page.getByText('Midnight Task')).toBeVisible(),
      page.getByRole('button', { name: 'Apply' }).click()
    ]);
    
    await expect(page.getByText('00:00')).toBeVisible();
  });

  test('should handle maximum duration', async ({ page }) => {
    await quickSetup(page, 'max-duration');
    
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.locator('.navigation-item').filter({ hasText: 'Tasks' }).click()
    ]);

    await page.getByRole('button', { name: 'Create Your First Task' }).click();
    await fillForm(page, {
      'Task Name': 'All Day Task',
      'Default Start Time': '00:00',
      'Default Duration (minutes)': '1440'
    });
    
    await Promise.all([
      expect(page.getByText('All Day Task')).toBeVisible(),
      page.getByRole('button', { name: 'Apply' }).click()
    ]);
    
    await expect(page.getByText('24h')).toBeVisible();
  });
});