import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { UserAvatar } from '../ui/UserAvatar';
import type { ResolvedTask, Task, User } from '../../types';

export interface CreateTaskOverrideData {
  assignedDate: string;
  taskId: string;
  action: 'ADD' | 'REMOVE' | 'REASSIGN';
  originalMemberId?: string | null;
  newMemberId?: string | null;
  overrideTime?: string | null;
  overrideDuration?: number | null;
}

interface TaskOverrideModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (overrideData: CreateTaskOverrideData) => Promise<void>;
  task?: ResolvedTask;
  date: string;
  action: 'ADD' | 'REMOVE' | 'REASSIGN';
  availableTasks?: Task[];
  familyMembers?: User[];
  isLoading?: boolean;
}

export const TaskOverrideModal: React.FC<TaskOverrideModalProps> = ({
  visible,
  onClose,
  onConfirm,
  task,
  date,
  action,
  availableTasks = [],
  familyMembers = [],
  isLoading = false,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [overrideTime, setOverrideTime] = useState<string>('');
  const [overrideDuration, setOverrideDuration] = useState<string>('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && task) {
      setSelectedTaskId(task.taskId);
      setSelectedMemberId(task.memberId || '');
      setOverrideTime(task.overrideTime || task.task.defaultStartTime || '09:00');
      setOverrideDuration(String(task.overrideDuration || task.task.defaultDuration || 30));
    } else if (visible && action === 'ADD') {
      setSelectedTaskId('');
      setSelectedMemberId('');
      setOverrideTime('09:00');
      setOverrideDuration('30');
    }
  }, [visible, task, action]);

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString + 'T00:00:00.000Z');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const getModalTitle = (): string => {
    switch (action) {
      case 'ADD': return 'Add Task';
      case 'REMOVE': return 'Remove Task';
      case 'REASSIGN': return 'Reassign Task';
      default: return 'Modify Task';
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (action === 'ADD') {
      if (!selectedTaskId) {
        Alert.alert('Error', 'Please select a task');
        return;
      }
      if (!selectedMemberId) {
        Alert.alert('Error', 'Please select a family member');
        return;
      }
      if (!overrideTime) {
        Alert.alert('Error', 'Please enter a start time');
        return;
      }
    }

    if (action === 'REASSIGN' && !selectedMemberId) {
      Alert.alert('Error', 'Please select a family member');
      return;
    }

    const overrideData: CreateTaskOverrideData = {
      assignedDate: date,
      taskId: action === 'ADD' ? selectedTaskId : task!.taskId,
      action,
      originalMemberId: action === 'REASSIGN' ? (task?.memberId || null) : null,
      newMemberId: action === 'ADD' || action === 'REASSIGN' ? selectedMemberId : null,
      overrideTime: action === 'ADD' ? overrideTime : null,
      overrideDuration: action === 'ADD' ? parseInt(overrideDuration) || 30 : null,
    };

    try {
      setIsSubmitting(true);
      await onConfirm(overrideData);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const renderTaskSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Task</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taskSelector}>
        {(availableTasks || []).map((availableTask) => (
          <TouchableOpacity
            key={availableTask.id}
            style={[
              styles.taskOption,
              selectedTaskId === availableTask.id && styles.taskOptionSelected
            ]}
            onPress={() => setSelectedTaskId(availableTask.id)}
            disabled={isSubmitting}
          >
            <Text style={styles.taskIcon}>{availableTask.icon || '📋'}</Text>
            <Text style={[
              styles.taskName,
              selectedTaskId === availableTask.id && styles.taskNameSelected
            ]}>
              {availableTask.name}
            </Text>
            {selectedTaskId === availableTask.id && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedIndicatorText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderMemberSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {action === 'ADD' ? 'Assign to' : 'Reassign to'}
      </Text>
      <View style={styles.memberGrid}>
        {(familyMembers || [])
          .filter(member => action === 'ADD' || member.id !== task?.memberId)
          .map(member => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberOption,
                selectedMemberId === member.id && styles.memberOptionSelected
              ]}
              onPress={() => handleMemberSelect(member.id)}
              disabled={isSubmitting}
            >
              <UserAvatar
                firstName={member.firstName}
                lastName={member.lastName}
                avatarUrl={member.avatarUrl}
                size="medium"
              />
              <Text style={[
                styles.memberName,
                selectedMemberId === member.id && styles.memberNameSelected
              ]}>
                {member.firstName} {member.lastName}
              </Text>
              {selectedMemberId === member.id && (
                <View style={styles.memberSelectedIndicator}>
                  <Text style={styles.memberSelectedIndicatorText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
      </View>
      {(familyMembers || []).filter(member => action === 'ADD' || member.id !== task?.memberId).length === 0 && (
        <Text style={styles.noMembersText}>
          No other family members available for assignment.
        </Text>
      )}
    </View>
  );

  const renderTimeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Time & Duration</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeGroup}>
          <Text style={styles.inputLabel}>Start Time</Text>
          <TextInput
            style={styles.timeInput}
            value={overrideTime}
            onChangeText={setOverrideTime}
            placeholder="09:00"
            editable={!isSubmitting}
          />
        </View>
        <View style={styles.timeGroup}>
          <Text style={styles.inputLabel}>Duration (min)</Text>
          <TextInput
            style={styles.timeInput}
            value={overrideDuration}
            onChangeText={setOverrideDuration}
            placeholder="30"
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>
      </View>
    </View>
  );

  const renderRemoveConfirmation = () => (
    <View style={styles.section}>
      <View style={styles.warningContainer}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>
          Are you sure you want to remove "{task?.task.name}" from {formatDate(date)}?
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getModalTitle()}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>
              {action === 'ADD' 
                ? `Add a new task to ${formatDate(date)}`
                : action === 'REMOVE'
                ? `Remove "${task?.task.name}" from ${formatDate(date)}`
                : `Reassign "${task?.task.name}" on ${formatDate(date)}`
              }
            </Text>
          </View>

          {/* Content based on action */}
          {action === 'ADD' && (
            <>
              {renderTaskSelector()}
              {selectedTaskId && renderMemberSelector()}
              {selectedTaskId && selectedMemberId && renderTimeSelector()}
            </>
          )}

          {action === 'REMOVE' && renderRemoveConfirmation()}

          {action === 'REASSIGN' && renderMemberSelector()}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              (isSubmitting || (action === 'ADD' && (!selectedTaskId || !selectedMemberId || !overrideTime)) ||
               (action === 'REASSIGN' && !selectedMemberId)) && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={
              isSubmitting ||
              (action === 'ADD' && (!selectedTaskId || !selectedMemberId || !overrideTime)) ||
              (action === 'REASSIGN' && !selectedMemberId)
            }
          >
            <Text style={styles.confirmButtonText}>
              {isSubmitting ? 'Processing...' : 
               action === 'ADD' ? 'Add Task' :
               action === 'REMOVE' ? 'Remove Task' :
               'Reassign Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  descriptionSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  taskSelector: {
    paddingLeft: 20,
  },
  taskOption: {
    alignItems: 'center',
    padding: 16,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 120,
    position: 'relative',
  },
  taskOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  taskIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
  },
  taskNameSelected: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  memberOption: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
    position: 'relative',
  },
  memberOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  memberName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  memberNameSelected: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  memberSelectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberSelectedIndicatorText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  noMembersText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  timeRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
  },
  timeGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#374151',
  },
  warningContainer: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 16,
    color: '#92400e',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
}); 