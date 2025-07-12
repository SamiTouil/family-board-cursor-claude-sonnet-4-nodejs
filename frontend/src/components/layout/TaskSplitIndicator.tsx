import React, { useEffect, useState, useRef } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useCurrentWeek } from '../../contexts/CurrentWeekContext';
import { analyticsApi } from '../../services/api';
import type { TaskSplitAnalytics } from '../../types';
import { UserAvatar } from '../ui/UserAvatar';
import './TaskSplitIndicator.css';

export const TaskSplitIndicator: React.FC = () => {
  const { currentFamily } = useFamily();
  const { on, off } = useWebSocket();
  const { currentWeekStart } = useCurrentWeek();
  const [analytics, setAnalytics] = useState<TaskSplitAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentFamily && currentWeekStart) {
      loadAnalytics();
    }
  }, [currentFamily, currentWeekStart]);

  // Listen for task schedule updates
  useEffect(() => {
    const handleTaskUpdate = () => {
      // Refresh analytics when tasks are modified
      if (currentFamily && currentWeekStart) {
        loadAnalytics();
      }
    };

    // Register WebSocket listener
    on('task-schedule-updated', handleTaskUpdate);

    // Cleanup
    return () => {
      off('task-schedule-updated', handleTaskUpdate);
    };
  }, [currentFamily, currentWeekStart, on, off]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const loadAnalytics = async () => {
    if (!currentFamily || !currentWeekStart) return;

    try {
      setIsLoading(true);
      const response = await analyticsApi.getTaskSplit(currentFamily.id, currentWeekStart);
      setAnalytics(response.data.data);
    } catch (error) {
      // Failed to load analytics - component will not render
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentFamily || isLoading || !analytics) {
    return null;
  }

  // Filter out virtual members for display
  const realMembers = analytics.memberStats.filter(member => !member.isVirtual);
  
  // Check if there are no tasks
  const hasNoTasks = analytics.totalMinutes === 0;
  
  // Get fairness indicator color
  const getFairnessColor = (score: number) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getFairnessLabel = (score: number) => {
    if (score >= 90) return 'Fair';
    if (score >= 70) return 'OK';
    return 'Unfair';
  };

  return (
    <div className="task-split-indicator" ref={dropdownRef}>
      <button
        className="task-split-indicator-button"
        onClick={() => setIsExpanded(!isExpanded)}
        title={`Task fairness: ${analytics.fairnessScore}%`}
      >
        <div className="task-split-indicator-content">
          <div 
            className="task-split-indicator-score"
            style={{ color: getFairnessColor(analytics.fairnessScore) }}
          >
            {analytics.fairnessScore}%
          </div>
          <div className="task-split-indicator-label">
            {getFairnessLabel(analytics.fairnessScore)}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="task-split-dropdown">
          <div className="task-split-dropdown-header">
            <h3>Task Distribution (4 weeks)</h3>
            <button 
              className="task-split-dropdown-close"
              onClick={() => setIsExpanded(false)}
            >
              ×
            </button>
          </div>
          
          <div className="task-split-members">
            {hasNoTasks ? (
              <div className="task-split-no-tasks">
                <p>No tasks assigned in the last 4 weeks</p>
                <p className="task-split-no-tasks-hint">Start assigning tasks to see distribution</p>
              </div>
            ) : realMembers.length === 0 ? (
              <div className="task-split-no-tasks">
                <p>No family members found</p>
              </div>
            ) : (
              realMembers.map(member => (
                <div key={member.memberId} className="task-split-member">
                  <div className="task-split-member-info">
                    <UserAvatar
                      firstName={member.firstName}
                      lastName={member.lastName}
                      avatarUrl={member.avatarUrl ?? null}
                      size="small"
                    />
                    <div className="task-split-member-name">
                      {member.memberName}
                    </div>
                  </div>
                  <div className="task-split-member-stats">
                    <div className="task-split-member-bar">
                      <div 
                        className="task-split-member-bar-fill"
                        style={{ width: `${member.percentage}%` }}
                      />
                    </div>
                    <div className="task-split-member-percentage">
                      {Math.round(member.percentage)}%
                    </div>
                  </div>
                  <div className="task-split-member-time">
                    {Math.floor(member.totalMinutes / 60)}h {member.totalMinutes % 60}m
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="task-split-summary">
            <div className="task-split-summary-item">
              <span>Total time:</span>
              <strong>{Math.floor(analytics.totalMinutes / 60)}h {analytics.totalMinutes % 60}m</strong>
            </div>
            <div className="task-split-summary-item">
              <span>Average per person:</span>
              <strong>{Math.floor(analytics.averageMinutesPerMember / 60)}h {analytics.averageMinutesPerMember % 60}m</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};