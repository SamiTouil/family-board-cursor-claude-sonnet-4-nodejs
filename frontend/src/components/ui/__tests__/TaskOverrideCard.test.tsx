import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { TaskOverrideCard } from '../TaskOverrideCard';
import type { ResolvedTask } from '../../../types';

// Mock UserAvatar component
vi.mock('../UserAvatar', () => ({
  UserAvatar: ({ firstName, lastName }: { firstName: string; lastName: string }) => (
    <div data-testid="user-avatar">{firstName} {lastName}</div>
  )
}));

const mockTask: ResolvedTask = {
  taskId: 'task-1',
  memberId: 'member-1',
  task: {
    id: 'task-1',
    name: 'Test Task',
    description: 'Test description',
    color: '#3b82f6',
    icon: 'task-icon',
    defaultStartTime: '09:00',
    defaultDuration: 60,
    isActive: true,
    familyId: 'family-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  member: {
    id: 'member-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    avatarUrl: null,
    isVirtual: false
  },
  source: 'template' as const,
  overrideTime: null,
  overrideDuration: null
};

const mockFormatTime = (time: string) => time;
const mockFormatDuration = (minutes: number) => `${minutes}min`;

describe('TaskOverrideCard', () => {
  it('renders task information correctly', () => {
    render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('60min')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
  });

  it('shows override indicator when task source is override', () => {
    const overrideTask = { ...mockTask, source: 'override' as const };
    
    render(
      <TaskOverrideCard
        task={overrideTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it('shows admin action buttons when user is admin', () => {
    const onRemove = vi.fn();
    const onReassign = vi.fn();

    render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={true}
        onRemove={onRemove}
        onReassign={onReassign}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    const removeButton = screen.getByTitle('Remove task');
    const reassignButton = screen.getByTitle('Reassign task');

    expect(removeButton).toBeInTheDocument();
    expect(reassignButton).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledWith(mockTask);

    fireEvent.click(reassignButton);
    expect(onReassign).toHaveBeenCalledWith(mockTask);
  });

  it('does not show admin action buttons when user is not admin', () => {
    render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    expect(screen.queryByTitle('Remove task')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Reassign task')).not.toBeInTheDocument();
  });

  it('uses override time and duration when available', () => {
    const taskWithOverrides = {
      ...mockTask,
      overrideTime: '10:30',
      overrideDuration: 90
    };

    render(
      <TaskOverrideCard
        task={taskWithOverrides}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('90min')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('task-override-card');
    expect(card).not.toHaveClass('is-override');
  });

  it('applies override CSS class when task source is override', () => {
    const overrideTask = { ...mockTask, source: 'override' as const };
    
    const { container } = render(
      <TaskOverrideCard
        task={overrideTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('task-override-card');
    expect(card).toHaveClass('is-override');
  });

  it('renders time and duration as separate tags with correct CSS classes', () => {
    const { container } = render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    const timeTag = container.querySelector('.time-tag');
    const durationTag = container.querySelector('.duration-tag');

    expect(timeTag).toBeInTheDocument();
    expect(durationTag).toBeInTheDocument();
    expect(timeTag).toHaveClass('task-override-card-tag', 'time-tag');
    expect(durationTag).toHaveClass('task-override-card-tag', 'duration-tag');
  });

  it('hides description when showDescription is false', () => {
    render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
        showDescription={false}
      />
    );

    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('shows description by default when showDescription is not provided', () => {
    render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
      />
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('applies compact CSS class when compact prop is true', () => {
    const { container } = render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
        compact={true}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('task-override-card');
    expect(card).toHaveClass('compact');
  });

  it('does not apply compact CSS class when compact prop is false or not provided', () => {
    const { container } = render(
      <TaskOverrideCard
        task={mockTask}
        taskIndex={0}
        isAdmin={false}
        formatTime={mockFormatTime}
        formatDuration={mockFormatDuration}
        compact={false}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('task-override-card');
    expect(card).not.toHaveClass('compact');
  });
}); 