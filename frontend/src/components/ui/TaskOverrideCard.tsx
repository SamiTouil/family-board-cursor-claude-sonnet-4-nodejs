import React from 'react';
import { UserAvatar } from './UserAvatar';
import type { ResolvedTask } from '../../types';
import './TaskOverrideCard.css';

interface TaskOverrideCardProps {
  task: ResolvedTask;
  taskIndex: number;
  isAdmin: boolean;
  onRemove?: (task: ResolvedTask) => void;
  onReassign?: (task: ResolvedTask) => void;
  onEdit?: (task: ResolvedTask) => void;
  formatTime: (time: string) => string;
  formatDuration: (minutes: number) => string;
  showDescription?: boolean;
  compact?: boolean;
}

export const TaskOverrideCard: React.FC<TaskOverrideCardProps> = ({
  task,
  taskIndex,
  isAdmin,
  onRemove,
  onReassign,
  onEdit,
  formatTime,
  formatDuration,
  showDescription = true,
  compact = false
}) => {
  const startTime = task.overrideTime || task.task.defaultStartTime;
  const duration = task.overrideDuration || task.task.defaultDuration;

  return (
    <div 
      key={`${task.taskId}-${task.memberId}-${taskIndex}`}
      className={`task-override-card ${task.source === 'override' ? 'is-override' : ''} ${compact ? 'compact' : ''} ${onEdit ? 'editable' : ''}`}
      style={{ 
        borderLeftColor: task.task.color,
        backgroundColor: `${task.task.color}10`
      }}
    >
      <div className="task-override-card-main">
        <div className="task-override-card-info">
          <h4 className="task-override-card-name">
            {task.task.name}
          </h4>
          <div className="task-override-card-tags">
            <span className="task-override-card-tag time-tag">
              {formatTime(startTime)}
            </span>
            <span className="task-override-card-tag duration-tag">
              {formatDuration(duration)}
            </span>
          </div>
        </div>
        
        {task.member && (
          <div className="task-override-card-member">
            <UserAvatar
              firstName={task.member.firstName}
              lastName={task.member.lastName}
              avatarUrl={task.member.avatarUrl}
              size={compact ? "extra-small" : "small"}
            />
          </div>
        )}
      </div>
      
      {showDescription && task.task.description && (
        <div className="task-override-card-description">
          {task.task.description}
        </div>
      )}
      
      {task.source === 'override' && (
        <div className="task-override-card-source">
          Modified
        </div>
      )}
      
      {/* Task Action Buttons */}
      {isAdmin && (
        <div className="task-override-card-actions">
          {onEdit && (
            <button
              className="task-override-action-btn edit"
              onClick={() => onEdit(task)}
              title="Edit task"
            >
              ✏️
            </button>
          )}
          <button
            className="task-override-action-btn remove"
            onClick={() => onRemove?.(task)}
            title="Remove task"
          >
            ×
          </button>
          {onReassign && (
            <button
              className="task-override-action-btn reassign"
              onClick={() => onReassign?.(task)}
              title="Reassign task"
            >
              ↻
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 