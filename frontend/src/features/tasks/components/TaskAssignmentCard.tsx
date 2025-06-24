import React from 'react';
import type { ResolvedTask } from '../../../types';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import './TaskAssignmentCard.css';

interface ResolvedTaskCardProps {
  resolvedTask: ResolvedTask;
  date?: string; // Optional date for context
  onClick?: (resolvedTask: ResolvedTask) => void;
  onOverride?: (resolvedTask: ResolvedTask) => void;
  onDelete?: (resolvedTask: ResolvedTask) => void; // For backward compatibility with template management
  isClickable?: boolean;
  isAdmin?: boolean;
  isLoading?: boolean;
  showSource?: boolean; // Whether to show if task comes from template or override
}

export const ResolvedTaskCard: React.FC<ResolvedTaskCardProps> = ({
  resolvedTask,
  onClick,
  onOverride,
  onDelete,
  isClickable = false,
  isAdmin = false,
  isLoading = false,
  showSource = false
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
    return resolvedTask.overrideTime || resolvedTask.task.defaultStartTime || '00:00';
  };

  const getDisplayDuration = (): number => {
    return resolvedTask.overrideDuration || resolvedTask.task.defaultDuration || 30;
  };

  const handleCardClick = () => {
    if (isClickable && onClick) {
      onClick(resolvedTask);
    }
  };

  const handleOverrideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOverride) {
      onOverride(resolvedTask);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(resolvedTask);
    }
  };

  return (
    <div 
      className={`task-assignment-card ${isClickable ? 'task-assignment-card-clickable' : ''}`}
      style={{ 
        borderColor: resolvedTask.task.color || '#6366f1',
        backgroundColor: `${resolvedTask.task.color || '#6366f1'}18`
      }}
      onClick={handleCardClick}
      title={isClickable ? 'Click to view task details' : undefined}
    >
      <div className="task-assignment-card-content">
        {/* Member Avatar - spans two lines on the left */}
        <div className="task-assignment-card-avatar">
          {resolvedTask.member ? (
            <UserAvatar
              firstName={resolvedTask.member.firstName}
              lastName={resolvedTask.member.lastName}
              avatarUrl={resolvedTask.member.avatarUrl}
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
              <span className="task-assignment-card-icon-emoji">{resolvedTask.task.icon || '✅'}</span>
              <h6 className="task-assignment-card-name">{resolvedTask.task.name || 'Unknown Task'}</h6>
              {showSource && (
                <span className={`task-assignment-card-source ${resolvedTask.source}`}>
                  {resolvedTask.source === 'template' ? '📋' : '✏️'}
                </span>
              )}
            </div>
            <div className="task-assignment-card-time-container">
              <span className="task-assignment-card-time">{getDisplayTime()}</span>
            </div>
          </div>
          
          <div className="task-assignment-card-description-row">
            {resolvedTask.task.description ? (
              <p className="task-assignment-card-description">{resolvedTask.task.description}</p>
            ) : (
              <div className="task-assignment-card-description-spacer"></div>
            )}
            <span className="task-assignment-card-duration">{formatDuration(getDisplayDuration())}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (onOverride || onDelete) && (
        <div className="task-assignment-card-actions">
          {onOverride && (
            <button
              className="task-assignment-card-action override"
              title="Override this task"
              onClick={handleOverrideClick}
              disabled={isLoading}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              className="task-assignment-card-action delete"
              title="Delete this item"
              onClick={handleDeleteClick}
              disabled={isLoading}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Keep the old component name for backward compatibility during migration
export const TaskAssignmentCard = ResolvedTaskCard; 