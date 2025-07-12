import React, { useEffect, useState, useRef } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { analyticsApi } from '../../services/api';
import type { TaskSplitAnalytics } from '../../types';
import './TaskSplitIndicator.css';

export const TaskSplitIndicator: React.FC = () => {
  const { currentFamily } = useFamily();
  const [analytics, setAnalytics] = useState<TaskSplitAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentFamily) {
      loadAnalytics();
    }
  }, [currentFamily]);

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
    if (!currentFamily) return;

    try {
      setIsLoading(true);
      const response = await analyticsApi.getTaskSplit(currentFamily.id);
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to load task split analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentFamily || isLoading || !analytics) {
    return null;
  }

  // Filter out virtual members for display
  const realMembers = analytics.memberStats.filter(member => !member.isVirtual);
  
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
            {realMembers.map(member => (
              <div key={member.memberId} className="task-split-member">
                <div className="task-split-member-name">
                  {member.memberName}
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
            ))}
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