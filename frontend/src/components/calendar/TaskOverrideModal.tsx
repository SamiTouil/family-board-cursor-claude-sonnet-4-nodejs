import React, { useState, useEffect } from 'react';
import type { ResolvedTask, Task, User, CreateTaskOverrideData } from '../../types';
import './WeeklyCalendar.css';

interface TaskOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (overrideData: CreateTaskOverrideData) => Promise<void>;
  task?: ResolvedTask | undefined;
  date: string;
  action: 'ADD' | 'REMOVE' | 'REASSIGN' | 'MODIFY_TIME';
  availableTasks?: Task[];
  familyMembers?: User[];
  isLoading?: boolean;
}

export const TaskOverrideModal: React.FC<TaskOverrideModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  task,
  date,
  action,
  availableTasks = [],
  familyMembers = []
}) => {
  // Form state
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [overrideTime, setOverrideTime] = useState<string>('');
  const [overrideDuration, setOverrideDuration] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form state when modal opens
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
    const date = new Date(dateString + 'T00:00:00.000Z');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getModalTitle = (): string => {
    switch (action) {
      case 'ADD': return 'Add Task';
      case 'REMOVE': return 'Remove Task';
      case 'REASSIGN': return 'Reassign Task';
      case 'MODIFY_TIME': return 'Modify Task Time';
      default: return 'Modify Task';
    }
  };

  const handleSubmit = async () => {
    const overrideData: CreateTaskOverrideData = {
      assignedDate: date,
      taskId: action === 'ADD' ? selectedTaskId : task!.taskId,
      action,
      originalMemberId: action === 'REASSIGN' ? (task?.memberId || null) : null,
      newMemberId: action === 'ADD' || action === 'REASSIGN' ? selectedMemberId : null,
      overrideTime: action === 'MODIFY_TIME' || action === 'ADD' ? overrideTime : null,
      overrideDuration: action === 'MODIFY_TIME' || action === 'ADD' ? overrideDuration : null,
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
  };

  const isFormValid = (): boolean => {
    switch (action) {
      case 'ADD':
        return selectedTaskId !== '' && selectedMemberId !== '';
      case 'REMOVE':
        return true;
      case 'REASSIGN':
        return selectedMemberId !== '' && selectedMemberId !== task?.memberId;
      case 'MODIFY_TIME':
        return overrideTime !== '' && overrideDuration > 0;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="weekly-calendar-modal-overlay">
      <div className="weekly-calendar-modal">
        <div className="weekly-calendar-modal-header">
          <h3>{getModalTitle()}</h3>
          <button
            onClick={onClose}
            className="weekly-calendar-modal-close"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>
        
        <div className="weekly-calendar-modal-content">
          <p>{action === 'ADD' ? `Add a new task to ${formatDate(date)}` : 
              action === 'REMOVE' ? `Remove "${task?.task.name}" from ${formatDate(date)}` :
              action === 'REASSIGN' ? `Reassign "${task?.task.name}" on ${formatDate(date)}` :
              `Modify time for "${task?.task.name}" on ${formatDate(date)}`}</p>

          {/* ADD Task Form */}
          {action === 'ADD' && (
            <div className="task-override-form">
              <div className="form-group">
                <label>Select Task:</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="form-select"
                  disabled={isSubmitting}
                >
                  <option value="">Choose a task...</option>
                  {availableTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Assign to:</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="form-select"
                  disabled={isSubmitting}
                >
                  <option value="">Choose a member...</option>
                  {familyMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
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

          {/* REMOVE Task Confirmation */}
          {action === 'REMOVE' && task && (
            <div className="task-override-form">
              <div className="confirmation-warning">
                <p>⚠️ Are you sure you want to remove this task?</p>
              </div>
            </div>
          )}

          {/* REASSIGN Task Form */}
          {action === 'REASSIGN' && task && (
            <div className="task-override-form">
              <div className="form-group">
                <label>Reassign to:</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="form-select"
                  disabled={isSubmitting}
                >
                  <option value="">Choose a member...</option>
                  {familyMembers.filter(member => member.id !== task.memberId).map(member => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* MODIFY_TIME Task Form */}
          {action === 'MODIFY_TIME' && task && (
            <div className="task-override-form">
              <div className="form-row">
                <div className="form-group">
                  <label>New Start Time:</label>
                  <input
                    type="time"
                    value={overrideTime}
                    onChange={(e) => setOverrideTime(e.target.value)}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label>New Duration (minutes):</label>
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
        </div>

        <div className="weekly-calendar-modal-actions">
          <button
            onClick={onClose}
            className="weekly-calendar-button weekly-calendar-button-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`weekly-calendar-button ${action === 'REMOVE' ? 'weekly-calendar-button-danger' : 'weekly-calendar-button-primary'}`}
            disabled={!isFormValid() || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : action === 'REMOVE' ? 'Remove Task' : 'Apply Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
