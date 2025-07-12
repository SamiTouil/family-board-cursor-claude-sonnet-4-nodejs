import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { CustomSelect } from '../ui/CustomSelect';
import { UserAvatar } from '../ui/UserAvatar';
import type { ResolvedTask, Task, User, CreateTaskOverrideData } from '../../types';
import './WeeklyCalendar.css';

interface TaskOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (overrideData: CreateTaskOverrideData) => Promise<void>;
  task?: ResolvedTask | undefined;
  bulkTasks?: ResolvedTask[];
  date: string;
  action: 'ADD' | 'REMOVE' | 'REASSIGN';
  availableTasks?: Task[];
  familyMembers?: User[];
  isLoading?: boolean;
}

export const TaskOverrideModal: React.FC<TaskOverrideModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  task,
  bulkTasks = [],
  date,
  action,
  availableTasks = [],
  familyMembers = []
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [overrideTime, setOverrideTime] = useState<string>('');
  const [overrideDuration, setOverrideDuration] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setSelectedTaskId(task.taskId);
      setSelectedMemberId(task.memberId || '');
      setOverrideTime(task.overrideTime || task.task.defaultStartTime || '09:00');
      setOverrideDuration(task.overrideDuration || task.task.defaultDuration || 30);
    } else if (isOpen && action === 'ADD') {
      setSelectedTaskId('');
      setSelectedMemberId('');
      setOverrideTime('09:00');
      setOverrideDuration(30);
    }
  }, [isOpen, task, action]);

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString + 'T00:00:00.000Z');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getModalTitle = (): string => {
    if (bulkTasks.length > 0) {
      switch (action) {
        case 'REASSIGN': return `Reassign ${bulkTasks.length} Tasks`;
        default: return 'Modify Tasks';
      }
    }
    switch (action) {
      case 'ADD': return 'Add Task';
      case 'REMOVE': return 'Remove Task';
      case 'REASSIGN': return 'Reassign Task';
      default: return 'Modify Task';
    }
  };

  const handleSubmit = async () => {
    // Validate member selection for reassign actions
    if (action === 'REASSIGN' && !selectedMemberId) {
      return; // Don't submit if no member is selected
    }

    // For bulk operations, we pass a special marker in the override data
    if (bulkTasks.length > 0 && action === 'REASSIGN') {
      const overrideData: CreateTaskOverrideData = {
        assignedDate: date,
        taskId: '', // This will be handled in the parent component
        action,
        originalMemberId: null,
        newMemberId: selectedMemberId,
        overrideTime: null,
        overrideDuration: null,
      };

      try {
        setIsSubmitting(true);
        await onConfirm(overrideData);
        onClose();
      } catch (error) {
        // Error handling is done in parent component
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Single task operation
      const overrideData: CreateTaskOverrideData = {
        assignedDate: date,
        taskId: action === 'ADD' ? selectedTaskId : task!.taskId,
        action,
        originalMemberId: action === 'REASSIGN' ? (task?.memberId || null) : null,
        newMemberId: action === 'ADD' || action === 'REASSIGN' ? selectedMemberId : null,
        overrideTime: action === 'ADD' || action === 'REASSIGN' ? overrideTime : null,
        overrideDuration: action === 'ADD' || action === 'REASSIGN' ? overrideDuration : null,
      };

      try {
        setIsSubmitting(true);
        await onConfirm(overrideData);
        onClose();
      } catch (error) {
        // Error handling is done in parent component
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const renderContent = () => (
    <>
      {bulkTasks.length === 0 && (
        <p>{action === 'ADD' ? `Add a new task to ${formatDate(date)}` :
            action === 'REMOVE' ? `Remove "${task?.task.name}" from ${formatDate(date)}` :
            `Reassign "${task?.task.name}" on ${formatDate(date)}`}</p>
      )}

      {action === 'ADD' && (
        <div className="task-override-form">
          <div className="form-group">
            <label>Select Task:</label>
            <CustomSelect
              value={selectedTaskId}
              onChange={(value) => setSelectedTaskId(String(value))}
              options={[
                { value: '', label: 'Choose a task...' },
                ...availableTasks.map(t => ({
                  value: t.id,
                  label: t.name
                }))
              ]}
              disabled={isSubmitting}
              placeholder="Choose a task..."
            />
          </div>

          <div className="form-group">
            <label>Assign to:</label>
            <CustomSelect
              value={selectedMemberId}
              onChange={(value) => setSelectedMemberId(String(value))}
              options={[
                { value: '', label: 'Choose a member...' },
                ...familyMembers.map(member => ({
                  value: member.id,
                  label: `${member.firstName} ${member.lastName}`
                }))
              ]}
              disabled={isSubmitting}
              placeholder="Choose a member..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time:</label>
              <input
                type="time"
                value={overrideTime}
                onChange={(e) => setOverrideTime(e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Duration (minutes):</label>
              <input
                type="number"
                min="1"
                max="1440"
                value={overrideDuration}
                onChange={(e) => setOverrideDuration(parseInt(e.target.value) || 30)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {action === 'REMOVE' && task && (
        <div className="task-override-form">
          <div className="confirmation-warning">
            <p>⚠️ Are you sure you want to remove this task?</p>
          </div>
        </div>
      )}

      {action === 'REASSIGN' && (task || bulkTasks.length > 0) && (
        <div className="task-override-form">
          {bulkTasks.length > 0 && (
            <div className="bulk-info">
              <p>Reassigning {bulkTasks.length} tasks from this shift:</p>
              <ul className="bulk-task-list">
                {bulkTasks.map((t, index) => (
                  <li key={`${t.taskId}-${index}`}>{t.task.name}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="form-group">
            <label>Reassign to:</label>
            <div className="member-avatar-grid">
              {familyMembers
                .filter(member => {
                  const currentMemberId = task?.memberId || bulkTasks[0]?.memberId;
                  return member.id !== currentMemberId;
                })
                .map(member => (
                  <div
                    key={member.id}
                    className={`member-avatar-option ${selectedMemberId === member.id ? 'selected' : ''}`}
                    onClick={() => !isSubmitting && handleMemberSelect(member.id)}
                  >
                    <UserAvatar
                      firstName={member.firstName}
                      lastName={member.lastName}
                      avatarUrl={member.avatarUrl ?? null}
                      size="large"
                    />
                    <span className="member-name">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>
                ))}
            </div>
            {familyMembers.filter(member => {
              const currentMemberId = task?.memberId || bulkTasks[0]?.memberId;
              return member.id !== currentMemberId;
            }).length === 0 && (
              <p className="no-members-message">No other family members available for reassignment.</p>
            )}
          </div>
          
          {/* Show time and duration fields only for single task reassignment */}
          {bulkTasks.length === 0 && task && (
            <div className="form-row">
              <div className="form-group">
                <label>Start Time:</label>
                <input
                  type="time"
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label>Duration (minutes):</label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={overrideDuration}
                  onChange={(e) => setOverrideDuration(parseInt(e.target.value) || 30)}
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <Modal
      title={getModalTitle()}
      isOpen={isOpen}
      onClose={onClose}
      onApply={handleSubmit}
      applyDisabled={
        isSubmitting || 
        (action === 'REASSIGN' && !selectedMemberId) ||
        (action === 'ADD' && (!selectedTaskId || !selectedMemberId))
      }
    >
      {renderContent()}
    </Modal>
  );
};
