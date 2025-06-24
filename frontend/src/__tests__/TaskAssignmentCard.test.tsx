import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ResolvedTaskCard } from '../features/tasks/components/TaskAssignmentCard';
import type { ResolvedTask } from '../types';

// Mock the UserAvatar component
vi.mock('../components/ui/UserAvatar', () => ({
  UserAvatar: ({ firstName, lastName }: { firstName: string; lastName: string }) => (
    <div data-testid="user-avatar">{firstName} {lastName}</div>
  ),
}));

const mockAssignedTask: ResolvedTask = {
  taskId: 'task-1',
  memberId: 'member-1',
  overrideTime: null,
  overrideDuration: null,
  source: 'template',
  task: {
    id: 'task-1',
    name: 'Clean Kitchen',
    description: 'Wipe down counters and load dishwasher',
    color: '#3b82f6',
    icon: '🧽',
    defaultStartTime: '09:00',
    defaultDuration: 30,
    isActive: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    familyId: 'family-1',
  },
  member: {
    id: 'member-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    avatarUrl: null,
    isVirtual: false,
  },
};

const mockUnassignedTask: ResolvedTask = {
  taskId: 'task-2',
  memberId: null,
  overrideTime: '14:30',
  overrideDuration: 45,
  source: 'override',
  task: {
    id: 'task-2',
    name: 'Vacuum Living Room',
    description: null,
    color: '#22c55e',
    icon: '🧹',
    defaultStartTime: '14:00',
    defaultDuration: 20,
    isActive: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    familyId: 'family-1',
  },
  member: null,
};

describe('ResolvedTaskCard', () => {
  it('renders assigned task correctly', () => {
    render(<ResolvedTaskCard resolvedTask={mockAssignedTask} />);
    
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
    render(<ResolvedTaskCard resolvedTask={mockUnassignedTask} />);
    
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

  it('shows source indicator when showSource is true', () => {
    render(<ResolvedTaskCard resolvedTask={mockAssignedTask} showSource={true} />);
    
    // Check template source indicator
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked and isClickable is true', () => {
    const mockOnClick = vi.fn();
    render(
      <ResolvedTaskCard 
        resolvedTask={mockAssignedTask} 
        onClick={mockOnClick}
        isClickable={true}
      />
    );
    
    const card = screen.getByTitle('Click to view task details');
    fireEvent.click(card);
    
    expect(mockOnClick).toHaveBeenCalledWith(mockAssignedTask);
  });

  it('does not call onClick when isClickable is false', () => {
    const mockOnClick = vi.fn();
    render(
      <ResolvedTaskCard 
        resolvedTask={mockAssignedTask} 
        onClick={mockOnClick}
        isClickable={false}
      />
    );
    
    const card = screen.getByText('Clean Kitchen').closest('.task-assignment-card');
    fireEvent.click(card!);
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('shows override button for admin users when onOverride is provided', () => {
    render(
      <ResolvedTaskCard 
        resolvedTask={mockAssignedTask} 
        onOverride={vi.fn()}
        isAdmin={true}
      />
    );
    
    expect(screen.getByTitle('Override this task')).toBeInTheDocument();
  });

  it('shows delete button for admin users when onDelete is provided', () => {
    render(
      <ResolvedTaskCard 
        resolvedTask={mockAssignedTask} 
        onDelete={vi.fn()}
        isAdmin={true}
      />
    );
    
    expect(screen.getByTitle('Delete this item')).toBeInTheDocument();
  });

  it('hides action buttons for non-admin users', () => {
    render(
      <ResolvedTaskCard 
        resolvedTask={mockAssignedTask} 
        onOverride={vi.fn()}
        onDelete={vi.fn()}
        isAdmin={false}
      />
    );
    
    expect(screen.queryByTitle('Override this task')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete this item')).not.toBeInTheDocument();
  });

  it('calls onOverride when override button is clicked', () => {
    const mockOnOverride = vi.fn();
    
    render(
      <ResolvedTaskCard 
        resolvedTask={mockAssignedTask} 
        onOverride={mockOnOverride}
        isAdmin={true}
      />
    );
    
    const overrideButton = screen.getByTitle('Override this task');
    fireEvent.click(overrideButton);
    
    expect(mockOnOverride).toHaveBeenCalledWith(mockAssignedTask);
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = vi.fn();
    
    render(
      <ResolvedTaskCard 
        resolvedTask={mockAssignedTask} 
        onDelete={mockOnDelete}
        isAdmin={true}
      />
    );
    
    const deleteButton = screen.getByTitle('Delete this item');
    fireEvent.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalledWith(mockAssignedTask);
  });

  it('formats duration correctly for hours and minutes', () => {
    const taskWithLongDuration: ResolvedTask = {
      ...mockAssignedTask,
      overrideDuration: 90, // 1h 30m
    };
    
    render(<ResolvedTaskCard resolvedTask={taskWithLongDuration} />);
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
  });

  it('formats duration correctly for hours only', () => {
    const taskWithHourDuration: ResolvedTask = {
      ...mockAssignedTask,
      overrideDuration: 120, // 2h
    };
    
    render(<ResolvedTaskCard resolvedTask={taskWithHourDuration} />);
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('handles missing task gracefully', () => {
    const taskWithoutTask: ResolvedTask = {
      ...mockAssignedTask,
      task: {
        ...mockAssignedTask.task,
        name: '',
        icon: '',
      },
    };
    
    render(<ResolvedTaskCard resolvedTask={taskWithoutTask} />);
    expect(screen.getByText('Unknown Task')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument(); // Default icon
  });
}); 