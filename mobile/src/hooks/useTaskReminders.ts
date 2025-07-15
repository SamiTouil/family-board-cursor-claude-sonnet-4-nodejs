import { useCallback } from 'react';
import { NotificationService } from '../services/NotificationService';
import type { ResolvedTask } from '../types';

export const useTaskReminders = () => {
  // Schedule a reminder for a task
  const scheduleTaskReminder = useCallback(async (
    task: ResolvedTask,
    reminderMinutesBefore: number = 15
  ): Promise<string | null> => {
    if (!task.member || !task.task) return null;
    
    // Parse the task time
    const taskTime = task.overrideTime || task.task.defaultStartTime;
    const [hours, minutes] = taskTime.split(':').map(Number);
    
    // Create a date object for today with the task time
    const taskDate = new Date();
    taskDate.setHours(hours, minutes, 0, 0);
    
    // Calculate reminder time
    const reminderTime = new Date(taskDate.getTime() - reminderMinutesBefore * 60 * 1000);
    
    // Only schedule if the reminder time is in the future
    const now = new Date();
    if (reminderTime <= now) {
      console.log('Reminder time is in the past, not scheduling');
      return null;
    }
    
    // Calculate delay in seconds
    const delaySeconds = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);
    
    // Schedule the notification
    const notificationId = await NotificationService.scheduleLocalNotification(
      `⏰ Upcoming Task: ${task.task.name}`,
      `Your task starts in ${reminderMinutesBefore} minutes`,
      {
        screen: 'Home',
        taskId: task.taskId,
        memberId: task.memberId,
      },
      delaySeconds
    );
    
    console.log(`Scheduled reminder for task ${task.task.name} in ${delaySeconds} seconds`);
    return notificationId;
  }, []);
  
  // Schedule daily routine reminder
  const scheduleDailyRoutineReminder = useCallback(async (
    hour: number = 7,
    minute: number = 0
  ): Promise<string | null> => {
    // Create a date object for today at the specified time
    const reminderDate = new Date();
    reminderDate.setHours(hour, minute, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    const now = new Date();
    if (reminderDate <= now) {
      reminderDate.setDate(reminderDate.getDate() + 1);
    }
    
    // Calculate delay in seconds
    const delaySeconds = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);
    
    // Schedule the notification
    const notificationId = await NotificationService.scheduleLocalNotification(
      '🌅 Daily Routine Reminder',
      'Time to check your tasks for today!',
      {
        screen: 'Home',
      },
      delaySeconds
    );
    
    console.log(`Scheduled daily routine reminder for ${reminderDate.toLocaleTimeString()}`);
    return notificationId;
  }, []);
  
  // Cancel a scheduled reminder
  const cancelTaskReminder = useCallback(async (notificationId: string) => {
    await NotificationService.cancelNotification(notificationId);
  }, []);
  
  return {
    scheduleTaskReminder,
    scheduleDailyRoutineReminder,
    cancelTaskReminder,
  };
};