import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily } from '../contexts/FamilyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { taskApi } from '../services/api';
import { TaskOverrideCard, Button, LoadingSpinner, LogoReversed } from '../components/ui';
import { TaskFormModal } from '../components/forms/TaskFormModal';
import type { Task, CreateTaskData, UpdateTaskData, ResolvedTask } from '../types';

const { width: screenWidth } = Dimensions.get('window');

export const TasksScreen: React.FC = () => {
  const { currentFamily } = useFamily();
  const { emit } = useNotifications();
  const insets = useSafeAreaInsets();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'created'>('time');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is admin
  const isAdmin = currentFamily?.userRole === 'ADMIN';

  useEffect(() => {
    if (currentFamily) {
      loadTasks();
    }
  }, [currentFamily]);

  // Auto-dismiss messages
  useEffect(() => {
    if (message) {
      const timeout = setTimeout(() => {
        setMessage(null);
      }, message.type === 'success' ? 3000 : 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [message]);

  // Listen for real-time task updates
  useEffect(() => {
    const handleTaskUpdate = () => {
      if (currentFamily) {
        loadTasks();
      }
    };

    // Listen for task-related WebSocket events
    emit('subscribe', 'task-assigned');
    emit('subscribe', 'task-unassigned');
    emit('subscribe', 'task-schedule-updated');

    return () => {
      emit('unsubscribe', 'task-assigned');
      emit('unsubscribe', 'task-unassigned');
      emit('unsubscribe', 'task-schedule-updated');
    };
  }, [currentFamily, emit]);

  const loadTasks = async () => {
    if (!currentFamily) return;
    
    setIsLoading(true);
    try {
      const response = await taskApi.getFamilyTasks(currentFamily.id, { isActive: true });
      const tasksData = response.data?.data || response.data;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      setMessage({ type: 'error', text: 'Failed to load tasks' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTasks();
    setIsRefreshing(false);
  }, []);

  const handleAddTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
    setMessage(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
    setMessage(null);
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskApi.deleteTask(task.id);
              setTasks(prev => prev.filter(t => t.id !== task.id));
              setMessage({ type: 'success', text: 'Task deleted successfully' });
            } catch (error: any) {
              setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete task' });
            }
          },
        },
      ]
    );
  };

  const handleSubmitTask = async (data: CreateTaskData | UpdateTaskData) => {
    if (!currentFamily) return;

    setIsSubmitting(true);
    try {
      if (editingTask) {
        // Update existing task
        const response = await taskApi.updateTask(editingTask.id, data);
        const updatedTask = response.data?.data || response.data;
        setTasks(prev => prev.map(task => 
          task.id === editingTask.id ? updatedTask : task
        ));
        setMessage({ type: 'success', text: 'Task updated successfully' });
      } else {
        // Create new task
        const response = await taskApi.createTask(currentFamily.id, data);
        const newTask = response.data?.data || response.data;
        setTasks(prev => [...prev, newTask]);
        setMessage({ type: 'success', text: 'Task created successfully' });
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || `Failed to ${editingTask ? 'update' : 'create'} task`);
    } finally {
      setIsSubmitting(false);
    }
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

  // Convert Task to ResolvedTask format for display
  const convertTaskToResolvedTask = (task: Task): ResolvedTask => {
    return {
      taskId: task.id,
      memberId: null, // Tasks in management view don't have assigned members
      overrideTime: null,
      overrideDuration: null,
      source: 'template',
      task: task,
      member: null,
    };
  };

  // Handle task press - show edit/delete options for admins
  const handleTaskPress = (resolvedTask: ResolvedTask) => {
    if (!isAdmin) return;
    
    const task = resolvedTask.task;
    Alert.alert(
      'Task Actions',
      `What would you like to do with "${task.name}"?`,
      [
        { text: 'Edit', onPress: () => handleEditTask(task) },
        { text: 'Delete', onPress: () => handleDeleteTask(task), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = tasks
    .filter(task => 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'time':
          const timeA = a.defaultStartTime.split(':').map(Number);
          const timeB = b.defaultStartTime.split(':').map(Number);
          const hoursComparison = (timeA[0] ?? 0) - (timeB[0] ?? 0);
          return hoursComparison !== 0 ? hoursComparison : (timeA[1] ?? 0) - (timeB[1] ?? 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  if (!currentFamily) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please select a family to manage tasks.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientBackground, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.logoButton}
              activeOpacity={0.7}
            >
              <LogoReversed size={48} style={styles.logo} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.title}>Task Management</Text>
              <View style={styles.indicatorsRow}>
                <View style={styles.leftIndicator}>
                  <Text style={styles.headerDescription}>Create and organize family tasks</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddTask}
                    disabled={isLoading}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Success/Error Messages */}
      {message && (
        <View style={[styles.message, message.type === 'success' ? styles.messageSuccess : styles.messageError]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      {/* Search and Sort */}
      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks..."
            clearButtonMode="while-editing"
          />
        </View>
        
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortButtons}>
            {[
              { key: 'time', label: 'Time' },
              { key: 'name', label: 'Name' },
              { key: 'created', label: 'Created' }
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.sortButton, sortBy === key && styles.sortButtonActive]}
                onPress={() => setSortBy(key as any)}
              >
                <Text style={[styles.sortButtonText, sortBy === key && styles.sortButtonTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Task Count */}
      <View style={styles.taskCount}>
        <Text style={styles.taskCountText}>
          {filteredAndSortedTasks.length} {filteredAndSortedTasks.length === 1 ? 'task' : 'tasks'}
          {searchQuery && ` matching "${searchQuery}"`}
        </Text>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : filteredAndSortedTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching tasks' : 'No tasks yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery 
                ? `No tasks match "${searchQuery}". Try a different search term.`
                : isAdmin
                  ? 'Create your first task to get started with family organization.'
                  : 'Your family admin can create tasks to help organize daily activities.'
              }
            </Text>
            {isAdmin && !searchQuery && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddTask}>
                <Text style={styles.emptyButtonText}>Create First Task</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.tasksList}>
            {filteredAndSortedTasks.map((task, index) => (
              <TaskOverrideCard
                key={task.id}
                task={convertTaskToResolvedTask(task)}
                taskIndex={index}
                isAdmin={isAdmin}
                onPress={isAdmin ? handleTaskPress : undefined}
                formatTime={formatTime}
                formatDuration={formatDuration}
                showDescription={true}
                compact={false}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Task Form Modal */}
      <TaskFormModal
        visible={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitTask}
        task={editingTask || undefined}
        isLoading={isSubmitting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoButton: {
    alignSelf: 'center',
    borderRadius: 8,
    padding: 4,
  },
  logo: {
    alignSelf: 'center',
  },
  headerText: {
    flex: 1,
  },
  indicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    minHeight: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  leftIndicator: {
    flex: 1,
    minHeight: 20,
    justifyContent: 'center',
  },
  headerDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  messageSuccess: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  messageError: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  controls: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  sortButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  taskCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  taskCountText: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  tasksList: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 