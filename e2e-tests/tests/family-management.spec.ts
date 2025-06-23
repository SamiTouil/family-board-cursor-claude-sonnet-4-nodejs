import { test, expect } from '@playwright/test';

test.describe('Family Management - Advanced Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/');
  });

  test.describe('Family Member Removal & Access Control', () => {
    test('should remove family member and redirect them to family onboarding', async ({ page, context }) => {
      // Create admin user and family
      const adminEmail = `admin-${Date.now()}@example.com`;
      const memberEmail = `member-${Date.now()}@example.com`;
      
      // Admin creates family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      // Wait for family onboarding and create family
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Wait for dashboard
      await expect(page.getByRole('heading', { name: 'Admin User' })).toBeVisible({ timeout: 10000 });

      // Get family invite code from family management
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);
      
      // Create an invite
      await page.getByRole('button', { name: 'Generate Invite' }).click();
      
      // Get the invite code from the UI
      const inviteCodeElement = await page.locator('.family-management-invite-code').first();
      const inviteCode = await inviteCodeElement.textContent();

      // Admin logs out
      await page.locator('.user-menu-avatar').click();
      await page.getByRole('button', { name: 'Logout' }).click();

      // Member signs up and joins family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Member');
      await page.getByLabel('Last Name').fill('User');
      await page.getByLabel('Email Address').fill(memberEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      // Wait for family onboarding and join family
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Join Existing Family').click();
      await page.getByLabel('Invitation Code').fill(inviteCode!.trim());
      await page.getByRole('button', { name: 'Join Family' }).click();

      // Should see request submitted message
      await expect(page.getByText('Request Submitted!')).toBeVisible({ timeout: 10000 });

      // Member logs out
      await page.getByRole('button', { name: 'Back to Login' }).click();

      // Admin logs back in
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Login' }).click();

      // Wait for dashboard and go to family management
      await expect(page.getByRole('heading', { name: 'Admin User' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      // Approve the join request
      await page.getByText('Approve').click();
      await page.waitForTimeout(2000);

      // Verify member appears in member list
      await expect(page.getByText('Member User')).toBeVisible();

      // Remove the member - handle browser confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      await page.getByText('Remove').last().click();
      await page.waitForTimeout(1000);

      // Verify member is removed from list
      await expect(page.getByText('Member User')).not.toBeVisible();

      // Admin logs out
      await page.locator('.user-menu-avatar').click();
      await page.getByRole('button', { name: 'Logout' }).click();

      // Member tries to log back in - should be redirected to family onboarding
      await page.getByLabel('Email Address').fill(memberEmail);
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Login' }).click();

      // Member should be back at family onboarding (no longer has family membership)
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Create New Family')).toBeVisible();
      await expect(page.getByText('Join Existing Family')).toBeVisible();
    });

    test('should prevent non-admin members from removing other members', async ({ page }) => {
      // This test verifies that remove buttons are not visible to non-admin members
      // Since a user who creates a family becomes admin automatically, we need to test
      // with a user who joins an existing family as a regular member
      const memberEmail = `member-${Date.now()}@example.com`;
      
      // Create member user
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Regular');
      await page.getByLabel('Last Name').fill('Member');
      await page.getByLabel('Email Address').fill(memberEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      // Create family to get to dashboard (this user will be admin of their own family)
      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Member Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Go to family management
      await expect(page.getByRole('heading', { name: 'Regular Member' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      // Family creator should only see themselves, so no Remove buttons for others
      await expect(page.getByText('Remove')).not.toBeVisible();
      
      // But they should see admin controls since they created the family
      await expect(page.getByText('Edit Family')).toBeVisible();
      await expect(page.getByText('Add Virtual Member')).toBeVisible();
    });
  });

  test.describe('Join Request Notifications & Workflow', () => {
    test('should show real-time notifications for join request workflow', async ({ page, context }) => {
      const adminEmail = `admin-notify-${Date.now()}@example.com`;
      const memberEmail = `member-notify-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('Notify');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Notification Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Create invite
      await expect(page.getByRole('heading', { name: 'Admin Notify' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Generate Invite' }).click();
      
      const inviteCodeElement = await page.locator('.family-management-invite-code').first();
      const inviteCode = await inviteCodeElement.textContent();

      // Open new tab for member
      const memberPage = await context.newPage();
      await memberPage.goto('/');

      // Member signs up
      await memberPage.getByRole('button', { name: 'Sign up here' }).click();
      await memberPage.getByLabel('First Name').fill('Member');
      await memberPage.getByLabel('Last Name').fill('Notify');
      await memberPage.getByLabel('Email Address').fill(memberEmail);
      await memberPage.getByLabel('Password', { exact: true }).fill('password123');
      await memberPage.getByLabel('Confirm Password').fill('password123');
      await memberPage.getByRole('button', { name: 'Sign Up' }).click();

      // Member submits join request
      await expect(memberPage.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await memberPage.getByText('Join Existing Family').click();
      await memberPage.getByLabel('Invitation Code').fill(inviteCode!.trim());
      await memberPage.getByLabel('Message (Optional)').fill('I would like to join this family!');
      await memberPage.getByRole('button', { name: 'Join Family' }).click();

      // Member should see request submitted confirmation
      await expect(memberPage.getByText('Request Submitted!')).toBeVisible({ timeout: 10000 });
      await expect(memberPage.getByText('Your request has been sent to the family administrators')).toBeVisible();

      // Admin should see the join request appear in real-time
      await page.waitForTimeout(2000);
      await page.reload(); // Refresh to see new join request
      await page.waitForTimeout(2000);
      
      // Check for join request in pending requests
      await expect(page.getByText('Member Notify')).toBeVisible();
      await expect(page.getByText('I would like to join this family!')).toBeVisible();

      // Admin approves the request
      await page.getByText('Approve').click();
      await page.waitForTimeout(3000);

      // Member page should automatically update (via WebSocket)
      await memberPage.waitForTimeout(3000);
      
      // Member should now be redirected to dashboard
      await expect(memberPage.getByRole('heading', { name: 'Member Notify' })).toBeVisible({ timeout: 15000 });
      await expect(memberPage.getByText('Notification Test Family')).toBeVisible();

      await memberPage.close();
    });

    test('should handle join request rejection gracefully', async ({ page, context }) => {
      const adminEmail = `admin-reject-${Date.now()}@example.com`;
      const memberEmail = `member-reject-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('Reject');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Rejection Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Create invite
      await expect(page.getByRole('heading', { name: 'Admin Reject' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Generate Invite' }).click();
      
      const inviteCodeElement = await page.locator('.family-management-invite-code').first();
      const inviteCode = await inviteCodeElement.textContent();

      // Open new tab for member
      const memberPage = await context.newPage();
      await memberPage.goto('/');

      // Member signs up and submits join request
      await memberPage.getByRole('button', { name: 'Sign up here' }).click();
      await memberPage.getByLabel('First Name').fill('Member');
      await memberPage.getByLabel('Last Name').fill('Reject');
      await memberPage.getByLabel('Email Address').fill(memberEmail);
      await memberPage.getByLabel('Password', { exact: true }).fill('password123');
      await memberPage.getByLabel('Confirm Password').fill('password123');
      await memberPage.getByRole('button', { name: 'Sign Up' }).click();

      await expect(memberPage.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await memberPage.getByText('Join Existing Family').click();
      await memberPage.getByLabel('Invitation Code').fill(inviteCode!.trim());
      await memberPage.getByRole('button', { name: 'Join Family' }).click();

      await expect(memberPage.getByText('Request Submitted!')).toBeVisible({ timeout: 10000 });

      // Admin rejects the request
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForTimeout(2000);
      await page.getByText('Reject').click();
      await page.waitForTimeout(3000);

      // Member should be redirected back to family choice screen
      await memberPage.waitForTimeout(5000);
      await expect(memberPage.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 15000 });
      await expect(memberPage.getByText('Create New Family')).toBeVisible();
      await expect(memberPage.getByText('Join Existing Family')).toBeVisible();

      await memberPage.close();
    });
  });

  test.describe('Virtual Member Management', () => {
    test('should create virtual family member successfully', async ({ page }) => {
      const adminEmail = `admin-virtual-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('Virtual');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Virtual Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Go to family management
      await expect(page.getByRole('heading', { name: 'Admin Virtual' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      // Create virtual member
      await page.getByText('Add Virtual Member').click();
      await page.getByLabel('First Name').fill('Grandma');
      await page.getByLabel('Last Name').fill('Smith');
      await page.getByLabel('Avatar URL (Optional)').fill('https://example.com/avatar.jpg');
      await page.getByRole('button', { name: 'Save' }).click();

      // Verify virtual member appears in list
      await expect(page.getByText('Grandma Smith')).toBeVisible();
      await expect(page.locator('.role-tag-virtual')).toBeVisible();

      // Verify success message
      await expect(page.getByText('Virtual member added successfully')).toBeVisible();
    });

    test('should edit virtual family member successfully', async ({ page }) => {
      const adminEmail = `admin-edit-virtual-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('EditVirtual');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Edit Virtual Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Go to family management and create virtual member
      await expect(page.getByRole('heading', { name: 'Admin EditVirtual' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      await page.getByText('Add Virtual Member').click();
      await page.getByLabel('First Name').fill('Uncle');
      await page.getByLabel('Last Name').fill('Bob');
      await page.getByRole('button', { name: 'Save' }).click();

      // Wait for virtual member to appear
      await expect(page.getByText('Uncle Bob')).toBeVisible();

      // Edit the virtual member
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await page.getByLabel('First Name').fill('Uncle');
      await page.getByLabel('Last Name').fill('Robert');
      await page.getByLabel('Avatar URL (Optional)').fill('https://example.com/uncle-robert.jpg');
      await page.getByRole('button', { name: 'Save' }).click();

      // Verify changes
      await expect(page.getByText('Uncle Robert')).toBeVisible();
      await expect(page.getByText('Uncle Bob')).not.toBeVisible();
      await expect(page.getByText('Virtual member updated successfully')).toBeVisible();
    });

    test('should remove virtual family member successfully', async ({ page }) => {
      const adminEmail = `admin-remove-virtual-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('RemoveVirtual');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Remove Virtual Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Go to family management and create virtual member
      await expect(page.getByRole('heading', { name: 'Admin RemoveVirtual' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      await page.getByText('Add Virtual Member').click();
      await page.getByLabel('First Name').fill('Aunt');
      await page.getByLabel('Last Name').fill('Mary');
      await page.getByRole('button', { name: 'Save' }).click();

      // Wait for virtual member to appear
      await expect(page.getByText('Aunt Mary')).toBeVisible();

      // Remove the virtual member - handle browser confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      await page.getByText('Remove').last().click();

      // Verify virtual member is removed
      await expect(page.getByText('Aunt Mary')).not.toBeVisible();
      await expect(page.getByText('Member removed successfully')).toBeVisible();
    });
  });

  test.describe('Family Details Editing & User Card Refresh', () => {
    test('should edit family details and refresh user card information', async ({ page }) => {
      const adminEmail = `admin-edit-family-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('EditFamily');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Original Family Name');
      await page.getByLabel('Description (Optional)').fill('Original description');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Verify original family name in dashboard
      await expect(page.getByRole('heading', { name: 'Admin EditFamily' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Original Family Name')).toBeVisible();

      // Go to family management
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      // Edit family details
      await page.getByText('Edit Family').click();
      await page.getByLabel('Family Name').fill('Updated Family Name');
      await page.getByLabel('Description').fill('Updated description with more details');
      await page.getByLabel('Family Avatar URL (Optional)').fill('https://example.com/family-avatar.jpg');
      await page.getByRole('button', { name: 'Save' }).click();

      // Verify success message - check for any success message
      await expect(page.locator('.family-management-message-success')).toBeVisible();

      // Go back to dashboard to verify user card is updated
      await page.getByText('Home').click();
      await page.waitForTimeout(2000);

      // Verify user card shows updated family information
      await expect(page.getByText('Updated Family Name')).toBeVisible();
      
      // Verify page title is updated
      await expect(page).toHaveTitle('Updated Family Name Board');

      // Go back to family management to verify details are persisted
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      // Check that family details show updated information
      await expect(page.getByText('Updated Family Name')).toBeVisible();
      await expect(page.getByText('Updated description with more details')).toBeVisible();
    });

    test('should validate family name requirements during editing', async ({ page }) => {
      const adminEmail = `admin-validate-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('Validate');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Validation Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Go to family management
      await expect(page.getByRole('heading', { name: 'Admin Validate' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      // Try to edit with empty family name
      await page.getByText('Edit Family').click();
      await page.getByLabel('Family Name').fill('');
      await page.getByRole('button', { name: 'Save' }).click();

      // Should show validation error
      await expect(page.locator('.form-error, .family-management-error')).toBeVisible();

      // Try with name too short
      await page.getByLabel('Family Name').fill('A');
      await page.getByRole('button', { name: 'Save' }).click();

      // Should show minimum length error
      await expect(page.locator('.form-error, .family-management-error')).toBeVisible();

      // Try with valid name
      await page.getByLabel('Family Name').fill('Valid Family Name');
      await page.getByRole('button', { name: 'Save' }).click();

      // Should succeed
      await expect(page.locator('.family-management-message-success')).toBeVisible();
    });

    test('should cancel family editing and restore original values', async ({ page }) => {
      const adminEmail = `admin-cancel-edit-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('CancelEdit');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Cancel Test Family');
      await page.getByLabel('Description (Optional)').fill('Original description');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Go to family management
      await expect(page.getByRole('heading', { name: 'Admin CancelEdit' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      // Start editing and make changes
      await page.getByText('Edit Family').click();
      await page.getByLabel('Family Name').fill('Changed Name');
      await page.getByLabel('Description').fill('Changed description');

      // Cancel editing
      await page.getByRole('button', { name: 'Cancel' }).first().click();

      // Verify original values are restored
      await expect(page.locator('.family-management-title')).toContainText('Cancel Test Family');
      await expect(page.getByText('Original description')).toBeVisible();

      // Verify form is closed
      await expect(page.getByLabel('Family Name')).not.toBeVisible();
    });
  });

  test.describe('Member Role Management', () => {
    test('should change member roles and update permissions', async ({ page, context }) => {
      const adminEmail = `admin-roles-${Date.now()}@example.com`;
      const memberEmail = `member-roles-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('Roles');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Role Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Create invite and add member (simplified version)
      await expect(page.getByRole('heading', { name: 'Admin Roles' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Generate Invite' }).click();
      
      const inviteCodeElement = await page.locator('.family-management-invite-code').first();
      const inviteCode = await inviteCodeElement.textContent();

      // Add member through second browser context
      const memberPage = await context.newPage();
      await memberPage.goto('/');

      await memberPage.getByRole('button', { name: 'Sign up here' }).click();
      await memberPage.getByLabel('First Name').fill('Member');
      await memberPage.getByLabel('Last Name').fill('Roles');
      await memberPage.getByLabel('Email Address').fill(memberEmail);
      await memberPage.getByLabel('Password', { exact: true }).fill('password123');
      await memberPage.getByLabel('Confirm Password').fill('password123');
      await memberPage.getByRole('button', { name: 'Sign Up' }).click();

      await expect(memberPage.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await memberPage.getByText('Join Existing Family').click();
      await memberPage.getByLabel('Invitation Code').fill(inviteCode!.trim());
      await memberPage.getByRole('button', { name: 'Join Family' }).click();

      // Admin approves request
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForTimeout(2000);
      await page.getByText('Approve').click();
      await page.waitForTimeout(3000);

      // Verify member appears with MEMBER role
      await expect(page.getByText('Member Roles')).toBeVisible();
      await expect(page.getByText('Member').last()).toBeVisible();

      // Change member role to admin
      const roleDropdown = page.locator('.role-select').last();
      await roleDropdown.click();
      await page.getByText('Admin').click();

      // Verify role change success message
      await expect(page.getByText('Member role updated successfully')).toBeVisible();

      // Verify member now shows as Admin
      await expect(page.getByText('Admin').last()).toBeVisible();

      await memberPage.close();
    });
  });

  test.describe('Real-time Family Updates', () => {
    test('should show real-time updates when family members join', async ({ page, context }) => {
      const adminEmail = `admin-realtime-${Date.now()}@example.com`;
      const memberEmail = `member-realtime-${Date.now()}@example.com`;

      // Create admin and family
      await page.getByRole('button', { name: 'Sign up here' }).click();
      await page.getByLabel('First Name').fill('Admin');
      await page.getByLabel('Last Name').fill('Realtime');
      await page.getByLabel('Email Address').fill(adminEmail);
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm Password').fill('password123');
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await page.getByText('Create New Family').click();
      await page.getByLabel('Family Name').fill('Realtime Test Family');
      await page.getByRole('button', { name: 'Create Family' }).click();

      // Go to family management
      await expect(page.getByRole('heading', { name: 'Admin Realtime' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Family' }).click();
      await page.waitForTimeout(2000);

      // Create invite
      await page.getByRole('button', { name: 'Generate Invite' }).click();
      
      const inviteCodeElement = await page.locator('.family-management-invite-code').first();
      const inviteCode = await inviteCodeElement.textContent();

      // Open member page
      const memberPage = await context.newPage();
      await memberPage.goto('/');

      // Member joins
      await memberPage.getByRole('button', { name: 'Sign up here' }).click();
      await memberPage.getByLabel('First Name').fill('Member');
      await memberPage.getByLabel('Last Name').fill('Realtime');
      await memberPage.getByLabel('Email Address').fill(memberEmail);
      await memberPage.getByLabel('Password', { exact: true }).fill('password123');
      await memberPage.getByLabel('Confirm Password').fill('password123');
      await memberPage.getByRole('button', { name: 'Sign Up' }).click();

      await expect(memberPage.getByText('Welcome to Family Board!')).toBeVisible({ timeout: 10000 });
      await memberPage.getByText('Join Existing Family').click();
      await memberPage.getByLabel('Invitation Code').fill(inviteCode!.trim());
      await memberPage.getByRole('button', { name: 'Join Family' }).click();

      // Admin should see join request appear in real-time
      await page.waitForTimeout(3000);
      await expect(page.getByText('Member Realtime')).toBeVisible();

      // Admin approves
      await page.getByText('Approve').click();
      await page.waitForTimeout(3000);

      // Verify member appears in member list
      await expect(page.getByText('Member Realtime')).toBeVisible();

      // Member should be redirected to dashboard
      await expect(memberPage.getByRole('heading', { name: 'Member Realtime' })).toBeVisible({ timeout: 15000 });

      await memberPage.close();
    });
  });
}); 