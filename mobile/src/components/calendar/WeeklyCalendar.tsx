import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useFamily } from '../../contexts/FamilyContext';
import { weekScheduleApi, taskApi, familyApi } from '../../services/api';
import { LoadingSpinner, TaskOverrideCard, Button } from '../ui';
import type { ResolvedWeekSchedule, ResolvedTask, ResolvedDay, Task, User } from '../../types';

interface WeeklyCalendarProps {
  style?: any;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ style }) => {
  const { currentFamily } = useFamily();
  const [weekSchedule, setWeekSchedule] = useState<ResolvedWeekSchedule | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('');
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);

  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth > 768;
  const daysToShow = isTablet ? 3 : 1;

  const isAdmin = currentFamily?.userRole === 'ADMIN';

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
    
    console.log('WeeklyCalendar: Loading week schedule for family:', currentFamily.id, 'week:', weekStartDate);
    setIsLoading(true);
    setError(null);
    try {
      const response = await weekScheduleApi.getWeekSchedule(currentFamily.id, weekStartDate);
      console.log('WeeklyCalendar: API response:', response.data);
      // Backend returns the ResolvedWeekSchedule directly (not wrapped in { success: true, data: ... })
      const scheduleData = response.data;
      console.log('WeeklyCalendar: Extracted schedule data:', scheduleData);
      console.log('WeeklyCalendar: Schedule data type:', typeof scheduleData);
      console.log('WeeklyCalendar: Schedule data keys:', Object.keys(scheduleData || {}));
      if (scheduleData && scheduleData.days) {
        console.log('WeeklyCalendar: Days array length:', scheduleData.days.length);
        scheduleData.days.forEach((day: any, index: number) => {
          console.log(`WeeklyCalendar: Day ${index} (${day.date}):`, {
            date: day.date,
            tasksCount: day.tasks ? day.tasks.length : 0,
            tasks: day.tasks,
            tasksStringified: JSON.stringify(day.tasks, null, 2)
          });
          
          // Log each task individually if they exist
          if (day.tasks && day.tasks.length > 0) {
            day.tasks.forEach((task: any, taskIndex: number) => {
              console.log(`WeeklyCalendar: Day ${index} Task ${taskIndex}:`, task);
            });
          }
        });
      }
      setWeekSchedule(scheduleData);
    } catch (error: any) {
      console.error('WeeklyCalendar: Failed to load week schedule:', error);
      console.error('WeeklyCalendar: Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to load week schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableTasks = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await taskApi.getFamilyTasks(currentFamily.id);
      console.log('WeeklyCalendar: Tasks API response:', response.data);
      // Backend returns { success: true, data: [tasks array] }
      // So we need response.data.data to get the actual tasks array
      const tasksData = response.data?.data || response.data;
      console.log('WeeklyCalendar: Extracted tasks data:', tasksData);
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
    console.log('getDayTasks called with day:', day);
    if (!day || !day.tasks) {
      console.log('getDayTasks: No day or no tasks, returning empty array');
      return [];
    }
    console.log('getDayTasks: Found tasks:', day.tasks);
    const sortedTasks = sortTasksByTime(day.tasks);
    console.log('getDayTasks: Sorted tasks:', sortedTasks);
    return sortedTasks;
  };

  const isCurrentWeek = (): boolean => {
    const today = new Date();
    const currentMonday = getMonday(today);
    return currentWeekStart === currentMonday;
  };

  const handleTaskOverride = (action: 'ADD' | 'REMOVE' | 'REASSIGN', task?: ResolvedTask, date?: string) => {
    // For now, show a simple alert - this would be replaced with a modal in full implementation
    Alert.alert(
      'Task Override',
      `${action} task ${task?.task.name || 'new task'} on ${date ? formatDate(date) : 'selected date'}`,
      [{ text: 'OK' }]
    );
  };

  const getVisibleDays = (): ResolvedDay[] => {
    console.log('getVisibleDays called, weekSchedule:', weekSchedule);
    if (!weekSchedule) {
      console.log('getVisibleDays: No weekSchedule, returning empty array');
      return [];
    }
    
    console.log('getVisibleDays: weekSchedule.days:', weekSchedule.days);
    console.log('getVisibleDays: currentDayIndex:', currentDayIndex, 'daysToShow:', daysToShow);
    
    if (daysToShow === 1) {
      const visibleDay = weekSchedule.days[currentDayIndex];
      console.log('getVisibleDays: Returning single day:', visibleDay);
      return [visibleDay];
    } else {
      // For tablet, show 3 days centered around current day
      const startIndex = Math.max(0, Math.min(currentDayIndex - 1, 4));
      const visibleDays = weekSchedule.days.slice(startIndex, startIndex + 3);
      console.log('getVisibleDays: Returning multiple days:', visibleDays);
      return visibleDays;
    }
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Weekly Schedule</Text>
          <Text style={styles.dateRange}>
            {formatWeekRange(currentWeekStart)}
          </Text>
          {weekSchedule?.baseTemplate && (
            <Text style={styles.templateInfo}>
              • {weekSchedule.baseTemplate.name}
              {weekSchedule.hasOverrides && (
                <Text style={styles.modifiedIndicator}> • modified</Text>
              )}
            </Text>
          )}
        </View>
        
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek('prev')}
          >
            <Text style={styles.navButtonText}>←</Text>
          </TouchableOpacity>
          
          {!isCurrentWeek() && (
            <TouchableOpacity
              style={[styles.navButton, styles.todayButton]}
              onPress={goToCurrentWeek}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek('next')}
          >
            <Text style={styles.navButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Day Navigation for Mobile */}
      {daysToShow === 1 && weekSchedule && (
        <View style={styles.dayNavigation}>
          <TouchableOpacity
            style={[styles.dayNavButton, currentDayIndex === 0 && styles.dayNavButtonDisabled]}
            onPress={() => navigateDay('prev')}
            disabled={currentDayIndex === 0}
          >
            <Text style={styles.dayNavButtonText}>‹</Text>
          </TouchableOpacity>
          
          <View style={styles.dayIndicators}>
            {weekSchedule.days.map((day, index) => (
              <TouchableOpacity
                key={day.date}
                style={[
                  styles.dayIndicator,
                  index === currentDayIndex && styles.dayIndicatorActive
                ]}
                onPress={() => setCurrentDayIndex(index)}
              >
                <Text style={[
                  styles.dayIndicatorText,
                  index === currentDayIndex && styles.dayIndicatorTextActive
                ]}>
                  {formatDate(day.date).split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity
            style={[styles.dayNavButton, currentDayIndex === 6 && styles.dayNavButtonDisabled]}
            onPress={() => navigateDay('next')}
            disabled={currentDayIndex === 6}
          >
            <Text style={styles.dayNavButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      {message && (
        <View style={[styles.message, styles[`message${message.type}`]]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      {/* Calendar Content */}
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
        <ScrollView style={styles.calendarContent} showsVerticalScrollIndicator={false}>
          <View style={styles.daysContainer}>
            {getVisibleDays().map((day, index) => {
              console.log('Rendering day:', day.date, 'with day object:', day);
              const dayTasks = getDayTasks(day);
              console.log('Day tasks for', day.date, ':', dayTasks);
              const isToday = new Date(day.date + 'T00:00:00.000Z').toDateString() === new Date().toDateString();
              
              return (
                <View 
                  key={day.date} 
                  style={[
                    styles.dayColumn,
                    isToday && styles.todayColumn,
                    daysToShow > 1 && styles.multiDayColumn
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
                            onRemove={(task) => handleTaskOverride('REMOVE', task, day.date)}
                            onReassign={(task) => handleTaskOverride('REASSIGN', task, day.date)}
                            formatTime={formatTime}
                            formatDuration={formatDuration}
                            showDescription={false}
                            compact={daysToShow > 1}
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
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No schedule data available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleSection: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  templateInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  modifiedIndicator: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
  },
  todayButton: {
    backgroundColor: '#3b82f6',
  },
  todayButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dayNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dayNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  dayNavButtonDisabled: {
    opacity: 0.5,
  },
  dayNavButtonText: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '600',
  },
  dayIndicators: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
  },
  dayIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dayIndicatorActive: {
    backgroundColor: '#3b82f6',
  },
  dayIndicatorText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  dayIndicatorTextActive: {
    color: '#ffffff',
    fontWeight: '600',
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
}); 