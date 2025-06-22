import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TaskAssignmentCard } from '../components/TaskAssignmentCard';
import { TaskAssignment } from '../services/api';

// Mock the UserAvatar component
vi.mock('../components/UserAvatar', () => ({
  UserAvatar: ({ firstName, lastName }: { firstName: string; lastName: string }) => (
    <div data-testid="user-avatar">{firstName} {lastName}</div>
  ),
}));

const mockAssignedTask: TaskAssignment = {
  id: 'assignment-1',
  memberId: 'member-1',
  taskId: 'task-1',
  overrideTime: null,
  overrideDuration: null,
  assignedDate: '2024-01-15T00:00:00.000Z',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  member: {
    id: 'member-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    avatarUrl: null,
    isVirtual: false,
  },
  task: {
    id: 'task-1',
    name: 'Clean Kitchen',
    description: 'Wipe down counters and load dishwasher',
    color: '#3b82f6',
    icon: '🧽',
    defaultStartTime: '09:00',
    defaultDuration: 30,
    familyId: 'family-1',
  },
};

const mockUnassignedTask: TaskAssignment = {
  id: 'assignment-2',
  memberId: null,
  taskId: 'task-2',
  overrideTime: '14:30',
  overrideDuration: 45,
  assignedDate: '2024-01-15T00:00:00.000Z',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  member: null,
  task: {
    id: 'task-2',
    name: 'Vacuum Living Room',
    description: null,
    color: '#22c55e',
    icon: '🧹',
    defaultStartTime: '14:00',
    defaultDuration: 20,
    familyId: 'family-1',
  },
};

describe('TaskAssignmentCard', () => {
  it('renders assigned task correctly', () => {
    render(<TaskAssignmentCard assignment={mockAssignedTask} />);
    
    // Check task name and icon
    expect(screen.getByText('Clean Kitchen')).toBeInTheDocument();
    expect(screen.getByText('🧽')).toBeInTheDocument();
    
    // Check member avatar is rendered
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    
    // Check time (should use task default time since no override)
    expect(screen.getByText('09:00')).toBeInTheDocument();
    
    // Check duration (should use task default duration since no override)
    expect(screen.getByText('30m')).toBeInTheDocument();
    
    // Check description
    expect(screen.getByText('Wipe down counters and load dishwasher')).toBeInTheDocument();
  });

  it('renders unassigned task correctly', () => {
    render(<TaskAssignmentCard assignment={mockUnassignedTask} />);
    
    // Check task name and icon
    expect(screen.getByText('Vacuum Living Room')).toBeInTheDocument();
    expect(screen.getByText('🧹')).toBeInTheDocument();
    
    // Check unassigned state (no user avatar, clock icon instead)
    expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument();
    
    // Check override time is used
    expect(screen.getByText('14:30')).toBeInTheDocument();
    
    // Check override duration is used
    expect(screen.getByText('45m')).toBeInTheDocument();
    
    // Check no description is shown (task has null description)
    expect(screen.queryByText('Wipe down counters and load dishwasher')).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked and isClickable is true', () => {
    const mockOnClick = vi.fn();
    render(
      <TaskAssignmentCard 
        assignment={mockAssignedTask} 
        onClick={mockOnClick}
        isClickable={true}
      />
    );
    
    const card = screen.getByTitle('Click to edit assignment');
    fireEvent.click(card);
    
    expect(mockOnClick).toHaveBeenCalledWith(mockAssignedTask);
  });

  it('does not call onClick when isClickable is false', () => {
    const mockOnClick = vi.fn();
    render(
      <TaskAssignmentCard 
        assignment={mockAssignedTask} 
        onClick={mockOnClick}
        isClickable={false}
      />
    );
    
    const card = screen.getByText('Clean Kitchen').closest('.task-assignment-card');
    fireEvent.click(card!);
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('shows delete button for admin users', () => {
    render(
      <TaskAssignmentCard 
        assignment={mockAssignedTask} 
        isAdmin={true}
      />
    );
    
    expect(screen.getByTitle('Delete assignment')).toBeInTheDocument();
  });

  it('hides delete button for non-admin users', () => {
    render(
      <TaskAssignmentCard 
        assignment={mockAssignedTask} 
        isAdmin={false}
      />
    );
    
    expect(screen.queryByTitle('Delete assignment')).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked and confirmed', () => {
    const mockOnDelete = vi.fn();
    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(
      <TaskAssignmentCard 
        assignment={mockAssignedTask} 
        onDelete={mockOnDelete}
        isAdmin={true}
      />
    );
    
    const deleteButton = screen.getByTitle('Delete assignment');
    fireEvent.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this task assignment?');
    expect(mockOnDelete).toHaveBeenCalledWith('assignment-1');
    
    confirmSpy.mockRestore();
  });

  it('does not call onDelete when delete is cancelled', () => {
    const mockOnDelete = vi.fn();
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(
      <TaskAssignmentCard 
        assignment={mockAssignedTask} 
        onDelete={mockOnDelete}
        isAdmin={true}
      />
    );
    
    const deleteButton = screen.getByTitle('Delete assignment');
    fireEvent.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  it('formats duration correctly for hours and minutes', () => {
    const taskWithLongDuration: TaskAssignment = {
      ...mockAssignedTask,
      overrideDuration: 90, // 1 hour 30 minutes
    };
    
    render(<TaskAssignmentCard assignment={taskWithLongDuration} />);
    
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
  });

  it('formats duration correctly for hours only', () => {
    const taskWithHourDuration: TaskAssignment = {
      ...mockAssignedTask,
      overrideDuration: 120, // 2 hours exactly
    };
    
    render(<TaskAssignmentCard assignment={taskWithHourDuration} />);
    
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('handles missing task data gracefully', () => {
    const taskWithoutTask: TaskAssignment = {
      ...mockAssignedTask,
      task: undefined,
    };
    
    render(<TaskAssignmentCard assignment={taskWithoutTask} />);
    
    expect(screen.getByText('Unknown Task')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument(); // Default icon
    expect(screen.getByText('00:00')).toBeInTheDocument(); // Default time
  });
}); 