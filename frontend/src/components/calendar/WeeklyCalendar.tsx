import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { weekScheduleApi } from '../../services/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { UserAvatar } from '../ui/UserAvatar';
import type { ResolvedWeekSchedule, ResolvedTask } from '../../types';
import './WeeklyCalendar.css';

interface WeeklyCalendarProps {
  className?: string;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ className }) => {
  const { currentFamily } = useFamily();
  
  const [weekSchedule, setWeekSchedule] = useState<ResolvedWeekSchedule | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with current week
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
                {weekSchedule.hasOverrides && <span className="has-overrides"> (Modified)</span>}
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
        </div>
      </div>

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
                  <h3 className="weekly-calendar-day-name">
                    {formatDate(day.date)}
                  </h3>
                  <span className="weekly-calendar-task-count">
                    {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
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
    </div>
  );
}; 