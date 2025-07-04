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
    
    // Get all user's tasks for this week, sorted by date and time
    const userTasks: Array<{ task: ResolvedTask; date: Date; startTime: Date; endTime: Date }> = [];
    
    weekSchedule.days.forEach(day => {
      // Parse the date string from the API response (YYYY-MM-DD format)
      const dayDate = new Date(day.date);
      day.tasks.forEach(task => {
        if (task.memberId === user.id) {
          const startTime = task.overrideTime || task.task.defaultStartTime;
          const duration = task.overrideDuration || task.task.defaultDuration;
          
          const [hours, minutes] = startTime.split(':').map(Number);
          
          // Create task start time using local timezone
          const taskStart = new Date(dayDate);
          taskStart.setHours(hours || 0, minutes || 0, 0, 0);
          
          const taskEnd = new Date(taskStart);
          taskEnd.setMinutes(taskEnd.getMinutes() + duration);
          
          userTasks.push({
            task,
            date: dayDate,
            startTime: taskStart,
            endTime: taskEnd
          });
        }
      });
    });

    // Sort tasks by start time
    userTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Check if user is currently in a shift (any task)
    const currentTask = userTasks.find(({ startTime, endTime }) => 
      now >= startTime && now < endTime // Changed <= to < for end time
    );

    if (currentTask) {
      // User is currently doing a task
      const timeRemaining = formatTimeRemaining(currentTask.endTime.getTime() - now.getTime());
      return {
        type: 'current',
        endTime: currentTask.endTime,
        timeRemaining
      };
    }

    // Find next task
    const nextTask = userTasks.find(({ startTime }) => startTime > now);
    
    if (nextTask) {
      const timeUntilStart = formatTimeRemaining(nextTask.startTime.getTime() - now.getTime());
      return {
        type: 'next',
        startTime: nextTask.startTime,
        timeUntilStart
      };
    }

    return null;
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
              {formatTime(shiftInfo.endTime!)} ({shiftInfo.timeRemaining} left)
            </span>
          </>
        ) : (
          <>
            <span className="shift-indicator-status next">Next shift</span>
            <span className="shift-indicator-time">
              {formatTime(shiftInfo.startTime!)} (in {shiftInfo.timeUntilStart})
            </span>
          </>
        )}
      </div>
    </div>
  );
}; 