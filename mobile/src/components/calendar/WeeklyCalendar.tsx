import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily } from '../../contexts/FamilyContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { weekScheduleApi, taskApi, familyApi } from '../../services/api';
import { LoadingSpinner, TaskOverrideCard, Button, UserAvatar, TaskSplitIndicator } from '../ui';
import { ShiftIndicator } from '../ui/ShiftIndicator';
import { TaskOverrideModal, CreateTaskOverrideData } from './TaskOverrideModal';
import type { ResolvedWeekSchedule, ResolvedTask, ResolvedDay, Task, User } from '../../types';

const { width: screenWidth } = Dimensions.get('window');

interface WeeklyCalendarProps {
  style?: any;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ style }) => {
  const { currentFamily } = useFamily();
  const { } = useNotifications();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [weekSchedule, setWeekSchedule] = useState<ResolvedWeekSchedule | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('');
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  
  // Cache for adjacent weeks
  const [weekCache, setWeekCache] = useState<Map<string, ResolvedWeekSchedule>>(new Map());
  
  // Task override modal state
  const [showTaskOverrideModal, setShowTaskOverrideModal] = useState(false);
  const [taskOverrideAction, setTaskOverrideAction] = useState<'ADD' | 'REMOVE' | 'REASSIGN'>('ADD');
  const [selectedTask, setSelectedTask] = useState<ResolvedTask | undefined>(undefined);
  const [taskOverrideDate, setTaskOverrideDate] = useState<string>('');
  
  const isAdmin = currentFamily?.userRole === 'ADMIN';
  const isTablet = screenWidth > 768;
  const daysToShow = isTablet ? 3 : 1;
  
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
  
  const loadWeekSchedule = async (weekStartDate: string, useCache = true) => {
    if (!currentFamily) return;
    
    // Check cache first
    if (useCache && weekCache.has(weekStartDate)) {
      const cached = weekCache.get(weekStartDate);
      if (cached) {
        setWeekSchedule(cached);
        return;
      }
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await weekScheduleApi.getWeekSchedule(currentFamily.id, weekStartDate);
      const scheduleData = response.data;
      setWeekSchedule(scheduleData);
      
      // Update cache
      setWeekCache(prev => new Map(prev).set(weekStartDate, scheduleData));
    } catch (error: any) {
      console.error('Failed to load week schedule:', error);
      setError(error.response?.data?.message || 'Failed to load week schedule');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Preload adjacent weeks
  const preloadAdjacentWeeks = async (weekStartDate: string) => {
    if (!currentFamily) return;
    
    const currentDate = new Date(weekStartDate + 'T00:00:00.000Z');
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    
    const prevWeekStart = getMonday(prevWeek);
    const nextWeekStart = getMonday(nextWeek);
    
    // Load in background without showing loader
    try {
      const [prevResponse, nextResponse] = await Promise.all([
        weekScheduleApi.getWeekSchedule(currentFamily.id, prevWeekStart),
        weekScheduleApi.getWeekSchedule(currentFamily.id, nextWeekStart),
      ]);
      
      setWeekCache(prev => {
        const newCache = new Map(prev);
        newCache.set(prevWeekStart, prevResponse.data);
        newCache.set(nextWeekStart, nextResponse.data);
        return newCache;
      });
    } catch (error) {
      console.error('Failed to preload adjacent weeks:', error);
    }
  };
  
  // Initialize
  useEffect(() => {
    if (currentFamily) {
      const today = new Date();
      const monday = getMonday(today);
      setCurrentWeekStart(monday);
      
      const todayIndex = new Date().getDay();
      const mondayBasedIndex = todayIndex === 0 ? 6 : todayIndex - 1;
      setCurrentDayIndex(mondayBasedIndex);
      
      loadWeekSchedule(monday);
      preloadAdjacentWeeks(monday);
      loadAvailableTasks();
      loadFamilyMembers();
    }
  }, [currentFamily]);
  
  // State for virtual scrolling
  const [scrollDays, setScrollDays] = useState<Array<{day: ResolvedDay | null; weekStart: string; dayIndex: number}>>([]);
  const [centerIndex, setCenterIndex] = useState(7); // Start at center of 21 days
  
  // Build array of days for scrolling (3 weeks: previous, current, next)
  useEffect(() => {
    if (!weekSchedule || !currentWeekStart) return;
    
    const days = [];
    
    // Previous week
    const prevWeek = new Date(currentWeekStart + 'T00:00:00.000Z');
    prevWeek.setDate(prevWeek.getDate() - 7);
    const prevWeekStart = getMonday(prevWeek);
    const prevWeekData = weekCache.get(prevWeekStart);
    
    for (let i = 0; i < 7; i++) {
      days.push({
        day: prevWeekData?.days?.[i] || null,
        weekStart: prevWeekStart,
        dayIndex: i
      });
    }
    
    // Current week
    for (let i = 0; i < 7; i++) {
      days.push({
        day: weekSchedule.days[i],
        weekStart: currentWeekStart,
        dayIndex: i
      });
    }
    
    // Next week
    const nextWeek = new Date(currentWeekStart + 'T00:00:00.000Z');
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStart = getMonday(nextWeek);
    const nextWeekData = weekCache.get(nextWeekStart);
    
    for (let i = 0; i < 7; i++) {
      days.push({
        day: nextWeekData?.days?.[i] || null,
        weekStart: nextWeekStart,
        dayIndex: i
      });
    }
    
    setScrollDays(days);
    setCenterIndex(7 + currentDayIndex);
  }, [weekSchedule, currentWeekStart, currentDayIndex, weekCache]);
  
  // Scroll to center when days are loaded
  useEffect(() => {
    if (scrollDays.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: screenWidth * centerIndex, animated: false });
      }, 100);
    }
  }, [centerIndex, scrollDays.length]);
  
  // Handle scroll end
  const handleScroll = (event: any) => {
    if (daysToShow !== 1) return;
    
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / screenWidth);
    
    if (pageIndex < 0 || pageIndex >= scrollDays.length) return;
    
    const selectedDay = scrollDays[pageIndex];
    if (!selectedDay) return;
    
    // Check if we moved to a different week
    if (selectedDay.weekStart !== currentWeekStart) {
      // Use cached data if available
      if (weekCache.has(selectedDay.weekStart)) {
        setWeekSchedule(weekCache.get(selectedDay.weekStart)!);
      }
      
      setCurrentWeekStart(selectedDay.weekStart);
      setCurrentDayIndex(selectedDay.dayIndex);
      
      // Load in background if not cached
      if (!weekCache.has(selectedDay.weekStart)) {
        loadWeekSchedule(selectedDay.weekStart);
      }
      preloadAdjacentWeeks(selectedDay.weekStart);
    } else if (selectedDay.dayIndex !== currentDayIndex) {
      // Same week, different day
      setCurrentDayIndex(selectedDay.dayIndex);
    }
  };
  
  const loadAvailableTasks = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await taskApi.getFamilyTasks(currentFamily.id);
      const tasks = response.data || [];
      console.log('Loaded tasks:', tasks);
      setAvailableTasks(Array.isArray(tasks) ? tasks : []);
    } catch (error) {
      console.error('Failed to load available tasks:', error);
      setAvailableTasks([]);
    }
  };
  
  const loadFamilyMembers = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await familyApi.getMembers(currentFamily.id);
      const membersList = response.data || [];
      console.log('Loaded members:', membersList);
      
      // Ensure we have an array of members
      setFamilyMembers(Array.isArray(membersList) ? membersList : []);
    } catch (error) {
      console.error('Failed to load family members:', error);
      setFamilyMembers([]);
    }
  };
  
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };
  
  const formatWeekRange = (weekStartDate: string): string => {
    if (!weekStartDate) return '';
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
  
  const groupTasksIntoShifts = (tasks: ResolvedTask[]): Array<{ memberId: string | null; tasks: ResolvedTask[] }> => {
    if (tasks.length === 0) return [];
    
    const shifts: Array<{ memberId: string | null; tasks: ResolvedTask[] }> = [];
    let currentShift: { memberId: string | null; tasks: ResolvedTask[] } | null = null;
    
    tasks.forEach((task) => {
      const memberId = task.member?.id || null;
      
      if (!currentShift || currentShift.memberId !== memberId) {
        currentShift = { memberId, tasks: [task] };
        shifts.push(currentShift);
      } else {
        currentShift.tasks.push(task);
      }
    });
    
    return shifts;
  };
  
  const renderDayComponent = (day: ResolvedDay | null) => {
    if (!day) {
      return <View style={styles.dayColumn} />;
    }
    
    const today = new Date();
    const dayDate = new Date(day.date + 'T00:00:00.000Z');
    const isToday = dayDate.toDateString() === today.toDateString();
    const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    return (
      <View style={[styles.dayColumn, { width: screenWidth }]}>
        <View style={[styles.dayHeader, isToday && styles.todayHeader]}>
          <View style={styles.dayInfo}>
            <Text style={[styles.dayName, isToday && styles.todayName]}>{dayName}</Text>
          </View>
          <View style={styles.dayActions}>
            <TouchableOpacity
              style={styles.dayActionButton}
              onPress={() => {
                setTaskOverrideAction('ADD');
                setSelectedTask(undefined);
                setTaskOverrideDate(day.date);
                setShowTaskOverrideModal(true);
              }}
              disabled={!isAdmin}
            >
              <Text style={styles.actionButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dayActionButton}
              onPress={() => {
                // TODO: Implement daily routine application
                console.log('Apply daily routine');
              }}
              disabled={!isAdmin}
            >
              <View style={styles.routinesIcon}>
                <View style={styles.routinesCircle} />
                <View style={styles.routinesCircle} />
                <View style={styles.routinesCircle} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.tasksLane} showsVerticalScrollIndicator={false}>
          {day.tasks.length > 0 ? (
            <View style={styles.tasksStack}>
              {groupTasksIntoShifts(day.tasks).map((shift, shiftIndex) => (
                <View
                  key={`shift-${shiftIndex}`}
                  style={[
                    styles.shift,
                    shift.tasks.length > 1 && styles.multiTaskShift
                  ]}
                >
                  {shift.tasks.length > 1 && shift.memberId && (() => {
                    // Calculate shift timing info
                    const startTime = shift.tasks[0].overrideTime || shift.tasks[0].task.defaultStartTime;
                    const lastTask = shift.tasks[shift.tasks.length - 1];
                    const lastStartTime = lastTask.overrideTime || lastTask.task.defaultStartTime;
                    const lastDuration = lastTask.overrideDuration || lastTask.task.defaultDuration;
                    
                    // Calculate end time
                    const [lastHours, lastMinutes] = lastStartTime.split(':').map(Number);
                    const endTimeMinutes = (lastHours * 60) + lastMinutes + lastDuration;
                    const endHours = Math.floor(endTimeMinutes / 60);
                    const endMins = endTimeMinutes % 60;
                    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
                    
                    // Calculate shift duration (time difference between start and end)
                    const [startHours, startMinutes] = startTime.split(':').map(Number);
                    const startTimeMinutes = (startHours * 60) + startMinutes;
                    const shiftDuration = endTimeMinutes - startTimeMinutes;
                    
                    return (
                      <View style={styles.shiftHeader}>
                        <UserAvatar
                          firstName={shift.tasks[0].member?.firstName || ''}
                          lastName={shift.tasks[0].member?.lastName || ''}
                          avatarUrl={shift.tasks[0].member?.avatarUrl}
                          size="small"
                        />
                        <View style={styles.shiftTags}>
                          <View style={styles.shiftTimeTag}>
                            <Text style={styles.shiftTimeTagText}>
                              {startTime} - {endTime}
                            </Text>
                          </View>
                          <View style={styles.shiftDurationTag}>
                            <Text style={styles.shiftDurationTagText}>
                              {formatDuration(shiftDuration)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                  
                  <View style={styles.shiftTasks}>
                    {shift.tasks.map((task, taskIndex) => (
                      <TaskOverrideCard
                        key={`task-${taskIndex}-${task.taskId}`}
                        task={task}
                        taskIndex={taskIndex}
                        isAdmin={isAdmin}
                        formatTime={formatTime}
                        formatDuration={formatDuration}
                        hideAvatar={shift.tasks.length > 1}
                        onPress={(task) => {
                          if (isAdmin) {
                            setTaskOverrideAction('REASSIGN');
                            setSelectedTask(task);
                            setTaskOverrideDate(day.date);
                            setShowTaskOverrideModal(true);
                          }
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noTasks}>
              <Text style={styles.noTasksText}>No tasks scheduled</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };
  
  const handleConfirmTaskOverride = async (_data: CreateTaskOverrideData) => {
    setShowTaskOverrideModal(false);
    // Reload current week after override
    await loadWeekSchedule(currentWeekStart, false);
  };
  
  if (isLoading && !weekSchedule) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientBackground, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {weekSchedule?.baseTemplate?.name || 'Weekly Schedule'}
            {weekSchedule?.hasOverrides && (
              <Text style={styles.modifiedIndicator}> • modified</Text>
            )}
          </Text>
          <View style={styles.indicatorsRow}>
            <ShiftIndicator />
            <TaskSplitIndicator currentWeekStart={currentWeekStart} />
          </View>
        </View>
      </LinearGradient>
      
      {error ? (
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
        <View style={styles.calendarContainer}>
          {daysToShow === 1 ? (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              snapToInterval={screenWidth}
              decelerationRate="fast"
              style={styles.scrollView}
              contentOffset={{ x: screenWidth * centerIndex, y: 0 }}
              scrollEventThrottle={16}
            >
              {scrollDays.map((dayData, index) => (
                <View key={`${dayData.weekStart}-${dayData.dayIndex}`} style={{ width: screenWidth }}>
                  {renderDayComponent(dayData.day)}
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView style={styles.calendarContent} showsVerticalScrollIndicator={false}>
              <View style={styles.daysContainer}>
                {weekSchedule.days.slice(0, daysToShow).map((day) => renderDayComponent(day))}
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}
      
      <TaskOverrideModal
        visible={showTaskOverrideModal}
        onClose={() => setShowTaskOverrideModal(false)}
        onConfirm={handleConfirmTaskOverride}
        task={selectedTask}
        date={taskOverrideDate}
        action={taskOverrideAction}
        availableTasks={availableTasks}
        familyMembers={familyMembers}
        isLoading={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    marginTop: -10,
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
  },
  indicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modifiedIndicator: {
    color: '#fbbf24',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendarContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  calendarContent: {
    flex: 1,
  },
  daysContainer: {
    flexDirection: 'row',
  },
  dayColumn: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginTop: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  todayHeader: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    shadowColor: '#3b82f6',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    lineHeight: 14,
  },
  todayName: {
    color: '#2563eb',
    fontWeight: '800',
  },
  dayActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 4,
  },
  dayActionButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  routinesIcon: {
    flexDirection: 'row',
    gap: 2,
  },
  routinesCircle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366f1',
  },
  tasksLane: {
    flex: 1,
    padding: 16,
  },
  tasksStack: {
    gap: 8,
  },
  shift: {
    gap: 4,
  },
  multiTaskShift: {
    backgroundColor: 'rgba(99, 102, 241, 0.02)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  shiftTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  shiftTimeTag: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shiftDurationTag: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shiftTimeTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e40af',
    lineHeight: 14,
  },
  shiftDurationTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#166534',
    lineHeight: 14,
  },
  shiftTasks: {
    gap: 4,
  },
  noTasks: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  noTasksText: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});