import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { weekScheduleApi, weekTemplateApi, dayTemplateApi } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { UserAvatar } from '../ui/UserAvatar';
import type { ResolvedWeekSchedule, ResolvedTask, WeekTemplate, DayTemplate } from '../../types';
import './WeeklyCalendar.css';

interface WeeklyCalendarProps {
  className?: string;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ className }) => {
  const { currentFamily } = useFamily();
  
  const [weekSchedule, setWeekSchedule] = useState<ResolvedWeekSchedule | null>(null);
  const [weekTemplates, setWeekTemplates] = useState<WeekTemplate[]>([]);
  const [dayTemplates, setDayTemplates] = useState<DayTemplate[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Week template application modal state
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Day template application modal state
  const [showApplyDayTemplateModal, setShowApplyDayTemplateModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string>('');
  const [selectedDayTemplateId, setSelectedDayTemplateId] = useState<string>('');
  const [isApplyingDayTemplate, setIsApplyingDayTemplate] = useState(false);

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  // Initialize with current week
  useEffect(() => {
    if (currentFamily) {
      const today = new Date();
      const monday = getMonday(today);
      setCurrentWeekStart(monday);
      loadWeekSchedule(monday);
      loadWeekTemplates();
      loadDayTemplates();
    }
  }, [currentFamily]);

  const getMonday = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    return d.toISOString().split('T')[0]!;
  };

  const loadWeekSchedule = async (weekStartDate: string) => {
    if (!currentFamily) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await weekScheduleApi.getWeekSchedule(currentFamily.id, weekStartDate);
      setWeekSchedule(response.data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load week schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeekTemplates = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await weekTemplateApi.getTemplates(currentFamily.id);
      setWeekTemplates(response.data.templates || []);
    } catch (error) {
      // Silently handle template loading errors - templates will be empty array
    }
  };

  const loadDayTemplates = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await dayTemplateApi.getTemplates(currentFamily.id);
      setDayTemplates(response.data?.templates || []);
    } catch (error) {
      // Silently handle template loading errors - templates will be empty array
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    const newWeekStart = newDate.toISOString().split('T')[0]!;
    setCurrentWeekStart(newWeekStart);
    loadWeekSchedule(newWeekStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const monday = getMonday(today);
    setCurrentWeekStart(monday);
    loadWeekSchedule(monday);
  };

  const handleApplyTemplate = () => {
    setShowApplyTemplateModal(true);
    setSelectedTemplateId('');
    setMessage(null);
  };

  const handleCancelApplyTemplate = () => {
    setShowApplyTemplateModal(false);
    setSelectedTemplateId('');
  };

  const handleConfirmApplyTemplate = async () => {
    if (!currentFamily || !selectedTemplateId) return;

    const selectedTemplate = weekTemplates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) return;

    const confirmed = window.confirm(
      `Apply "${selectedTemplate.name}" template to this week? This will replace the current schedule for the week of ${formatWeekRange(currentWeekStart)}.`
    );
    if (!confirmed) return;

    try {
      setIsApplyingTemplate(true);
      
      // Apply the week template by creating a week override
      await weekScheduleApi.applyWeekOverride(currentFamily.id, {
        weekStartDate: currentWeekStart,
        weekTemplateId: selectedTemplateId,
        taskOverrides: [] // No additional task overrides, just apply the template
      });

      setMessage({ type: 'success', text: `Applied template "${selectedTemplate.name}" successfully` });
      setShowApplyTemplateModal(false);
      loadWeekSchedule(currentWeekStart); // Reload to show changes
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to apply template' });
    } finally {
      setIsApplyingTemplate(false);
    }
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

  const handleApplyDayTemplate = (dayDate: string) => {
    setSelectedDayDate(dayDate);
    setShowApplyDayTemplateModal(true);
    setSelectedDayTemplateId('');
    setMessage(null);
  };

  const handleCancelApplyDayTemplate = () => {
    setShowApplyDayTemplateModal(false);
    setSelectedDayDate('');
    setSelectedDayTemplateId('');
  };

  const handleConfirmApplyDayTemplate = async () => {
    if (!currentFamily || !selectedDayTemplateId || !selectedDayDate) {
      setMessage({ type: 'error', text: 'Missing required information to apply day routine' });
      return;
    }

    const selectedTemplate = dayTemplates.find(t => t.id === selectedDayTemplateId);
    if (!selectedTemplate) {
      setMessage({ type: 'error', text: 'Selected day routine not found' });
      return;
    }

    const confirmed = window.confirm(
      `Apply "${selectedTemplate.name}" routine to ${formatDate(selectedDayDate)}? This will completely replace the current schedule for this day.`
    );
    if (!confirmed) return;

    try {
      setIsApplyingDayTemplate(true);
      
      // Get the day template items to create the overrides
      const dayTemplateResponse = await dayTemplateApi.getItems(currentFamily.id, selectedDayTemplateId);
      
      // Handle different response structures
      let dayTemplateItems = [];
      if (dayTemplateResponse?.data?.items) {
        dayTemplateItems = dayTemplateResponse.data.items;
      } else if (dayTemplateResponse?.data && Array.isArray(dayTemplateResponse.data)) {
        dayTemplateItems = dayTemplateResponse.data;
      } else {
        // Unexpected day template response structure - handle gracefully
      }

      if (!dayTemplateItems || dayTemplateItems.length === 0) {
        setMessage({ type: 'error', text: `Day routine "${selectedTemplate.name}" has no tasks configured` });
        return;
      }

      // Get current day's tasks to remove them first
      const currentDay = weekSchedule?.days.find(day => day.date === selectedDayDate);
      const currentTasks = currentDay?.tasks || [];

      // Create task overrides to completely replace the day
      const taskOverrides = [];

      // Step 1: Remove all existing tasks for this day
      for (const task of currentTasks) {
        taskOverrides.push({
          assignedDate: selectedDayDate,
          taskId: task.taskId,
          action: 'REMOVE' as const,
          originalMemberId: task.memberId,
          newMemberId: null,
          overrideTime: null,
          overrideDuration: null,
        });
      }

      // Step 2: Add all tasks from the day template
      for (const item of dayTemplateItems) {
        if (!item.taskId) {
          continue;
        }
        
        taskOverrides.push({
          assignedDate: selectedDayDate,
          taskId: item.taskId,
          action: 'ADD' as const,
          originalMemberId: null,
          newMemberId: item.memberId || null,
          overrideTime: item.overrideTime || null,
          overrideDuration: item.overrideDuration || null,
        });
      }

      if (taskOverrides.length === 0) {
        setMessage({ type: 'error', text: 'No valid task overrides to apply' });
        return;
      }

      // Apply the day template overrides
      await weekScheduleApi.applyWeekOverride(currentFamily.id, {
        weekStartDate: currentWeekStart,
        taskOverrides: taskOverrides
      });

      setMessage({ type: 'success', text: `Applied routine "${selectedTemplate.name}" to ${formatDate(selectedDayDate)}` });
      setShowApplyDayTemplateModal(false);
      loadWeekSchedule(currentWeekStart); // Reload to show changes
    } catch (error: any) {
      let errorMessage = 'Failed to apply day routine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsApplyingDayTemplate(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00.000Z');
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    
    return isToday ? `${dayName} ${dayNumber} (Today)` : `${dayName} ${dayNumber}`;
  };

  const formatWeekRange = (weekStartDate: string): string => {
    const startDate = new Date(weekStartDate + 'T00:00:00.000Z');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const year = startDate.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${year}`;
    } else {
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`;
    }
  };

  const sortTasksByTime = (tasks: ResolvedTask[]): ResolvedTask[] => {
    return [...tasks].sort((a, b) => {
      const timeA = a.overrideTime || a.task.defaultStartTime;
      const timeB = b.overrideTime || b.task.defaultStartTime;
      return timeA.localeCompare(timeB);
    });
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours || '0', 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes || '00'} ${ampm}`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getDayTasks = (day: any) => {
    if (!day || !day.tasks) return [];
    return sortTasksByTime(day.tasks);
  };

  const isCurrentWeek = (): boolean => {
    const today = new Date();
    const currentMonday = getMonday(today);
    return currentWeekStart === currentMonday;
  };

  if (!currentFamily) {
    return (
      <div className={`weekly-calendar ${className || ''}`}>
        <div className="weekly-calendar-error">
          Please select a family to view the calendar.
        </div>
      </div>
    );
  }

  return (
    <div className={`weekly-calendar ${className || ''}`}>
      {/* Calendar Header */}
      <div className="weekly-calendar-header">
        <div className="weekly-calendar-title">
          <h2>Weekly Schedule</h2>
          <p className="weekly-calendar-subtitle">
            {formatWeekRange(currentWeekStart)}
            {weekSchedule?.baseTemplate && (
              <span className="weekly-calendar-template">
                • {weekSchedule.baseTemplate.name}
              </span>
            )}
          </p>
        </div>
        
        <div className="weekly-calendar-controls">
          <button
            onClick={() => navigateWeek('prev')}
            className="weekly-calendar-nav-btn"
            title="Previous week"
          >
            ←
          </button>
          
          {!isCurrentWeek() && (
            <button
              onClick={goToCurrentWeek}
              className="weekly-calendar-today-btn"
              title="Go to current week"
            >
              Today
            </button>
          )}
          
          <button
            onClick={() => navigateWeek('next')}
            className="weekly-calendar-nav-btn"
            title="Next week"
          >
            →
          </button>

          {isAdmin && (
            <div className="weekly-calendar-admin-controls">
              <button
                onClick={handleApplyTemplate}
                className="weekly-calendar-apply-btn"
                disabled={isLoading || weekTemplates.length === 0}
                title={weekTemplates.length === 0 ? 'No week templates available' : 'Apply a weekly routine to this week'}
              >
                📋 Apply Routine
              </button>
              {weekSchedule?.hasOverrides && (
                <button
                  onClick={handleRemoveOverrides}
                  className="weekly-calendar-revert-btn"
                  disabled={isLoading}
                  title="Revert to template"
                >
                  🔄 Revert
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`weekly-calendar-message weekly-calendar-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Calendar Content */}
      {isLoading ? (
        <div className="weekly-calendar-loading">
          <LoadingSpinner />
          <p>Loading schedule...</p>
        </div>
      ) : error ? (
        <div className="weekly-calendar-error">
          <p>⚠️ {error}</p>
          <button onClick={() => loadWeekSchedule(currentWeekStart)} className="retry-btn">
            Try Again
          </button>
        </div>
      ) : weekSchedule ? (
        <div className="weekly-calendar-grid">
          {weekSchedule.days.map((day) => {
            const dayTasks = getDayTasks(day);
            const isToday = new Date(day.date + 'T00:00:00.000Z').toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={day.date} 
                className={`weekly-calendar-day ${isToday ? 'is-today' : ''}`}
              >
                {/* Day Header */}
                <div className="weekly-calendar-day-header">
                  <div className="weekly-calendar-day-info">
                    <h3 className="weekly-calendar-day-name">
                      {formatDate(day.date)}
                    </h3>
                    <span className="weekly-calendar-task-count">
                      {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="weekly-calendar-day-controls">
                      <button
                        onClick={() => handleApplyDayTemplate(day.date)}
                        className="weekly-calendar-day-override-btn"
                        disabled={isLoading || dayTemplates.length === 0}
                        title={dayTemplates.length === 0 ? 'No day routines available' : 'Apply a daily routine to this day'}
                      >
                        📅
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Tasks Lane */}
                <div className="weekly-calendar-tasks-lane">
                  {dayTasks.length === 0 ? (
                    <div className="weekly-calendar-no-tasks">
                      <span>No tasks</span>
                    </div>
                  ) : (
                    <div className="weekly-calendar-tasks-stack">
                      {dayTasks.map((task, taskIndex) => {
                        const startTime = task.overrideTime || task.task.defaultStartTime;
                        const duration = task.overrideDuration || task.task.defaultDuration;
                        
                        return (
                          <div 
                            key={`${task.taskId}-${task.memberId}-${taskIndex}`}
                            className={`weekly-calendar-task ${task.source === 'override' ? 'is-override' : ''}`}
                            style={{ 
                              borderLeftColor: task.task.color,
                              backgroundColor: `${task.task.color}10`
                            }}
                          >
                            <div className="weekly-calendar-task-main">
                              <div className="weekly-calendar-task-info">
                                <h4 className="weekly-calendar-task-name">
                                  {task.task.name}
                                </h4>
                                <div className="weekly-calendar-task-time">
                                  {formatTime(startTime)} • {formatDuration(duration)}
                                </div>
                              </div>
                              
                              {task.member && (
                                <div className="weekly-calendar-task-member">
                                  <UserAvatar
                                    firstName={task.member.firstName}
                                    lastName={task.member.lastName}
                                    avatarUrl={task.member.avatarUrl}
                                    size="small"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {task.task.description && (
                              <div className="weekly-calendar-task-description">
                                {task.task.description}
                              </div>
                            )}
                            
                            {task.source === 'override' && (
                              <div className="weekly-calendar-task-source">
                                Modified
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="weekly-calendar-empty">
          <p>No schedule available for this week.</p>
        </div>
      )}

      {/* Apply Template Modal */}
      {showApplyTemplateModal && (
        <div className="weekly-calendar-modal-overlay">
          <div className="weekly-calendar-modal">
            <div className="weekly-calendar-modal-header">
              <h3>Apply Weekly Routine</h3>
              <button
                onClick={handleCancelApplyTemplate}
                className="weekly-calendar-modal-close"
                disabled={isApplyingTemplate}
              >
                ✕
              </button>
            </div>
            <div className="weekly-calendar-modal-content">
              <p>Select a weekly routine to apply to the week of <strong>{formatWeekRange(currentWeekStart)}</strong>:</p>
              
              {weekTemplates.length === 0 ? (
                <div className="weekly-calendar-modal-empty">
                  <p>No weekly routines available. Create one first in the Week Templates section.</p>
                </div>
              ) : (
                <div className="weekly-calendar-template-list">
                  {weekTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`weekly-calendar-template-option ${selectedTemplateId === template.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <div className="weekly-calendar-template-info">
                        <h4 className="weekly-calendar-template-name">{template.name}</h4>
                        {template.description && (
                          <p className="weekly-calendar-template-description">{template.description}</p>
                        )}
                        <div className="weekly-calendar-template-meta">
                          <span className="weekly-calendar-template-days-count">
                            {template.days?.length || 0} days configured
                          </span>
                          {template.isDefault && (
                            <span className="weekly-calendar-template-badge default">Default</span>
                          )}
                          {template.applyRule && (
                            <span className="weekly-calendar-template-badge rule">
                              {template.applyRule === 'EVEN_WEEKS' ? 'Even Weeks' : 'Odd Weeks'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="weekly-calendar-template-selector">
                        <input
                          type="radio"
                          name="selectedTemplate"
                          value={template.id}
                          checked={selectedTemplateId === template.id}
                          onChange={() => setSelectedTemplateId(template.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="weekly-calendar-modal-actions">
              <button
                onClick={handleCancelApplyTemplate}
                className="weekly-calendar-button weekly-calendar-button-secondary"
                disabled={isApplyingTemplate}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApplyTemplate}
                className="weekly-calendar-button weekly-calendar-button-primary"
                disabled={!selectedTemplateId || isApplyingTemplate}
              >
                {isApplyingTemplate ? 'Applying...' : 'Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Day Template Modal */}
      {showApplyDayTemplateModal && (
        <div className="weekly-calendar-modal-overlay">
          <div className="weekly-calendar-modal">
            <div className="weekly-calendar-modal-header">
              <h3>Apply Daily Routine</h3>
              <button
                onClick={handleCancelApplyDayTemplate}
                className="weekly-calendar-modal-close"
                disabled={isApplyingDayTemplate}
              >
                ✕
              </button>
            </div>
            <div className="weekly-calendar-modal-content">
              <p>Select a daily routine to apply to <strong>{formatDate(selectedDayDate)}</strong>:</p>
              
              {dayTemplates.length === 0 ? (
                <div className="weekly-calendar-modal-empty">
                  <p>No daily routines available. Create one first in the Daily Routines section.</p>
                </div>
              ) : (
                <div className="weekly-calendar-template-list">
                  {dayTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`weekly-calendar-template-option ${selectedDayTemplateId === template.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDayTemplateId(template.id)}
                    >
                      <div className="weekly-calendar-template-info">
                        <h4 className="weekly-calendar-template-name">{template.name}</h4>
                        {template.description && (
                          <p className="weekly-calendar-template-description">{template.description}</p>
                        )}
                        <div className="weekly-calendar-template-meta">
                          <span className="weekly-calendar-template-badge daily">Daily Routine</span>
                        </div>
                      </div>
                      <div className="weekly-calendar-template-selector">
                        <input
                          type="radio"
                          name="selectedDayTemplate"
                          value={template.id}
                          checked={selectedDayTemplateId === template.id}
                          onChange={() => setSelectedDayTemplateId(template.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="weekly-calendar-modal-actions">
              <button
                onClick={handleCancelApplyDayTemplate}
                className="weekly-calendar-button weekly-calendar-button-secondary"
                disabled={isApplyingDayTemplate}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApplyDayTemplate}
                className="weekly-calendar-button weekly-calendar-button-primary"
                disabled={!selectedDayTemplateId || isApplyingDayTemplate}
              >
                {isApplyingDayTemplate ? 'Applying...' : 'Apply Routine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 