import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../ui/CustomSelect';
import type { ResolvedTask, Task, User, CreateTaskOverrideData } from '../../types';
import './WeeklyCalendar.css';

interface TaskOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (overrideData: CreateTaskOverrideData) => Promise<void>;
  task?: ResolvedTask | undefined;
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
      overrideTime: action === 'ADD' ? overrideTime : null,
      overrideDuration: action === 'ADD' ? overrideDuration : null,
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
              `Reassign "${task?.task.name}" on ${formatDate(date)}`}</p>

          {/* ADD Task Form */}
          {action === 'ADD' && (
            <div className="task-override-form">
              <div className="form-group">
                <label>Select Task:</label>
                <CustomSelect
                  value={selectedTaskId}
                  onChange={(value) => setSelectedTaskId(String(value))}
                  options={[
                    { value: '', label: 'Choose a task...' },
                    ...availableTasks.map(task => ({
                      value: task.id,
                      label: task.name
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
                <CustomSelect
                  value={selectedMemberId}
                  onChange={(value) => setSelectedMemberId(String(value))}
                  options={[
                    { value: '', label: 'Choose a member...' },
                    ...familyMembers.filter(member => member.id !== task.memberId).map(member => ({
                      value: member.id,
                      label: `${member.firstName} ${member.lastName}`
                    }))
                  ]}
                  disabled={isSubmitting}
                  placeholder="Choose a member..."
                />
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
