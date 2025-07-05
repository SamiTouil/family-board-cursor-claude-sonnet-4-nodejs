import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from './Button';
import type { ResolvedTask } from '../../types';
import { UserAvatar } from './UserAvatar';

interface TaskOverrideCardProps {
  task: ResolvedTask;
  taskIndex: number;
  isAdmin: boolean;
  onRemove?: (task: ResolvedTask) => void;
  onReassign?: (task: ResolvedTask) => void;
  onEdit?: (task: ResolvedTask) => void;
  formatTime: (time: string) => string;
  formatDuration: (minutes: number) => string;
  showDescription?: boolean;
  compact?: boolean;
}

export const TaskOverrideCard: React.FC<TaskOverrideCardProps> = ({
  task,
  taskIndex,
  isAdmin,
  onRemove,
  onReassign,
  onEdit,
  formatTime,
  formatDuration,
  showDescription = true,
  compact = false
}) => {
  const startTime = task.overrideTime || task.task.defaultStartTime;
  const duration = task.overrideDuration || task.task.defaultDuration;

  return (
    <View 
      style={[
        styles.taskCard, 
        compact && styles.compact,
        { 
          borderLeftColor: task.task.color,
          backgroundColor: `${task.task.color}10`
        }
      ]}
    >
      <View style={styles.taskMain}>
        <View style={styles.taskInfo}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskIcon}>{task.task.icon || '✅'}</Text>
            <Text style={[styles.taskName, compact && styles.taskNameCompact]}>
              {task.task.name}
            </Text>
          </View>
          
          <View style={styles.taskTags}>
            <View style={styles.timeTag}>
              <Text style={styles.tagText}>{formatTime(startTime)}</Text>
            </View>
            <View style={styles.durationTag}>
              <Text style={styles.tagText}>{formatDuration(duration)}</Text>
            </View>
          </View>
        </View>
        
        {task.member && (
          <View style={styles.taskMember}>
            <UserAvatar
              firstName={task.member.firstName}
              lastName={task.member.lastName}
              avatarUrl={task.member.avatarUrl}
              size={compact ? "extra-small" : "small"}
            />
          </View>
        )}
      </View>
      
      {showDescription && task.task.description && (
        <Text style={styles.taskDescription}>
          {task.task.description}
        </Text>
      )}
      
      {task.source === 'override' && (
        <View style={styles.modifiedBadge}>
          <Text style={styles.modifiedText}>Modified</Text>
        </View>
      )}
      
      {/* Task Action Buttons */}
      {isAdmin && (
        <View style={styles.taskActions}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => onEdit(task)}
            >
              <Text style={styles.actionButtonText}>✏️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => onRemove?.(task)}
          >
            <Text style={styles.actionButtonText}>×</Text>
          </TouchableOpacity>
          {onReassign && (
            <TouchableOpacity
              style={[styles.actionButton, styles.reassignButton]}
              onPress={() => onReassign?.(task)}
            >
              <Text style={styles.actionButtonText}>↻</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compact: {
    padding: 12,
    marginBottom: 8,
  },
  taskMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskInfo: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    flex: 1,
  },
  taskNameCompact: {
    fontSize: 14,
  },
  taskTags: {
    flexDirection: 'row',
    gap: 8,
  },
  timeTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationTag: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  taskMember: {
    marginLeft: 12,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 20,
  },
  modifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#10b981',
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  reassignButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 