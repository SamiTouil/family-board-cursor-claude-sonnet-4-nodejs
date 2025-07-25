import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { useCurrentWeek } from '../../contexts/CurrentWeekContext';
import { weekScheduleApi, weekTemplateApi, dayTemplateApi, taskApi } from '../../services/api';
import { apiClient } from '../../services/api-client';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { TaskOverrideCard, Button, UserAvatar, DropdownMenu } from '../ui';
import type { DropdownMenuItem } from '../ui';
import RoutinesIcon from '../ui/icons/RoutinesIcon';
import { TaskOverrideModal } from './TaskOverrideModal';
import { TaskSplitIndicator } from '../layout/TaskSplitIndicator';
import { useMessage } from '../../hooks';
import type { ResolvedWeekSchedule, ResolvedTask, WeekTemplate, DayTemplate, DayTemplateItem, Task, User, CreateTaskOverrideData, ShiftInfo } from '../../types';
import './WeeklyCalendar.css';

interface WeeklyCalendarProps {
  className?: string;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ className }) => {
  const { user: currentUser } = useAuth();
  const { currentFamily } = useFamily();
  const { currentWeekStart, setCurrentWeekStart } = useCurrentWeek();
  
  const [weekSchedule, setWeekSchedule] = useState<ResolvedWeekSchedule | null>(null);
  const [weekTemplates, setWeekTemplates] = useState<WeekTemplate[]>([]);
  const [dayTemplates, setDayTemplates] = useState<DayTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useMessage();

  // Week template application modal state
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Day template application modal state
  const [showApplyDayTemplateModal, setShowApplyDayTemplateModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string>('');
  const [selectedDayTemplateId, setSelectedDayTemplateId] = useState<string>('');
  const [isApplyingDayTemplate, setIsApplyingDayTemplate] = useState(false);

  // Task override modal state
  const [showTaskOverrideModal, setShowTaskOverrideModal] = useState(false);
  const [taskOverrideAction, setTaskOverrideAction] = useState<'ADD' | 'REMOVE' | 'REASSIGN'>('ADD');
  const [selectedTask, setSelectedTask] = useState<ResolvedTask | undefined>(undefined);
  const [selectedShiftTasks, setSelectedShiftTasks] = useState<ResolvedTask[]>([]);
  const [taskOverrideDate, setTaskOverrideDate] = useState<string>('');
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [shiftStatus, setShiftStatus] = useState<ShiftInfo | null>(null);

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  // Helper function to check if a shift belongs to the current user
  const isCurrentUserShift = (memberId: string): boolean => {
    return currentUser?.id === memberId;
  };



  // Load shift status from backend
  const loadShiftStatus = useCallback(async () => {
    if (!currentFamily) {
      return;
    }

    try {
      // Pass currentWeekStart even if undefined - backend will use current week
      const response = await weekScheduleApi.getShiftStatus(currentFamily.id, currentWeekStart || undefined);
      setShiftStatus(response.data.shiftInfo);
    } catch (error) {
      setShiftStatus(null);
    }
  }, [currentFamily, currentWeekStart]);

  // Helper function to check if a specific task is currently active
  const isShiftCurrentlyActive = (tasks: ResolvedTask[], date: string): boolean => {
    if (!tasks.length || !currentUser || shiftStatus?.type !== 'current') return false;

    // Only show as active if this is the current user's shift AND
    // one of these tasks is actually the currently running task
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Only check tasks for today
    if (date !== today) return false;

    // Check if this shift belongs to the current user
    const isCurrentUserShift = tasks.some(task => task.memberId === currentUser.id);
    if (!isCurrentUserShift) return false;

    // Check if any task in this shift is currently running (started but not finished)
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const hasActiveTask = tasks.some(task => {
      if (task.memberId !== currentUser.id) return false;

      const startTime = task.overrideTime || task.task.defaultStartTime;
      const duration = task.overrideDuration || task.task.defaultDuration;

      const timeParts = startTime.split(':').map(Number);
      const hours = timeParts[0] || 0;
      const minutes = timeParts[1] || 0;
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;

      // Task is active if current time is between start and end
      return currentTime >= startMinutes && currentTime < endMinutes;
    });

    return hasActiveTask;
  };

  // Initialize and load data when family changes
  useEffect(() => {
    if (currentFamily) {
      loadWeekTemplates();
      loadDayTemplates();
      loadAvailableTasks();
      loadFamilyMembers();
    }
  }, [currentFamily]);

  // Load week schedule when currentWeekStart changes
  useEffect(() => {
    if (currentFamily && currentWeekStart) {
      loadWeekSchedule(currentWeekStart);
      loadShiftStatus();
    }
  }, [currentFamily, currentWeekStart, loadShiftStatus]);



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
    setError(null);
    try {
      const response = await weekScheduleApi.getWeekSchedule(currentFamily.id, weekStartDate);
      setWeekSchedule(response.data);
      // Also load shift status when schedule changes
      await loadShiftStatus();
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

  const loadAvailableTasks = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await taskApi.getFamilyTasks(currentFamily.id);
      // Backend returns { success: true, data: [tasks array] }
      // So we need response.data.data to get the actual tasks array
      setAvailableTasks(response.data?.data || []);
    } catch (error) {
      setAvailableTasks([]); // Ensure empty array on error
    }
  };

  const loadFamilyMembers = async () => {
    if (!currentFamily) {
      return;
    }
    
    try {
      const response = await apiClient.get(`/families/${currentFamily.id}/members`);
      
      // Backend returns: { success: true, data: [FamilyMemberResponse array] }
      // So we need response.data.data to get the actual members array
      const membersData = response.data?.data || [];
      
      if (!Array.isArray(membersData)) {
        setFamilyMembers([]);
        return;
      }
      
      // Backend returns FamilyMemberResponse objects with nested user data
      // Transform to User objects that TaskOverrideModal expects
      const members = membersData.map((member: any) => ({
        id: member.user.id, // Use user.id for consistency
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        isVirtual: member.user.isVirtual || false,
        createdAt: member.user.createdAt || new Date().toISOString(),
        updatedAt: member.user.updatedAt || new Date().toISOString()
      }));
      
      setFamilyMembers(members);
    } catch (error) {
      setFamilyMembers([]); // Ensure empty array on error
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    
    // Use local date formatting to avoid timezone issues
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(newDate.getDate()).padStart(2, '0');
    const newWeekStart = `${year}-${month}-${dayOfMonth}`;
    
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
        taskOverrides: [], // No additional task overrides, just apply the template
        replaceExisting: true // Week template application should replace all existing overrides
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
      let dayTemplateItems: DayTemplateItem[] = [];
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

      // Get current day's tasks
      const currentDay = weekSchedule?.days.find(day => day.date === selectedDayDate);
      const currentTasks = currentDay?.tasks || [];

      // Create task overrides to completely replace the day
      const taskOverrides = [];

      // Create sets for efficient comparison
      const templateTaskIds = new Set(dayTemplateItems.map(item => item.taskId).filter(Boolean));

      // Step 1: Remove tasks that are NOT in the template
      for (const task of currentTasks) {
        if (!templateTaskIds.has(task.taskId)) {
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
      }

      // Step 2: Add/Update tasks from the template
      for (const item of dayTemplateItems) {
        if (!item.taskId) {
          continue;
        }
        
        const currentTask = currentTasks.find(task => task.taskId === item.taskId);
        
        if (!currentTask) {
          // Task doesn't exist in current day - ADD it
          taskOverrides.push({
            assignedDate: selectedDayDate,
            taskId: item.taskId,
            action: 'ADD' as const,
            originalMemberId: null,
            newMemberId: item.memberId || null,
            overrideTime: item.overrideTime || null,
            overrideDuration: item.overrideDuration || null,
          });
        } else {
          // Task exists - check if we need to reassign or modify it
          const needsReassignment = item.memberId !== currentTask.memberId;
          const templateTime = item.overrideTime || null;
          const currentTime = currentTask.overrideTime || null;
          const templateDuration = item.overrideDuration || null;
          const currentDuration = currentTask.overrideDuration || null;
          const needsTimeUpdate = templateTime !== currentTime || templateDuration !== currentDuration;
          
          if (needsReassignment || needsTimeUpdate) {
            if (needsReassignment) {
              // Reassign the task
              taskOverrides.push({
                assignedDate: selectedDayDate,
                taskId: item.taskId,
                action: 'REASSIGN' as const,
                originalMemberId: currentTask.memberId,
                newMemberId: item.memberId || null,
                overrideTime: needsTimeUpdate ? templateTime : null,
                overrideDuration: needsTimeUpdate ? templateDuration : null,
              });
            } else if (needsTimeUpdate) {
              // Just update time/duration by removing and re-adding
              taskOverrides.push({
                assignedDate: selectedDayDate,
                taskId: item.taskId,
                action: 'REMOVE' as const,
                originalMemberId: currentTask.memberId,
                newMemberId: null,
                overrideTime: null,
                overrideDuration: null,
              });
              taskOverrides.push({
                assignedDate: selectedDayDate,
                taskId: item.taskId,
                action: 'ADD' as const,
                originalMemberId: null,
                newMemberId: item.memberId || null,
                overrideTime: templateTime,
                overrideDuration: templateDuration,
              });
            }
          }
          // If task exists with same assignment and time, no override needed
        }
      }

      if (taskOverrides.length === 0) {
        setMessage({ type: 'error', text: 'No valid task overrides to apply' });
        return;
      }

      // Apply the day template overrides (replace existing overrides for this day)
      await weekScheduleApi.applyWeekOverride(currentFamily.id, {
        weekStartDate: currentWeekStart,
        taskOverrides: taskOverrides,
        replaceExisting: true // Day template application should replace all existing overrides for the day
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

  // Task override handlers
  const handleTaskOverride = (action: 'ADD' | 'REMOVE' | 'REASSIGN', task?: ResolvedTask, date?: string) => {
    setTaskOverrideAction(action);
    setSelectedTask(task);
    setTaskOverrideDate(date || '');
    setShowTaskOverrideModal(true);
    setMessage(null);
  };

  const handleCancelTaskOverride = () => {
    setShowTaskOverrideModal(false);
    setSelectedTask(undefined);
    setSelectedShiftTasks([]);
    setTaskOverrideDate('');
  };

  // Shift bulk operation handlers
  const handleShiftRemove = async (tasks: ResolvedTask[], date: string) => {
    if (!currentFamily || !weekSchedule) return;
    
    const confirmMessage = `Are you sure you want to remove all ${tasks.length} tasks in this shift?`;
    if (!window.confirm(confirmMessage)) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // Create REMOVE overrides for all tasks in the shift
      const removeOverrides = tasks.map(task => ({
        assignedDate: date,
        taskId: task.taskId,
        action: 'REMOVE' as const,
        originalMemberId: task.memberId || null,
        newMemberId: null,
        overrideTime: null,
        overrideDuration: null,
      }));

      await weekScheduleApi.applyWeekOverride(currentFamily.id, {
        weekStartDate: currentWeekStart,
        taskOverrides: removeOverrides,
        replaceExisting: false
      });
      
      // Reload the week schedule
      await loadWeekSchedule(currentWeekStart);
      setMessage({ type: 'success', text: `Successfully removed ${tasks.length} tasks from the shift` });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || `Failed to remove tasks from shift`;
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShiftReassign = (tasks: ResolvedTask[], date: string) => {
    // For reassignment, we'll show the modal with a special flag
    // to indicate this is a bulk operation
    setSelectedShiftTasks(tasks);
    setTaskOverrideAction('REASSIGN');
    setTaskOverrideDate(date);
    setShowTaskOverrideModal(true);
    setMessage(null);
  };

  const handleConfirmTaskOverride = async (overrideData: CreateTaskOverrideData) => {
    if (!currentFamily) return;

    try {
      // Check if this is a bulk operation
      if (selectedShiftTasks.length > 0 && overrideData.action === 'REASSIGN') {
        // Create overrides for all tasks in the shift
        const bulkOverrides = selectedShiftTasks.map(task => ({
          ...overrideData,
          taskId: task.taskId,
          originalMemberId: task.memberId || null,
        }));

        await weekScheduleApi.applyWeekOverride(currentFamily.id, {
          weekStartDate: currentWeekStart,
          taskOverrides: bulkOverrides,
          replaceExisting: false
        });

        setMessage({ type: 'success', text: `Successfully reassigned ${selectedShiftTasks.length} tasks in the shift` });
      } else {
        // Single task operation
        await weekScheduleApi.applyWeekOverride(currentFamily.id, {
          weekStartDate: currentWeekStart,
          taskOverrides: [overrideData],
          replaceExisting: false // Individual task overrides should be cumulative
        });

        const actionText = overrideData.action === 'ADD' ? 'added' : 
                          overrideData.action === 'REMOVE' ? 'removed' : 
                          overrideData.action === 'REASSIGN' ? 'reassigned' : 'modified';
        
        setMessage({ type: 'success', text: `Task ${actionText} successfully` });
      }
      
      loadWeekSchedule(currentWeekStart); // Reload to show changes
      setSelectedShiftTasks([]); // Clear bulk selection
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to apply task override' });
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00.000Z');
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNumber = date.getDate();
    
    return `${dayName} ${dayNumber}`;
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

  const formatTime24 = (time: string): string => {
    const [hours, minutes] = time.split(':');
    return `${hours || '00'}:${minutes || '00'}`;
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

  // Group sequential tasks by member into shifts
  const groupTasksIntoShifts = (tasks: ResolvedTask[]): Array<{ memberId: string | null; tasks: ResolvedTask[] }> => {
    if (tasks.length === 0) return [];
    
    const shifts: Array<{ memberId: string | null; tasks: ResolvedTask[] }> = [];
    let currentShift: { memberId: string | null; tasks: ResolvedTask[] } | null = null;
    
    tasks.forEach((task) => {
      if (!currentShift || currentShift.memberId !== task.memberId) {
        // Start a new shift
        currentShift = {
          memberId: task.memberId,
          tasks: [task]
        };
        shifts.push(currentShift);
      } else {
        // Add to current shift
        currentShift.tasks.push(task);
      }
    });
    
    return shifts;
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
        <div className="weekly-calendar-title-section">
          <h2 className="weekly-calendar-title">Weekly Schedule</h2>
          <span className="weekly-calendar-date-range">
            {formatWeekRange(currentWeekStart)}
          </span>
          {weekSchedule?.baseTemplate && (
            <span className="weekly-calendar-template-info">
              • {weekSchedule.baseTemplate.name}
              {weekSchedule.hasOverrides && (
                <span className="weekly-calendar-modified-indicator"> • modified</span>
              )}
            </span>
          )}
        </div>
        
        <TaskSplitIndicator />
        
        <div className="weekly-calendar-controls">
          <button
            className="weekly-calendar-header-button"
            onClick={() => navigateWeek('prev')}
            title="Previous week"
          >
            ←
          </button>
          
          {!isCurrentWeek() && (
            <button
              className="weekly-calendar-header-button active"
              onClick={goToCurrentWeek}
              title="Go to current week"
            >
              Today
            </button>
          )}
          
          <button
            className="weekly-calendar-header-button"
            onClick={() => navigateWeek('next')}
            title="Next week"
          >
            →
          </button>

          {isAdmin && (
            <div className="weekly-calendar-admin-controls">
              <button
                className="weekly-calendar-header-button"
                onClick={handleApplyTemplate}
                disabled={isLoading || weekTemplates.length === 0}
                title={weekTemplates.length === 0 ? 'No week templates available' : 'Apply a weekly routine to this week'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9"></circle>
                  <polyline points="12,6 12,12 8,12"></polyline>
                </svg>
                Apply Routine
              </button>
              {weekSchedule?.hasOverrides && (
                <button
                  className="weekly-calendar-header-button"
                  onClick={handleRemoveOverrides}
                  disabled={isLoading}
                  title="Revert to template"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"></path>
                    <path d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14"></path>
                  </svg>
                  Revert
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
          <Button
            variant="primary"
            size="sm"
            onClick={() => loadWeekSchedule(currentWeekStart)}
          >
            Try Again
          </Button>

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
                  </div>
                  {isAdmin && (
                    <div className="weekly-calendar-day-controls">
                      <Button
                        variant="icon"
                        className="weekly-calendar-day-override-btn"
                        onClick={() => handleTaskOverride('ADD', undefined, day.date)}
                        disabled={isLoading || availableTasks.length === 0}
                        title={availableTasks.length === 0 ? 'No tasks available' : 'Add a task to this day'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </Button>
                      <Button
                        variant="icon"
                        className="weekly-calendar-day-override-btn"
                        onClick={() => handleApplyDayTemplate(day.date)}
                        disabled={isLoading || dayTemplates.length === 0}
                        title={dayTemplates.length === 0 ? 'No day routines available' : 'Apply a daily routine to this day'}
                      >
                        <RoutinesIcon size={14} />
                      </Button>
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
                      {groupTasksIntoShifts(dayTasks).map((shift, shiftIndex) => {
                        const isMultiTaskShift = shift.tasks.length > 1;
                        const shiftMember = shift.tasks[0]?.member;
                        
                        // Calculate shift time range and duration
                        let shiftStartTime = '';
                        let shiftEndTime = '';
                        let totalDuration = 0;
                        
                        if (isMultiTaskShift && shift.tasks.length > 0) {
                          // Get start time from first task
                          const firstTask = shift.tasks[0];
                          if (firstTask) {
                            shiftStartTime = firstTask.overrideTime || firstTask.task.defaultStartTime;
                            
                            // Calculate end time from last task
                            const lastTask = shift.tasks[shift.tasks.length - 1];
                            if (lastTask) {
                              const lastTaskStartTime = lastTask.overrideTime || lastTask.task.defaultStartTime;
                              const lastTaskDuration = lastTask.overrideDuration || lastTask.task.defaultDuration;
                              
                              // Parse time and add duration
                              const lastTimeParts = lastTaskStartTime.split(':').map(Number);
                              const lastHours = lastTimeParts[0] || 0;
                              const lastMinutes = lastTimeParts[1] || 0;
                              const endMinutes = lastHours * 60 + lastMinutes + lastTaskDuration;
                              const endHours = Math.floor(endMinutes / 60);
                              const endMins = endMinutes % 60;
                              shiftEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
                              
                              // Calculate total duration from first task start to last task end
                              const firstTimeParts = shiftStartTime.split(':').map(Number);
                              const firstHours = firstTimeParts[0] || 0;
                              const firstMinutes = firstTimeParts[1] || 0;
                              const startTotalMinutes = firstHours * 60 + firstMinutes;
                              totalDuration = endMinutes - startTotalMinutes;
                            }
                          }
                        }
                        
                        const isCurrentUser = shift.memberId ? isCurrentUserShift(shift.memberId) : false;
                        const isCurrentlyActive = isCurrentUser && isShiftCurrentlyActive(shift.tasks, day.date);

                        return (
                          <div
                            key={`shift-${shiftIndex}-${shift.memberId}`}
                            className={`weekly-calendar-shift ${isMultiTaskShift ? 'is-multi-task' : ''} ${isCurrentUser ? 'is-current-user' : ''} ${isCurrentlyActive ? 'is-currently-active' : ''}`}
                          >
                            {isMultiTaskShift && shiftMember && (
                              <div className="weekly-calendar-shift-header">
                                <div className="weekly-calendar-shift-member">
                                  <UserAvatar
                                    firstName={shiftMember.firstName}
                                    lastName={shiftMember.lastName}
                                    avatarUrl={shiftMember.avatarUrl}
                                    size="small"
                                  />

                                </div>
                                <div className="weekly-calendar-shift-tags">
                                  <span className="weekly-calendar-shift-tag time-tag">
                                    {formatTime24(shiftStartTime)} - {formatTime24(shiftEndTime)}
                                  </span>
                                  <span className="weekly-calendar-shift-tag duration-tag">
                                    {formatDuration(totalDuration)}
                                  </span>
                                </div>
                                {isAdmin && (
                                  <div className="weekly-calendar-shift-actions">
                                    <DropdownMenu
                                      items={[
                                        {
                                          id: 'reassign-shift',
                                          label: 'Reassign all tasks',
                                          icon: '↻',
                                          onClick: () => handleShiftReassign(shift.tasks, day.date),
                                          variant: 'primary'
                                        },
                                        {
                                          id: 'remove-shift',
                                          label: 'Remove all tasks',
                                          icon: '×',
                                          onClick: () => handleShiftRemove(shift.tasks, day.date),
                                          variant: 'danger'
                                        }
                                      ] as DropdownMenuItem[]}
                                      align="right"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={`weekly-calendar-shift-tasks ${isMultiTaskShift ? 'grouped' : ''}`}>
                              {shift.tasks.map((task, taskIndex) => {
                                const isTaskCurrentUser = task.memberId ? isCurrentUserShift(task.memberId) : false;
                                const isTaskCurrentlyActive = isTaskCurrentUser && isShiftCurrentlyActive([task], day.date);

                                return (
                                  <TaskOverrideCard
                                    key={`${task.taskId}-${task.memberId}-${taskIndex}`}
                                    task={task}
                                    taskIndex={taskIndex}
                                    isAdmin={isAdmin}
                                    onRemove={(task) => handleTaskOverride('REMOVE', task, day.date)}
                                    onReassign={(task) => handleTaskOverride('REASSIGN', task, day.date)}
                                    formatTime={formatTime}
                                    formatDuration={formatDuration}
                                    showDescription={false}
                                    compact={false}
                                    hideAvatar={isMultiTaskShift}
                                    isCurrentUser={isTaskCurrentUser}
                                    isCurrentlyActive={isTaskCurrentlyActive}
                                  />
                                );
                              })}
                            </div>
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
              <Button
                variant="icon"
                onClick={handleCancelApplyTemplate}
                disabled={isApplyingTemplate}
              >
                ✕
              </Button>
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
              <Button
                variant="secondary"
                onClick={handleCancelApplyTemplate}
                disabled={isApplyingTemplate}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmApplyTemplate}
                disabled={!selectedTemplateId || isApplyingTemplate}
                loading={isApplyingTemplate}
              >
                Apply Template
              </Button>
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
              <Button
                variant="icon"
                onClick={handleCancelApplyDayTemplate}
                disabled={isApplyingDayTemplate}
              >
                ✕
              </Button>
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
              <Button
                variant="secondary"
                onClick={handleCancelApplyDayTemplate}
                disabled={isApplyingDayTemplate}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmApplyDayTemplate}
                disabled={!selectedDayTemplateId || isApplyingDayTemplate}
                loading={isApplyingDayTemplate}
              >
                Apply Routine
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task Override Modal */}
      <TaskOverrideModal
        isOpen={showTaskOverrideModal}
        onClose={handleCancelTaskOverride}
        onConfirm={handleConfirmTaskOverride}
        task={selectedTask}
        bulkTasks={selectedShiftTasks}
        date={taskOverrideDate}
        action={taskOverrideAction}
        availableTasks={availableTasks}
        familyMembers={familyMembers}
        isLoading={isLoading}
      />
    </div>
  );
}; 