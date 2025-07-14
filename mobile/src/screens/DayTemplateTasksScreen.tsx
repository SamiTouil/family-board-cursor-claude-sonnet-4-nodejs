import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFamily } from '../contexts/FamilyContext';
import { dayTemplateApi, taskApi, familyApi } from '../services/api';
import { LoadingSpinner, TaskOverrideCard, UserAvatar, PageHeader, headerButtonStyles } from '../components/ui';
import type { DayTemplateItem, Task, FamilyMember, ResolvedTask } from '../types';

type RouteParams = {
  templateId: string;
  templateName: string;
};

export const DayTemplateTasksScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { templateId, templateName } = route.params;
  const { currentFamily } = useFamily();

  // State
  const [templateItems, setTemplateItems] = useState<DayTemplateItem[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [messageTimeout, setMessageTimeout] = useState<NodeJS.Timeout | null>(null);

  // Modal states
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DayTemplateItem | null>(null);
  const [taskData, setTaskData] = useState({
    taskId: '',
    memberId: '',
    overrideTime: '',
    overrideDuration: '',
  });

  // Check if user is admin
  const isAdmin = currentFamily?.userRole === 'ADMIN';

  // Helper function to set message with auto-dismiss
  const setMessageWithAutoDismiss = (newMessage: { type: 'success' | 'error'; text: string } | null) => {
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      setMessageTimeout(null);
    }

    setMessage(newMessage);

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

  // Load data when component mounts
  useEffect(() => {
    if (currentFamily) {
      loadData();
    }
  }, [currentFamily]);

  const loadData = async () => {
    if (!currentFamily) return;

    setIsLoading(true);
    try {
      // Load template items
      const itemsResponse = await dayTemplateApi.getItems(currentFamily.id, templateId);
      setTemplateItems(itemsResponse.data.items || []);

      // Load available tasks
      const tasksResponse = await taskApi.getFamilyTasks(currentFamily.id, { isActive: true });
      setAvailableTasks(tasksResponse.data.tasks || []);

      // Load family members
      const membersResponse = await familyApi.getMembers(currentFamily.id);
      // The response has members in data.data
      const members = membersResponse.data?.data || [];
      setFamilyMembers(Array.isArray(members) ? members : []);
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to load data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [currentFamily]);

  const handleAddTask = () => {
    setTaskData({
      taskId: '',
      memberId: '',
      overrideTime: '',
      overrideDuration: '',
    });
    setIsAddTaskModalOpen(true);
  };

  const handleEditTask = (item: DayTemplateItem) => {
    setEditingItem(item);
    // For day template items, the memberId refers to the user ID directly
    setTaskData({
      taskId: item.taskId,
      memberId: item.memberId || '',
      overrideTime: item.overrideTime || '',
      overrideDuration: item.overrideDuration?.toString() || '',
    });
    setIsEditTaskModalOpen(true);
  };

  const handleCreateTask = async () => {
    if (!currentFamily || !taskData.taskId) {
      Alert.alert('Error', 'Please select a task');
      return;
    }

    setIsLoading(true);
    try {
      const createData = {
        taskId: taskData.taskId,
        memberId: taskData.memberId || null,
        overrideTime: taskData.overrideTime || undefined,
        overrideDuration: taskData.overrideDuration ? parseInt(taskData.overrideDuration) : undefined,
      };

      const response = await dayTemplateApi.addItem(currentFamily.id, templateId, createData);
      if (response.data) {
        await loadData(); // Reload to get full item data
        setMessageWithAutoDismiss({ type: 'success', text: 'Task added successfully' });
        setIsAddTaskModalOpen(false);
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to add task' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!currentFamily || !editingItem) {
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        memberId: taskData.memberId || null,
        overrideTime: taskData.overrideTime || undefined,
        overrideDuration: taskData.overrideDuration ? parseInt(taskData.overrideDuration) : undefined,
      };

      const response = await dayTemplateApi.updateItem(
        currentFamily.id,
        templateId,
        editingItem.id,
        updateData
      );
      if (response.data) {
        await loadData(); // Reload to get full item data
        setMessageWithAutoDismiss({ type: 'success', text: 'Task updated successfully' });
        setIsEditTaskModalOpen(false);
        setEditingItem(null);
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to update task' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (item: DayTemplateItem) => {
    Alert.alert(
      'Remove Task',
      `Are you sure you want to remove "${item.task.name}" from this routine?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!currentFamily) return;

            setIsLoading(true);
            try {
              await dayTemplateApi.removeItem(currentFamily.id, templateId, item.id);
              await loadData();
              setMessageWithAutoDismiss({ type: 'success', text: 'Task removed successfully' });
            } catch (error) {
              setMessageWithAutoDismiss({ type: 'error', text: 'Failed to remove task' });
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const handleTaskPress = (item: DayTemplateItem) => {
    if (!isAdmin) return;
    
    Alert.alert(
      'Task Actions',
      `What would you like to do with "${item.task.name}"?`,
      [
        { text: 'Edit', onPress: () => handleEditTask(item) },
        { text: 'Remove', onPress: () => handleDeleteTask(item), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const convertItemToResolvedTask = (item: DayTemplateItem): ResolvedTask => {
    return {
      taskId: item.taskId,
      memberId: item.memberId || null,
      overrideTime: item.overrideTime || null,
      overrideDuration: item.overrideDuration || null,
      source: 'template' as const,
      task: item.task,
      member: item.member ? {
        id: item.member.id,
        firstName: item.member.firstName,
        lastName: item.member.lastName,
        email: item.member.email || '',
        avatarUrl: item.member.avatarUrl || undefined,
        createdAt: '',
        updatedAt: ''
      } : undefined
    };
  };


  if (!currentFamily) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No family selected</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={templateName}
        description="Manage tasks in this routine"
        showBackButton
        showLogo={false}
        rightButtons={
          isAdmin ? (
            <TouchableOpacity
              style={headerButtonStyles.button}
              onPress={handleAddTask}
              disabled={isLoading}
            >
              <Text style={headerButtonStyles.buttonText}>+</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Messages */}
      {message && (
        <View style={[styles.message, styles[`message${message.type}`]]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : templateItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyDescription}>
              {isAdmin
                ? 'Add tasks to this routine to organize daily activities.'
                : 'Your family admin can add tasks to this routine.'
              }
            </Text>
            {isAdmin && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddTask}>
                <Text style={styles.emptyButtonText}>Add First Task</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.tasksList}>
            {templateItems
              .sort((a, b) => {
                // Sort by start time (use override time if available, otherwise default)
                const timeA = a.overrideTime || a.task.defaultStartTime;
                const timeB = b.overrideTime || b.task.defaultStartTime;
                return timeA.localeCompare(timeB);
              })
              .map((item, index) => (
                <TaskOverrideCard
                  key={item.id}
                  task={convertItemToResolvedTask(item)}
                  taskIndex={index}
                  isAdmin={isAdmin}
                  onPress={isAdmin ? () => handleTaskPress(item) : undefined}
                  formatTime={formatTime}
                  formatDuration={formatDuration}
                  showDescription={true}
                  compact={false}
                />
              ))}
          </View>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        visible={isAddTaskModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddTaskModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAddTaskModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Task</Text>
            <TouchableOpacity onPress={handleCreateTask} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Task</Text>
              <ScrollView style={styles.pickerContainer} horizontal showsHorizontalScrollIndicator={false}>
                {availableTasks.map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskOption,
                      taskData.taskId === task.id && styles.taskOptionSelected
                    ]}
                    onPress={() => setTaskData(prev => ({ ...prev, taskId: task.id }))}
                  >
                    <View style={[styles.taskOptionIcon, { backgroundColor: task.color }]}>
                      <Text style={styles.taskOptionIconText}>{task.icon || '📋'}</Text>
                    </View>
                    <Text style={[
                      styles.taskOptionText,
                      taskData.taskId === task.id && styles.taskOptionTextSelected
                    ]}>
                      {task.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Assign to (Optional)</Text>
              <View style={styles.membersList}>
                <TouchableOpacity
                  style={[
                    styles.memberRow,
                    !taskData.memberId && styles.memberRowSelected
                  ]}
                  onPress={() => setTaskData(prev => ({ ...prev, memberId: '' }))}
                >
                  <View style={styles.unassignedAvatar}>
                    <Text style={styles.unassignedAvatarText}>?</Text>
                  </View>
                  <Text style={[
                    styles.memberName,
                    !taskData.memberId && styles.memberNameSelected
                  ]}>
                    Unassigned
                  </Text>
                  {!taskData.memberId && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
                {familyMembers.map(member => {
                  // Use user ID for comparison and assignment
                  const memberUserId = member.user?.id || member.userId;
                  const isSelected = taskData.memberId === memberUserId;
                  
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.memberRow,
                        isSelected && styles.memberRowSelected
                      ]}
                      onPress={() => setTaskData(prev => ({ ...prev, memberId: memberUserId }))}
                    >
                      <UserAvatar
                        firstName={member.user?.firstName || ''}
                        lastName={member.user?.lastName || ''}
                        avatarUrl={member.user?.avatarUrl}
                        size="small"
                      />
                      <Text style={[
                        styles.memberName,
                        isSelected && styles.memberNameSelected
                      ]}>
                        {member.user?.firstName || member.user?.email || 'Member'}
                      </Text>
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Time (Optional)</Text>
              <TextInput
                style={styles.input}
                value={taskData.overrideTime}
                onChangeText={(text) => setTaskData(prev => ({ ...prev, overrideTime: text }))}
                placeholder="HH:MM (24-hour format)"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Duration in minutes (Optional)</Text>
              <TextInput
                style={styles.input}
                value={taskData.overrideDuration}
                onChangeText={(text) => setTaskData(prev => ({ ...prev, overrideDuration: text }))}
                placeholder="Duration in minutes"
                keyboardType="numeric"
                editable={!isLoading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        visible={isEditTaskModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditTaskModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditTaskModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Task</Text>
            <TouchableOpacity onPress={handleUpdateTask} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Assign to (Optional)</Text>
              <View style={styles.membersList}>
                <TouchableOpacity
                  style={[
                    styles.memberRow,
                    !taskData.memberId && styles.memberRowSelected
                  ]}
                  onPress={() => setTaskData(prev => ({ ...prev, memberId: '' }))}
                >
                  <View style={styles.unassignedAvatar}>
                    <Text style={styles.unassignedAvatarText}>?</Text>
                  </View>
                  <Text style={[
                    styles.memberName,
                    !taskData.memberId && styles.memberNameSelected
                  ]}>
                    Unassigned
                  </Text>
                  {!taskData.memberId && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
                {familyMembers.map(member => {
                  // The memberId in DayTemplateItem appears to be the user ID directly
                  const memberUserId = member.user?.id || member.userId;
                  const isSelected = taskData.memberId === memberUserId;
                  
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.memberRow,
                        isSelected && styles.memberRowSelected
                      ]}
                      onPress={() => setTaskData(prev => ({ ...prev, memberId: memberUserId }))}
                    >
                      <UserAvatar
                        firstName={member.user?.firstName || ''}
                        lastName={member.user?.lastName || ''}
                        avatarUrl={member.user?.avatarUrl}
                        size="small"
                      />
                      <Text style={[
                        styles.memberName,
                        isSelected && styles.memberNameSelected
                      ]}>
                        {member.user?.firstName || member.user?.email || 'Member'}
                      </Text>
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Time (Optional)</Text>
              <TextInput
                style={styles.input}
                value={taskData.overrideTime}
                onChangeText={(text) => setTaskData(prev => ({ ...prev, overrideTime: text }))}
                placeholder="HH:MM (24-hour format)"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Duration in minutes (Optional)</Text>
              <TextInput
                style={styles.input}
                value={taskData.overrideDuration}
                onChangeText={(text) => setTaskData(prev => ({ ...prev, overrideDuration: text }))}
                placeholder="Duration in minutes"
                keyboardType="numeric"
                editable={!isLoading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  content: {
    flex: 1,
  },
  tasksList: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalCloseText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalSaveText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#374151',
  },
  pickerContainer: {
    maxHeight: 100,
  },
  taskOption: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  taskOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskOptionIconText: {
    fontSize: 24,
  },
  taskOptionText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  taskOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  membersList: {
    marginTop: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberRowSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  unassignedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unassignedAvatarText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  memberNameSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});