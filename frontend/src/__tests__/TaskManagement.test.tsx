import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TaskManagement } from '../features/tasks/components/TaskManagement';
import { useFamily } from '../contexts/FamilyContext';
import { taskApi } from '../services/api';
import type { Family } from '../types';
import '../test/setup';

// Mock the contexts and API
vi.mock('../contexts/FamilyContext');
vi.mock('../services/api');

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseFamily = vi.mocked(useFamily);
const mockTaskApi = vi.mocked(taskApi);

// Helper to create mock axios response
const createMockAxiosResponse = (data: any) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

const mockFamily: Family = {
  id: 'family-1',
  name: 'Test Family',
  description: 'Test family description',
  avatarUrl: undefined,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  creator: {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  memberCount: 2,
  userRole: 'ADMIN' as const,
};

const mockTasks = [
  {
    id: 'task-1',
    name: 'Clean Kitchen',
    description: 'Clean all surfaces and dishes',
    color: '#FF5733',
    icon: 'cleaning',
    defaultStartTime: '09:00',
    defaultDuration: 60,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    familyId: 'family-1',
  },
  {
    id: 'task-2',
    name: 'Walk Dog',
    description: null,
    color: '#33FF57',
    icon: 'petcare',
    defaultStartTime: '07:00',
    defaultDuration: 30,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    familyId: 'family-1',
  },
];

describe('TaskManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
      families: [mockFamily],
      loading: false,
      hasCompletedOnboarding: true,
      pendingJoinRequests: [],
      approvalNotification: null,
      createFamily: vi.fn(),
      joinFamily: vi.fn(),
      setCurrentFamily: vi.fn(),
      refreshFamilies: vi.fn(),
      loadPendingJoinRequests: vi.fn(),
      cancelJoinRequest: vi.fn(),
      dismissApprovalNotification: vi.fn(),
    });
  });

  it('renders task management header', () => {
    mockTaskApi.getFamilyTasks.mockResolvedValue(
      createMockAxiosResponse({ success: true, data: [] })
    );

    render(<TaskManagement />);
    
    expect(screen.getByText('tasks.management')).toBeDefined();
  });

  it('loads and displays tasks on mount', async () => {
    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: mockTasks },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      expect(screen.getByText('Clean Kitchen')).toBeDefined();
      expect(screen.getByText('Walk Dog')).toBeDefined();
    });

    expect(mockTaskApi.getFamilyTasks).toHaveBeenCalledWith('family-1', { isActive: true });
  });

  it('shows empty state when no tasks exist', async () => {
    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: [] },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      expect(screen.getByText('tasks.noTasks')).toBeDefined();
      expect(screen.getByText('tasks.noTasksDescription')).toBeDefined();
    });
  });

  it('shows create task button for admins', async () => {
    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: [] },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      expect(screen.getByText('tasks.createFirstTask')).toBeDefined();
    });
  });

  it('hides create task button for non-admins', async () => {
    const memberFamily: Family = { ...mockFamily, userRole: 'MEMBER' };
    mockUseFamily.mockReturnValue({
      currentFamily: memberFamily,
      families: [memberFamily],
      loading: false,
      hasCompletedOnboarding: true,
      pendingJoinRequests: [],
      approvalNotification: null,
      createFamily: vi.fn(),
      joinFamily: vi.fn(),
      setCurrentFamily: vi.fn(),
      refreshFamilies: vi.fn(),
      loadPendingJoinRequests: vi.fn(),
      cancelJoinRequest: vi.fn(),
      dismissApprovalNotification: vi.fn(),
    });

    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: [] },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      expect(screen.queryByText('tasks.createFirstTask')).toBeNull();
    });
  });

  it('opens create task form when create button is clicked', async () => {
    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: [] },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      const createButton = screen.getByText('tasks.createFirstTask');
      fireEvent.click(createButton);
    });

    expect(screen.getByText('tasks.createTask')).toBeDefined();
    expect(screen.getByLabelText('tasks.name')).toBeDefined();
    expect(screen.getByLabelText('tasks.color')).toBeDefined();
  });

  it('creates a new task successfully', async () => {
    const newTask = {
      id: 'new-task-1',
      name: 'New Task',
      description: 'Test description',
      color: '#6366f1',
      icon: 'task',
      defaultStartTime: '09:00',
      defaultDuration: 45,
      isActive: true,
      familyId: 'family-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: [] },
    });
    mockTaskApi.createTask.mockResolvedValue({
      data: { success: true, data: newTask },
    });

    render(<TaskManagement />);

    // Wait for initial load and open create form
    await waitFor(() => {
      expect(screen.getByText('tasks.createFirstTask')).toBeDefined();
    });

    fireEvent.click(screen.getByText('tasks.createFirstTask'));

    // Wait for form to be visible by checking for form elements
    await waitFor(() => {
      expect(screen.getByLabelText('tasks.name')).toBeDefined();
    });

    // Fill form
    const nameInput = screen.getByLabelText('tasks.name');
    const descriptionInput = screen.getByLabelText('tasks.description (common.optional)');
    const durationInput = screen.getByLabelText('tasks.defaultDuration (tasks.minutes)');

    fireEvent.change(nameInput, {
      target: { value: 'New Task' },
    });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    });
    fireEvent.change(durationInput, {
      target: { value: '45' },
    });

    // Submit form by clicking the submit button
    const submitButton = screen.getByRole('button', { name: 'tasks.createTask' });
    fireEvent.click(submitButton);

    // Wait for API call
    await waitFor(() => {
      expect(mockTaskApi.createTask).toHaveBeenCalledWith('family-1', {
        name: 'New Task',
        description: 'Test description',
        color: '#6366f1',
        icon: '✅',
        defaultStartTime: '09:00',
        defaultDuration: 45,
      });
    }, { timeout: 3000 });

    // Check success message
    await waitFor(() => {
      expect(screen.getByText('tasks.created')).toBeDefined();
    });
  });

  it('validates required fields when creating task', async () => {
    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: [] },
    });

    render(<TaskManagement />);

    // Wait for initial load and open create form
    await waitFor(() => {
      expect(screen.getByText('tasks.createFirstTask')).toBeDefined();
    });

    fireEvent.click(screen.getByText('tasks.createFirstTask'));

    // Wait for form to be visible by checking for form elements
    await waitFor(() => {
      expect(screen.getByLabelText('tasks.name')).toBeDefined();
    });

    // Submit form without filling required fields (name should be empty by default)
    const submitButton = screen.getByRole('button', { name: 'tasks.createTask' });
    fireEvent.click(submitButton);

    // Wait for validation error to appear
    await waitFor(() => {
      expect(screen.getByText('tasks.validation.nameRequired')).toBeDefined();
    }, { timeout: 3000 });

    // Ensure API was not called
    expect(mockTaskApi.createTask).not.toHaveBeenCalled();
  });

  it('opens edit form when task is clicked', async () => {
    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: mockTasks },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      const taskElements = screen.getAllByTitle('Click to edit task');
      // Click on the second task (Clean Kitchen at 09:00) since tasks are now sorted by time
      // First task is now "Walk Dog" at 07:00, second is "Clean Kitchen" at 09:00
      fireEvent.click(taskElements[1]);
    });

    // Check that form is pre-filled with task data
    expect(screen.getByDisplayValue('Clean Kitchen')).toBeDefined();
    expect(screen.getByDisplayValue('Clean all surfaces and dishes')).toBeDefined();
    expect(screen.getByDisplayValue('60')).toBeDefined();
  });

  it('updates a task successfully', async () => {
    const updatedTask = {
      ...mockTasks[0],
      name: 'Updated Task Name',
      description: 'Updated description',
    };

    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: mockTasks },
    });
    mockTaskApi.updateTask.mockResolvedValue({
      data: { success: true, data: updatedTask },
    });

    render(<TaskManagement />);

    // Open edit form by clicking on task
    await waitFor(() => {
      const taskElements = screen.getAllByTitle('Click to edit task');
      // Click on the second task (Clean Kitchen at 09:00) since tasks are now sorted by time
      fireEvent.click(taskElements[1]);
    });

    // Update task name
    fireEvent.change(screen.getByDisplayValue('Clean Kitchen'), {
      target: { value: 'Updated Task Name' },
    });

    // Submit form
    fireEvent.click(screen.getByText('Update Task'));

    await waitFor(() => {
      expect(mockTaskApi.updateTask).toHaveBeenCalledWith('task-1', {
        name: 'Updated Task Name',
        description: 'Clean all surfaces and dishes',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
      });
    });
  });

  it('deletes a task successfully', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: mockTasks },
    });
    mockTaskApi.delete.mockResolvedValue({
      data: { success: true, data: { message: 'Task deleted' } },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('common.delete');
      // Click on the second delete button (Clean Kitchen at 09:00) since tasks are now sorted by time
      // First task is now "Walk Dog" (task-2), second is "Clean Kitchen" (task-1)
      fireEvent.click(deleteButtons[1]);
    });

    await waitFor(() => {
      expect(mockTaskApi.delete).toHaveBeenCalledWith('task-1');
    });

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('cancels delete when user clicks cancel in confirmation', async () => {
    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);

    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: mockTasks },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('common.delete');
      fireEvent.click(deleteButtons[0]);
    });

    expect(mockTaskApi.delete).not.toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('handles API errors gracefully', async () => {
    mockTaskApi.getFamilyTasks.mockRejectedValue(new Error('API Error'));

    render(<TaskManagement />);

    await waitFor(() => {
      expect(screen.getByText('tasks.loadError')).toBeDefined();
    });
  });

  it('displays task details correctly', async () => {
    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: mockTasks },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      // Check task names
      expect(screen.getByText('Clean Kitchen')).toBeDefined();
      expect(screen.getByText('Walk Dog')).toBeDefined();

      // Check task descriptions
      expect(screen.getByText('Clean all surfaces and dishes')).toBeDefined();

      // Check task times and durations
      expect(screen.getByText('09:00')).toBeDefined();
      expect(screen.getByText('07:00')).toBeDefined();
      expect(screen.getByText('1h')).toBeDefined(); // 60 minutes = 1h
      expect(screen.getByText('30m')).toBeDefined();
    });
  });

  it('formats duration correctly', async () => {
    const tasksWithVariousDurations = [
      { ...mockTasks[0], defaultDuration: 30 }, // 30m
      { ...mockTasks[0], id: 'task-2', defaultDuration: 60 }, // 1h
      { ...mockTasks[0], id: 'task-3', defaultDuration: 90 }, // 1h 30m
      { ...mockTasks[0], id: 'task-4', defaultDuration: 120 }, // 2h
    ];

    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: tasksWithVariousDurations },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      expect(screen.getByText('30m')).toBeDefined();
      expect(screen.getByText('1h')).toBeDefined();
      expect(screen.getByText('1h 30m')).toBeDefined();
      expect(screen.getByText('2h')).toBeDefined();
    });
  });

  it('sorts tasks by default start time in chronological order', async () => {
    const unsortedTasks = [
      {
        id: 'task-1',
        name: 'Evening Task',
        description: 'Task at 18:00',
        color: '#FF5733',
        icon: 'evening',
        defaultStartTime: '18:00',
        defaultDuration: 30,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        familyId: 'family-1',
      },
      {
        id: 'task-2',
        name: 'Morning Task',
        description: 'Task at 07:00',
        color: '#33FF57',
        icon: 'morning',
        defaultStartTime: '07:00',
        defaultDuration: 45,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        familyId: 'family-1',
      },
      {
        id: 'task-3',
        name: 'Afternoon Task',
        description: 'Task at 14:30',
        color: '#3357FF',
        icon: 'afternoon',
        defaultStartTime: '14:30',
        defaultDuration: 60,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        familyId: 'family-1',
      },
    ];

    mockTaskApi.getFamilyTasks.mockResolvedValue({
      data: { success: true, data: unsortedTasks },
    });

    render(<TaskManagement />);

    await waitFor(() => {
      // Check that all tasks are displayed
      expect(screen.getByText('Morning Task')).toBeDefined();
      expect(screen.getByText('Afternoon Task')).toBeDefined();
      expect(screen.getByText('Evening Task')).toBeDefined();
      
      // Verify chronological order by checking the DOM structure
      const taskNames = screen.getAllByText(/(Morning|Afternoon|Evening) Task$/).map(el => el.textContent);
      expect(taskNames).toEqual(['Morning Task', 'Afternoon Task', 'Evening Task']);
    });
  });

  it('returns null when no current family is selected', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: null,
      families: [],
      loading: false,
      hasCompletedOnboarding: false,
      pendingJoinRequests: [],
      approvalNotification: null,
      createFamily: vi.fn(),
      joinFamily: vi.fn(),
      setCurrentFamily: vi.fn(),
      refreshFamilies: vi.fn(),
      loadPendingJoinRequests: vi.fn(),
      cancelJoinRequest: vi.fn(),
      dismissApprovalNotification: vi.fn(),
    });

    const { container } = render(<TaskManagement />);
    expect(container.firstChild).toBeNull();
  });


}); 