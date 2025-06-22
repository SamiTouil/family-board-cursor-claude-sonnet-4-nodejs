import React from 'react';
import { TaskAssignment } from '../services/api';
import { UserAvatar } from './UserAvatar';
import './TaskAssignmentCard.css';

interface TaskAssignmentCardProps {
  assignment: TaskAssignment;
  onClick?: (assignment: TaskAssignment) => void;
  onDelete?: (assignmentId: string) => void;
  isClickable?: boolean;
  isAdmin?: boolean;
  isLoading?: boolean;
}

export const TaskAssignmentCard: React.FC<TaskAssignmentCardProps> = ({
  assignment,
  onClick,
  onDelete,
  isClickable = false,
  isAdmin = false,
  isLoading = false
}) => {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${mins}m`;
  };

  const getDisplayTime = (): string => {
    return assignment.overrideTime || assignment.task?.defaultStartTime || '00:00';
  };

  const getDisplayDuration = (): number => {
    return assignment.overrideDuration || assignment.task?.defaultDuration || 30;
  };

  const getDisplayDate = (): string => {
    const date = new Date(assignment.assignedDate);
    return date.toLocaleDateString();
  };

  const handleCardClick = () => {
    if (isClickable && onClick) {
      onClick(assignment);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm('Are you sure you want to delete this task assignment?')) {
      onDelete(assignment.id);
    }
  };

  return (
    <div 
      className={`task-assignment-card ${isClickable ? 'task-assignment-card-clickable' : ''}`}
      style={{ 
        borderColor: assignment.task?.color || '#6366f1',
        backgroundColor: `${assignment.task?.color || '#6366f1'}18`
      }}
      onClick={handleCardClick}
      title={isClickable ? 'Click to edit assignment' : undefined}
    >
      <div className="task-assignment-card-content">
        {/* Member Avatar - spans two lines on the left */}
        <div className="task-assignment-card-avatar">
          {assignment.member ? (
            <UserAvatar
              firstName={assignment.member.firstName}
              lastName={assignment.member.lastName}
              avatarUrl={assignment.member.avatarUrl}
              size="medium"
            />
          ) : (
            <div className="task-assignment-card-unassigned-avatar">
              <div className="task-assignment-card-unassigned-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Task Info */}
        <div className="task-assignment-card-info">
          <div className="task-assignment-card-header">
            <div className="task-assignment-card-title">
              <span className="task-assignment-card-icon-emoji">{assignment.task?.icon || '✅'}</span>
              <h6 className="task-assignment-card-name">{assignment.task?.name || 'Unknown Task'}</h6>
            </div>
            <div className="task-assignment-card-time-container">
              <span className="task-assignment-card-time">{getDisplayTime()}</span>
            </div>
          </div>
          
          <div className="task-assignment-card-description-row">
            <div className="task-assignment-card-details">
              {assignment.member ? (
                <span className="task-assignment-card-member-name">
                  {assignment.member.firstName} {assignment.member.lastName}
                </span>
              ) : (
                <span className="task-assignment-card-unassigned-text">Unassigned</span>
              )}
              <span className="task-assignment-card-date">{getDisplayDate()}</span>
            </div>
            <span className="task-assignment-card-duration">{formatDuration(getDisplayDuration())}</span>
          </div>

          {assignment.task?.description && (
            <div className="task-assignment-card-task-description">
              <p className="task-assignment-card-description">{assignment.task.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="task-assignment-card-actions">
          <button
            className="task-assignment-card-action delete"
            title="Delete assignment"
            onClick={handleDeleteClick}
            disabled={isLoading}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}; 