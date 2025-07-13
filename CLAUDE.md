# Claude Memory - Family Board Project

## Testing Guidelines

### Always Check Tests Before Committing
When making changes to any component or functionality, ALWAYS check if there are unit tests or Playwright tests that test the component you modified. This includes:

1. **Frontend Unit Tests**: Located in `frontend/src/**/__tests__/*.test.tsx`
   - Run with: `cd frontend && npm test`
   - Check for tests related to any React components you modify
   - Update tests when changing component behavior (e.g., replacing buttons with dropdowns)

2. **Backend Unit Tests**: Located in `backend/**/*.test.ts`
   - Run with: `cd backend && npm test`
   - Check for tests related to any API endpoints or services you modify

3. **Playwright E2E Tests**: Located in `e2e-tests/tests/*.spec.ts`
   - Run with: `cd e2e-tests && npm test`
   - Check for tests that interact with UI elements you've changed

### Common Test Update Scenarios
- When replacing buttons with dropdown menus, update test selectors from `screen.getByTitle()` to `screen.getByText()` or `screen.getByRole()`
- When changing text content, update corresponding test assertions
- When modifying component structure, ensure test queries still find the right elements

### Example
If you change from:
```tsx
<button title="Edit task">Edit</button>
```

To a dropdown menu with:
```tsx
<DropdownMenu items={[{ label: 'Edit task', ... }]} />
```

Update the test from:
```tsx
screen.getByTitle('Edit task')
```

To:
```tsx
// First click the dropdown trigger
const dropdownButtons = screen.getAllByRole('button', { name: '�' });
fireEvent.click(dropdownButtons[0]);

// Then click the menu item
const editOption = screen.getByText('Edit task');
fireEvent.click(editOption);
```

## Project-Specific Commands

### Lint and Type Checking
Before committing changes, always run:
- Frontend: `cd frontend && npm run lint && npm run typecheck`
- Backend: `cd backend && npm run lint && npm run typecheck`

If these commands are not available, ask the user for the correct commands and update this file.

## Git Branch Management

### Clean Up After PR Merge
When the user tells you they have merged a PR, ALWAYS clean up both local and remote branches:

1. **Switch to main branch**: `git checkout main`
2. **Pull latest changes**: `git pull origin main`
3. **Delete local feature branch**: `git branch -d <branch-name>`
4. **Delete remote feature branch**: `git push origin --delete <branch-name>`

Example workflow after PR merge:
```bash
git checkout main
git pull origin main
git branch -d feat/dropdown-menu-and-ui-improvements
git push origin --delete feat/dropdown-menu-and-ui-improvements
```

This keeps the repository clean and prevents accumulation of stale branches.