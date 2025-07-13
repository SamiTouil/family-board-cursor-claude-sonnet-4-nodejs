import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { PanGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily } from '../../contexts/FamilyContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { weekScheduleApi, taskApi, familyApi } from '../../services/api';
import { LoadingSpinner, TaskOverrideCard, Button, UserAvatar, TaskSplitIndicator } from '../ui';
import { ShiftIndicator } from '../ui/ShiftIndicator';
import { TaskOverrideModal, CreateTaskOverrideData } from './TaskOverrideModal';
import type { ResolvedWeekSchedule, ResolvedTask, ResolvedDay, Task, User } from '../../types';

interface WeeklyCalendarProps {
  style?: any;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ style }) => {
  const { currentFamily } = useFamily();
  const { on, off } = useNotifications();
  const insets = useSafeAreaInsets();
  const [weekSchedule, setWeekSchedule] = useState<ResolvedWeekSchedule | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('');
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [messageTimeout, setMessageTimeout] = useState<NodeJS.Timeout | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);

  // Task override modal state
  const [showTaskOverrideModal, setShowTaskOverrideModal] = useState(false);
  const [taskOverrideAction, setTaskOverrideAction] = useState<'ADD' | 'REMOVE' | 'REASSIGN'>('ADD');
  const [selectedTask, setSelectedTask] = useState<ResolvedTask | undefined>(undefined);
  const [taskOverrideDate, setTaskOverrideDate] = useState<string>('');

  // Animation state for smooth transitions with prerendering
  const [slideAnimation] = useState(new Animated.Value(0));
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Prerendering state for smooth transitions
  const [prevDayData, setPrevDayData] = useState<ResolvedDay | null>(null);
  const [nextDayData, setNextDayData] = useState<ResolvedDay | null>(null);

  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth > 768;
  const daysToShow = isTablet ? 3 : 1;

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  // Helper function to set message with auto-dismiss
  const setMessageWithAutoDismiss = (newMessage: { type: 'success' | 'error'; text: string } | null) => {
    // Clear existing timeout
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      setMessageTimeout(null);
    }

    setMessage(newMessage);

    // Set auto-dismiss for success messages (3 seconds) and error messages (5 seconds)
    if (newMessage) {
      const timeout = setTimeout(() => {
        setMessage(null);
        setMessageTimeout(null);
      }, newMessage.type === 'success' ? 3000 : 5000);
      setMessageTimeout(timeout);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
    };
  }, [messageTimeout]);

  // Set up WebSocket event listeners for real-time schedule updates
  useEffect(() => {
    if (!currentFamily) return;

    // Handle task schedule updates
    const handleTaskScheduleUpdated = (data: any) => {
      console.log('WeeklyCalendar: Task schedule updated', data);
      // Refresh the current week schedule to show changes
      if (currentWeekStart) {
        loadWeekSchedule(currentWeekStart);
      }
    };

    // Register event listener
    on('task-schedule-updated', handleTaskScheduleUpdated);

    // Cleanup event listener
    return () => {
      off('task-schedule-updated', handleTaskScheduleUpdated);
    };
  }, [currentFamily, currentWeekStart, on, off]);

  // Initialize with current week
  useEffect(() => {
    if (currentFamily) {
      console.log('WeeklyCalendar: Initializing with family:', currentFamily.name);
      const today = new Date();
      const monday = getMonday(today);
      console.log('WeeklyCalendar: Calculated Monday:', monday);
      setCurrentWeekStart(monday);
      
      // Set current day index to today
      const todayIndex = new Date().getDay();
      const mondayBasedIndex = todayIndex === 0 ? 6 : todayIndex - 1; // Convert Sunday=0 to Monday=0 based
      setCurrentDayIndex(mondayBasedIndex);
      
      loadWeekSchedule(monday);
      loadAvailableTasks();
      loadFamilyMembers();
    } else {
      console.log('WeeklyCalendar: No current family available');
    }
  }, [currentFamily]);

  // Get prerendered day data for smooth transitions
  const getPrerenderDayData = async (weekStart: string, dayIndex: number): Promise<ResolvedDay | null> => {
    try {
      if (!currentFamily) return null;
      
      const response = await weekScheduleApi.getWeekSchedule(currentFamily.id, weekStart);
      const scheduleData = response.data;
      
      if (scheduleData && scheduleData.days && scheduleData.days[dayIndex]) {
        return scheduleData.days[dayIndex];
      }
      return null;
    } catch (error) {
      console.error('Failed to prerender day data:', error);
      return null;
    }
  };

  // Update prerendered days when current day changes
  useEffect(() => {
    if (!weekSchedule || !currentFamily) return;

    const updatePrerenderData = async () => {
      // Calculate previous day
      if (currentDayIndex === 0) {
        // Previous day is Sunday of previous week
        const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
        const prevWeekDate = new Date(currentDate);
        prevWeekDate.setDate(currentDate.getDate() - 7);
        const prevWeekStart = getMonday(prevWeekDate);
        setPrevDayData(await getPrerenderDayData(prevWeekStart, 6));
      } else {
        // Previous day is in current week
        setPrevDayData(weekSchedule.days[currentDayIndex - 1] || null);
      }

      // Calculate next day
      if (currentDayIndex === 6) {
        // Next day is Monday of next week
        const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
        const nextWeekDate = new Date(currentDate);
        nextWeekDate.setDate(currentDate.getDate() + 7);
        const nextWeekStart = getMonday(nextWeekDate);
        setNextDayData(await getPrerenderDayData(nextWeekStart, 0));
      } else {
        // Next day is in current week
        setNextDayData(weekSchedule.days[currentDayIndex + 1] || null);
      }
    };

    updatePrerenderData();
  }, [currentDayIndex, currentWeekStart, weekSchedule, currentFamily]);

  // Initialize slide animation to center position
  useEffect(() => {
    if (daysToShow === 1) {
      slideAnimation.setValue(-screenWidth);
    }
  }, [daysToShow, screenWidth, slideAnimation]);

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

  const loadWeekSchedule = async (weekStartDate: string) => {
    if (!currentFamily) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await weekScheduleApi.getWeekSchedule(currentFamily.id, weekStartDate);
      // Backend returns the ResolvedWeekSchedule directly (not wrapped in { success: true, data: ... })
      const scheduleData = response.data;
      setWeekSchedule(scheduleData);
    } catch (error: any) {
      console.error('WeeklyCalendar: Failed to load week schedule:', error);
      setError(error.response?.data?.message || 'Failed to load week schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableTasks = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await taskApi.getFamilyTasks(currentFamily.id);
      // Backend returns { success: true, data: [tasks array] }
      const tasksData = response.data?.data || response.data;
      setAvailableTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('WeeklyCalendar: Failed to load tasks:', error);
      setAvailableTasks([]);
    }
  };

  const loadFamilyMembers = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await familyApi.getMembers(currentFamily.id);
      
      // Backend returns: { success: true, data: [FamilyMemberResponse array] }
      const membersData = response.data?.data || [];
      
      if (Array.isArray(membersData)) {
        // Backend returns FamilyMemberResponse objects with nested user data
        const members = membersData.map((member: any) => ({
          id: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl,
          isVirtual: member.user.isVirtual || false,
          createdAt: member.user.createdAt || new Date().toISOString(),
          updatedAt: member.user.updatedAt || new Date().toISOString()
        }));
        setFamilyMembers(members);
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
      setFamilyMembers([]);
    }
  };


  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    
    const newWeekStart = getMonday(newDate);
    setCurrentWeekStart(newWeekStart);
    loadWeekSchedule(newWeekStart);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    if (!weekSchedule) return;
    
    const newIndex = direction === 'next' 
      ? Math.min(currentDayIndex + 1, 6)
      : Math.max(currentDayIndex - 1, 0);
    
    setCurrentDayIndex(newIndex);
  };

  // Handle swipe gestures with proper cross-week navigation
  const handleSwipeGesture = (event: any) => {
    const { nativeEvent } = event;
    
    // Only handle swipes on mobile (single day view)
    if (daysToShow !== 1 || !weekSchedule) return;
    
    const { translationX, state } = nativeEvent;
    
    if (state === State.ACTIVE) {
      // Follow finger movement in real-time
      const baseOffset = -screenWidth;
      slideAnimation.setValue(baseOffset + translationX);
    } else if (state === State.END) {
      const { velocityX } = nativeEvent;
      
      // Determine if gesture should trigger navigation
      const swipeThreshold = screenWidth * 0.3;
      const velocityThreshold = 500;
      
      const shouldNavigateNext = translationX < -swipeThreshold || velocityX < -velocityThreshold;
      const shouldNavigatePrev = translationX > swipeThreshold || velocityX > velocityThreshold;
      
      if (shouldNavigateNext || shouldNavigatePrev) {
        // Animate to completion first
        const targetPosition = shouldNavigateNext ? -screenWidth * 2 : 0;
        
        Animated.timing(slideAnimation, {
          toValue: targetPosition,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // After animation completes, update data and reset position
          const direction = shouldNavigateNext ? 'next' : 'prev';
          updateNavigationData(direction).then(() => {
            // Reset to center after data is updated
            slideAnimation.setValue(-screenWidth);
          });
        });
      } else {
        // Snap back to center position
        Animated.spring(slideAnimation, {
          toValue: -screenWidth,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start(() => {
          // After animation completes, update data and reset position
          const direction = shouldNavigateNext ? 'next' : 'prev';
          updateNavigationData(direction).then(() => {
            // Small delay to ensure prerendered data is updated
            setTimeout(() => {
              slideAnimation.setValue(-screenWidth);
            }, 50);
          });
        });
      }
    } else if (state === State.BEGAN) {
      // Initialize animation to center position when gesture begins
      slideAnimation.setValue(-screenWidth);
    }
  };

  // Update navigation data without visual disruption
  const updateNavigationData = async (direction: 'prev' | 'next') => {
    if (!weekSchedule || isAnimating) return;

    setIsAnimating(true);

    try {
      if (direction === 'next' && currentDayIndex === 6) {
        // Sunday -> next Monday (next week)
        const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        const newWeekStart = getMonday(newDate);
        
        setCurrentWeekStart(newWeekStart);
        setCurrentDayIndex(0);
        await loadWeekSchedule(newWeekStart);
      } else if (direction === 'prev' && currentDayIndex === 0) {
        // Monday -> previous Sunday (previous week)
        const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        const newWeekStart = getMonday(newDate);
        
        setCurrentWeekStart(newWeekStart);
        setCurrentDayIndex(6);
        await loadWeekSchedule(newWeekStart);
      } else {
        // Regular day navigation within the week
        const newIndex = direction === 'next' 
          ? Math.min(currentDayIndex + 1, 6)
          : Math.max(currentDayIndex - 1, 0);
        setCurrentDayIndex(newIndex);
      }
    } catch (error) {
      console.error('Navigation data update failed:', error);
    } finally {
      setIsAnimating(false);
    }
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const monday = getMonday(today);
    setCurrentWeekStart(monday);
    
    const todayIndex = new Date().getDay();
    const mondayBasedIndex = todayIndex === 0 ? 6 : todayIndex - 1;
    setCurrentDayIndex(mondayBasedIndex);
    
    loadWeekSchedule(monday);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00.000Z');
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    
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

  const getDayTasks = (day: ResolvedDay) => {
    if (!day || !day.tasks) {
      return [];
    }
    return sortTasksByTime(day.tasks);
  };

  const isCurrentWeek = (): boolean => {
    const today = new Date();
    const currentMonday = getMonday(today);
    return currentWeekStart === currentMonday;
  };

  const handleTaskPress = (task: ResolvedTask, date: string) => {
    if (!isAdmin) return;
    
    // Show action menu for task (placeholder for now - will show alert)
    Alert.alert(
      'Task Actions',
      `What would you like to do with "${task.task.name}"?`,
      [
        { text: 'Edit', onPress: () => handleTaskOverride('REASSIGN', task, date) },
        { text: 'Remove', onPress: () => handleTaskOverride('REMOVE', task, date), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleTaskOverride = (action: 'ADD' | 'REMOVE' | 'REASSIGN', task?: ResolvedTask, date?: string) => {
    setTaskOverrideAction(action);
    setSelectedTask(task);
    setTaskOverrideDate(date || '');
    setShowTaskOverrideModal(true);
    setMessageWithAutoDismiss(null);
  };

  const handleCancelTaskOverride = () => {
    setShowTaskOverrideModal(false);
    setSelectedTask(undefined);
    setTaskOverrideDate('');
  };

  const handleConfirmTaskOverride = async (overrideData: CreateTaskOverrideData) => {
    if (!currentFamily) return;

    try {
      await weekScheduleApi.applyWeekOverride(currentFamily.id, {
        weekStartDate: currentWeekStart,
        taskOverrides: [overrideData],
        replaceExisting: false // Individual task overrides should be cumulative
      });

      const actionText = overrideData.action === 'ADD' ? 'added' : 
                        overrideData.action === 'REMOVE' ? 'removed' : 
                        overrideData.action === 'REASSIGN' ? 'reassigned' : 'modified';
      
      setMessageWithAutoDismiss({ type: 'success', text: `Task ${actionText} successfully` });
      loadWeekSchedule(currentWeekStart); // Reload to show changes
    } catch (error: any) {
      setMessageWithAutoDismiss({ type: 'error', text: error.response?.data?.message || 'Failed to apply task override' });
    }
  };

  const getVisibleDays = (): ResolvedDay[] => {
    if (!weekSchedule) return [];
    
    if (daysToShow === 1) {
      // Mobile: show only current day
      return [weekSchedule.days[currentDayIndex]];
    } else {
      // Tablet: show multiple days
      const startIndex = Math.max(0, currentDayIndex - 1);
      const endIndex = Math.min(6, startIndex + daysToShow - 1);
      return weekSchedule.days.slice(startIndex, endIndex + 1);
    }
  };

  // Helper function to render a day component
  const renderDayComponent = (day: ResolvedDay | null, position: 'prev' | 'current' | 'next') => {
    if (!day) return null;

    const dayTasks = getDayTasks(day);
    const isToday = new Date(day.date + 'T00:00:00.000Z').toDateString() === new Date().toDateString();
    
    return (
      <View 
        key={`${day.date}-${position}`}
        style={[
          styles.dayColumn,
          isToday && styles.todayColumn,
          styles.slidingDayColumn,
          position === 'prev' && styles.prevDayColumn,
          position === 'next' && styles.nextDayColumn,
        ]}
      >
        {/* Day Header */}
        <View style={[styles.dayHeader, isToday && styles.todayHeader]}>
          <View style={styles.dayInfo}>
            <Text style={[styles.dayName, isToday && styles.todayDayName]}>
              {formatDate(day.date)}
            </Text>
            <Text style={styles.taskCount}>
              {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </View>
        
        {/* Tasks */}
        <View style={styles.tasksContainer}>
          {dayTasks.length === 0 ? (
            <View style={styles.noTasks}>
              <Text style={styles.noTasksText}>No tasks</Text>
            </View>
          ) : (
            <View style={styles.tasksStack}>
              {dayTasks.map((task, taskIndex) => (
                <TaskOverrideCard
                  key={`${task.taskId}-${task.memberId}-${taskIndex}`}
                  task={task}
                  taskIndex={taskIndex}
                  isAdmin={isAdmin}
                  onPress={(task) => handleTaskPress(task, day.date)}
                  formatTime={formatTime}
                  formatDuration={formatDuration}
                  showDescription={false}
                  compact={false}
                />
              ))}
            </View>
          )}
          
          {/* Add Task Button */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => handleTaskOverride('ADD', undefined, day.date)}
              disabled={isLoading || availableTasks.length === 0}
            >
              <Text style={styles.addTaskButtonText}>+ Add Task</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!currentFamily) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please select a family to view the calendar.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Gradient Background that extends to top */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientBackground, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
        {/* Line 1: Template Name + Modified Indicator */}
        <View style={styles.templateRow}>
          {weekSchedule?.baseTemplate ? (
            <Text style={styles.templateInfo}>
              {weekSchedule.baseTemplate.name}
              {weekSchedule.hasOverrides && (
                <Text style={styles.modifiedIndicator}> • modified</Text>
              )}
            </Text>
          ) : (
            <Text style={styles.templateInfo}>Schedule</Text>
          )}
        </View>
        
        {/* Line 2: Shift Indicator + Task Split Indicator */}
        <View style={styles.shiftRow}>
          <ShiftIndicator />
          <View style={styles.indicatorSpacer} />
          <TaskSplitIndicator currentWeekStart={currentWeekStart} />
        </View>
        
        {/* Line 3: Admin Controls */}
        {isAdmin && (
          <View style={styles.adminRow}>
            <View style={styles.adminControls}>
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => Alert.alert('Apply Routine', 'This feature is coming soon!')}
                disabled={isLoading}
              >
                <Text style={styles.adminButtonText}>Apply Routine</Text>
              </TouchableOpacity>
              
              {weekSchedule?.hasOverrides && (
                <TouchableOpacity
                  style={styles.adminButton}
                  onPress={() => Alert.alert('Revert', 'This feature is coming soon!')}
                  disabled={isLoading}
                >
                  <Text style={styles.adminButtonText}>Revert</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        </View>
      </LinearGradient>

      <GestureHandlerRootView style={styles.contentContainer}>

      {/* Messages */}
      {message && (
        <View style={[styles.message, styles[`message${message.type}`]]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      {/* Calendar Content with Swipe Gesture Support */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Button
            title="Try Again"
            onPress={() => loadWeekSchedule(currentWeekStart)}
            variant="primary"
            size="sm"
          />
        </View>
      ) : weekSchedule ? (
        <PanGestureHandler
          onGestureEvent={handleSwipeGesture}
          onHandlerStateChange={handleSwipeGesture}
          activeOffsetX={[-5, 5]}
          failOffsetY={[-20, 20]}
          shouldCancelWhenOutside={false}
        >
          <View style={styles.gestureContainer}>
            <ScrollView style={styles.calendarContent} showsVerticalScrollIndicator={false}>
              {daysToShow === 1 ? (
                // Mobile: Three-day sliding view (prev, current, next)
                <Animated.View 
                  style={[
                    styles.slidingContainer,
                    {
                      transform: [{ translateX: slideAnimation }]
                    }
                  ]}
                >
                  {/* Previous Day */}
                  {renderDayComponent(prevDayData, 'prev')}
                  
                  {/* Current Day */}
                  {renderDayComponent(weekSchedule.days[currentDayIndex], 'current')}
                  
                  {/* Next Day */}
                  {renderDayComponent(nextDayData, 'next')}
                </Animated.View>
              ) : (
                // Tablet: Multi-day view
                <View style={styles.daysContainer}>
                  {getVisibleDays().map((day, index) => {
                    return renderDayComponent(day, 'current');
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </PanGestureHandler>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No schedule data available</Text>
        </View>
      )}
      
      {/* Task Override Modal */}
      <TaskOverrideModal
        visible={showTaskOverrideModal}
        onClose={handleCancelTaskOverride}
        onConfirm={handleConfirmTaskOverride}
        task={selectedTask}
        date={taskOverrideDate}
        action={taskOverrideAction}
        availableTasks={availableTasks}
        familyMembers={familyMembers}
        isLoading={isLoading}
      />
      </GestureHandlerRootView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  gradientBackground: {
    marginTop: -10, // Extend gradient above the container
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 0,
  },
  contentContainer: {
    flex: 1,
  },
  templateRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicatorSpacer: {
    flex: 1,
  },
  templateInfo: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  modifiedIndicator: {
    color: '#fde68a',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    width: '100%',
  },
  dateAndControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateRange: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  todayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    minWidth: 60,
  },
  todayButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  adminRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  adminControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },

  message: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  messagesuccess: {
    backgroundColor: '#d1fae5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
  },
  messageerror: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  gestureContainer: {
    flex: 1,
  },
  calendarContent: {
    flex: 1,
  },
  daysContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  dayColumn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  slidingDayColumn: {
    width: '33.333%', // Each day takes 1/3 of the sliding container
    marginHorizontal: 4,
  },
  prevDayColumn: {
    // Previous day is positioned to the left
  },
  nextDayColumn: {
    // Next day is positioned to the right
  },
  multiDayColumn: {
    marginHorizontal: 4,
  },
  todayColumn: {
    borderTopWidth: 3,
    borderTopColor: '#3b82f6',
  },
  dayHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  todayHeader: {
    backgroundColor: '#dbeafe',
  },
  dayInfo: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  todayDayName: {
    color: '#1d4ed8',
  },
  taskCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  tasksContainer: {
    padding: 16,
    minHeight: 200,
  },
  noTasks: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150,
  },
  noTasksText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  tasksStack: {
    gap: 12,
  },
  addTaskButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
  },
  addTaskButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  slidingContainer: {
    flexDirection: 'row',
    width: '300%', // Three days side by side
    paddingHorizontal: 16,
  },
}); 