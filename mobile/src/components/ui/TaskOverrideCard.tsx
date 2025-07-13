import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ResolvedTask } from '../../types';
import { UserAvatar } from './UserAvatar';

interface TaskOverrideCardProps {
  task: ResolvedTask;
  taskIndex: number;
  isAdmin: boolean;
  onPress?: (task: ResolvedTask) => void;
  formatTime: (time: string) => string;
  formatDuration: (minutes: number) => string;
  showDescription?: boolean;
  compact?: boolean;
  hideAvatar?: boolean;
}

export const TaskOverrideCard: React.FC<TaskOverrideCardProps> = ({
  task,
  taskIndex,
  isAdmin,
  onPress,
  formatTime,
  formatDuration,
  showDescription = true,
  compact = false,
  hideAvatar = false
}) => {
  const startTime = task.overrideTime || task.task.defaultStartTime;
  const duration = task.overrideDuration || task.task.defaultDuration;

  return (
    <TouchableOpacity 
      style={[
        styles.taskCard, 
        compact && styles.compact,
        { 
          borderLeftColor: task.task.color,
          backgroundColor: `${task.task.color}10`
        }
      ]}
      onPress={() => onPress?.(task)}
      activeOpacity={0.7}
    >
      <View style={[styles.taskMain, !hideAvatar && styles.taskMainWithAvatar]}>
        {task.member && !hideAvatar && (
          <View style={styles.taskLeft}>
            <UserAvatar
              firstName={task.member.firstName}
              lastName={task.member.lastName}
              avatarUrl={task.member.avatarUrl}
              size={compact ? "extra-small" : "small"}
            />
          </View>
        )}
        
        <View style={styles.taskInfo}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskIcon}>{task.task.icon || '✅'}</Text>
            <Text style={[styles.taskName, compact && styles.taskNameCompact]}>
              {task.task.name}
            </Text>
            <View style={styles.taskTags}>
              <View style={styles.timeTag}>
                <Text style={styles.tagText}>{formatTime(startTime)}</Text>
              </View>
              <View style={styles.durationTag}>
                <Text style={styles.tagText}>{formatDuration(duration)}</Text>
              </View>
              {task.source === 'override' && (
                <View style={styles.modifiedBadge}>
                  <Text style={styles.modifiedText}>MOD</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  compact: {
    padding: 10,
    marginBottom: 4,
  },
  taskMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskMainWithAvatar: {
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  taskIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  taskName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    lineHeight: 16,
  },
  taskNameCompact: {
    fontSize: 12,
  },
  taskTags: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
  },
  timeTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  durationTag: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#1e40af',
    lineHeight: 12,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 20,
  },
  modifiedBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  modifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskLeft: {
    marginRight: 12,
  },
}); 