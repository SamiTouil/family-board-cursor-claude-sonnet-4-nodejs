import React, { useState, useEffect } from 'react';
import { useFamily } from '../../../contexts/FamilyContext';
import { weekScheduleApi } from '../../../services/api';
import type { ResolvedWeekSchedule, ResolvedTask } from '../../../types';
import { ResolvedTaskCard } from '../../tasks/components/TaskAssignmentCard';
import { useMessage } from '../../../hooks';
import './WeekScheduleView.css';

export const WeekScheduleView: React.FC = () => {
  const { currentFamily } = useFamily();
  
  const [weekSchedule, setWeekSchedule] = useState<ResolvedWeekSchedule | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useMessage();

  // Override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ResolvedTask | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  useEffect(() => {
    if (currentFamily) {
      const today = new Date();
      const monday = getMonday(today);
      setCurrentWeekStart(monday);
      loadWeekSchedule(monday);
    }
  }, [currentFamily]);

  const getMonday = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    
    // Use local date formatting to avoid timezone issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const loadWeekSchedule = async (weekStartDate: string) => {
    if (!currentFamily) return;
    
    setIsLoading(true);
    try {
      const response = await weekScheduleApi.getWeekSchedule(currentFamily.id, weekStartDate);
      setWeekSchedule(response.data.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load week schedule' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    
    // Use local date formatting to avoid timezone issues
    const year = prevWeek.getFullYear();
    const month = String(prevWeek.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(prevWeek.getDate()).padStart(2, '0');
    const prevWeekStart = `${year}-${month}-${dayOfMonth}`;
    
    setCurrentWeekStart(prevWeekStart);
    loadWeekSchedule(prevWeekStart);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Use local date formatting to avoid timezone issues
    const year = nextWeek.getFullYear();
    const month = String(nextWeek.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(nextWeek.getDate()).padStart(2, '0');
    const nextWeekStart = `${year}-${month}-${dayOfMonth}`;
    
    setCurrentWeekStart(nextWeekStart);
    loadWeekSchedule(nextWeekStart);
  };

  const handleTaskOverride = (task: ResolvedTask, date: string) => {
    setSelectedTask(task);
    setSelectedDate(date);
    setShowOverrideModal(true);
  };

  const handleRemoveOverrides = async () => {
    if (!currentFamily || !weekSchedule?.hasOverrides) return;

    const confirmed = window.confirm(
      'Remove all customizations for this week and revert to the template?'
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await weekScheduleApi.removeWeekOverride(currentFamily.id, currentWeekStart);
      setMessage({ type: 'success', text: 'Week reverted to template' });
      loadWeekSchedule(currentWeekStart);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to remove overrides' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatWeekRange = (startDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const sortTasksByTime = (tasks: ResolvedTask[]): ResolvedTask[] => {
    return [...tasks].sort((a, b) => {
      const timeA = a.overrideTime || a.task.defaultStartTime;
      const timeB = b.overrideTime || b.task.defaultStartTime;
      return timeA.localeCompare(timeB);
    });
  };

  return (
    <div className="week-schedule-view">
      <div className="week-schedule-view-header">
        <div className="week-schedule-view-title-section">
          <h2 className="week-schedule-view-title">
            📅 Week Schedule
          </h2>
          <div className="week-schedule-view-navigation">
            <button
              onClick={handlePreviousWeek}
              className="week-schedule-view-nav-button"
              disabled={isLoading}
            >
              ←
            </button>
            <span className="week-schedule-view-week-range">
              {formatWeekRange(currentWeekStart)}
            </span>
            <button
              onClick={handleNextWeek}
              className="week-schedule-view-nav-button"
              disabled={isLoading}
            >
              →
            </button>
          </div>
        </div>
        
        {isAdmin && (
          <div className="week-schedule-view-actions">
            {weekSchedule?.hasOverrides && (
              <button
                onClick={handleRemoveOverrides}
                className="week-schedule-view-button week-schedule-view-button-secondary"
                disabled={isLoading}
              >
                🔄 Revert to Template
              </button>
            )}
          </div>
        )}
      </div>

      <div className="week-schedule-view-content">
        {/* Messages */}
        {message && (
          <div className={`week-schedule-view-message week-schedule-view-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Template Info */}
        {weekSchedule?.baseTemplate && (
          <div className="week-schedule-view-template-info">
            <div className="week-schedule-view-template-details">
              <span className="week-schedule-view-template-label">Based on template:</span>
              <span className="week-schedule-view-template-name">
                {weekSchedule.baseTemplate.name}
              </span>
              {weekSchedule.hasOverrides && (
                <span className="week-schedule-view-customized-badge">Customized</span>
              )}
            </div>
          </div>
        )}

        {/* Week Schedule */}
        {isLoading ? (
          <div className="week-schedule-view-loading">
            Loading week schedule...
          </div>
        ) : weekSchedule ? (
          <div className="week-schedule-view-days">
            {weekSchedule.days.map(day => (
              <div key={day.date} className="week-schedule-view-day">
                <div className="week-schedule-view-day-header">
                  <h3 className="week-schedule-view-day-name">
                    {formatDate(day.date)}
                  </h3>
                  <span className="week-schedule-view-task-count">
                    {day.tasks.length} tasks
                  </span>
                </div>
                
                <div className="week-schedule-view-day-tasks">
                  {day.tasks.length === 0 ? (
                    <div className="week-schedule-view-no-tasks">
                      No tasks scheduled
                    </div>
                  ) : (
                    <div className="week-schedule-view-tasks-grid">
                      {sortTasksByTime(day.tasks).map((task, index) => (
                        <ResolvedTaskCard
                          key={`${task.taskId}-${task.memberId}-${index}`}
                          resolvedTask={task}
                          date={day.date}
                          showSource={weekSchedule.hasOverrides}
                          isClickable={false}
                          isAdmin={isAdmin}
                          onOverride={(task) => handleTaskOverride(task, day.date)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="week-schedule-view-empty">
            <div className="week-schedule-view-empty-icon">📅</div>
            <h3>No Schedule Available</h3>
            <p>Create a week template to get started with scheduling.</p>
          </div>
        )}
      </div>

      {/* Override Modal - Placeholder for now */}
      {showOverrideModal && selectedTask && (
        <div className="week-schedule-view-modal-overlay">
          <div className="week-schedule-view-modal">
            <div className="week-schedule-view-modal-header">
              <h3>Override Task</h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="week-schedule-view-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="week-schedule-view-modal-content">
              <p>Task override functionality coming soon...</p>
              <p>Task: {selectedTask.task.name}</p>
              <p>Date: {formatDate(selectedDate)}</p>
            </div>
            <div className="week-schedule-view-modal-actions">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="week-schedule-view-button week-schedule-view-button-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 