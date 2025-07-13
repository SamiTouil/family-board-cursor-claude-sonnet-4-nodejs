import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFamily } from '../../contexts/FamilyContext';
import { analyticsApi } from '../../services/api';
import type { TaskSplitAnalytics } from '../../types';
import { UserAvatar } from './UserAvatar';

const { width: screenWidth } = Dimensions.get('window');

interface TaskSplitIndicatorProps {
  currentWeekStart: string;
}

export const TaskSplitIndicator: React.FC<TaskSplitIndicatorProps> = ({ currentWeekStart }) => {
  const { currentFamily } = useFamily();
  const [analytics, setAnalytics] = useState<TaskSplitAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (currentFamily && currentWeekStart) {
      loadAnalytics();
    }
  }, [currentFamily, currentWeekStart]);

  const loadAnalytics = async () => {
    if (!currentFamily || !currentWeekStart) return;

    try {
      setIsLoading(true);
      const response = await analyticsApi.getTaskSplit(currentFamily.id, currentWeekStart);
      setAnalytics(response.data.data);
    } catch (error) {
      // Failed to load analytics - component will not render
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentFamily || isLoading || !analytics) {
    return null;
  }

  // Filter out virtual members for display
  const realMembers = analytics.memberStats.filter(member => !member.isVirtual);
  
  // Check if there are no tasks
  const hasNoTasks = analytics.totalMinutes === 0;
  
  // Get fairness indicator color
  const getFairnessColor = (score: number) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getFairnessLabel = (score: number) => {
    if (score >= 90) return 'Fair';
    if (score >= 70) return 'OK';
    return 'Unfair';
  };

  return (
    <>
      <TouchableOpacity
        style={styles.indicatorButton}
        onPress={() => setIsExpanded(true)}
      >
        <Text style={styles.score}>
          {analytics.fairnessScore}%
        </Text>
        <Text style={styles.label}>
          {getFairnessLabel(analytics.fairnessScore)}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isExpanded}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task Distribution (4 weeks)</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsExpanded(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.membersContainer}>
              {hasNoTasks ? (
                <View style={styles.noTasks}>
                  <Text style={styles.noTasksText}>No tasks assigned in the last 4 weeks</Text>
                  <Text style={styles.noTasksHint}>Start assigning tasks to see distribution</Text>
                </View>
              ) : realMembers.length === 0 ? (
                <View style={styles.noTasks}>
                  <Text style={styles.noTasksText}>No family members found</Text>
                </View>
              ) : (
                realMembers.map(member => (
                  <View key={member.memberId} style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      <UserAvatar
                        firstName={member.firstName}
                        lastName={member.lastName}
                        avatarUrl={member.avatarUrl ?? null}
                        size={32}
                      />
                      <Text style={styles.memberName}>{member.memberName}</Text>
                    </View>
                    <View style={styles.memberStats}>
                      <View style={styles.barContainer}>
                        <View 
                          style={[
                            styles.barFill,
                            { width: `${member.percentage}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.percentage}>
                        {Math.round(member.percentage)}%
                      </Text>
                    </View>
                    <Text style={styles.time}>
                      {Math.floor(member.totalMinutes / 60)}h {member.totalMinutes % 60}m
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total time:</Text>
                <Text style={styles.summaryValue}>
                  {Math.floor(analytics.totalMinutes / 60)}h {analytics.totalMinutes % 60}m
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Average per person:</Text>
                <Text style={styles.summaryValue}>
                  {Math.floor(analytics.averageMinutesPerMember / 60)}h {analytics.averageMinutesPerMember % 60}m
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  indicatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  score: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  label: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
  },
  membersContainer: {
    padding: 16,
  },
  noTasks: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noTasksText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  noTasksHint: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  memberRow: {
    marginBottom: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    minWidth: 40,
    textAlign: 'right',
  },
  time: {
    fontSize: 12,
    color: '#6b7280',
  },
  summary: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});