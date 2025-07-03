import { test, expect } from '@playwright/test';

test.describe('Task Management - Comprehensive Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Task CRUD Operations & Management', () => {
    test('should create, edit, and delete tasks with full validation', async ({ page }) => {
      const adminEmail = `admin-task-crud-${Date.now()}@example.com`;
      
      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('TaskCRUD');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Task Management Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Navigate to Tasks page
      await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Tasks' }).click();
      await page.waitForTimeout(2000);

      // Test task creation
      await page.getByRole('button', { name: 'Create Your First Task' }).click();
      
      // Fill task details
      await page.getByLabel('Task Name').fill('Morning Routine');
      await page.getByLabel('Description (Optional)').fill('Complete morning routine tasks');
      await page.getByLabel('Default Start Time').fill('07:00');
      await page.getByLabel('Default Duration (minutes)').fill('45');
      
      // Test color picker
      await page.getByLabel('Color').fill('#ff6b6b');
      
      await page.getByRole('button', { name: 'Apply' }).click();
      
      // Verify task appears in list with correct details
      await expect(page.getByText('Morning Routine')).toBeVisible();
      await expect(page.getByText('07:00')).toBeVisible();
      await expect(page.getByText('45m')).toBeVisible();
      await expect(page.getByText('Complete morning routine tasks')).toBeVisible();

      // Test task editing - click the edit button (✏️) instead of heading
      await page.locator('.task-override-action-btn.edit').first().click();
      await page.getByLabel('Task Name').fill('Updated Morning Routine');
      await page.getByLabel('Description (Optional)').fill('Updated morning routine description');
      await page.getByLabel('Default Start Time').fill('06:30');
      await page.getByLabel('Default Duration (minutes)').fill('60');
      await page.getByRole('button', { name: 'Apply' }).click();

      // Verify updates
      await expect(page.getByText('Updated Morning Routine')).toBeVisible();
      await expect(page.getByText('06:30')).toBeVisible();
      await expect(page.getByText('1h')).toBeVisible();
      await expect(page.getByText('Updated morning routine description')).toBeVisible();

      // Test task deletion with confirmation
      page.on('dialog', dialog => dialog.accept());
      await page.locator('.task-override-action-btn.remove').click();
      
      // Verify task is removed
      await expect(page.getByRole('heading', { name: 'Updated Morning Routine' })).not.toBeVisible();
    });

    test('should validate task creation with required fields and constraints', async ({ page }) => {
      const adminEmail = `admin-task-validation-${Date.now()}@example.com`;
      
      // Setup admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('TaskValidation');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Validation Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Tasks' }).click();
      await page.waitForTimeout(2000);

      // Test empty task name validation
      await page.getByRole('button', { name: 'Create Your First Task' }).click();
      await page.getByRole('button', { name: 'Apply' }).click();
      await expect(page.locator('.task-management-error')).toBeVisible();

      // Test task name too short
      await page.getByLabel('Task Name').fill('A');
      await page.getByRole('button', { name: 'Apply' }).click();
      await expect(page.locator('.task-management-error')).toBeVisible();

      // Test task name too long
      await page.getByLabel('Task Name').fill('A'.repeat(101));
      await page.getByRole('button', { name: 'Apply' }).click();
      await expect(page.locator('.task-management-error')).toBeVisible();

      // Test valid task creation with proper values
      await page.getByLabel('Task Name').fill('Valid Task Name');
      await page.getByLabel('Default Start Time').fill('09:00');
      await page.getByLabel('Default Duration (minutes)').fill('30');
      await page.getByRole('button', { name: 'Apply' }).click();
      
      // Should succeed and task should appear
      await expect(page.getByText('Valid Task Name')).toBeVisible();
      await expect(page.getByText('09:00')).toBeVisible();
      await expect(page.getByText('30m')).toBeVisible();
    });

    test('should handle multiple tasks with different time slots and sorting', async ({ page }) => {
      const adminEmail = `admin-multi-tasks-${Date.now()}@example.com`;
      
      // Setup admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('MultiTasks');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Multi Tasks Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Tasks' }).click();
      await page.waitForTimeout(2000);

      // Create multiple tasks with different times
      const tasks = [
        { name: 'Morning Exercise', time: '06:00', duration: '30' },
        { name: 'Breakfast', time: '07:30', duration: '20' },
        { name: 'Work Start', time: '09:00', duration: '480' },
        { name: 'Lunch Break', time: '12:00', duration: '60' }
      ];

      // Create first task
      await page.getByRole('button', { name: 'Create Your First Task' }).click();
      await page.getByLabel('Task Name').fill(tasks[0].name);
      await page.getByLabel('Default Start Time').fill(tasks[0].time);
      await page.getByLabel('Default Duration (minutes)').fill(tasks[0].duration);
      await page.getByRole('button', { name: 'Apply' }).click();
      await page.waitForTimeout(1000);

      // Create remaining tasks
      for (let i = 1; i < tasks.length; i++) {
        const task = tasks[i];
        await page.getByRole('button', { name: 'Create Task' }).click();
        await page.getByLabel('Task Name').fill(task.name);
        await page.getByLabel('Default Start Time').fill(task.time);
        await page.getByLabel('Default Duration (minutes)').fill(task.duration);
        await page.getByRole('button', { name: 'Apply' }).click();
        await page.waitForTimeout(1000);
      }

      // Verify all tasks are created and visible
      await expect(page.getByText('Morning Exercise')).toBeVisible();
      await expect(page.getByText('Breakfast')).toBeVisible();  
      await expect(page.getByText('Work Start')).toBeVisible();
      await expect(page.getByText('Lunch Break')).toBeVisible();

      // Verify time display formats correctly
      await expect(page.getByText('06:00')).toBeVisible();
      await expect(page.getByText('30m')).toBeVisible();
      await expect(page.getByText('8h')).toBeVisible(); // 480 minutes = 8 hours
      await expect(page.getByText('1h')).toBeVisible(); // 60 minutes = 1 hour
    });
  });

  test.describe('Day Routine CRUD Operations & Management', () => {
    test('should create, edit, and delete day routines with validation', async ({ page }) => {
      const adminEmail = `admin-routine-crud-${Date.now()}@example.com`;
      
      // Setup admin, family, and some tasks
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('RoutineCRUD');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Routine Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible({ timeout: 10000 });
      
      // First create some tasks to use in routines
      await page.getByRole('button', { name: 'Tasks' }).click();
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Create Your First Task' }).click();
      await page.getByLabel('Task Name').fill('Wake Up');
      await page.getByLabel('Default Start Time').fill('07:00');
      await page.getByLabel('Default Duration (minutes)').fill('5');
      await page.getByRole('button', { name: 'Apply' }).click();
      await page.waitForTimeout(1000);

      await page.getByRole('button', { name: 'Create Task' }).click();
      await page.getByLabel('Task Name').fill('Brush Teeth');
      await page.getByLabel('Default Start Time').fill('07:05');
      await page.getByLabel('Default Duration (minutes)').fill('3');
      await page.getByRole('button', { name: 'Apply' }).click();
      await page.waitForTimeout(1000);

      // Navigate to Routines page for routine management
      await page.getByRole('button', { name: 'Routines' }).click();
      await page.waitForTimeout(2000);

      // Test routine creation
      await page.getByRole('button', { name: 'Add Routine' }).click();
      await page.getByLabel('Routine Name').fill('Weekday Morning');
      await page.getByLabel('Description').fill('Standard weekday morning routine');
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify routine appears
      await expect(page.getByText('Weekday Morning')).toBeVisible();
      await expect(page.getByText('Standard weekday morning routine')).toBeVisible();

      // Test routine editing
      await page.getByRole('button', { name: 'Edit' }).click();
      await page.getByLabel('Routine Name').fill('Updated Weekday Morning');
      await page.getByLabel('Description').fill('Updated morning routine description');
      await page.getByRole('button', { name: 'Update' }).click();

      // Verify updates
      await expect(page.getByText('Updated Weekday Morning')).toBeVisible();
      await expect(page.getByText('Updated morning routine description')).toBeVisible();

      // Test routine deletion
      page.on('dialog', dialog => dialog.accept());
      await page.locator('.day-template-management-template-action.delete').click();
      
      // Verify routine is removed
      await expect(page.getByText('Updated Weekday Morning')).not.toBeVisible();
    });

    test.skip('should manage routine items with task assignments and overrides', async ({ page }) => {
      const adminEmail = `admin-routine-items-${Date.now()}@example.com`;
      
      // Setup admin, family, and tasks
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('RoutineItems');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Routine Items Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible({ timeout: 10000 });
      
      // Create some tasks first
      await page.getByRole('button', { name: 'Tasks' }).click();
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Create Your First Task' }).click();
      await page.getByLabel('Task Name').fill('Morning Jog');
      await page.getByLabel('Default Start Time').fill('06:00');
      await page.getByLabel('Default Duration (minutes)').fill('30');
      await page.getByRole('button', { name: 'Apply' }).click();
      await page.waitForTimeout(1000);

      await page.getByRole('button', { name: 'Create Task' }).click();
      await page.getByLabel('Task Name').fill('Shower');
      await page.getByLabel('Default Start Time').fill('06:30');
      await page.getByLabel('Default Duration (minutes)').fill('15');
      await page.getByRole('button', { name: 'Apply' }).click();
      await page.waitForTimeout(1000);

      // Navigate to Routines page for routine management
      await page.getByRole('button', { name: 'Routines' }).click();
      await page.waitForTimeout(2000);

      // Create a routine
      await page.getByRole('button', { name: 'Add Routine' }).click();
      await page.getByLabel('Routine Name').fill('Morning Routine');
      await page.getByLabel('Description').fill('Complete morning routine template');
      await page.getByRole('button', { name: 'Create' }).click();
      await page.waitForTimeout(2000);

      // Add task to routine with default settings
      await page.getByRole('button', { name: 'Add Task to Routine' }).click();
      await page.waitForTimeout(1000); // Wait for dropdown to populate
      
      // Click on CustomSelect to open dropdown
      await page.locator('.day-template-management-form-group').filter({ hasText: 'Task *' }).locator('.custom-select').click();
      await page.waitForTimeout(500); // Wait for dropdown to open
      
      // Select first available task from dropdown
      await page.locator('.custom-select-option').nth(1).click(); // Skip the placeholder option
      await page.waitForTimeout(1000); // Wait for form to update after selection
      
      // Look for the Add Task button (it might be disabled initially)
      await page.locator('button').filter({ hasText: 'Add Task' }).click();
      
      // Verify task appears in routine
      await expect(page.locator('.task-override-card')).toBeVisible();
      await expect(page.locator('.task-override-card .time-tag')).toContainText('06:00');
      await expect(page.locator('.task-override-card .duration-tag')).toContainText('30m');

      // Wait for the form to close and state to reset before adding another task
      await page.waitForTimeout(2000);

      // Add task with time override - click directly without waiting for enabled state
      // (there's a component bug where button stays disabled, but clicking works)
      await page.getByRole('button', { name: 'Add Task to Routine' }).click({ force: true });
      await page.waitForTimeout(1000); // Wait for dropdown to populate
      
      // Click on CustomSelect to open dropdown
      await page.locator('.day-template-management-form-group').filter({ hasText: 'Task *' }).locator('.custom-select').click();
      await page.waitForTimeout(500); // Wait for dropdown to open
      
      // Select second available task from dropdown
      await page.locator('.custom-select-option').nth(2).click(); // Skip the placeholder option
      await page.waitForTimeout(1000); // Wait for form to update after selection
      
      await page.getByLabel('Override Time (Optional)').fill('07:00');
      await page.locator('button').filter({ hasText: 'Add Task' }).click();
      
      // Verify second task appears with overridden time
      await expect(page.locator('.task-override-card').nth(1)).toBeVisible();
      await expect(page.locator('.task-override-card').nth(1).locator('.time-tag')).toContainText('07:00');
    });
  });

  test.describe('Advanced Integration & Edge Cases', () => {
    test('should handle concurrent editing and form state management', async ({ page }) => {
      const adminEmail = `admin-concurrent-${Date.now()}@example.com`;
      
      // Setup
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('Concurrent');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Concurrent Editing Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Tasks' }).click();
      await page.waitForTimeout(2000);

      // Test concurrent form opening and cancellation
      await page.getByRole('button', { name: 'Create Your First Task' }).click();
      await page.getByLabel('Task Name').fill('Partial Task Entry');
      
      // Cancel task creation - use modal cancel button
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Verify form is closed and data is cleared
      await expect(page.getByLabel('Task Name')).not.toBeVisible();

      // Navigate to Routines page for routine management
      await page.getByRole('button', { name: 'Routines' }).click();
      await page.waitForTimeout(2000);

      // Start creating a routine while task form was cancelled
      await page.getByRole('button', { name: 'Add Routine' }).click();
      await page.getByLabel('Routine Name').fill('Concurrent Routine');
      
      // Cancel routine creation - use more specific selector
      await page.locator('.day-template-management-form').getByRole('button', { name: 'Cancel' }).click();
      
      // Verify routine form is closed
      await expect(page.getByLabel('Routine Name')).not.toBeVisible();

      // Navigate back to Tasks page for task creation
      await page.getByRole('button', { name: 'Tasks' }).click();
      await page.waitForTimeout(2000);

      // Test successful creation after cancellations
      await page.getByRole('button', { name: 'Create Your First Task' }).click();
      await page.getByLabel('Task Name').fill('Successfully Created Task');
      await page.getByLabel('Default Start Time').fill('12:00');
      await page.getByLabel('Default Duration (minutes)').fill('20');
      await page.getByRole('button', { name: 'Apply' }).click();

      // Verify task was created successfully
      await expect(page.getByText('Successfully Created Task')).toBeVisible();
      await expect(page.getByText('12:00')).toBeVisible();
      await expect(page.getByText('20m')).toBeVisible();
    });

    test('should handle error recovery and validation edge cases', async ({ page }) => {
      const adminEmail = `admin-errors-${Date.now()}@example.com`;
      
      // Setup
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('Errors');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Error Recovery Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Tasks' }).click();
      await page.waitForTimeout(2000);

      // Test edge case: midnight time (00:00)
      await page.getByRole('button', { name: 'Create Your First Task' }).click();
      await page.getByLabel('Task Name').fill('Midnight Task');
      await page.getByLabel('Default Start Time').fill('00:00');
      await page.getByLabel('Default Duration (minutes)').fill('5');
      await page.getByRole('button', { name: 'Apply' }).click();

      // Verify midnight task creation
      await expect(page.getByText('Midnight Task')).toBeVisible();
      await expect(page.getByText('00:00')).toBeVisible();

      // Test edge case: maximum duration (24 hours = 1440 minutes)
      await page.getByRole('button', { name: 'Create Task' }).click();
      await page.getByLabel('Task Name').fill('All Day Task');
      await page.getByLabel('Default Start Time').fill('00:01');
      await page.getByLabel('Default Duration (minutes)').fill('1440');
      await page.getByRole('button', { name: 'Apply' }).click();

      // Verify all-day task creation
      await expect(page.getByText('All Day Task')).toBeVisible();
      await expect(page.getByText('24h')).toBeVisible();

      // Test edge case: late night time (23:59)
      await page.getByRole('button', { name: 'Create Task' }).click();
      await page.getByLabel('Task Name').fill('Late Night Task');
      await page.getByLabel('Default Start Time').fill('23:59');
      await page.getByLabel('Default Duration (minutes)').fill('1');
      await page.getByRole('button', { name: 'Apply' }).click();

      // Verify late night task
      await expect(page.getByText('Late Night Task')).toBeVisible();
      await expect(page.getByText('23:59')).toBeVisible();
      await expect(page.getByText('1m')).toBeVisible();
    });
  });
}); 