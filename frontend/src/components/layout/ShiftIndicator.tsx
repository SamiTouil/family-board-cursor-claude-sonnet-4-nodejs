import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { weekScheduleApi } from '../../services/api';
import type { ResolvedWeekSchedule, ResolvedTask } from '../../types';
import './ShiftIndicator.css';

interface ShiftInfo {
  type: 'current' | 'next';
  endTime?: Date;
  startTime?: Date;
  timeRemaining?: string;
  timeUntilStart?: string;
}

export const ShiftIndicator: React.FC = () => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentFamily && user) {
      loadShiftInfo();
      // Update every minute
      const interval = setInterval(loadShiftInfo, 60000);
      return () => clearInterval(interval);
    }
    // Return undefined when conditions are not met
    return undefined;
  }, [currentFamily, user]);

  const getCurrentWeekStart = (): string => {
    const today = new Date();
    const monday = getMonday(today);
    return monday;
  };

  const getMonday = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const loadShiftInfo = async () => {
    if (!currentFamily || !user) return;

    setIsLoading(true);
    try {
      const weekStart = getCurrentWeekStart();
      const response = await weekScheduleApi.getWeekSchedule(currentFamily.id, weekStart);
      const weekSchedule: ResolvedWeekSchedule = response.data;
      
      const shiftData = calculateShiftInfo(weekSchedule);
      setShiftInfo(shiftData);
    } catch (error) {
      // Silently handle errors - user will see no shift info
      setShiftInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateShiftInfo = (weekSchedule: ResolvedWeekSchedule): ShiftInfo | null => {
    if (!user) return null;

    const now = new Date();
    
    // Get all tasks for the entire week, sorted by date and time
    const allWeekTasks: Array<{ task: ResolvedTask; startTime: Date }> = [];
    
    weekSchedule.days.forEach(day => {
      day.tasks.forEach(task => {
        const startTime = task.overrideTime || task.task.defaultStartTime;
        const [hours, minutes] = startTime.split(':').map(Number);
        
        // Parse the day date and set the task time
        const dayDate = new Date(day.date + 'T00:00:00');
        const taskStart = new Date(dayDate);
        taskStart.setHours(hours || 0, minutes || 0, 0, 0);
        
        allWeekTasks.push({
          task,
          startTime: taskStart
        });
      });
    });

    // Sort all tasks by start time (across all days)
    allWeekTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Find the most recent task (closest in the past)
    const pastTasks = allWeekTasks.filter(({ startTime }) => startTime <= now);
    
    if (pastTasks.length === 0) {
      // No tasks have started yet, find next task for current user
      const nextUserTask = allWeekTasks.find(({ task }) => task.memberId === user.id);
      if (nextUserTask) {
        const timeUntilStart = formatTimeRemaining(nextUserTask.startTime.getTime() - now.getTime());
        return {
          type: 'next',
          startTime: nextUserTask.startTime,
          timeUntilStart
        };
      }
      return null;
    }

    // Get the most recent task (last in pastTasks array)
    const mostRecentTask = pastTasks[pastTasks.length - 1];
    if (!mostRecentTask) {
      return null; // This shouldn't happen since we checked pastTasks.length > 0, but TypeScript safety
    }
    
    // Check if the most recent task is assigned to the current user
    if (mostRecentTask.task.memberId === user.id) {
      // User is currently in shift - find when their shift ends (first task assigned to someone else)
      const shiftEndTask = allWeekTasks.find(({ startTime, task }) => 
        startTime > mostRecentTask.startTime && task.memberId !== user.id
      );
      
      if (shiftEndTask) {
        // Shift ends when first task assigned to someone else starts
        const timeRemaining = formatTimeRemaining(shiftEndTask.startTime.getTime() - now.getTime());
        return {
          type: 'current',
          endTime: shiftEndTask.startTime,
          timeRemaining
        };
      } else {
        // No more tasks assigned to others in the entire week, shift ends at end of week
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (6 - now.getDay())); // Go to Saturday
        endOfWeek.setHours(23, 59, 59, 999);
        const timeRemaining = formatTimeRemaining(endOfWeek.getTime() - now.getTime());
        return {
          type: 'current',
          endTime: endOfWeek,
          timeRemaining
        };
      }
    } else {
      // User is not in shift - find their next task
      const nextUserTask = allWeekTasks.find(({ startTime, task }) => 
        startTime > now && task.memberId === user.id
      );
      
      if (nextUserTask) {
        const timeUntilStart = formatTimeRemaining(nextUserTask.startTime.getTime() - now.getTime());
        return {
          type: 'next',
          startTime: nextUserTask.startTime,
          timeUntilStart
        };
      }
      return null; // No more tasks for user this week
    }
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatTimeWithDate = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const timeDiff = targetDate.getTime() - today.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    const timeStr = formatTime(date);
    
    if (daysDiff === 0) {
      return timeStr; // Today - no need to specify
    } else if (daysDiff === 1) {
      return `${timeStr} Tomorrow`;
    } else if (daysDiff === -1) {
      return `${timeStr} Yesterday`;
    } else if (daysDiff > 1 && daysDiff <= 6) {
      const dayName = date.toLocaleDateString([], { weekday: 'long' });
      return `${timeStr} ${dayName}`;
    } else {
      // For dates beyond this week, show the actual date
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${timeStr} ${dateStr}`;
    }
  };

  if (!currentFamily || !user || isLoading) {
    return null;
  }

  if (!shiftInfo) {
    return (
      <div className="shift-indicator" data-testid="shift-indicator">
        <div className="shift-indicator-content">
          <span className="shift-indicator-status">No shifts scheduled</span>
        </div>
      </div>
    );
  }

  return (
    <div className="shift-indicator" data-testid="shift-indicator">
      <div className="shift-indicator-content">
        {shiftInfo.type === 'current' ? (
          <>
            <span className="shift-indicator-status current">Shift ends</span>
            <span className="shift-indicator-time">
              {formatTimeWithDate(shiftInfo.endTime!)} ({shiftInfo.timeRemaining} left)
            </span>
          </>
        ) : (
          <>
            <span className="shift-indicator-status next">Next shift</span>
            <span className="shift-indicator-time">
              {formatTimeWithDate(shiftInfo.startTime!)} (in {shiftInfo.timeUntilStart})
            </span>
          </>
        )}
      </div>
    </div>
  );
}; 