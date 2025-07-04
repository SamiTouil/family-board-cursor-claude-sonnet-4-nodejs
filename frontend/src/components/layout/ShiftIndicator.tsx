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
    
    // Get all tasks for today, sorted by time
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const todaySchedule = weekSchedule.days.find(day => day.date === todayStr);
    if (!todaySchedule || todaySchedule.tasks.length === 0) {
      return null; // No tasks today
    }

    // Create array of all tasks today with their start times
    const allTodayTasks: Array<{ task: ResolvedTask; startTime: Date }> = [];
    
    todaySchedule.tasks.forEach(task => {
      const startTime = task.overrideTime || task.task.defaultStartTime;
      const [hours, minutes] = startTime.split(':').map(Number);
      
      const taskStart = new Date(today);
      taskStart.setHours(hours || 0, minutes || 0, 0, 0);
      
      allTodayTasks.push({
        task,
        startTime: taskStart
      });
    });

    // Sort all tasks by start time
    allTodayTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Find the most recent task (closest in the past)
    const pastTasks = allTodayTasks.filter(({ startTime }) => startTime <= now);
    
    if (pastTasks.length === 0) {
      // No tasks have started yet, find next task for current user
      const nextUserTask = allTodayTasks.find(({ task }) => task.memberId === user.id);
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
      const shiftEndTask = allTodayTasks.find(({ startTime, task }) => 
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
        // No more tasks assigned to others today, shift ends at end of day (11:59 PM)
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const timeRemaining = formatTimeRemaining(endOfDay.getTime() - now.getTime());
        return {
          type: 'current',
          endTime: endOfDay,
          timeRemaining
        };
      }
    } else {
      // User is not in shift - find their next task
      const nextUserTask = allTodayTasks.find(({ startTime, task }) => 
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
      return null; // No more tasks for user today
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