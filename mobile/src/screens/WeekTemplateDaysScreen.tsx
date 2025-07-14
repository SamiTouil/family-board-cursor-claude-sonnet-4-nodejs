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
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFamily } from '../contexts/FamilyContext';
import { weekTemplateApi, dayTemplateApi } from '../services/api';
import { LoadingSpinner, PageHeader, headerButtonStyles } from '../components/ui';
import type { WeekTemplateDay, DayTemplate } from '../types';

type RouteParams = {
  templateId: string;
  templateName: string;
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export const WeekTemplateDaysScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { templateId, templateName } = route.params;
  const { currentFamily } = useFamily();

  // State
  const [templateDays, setTemplateDays] = useState<WeekTemplateDay[]>([]);
  const [availableDayTemplates, setAvailableDayTemplates] = useState<DayTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [messageTimeout, setMessageTimeout] = useState<NodeJS.Timeout | null>(null);

  // Modal states
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [isEditDayModalOpen, setIsEditDayModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<WeekTemplateDay | null>(null);
  const [dayData, setDayData] = useState({
    dayOfWeek: 0,
    dayTemplateId: '',
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
      // Load template days
      const daysResponse = await weekTemplateApi.getTemplateDays(currentFamily.id, templateId);
      setTemplateDays(daysResponse.data.days || []);

      // Load available day templates
      const dayTemplatesResponse = await dayTemplateApi.getTemplates(currentFamily.id);
      setAvailableDayTemplates(dayTemplatesResponse.data.templates || []);
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

  const getAvailableDays = () => {
    const assignedDays = templateDays.map(d => d.dayOfWeek);
    return DAYS_OF_WEEK.filter(day => !assignedDays.includes(day.value));
  };

  const handleAddDay = () => {
    const availableDays = getAvailableDays();
    if (availableDays.length === 0) {
      Alert.alert('Info', 'All days of the week have been assigned');
      return;
    }
    setDayData({
      dayOfWeek: availableDays[0].value,
      dayTemplateId: '',
    });
    setIsAddDayModalOpen(true);
  };

  const handleEditDay = (day: WeekTemplateDay) => {
    setEditingDay(day);
    setDayData({
      dayOfWeek: day.dayOfWeek,
      dayTemplateId: day.dayTemplateId,
    });
    setIsEditDayModalOpen(true);
  };

  const handleCreateDay = async () => {
    if (!currentFamily || !dayData.dayTemplateId) {
      Alert.alert('Error', 'Please select a daily routine');
      return;
    }

    setIsLoading(true);
    try {
      const createData = {
        dayOfWeek: dayData.dayOfWeek,
        dayTemplateId: dayData.dayTemplateId,
      };

      const response = await weekTemplateApi.addTemplateDay(currentFamily.id, templateId, createData);
      if (response.data) {
        await loadData(); // Reload to get full day data
        setMessageWithAutoDismiss({ type: 'success', text: 'Day added successfully' });
        setIsAddDayModalOpen(false);
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to add day' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDay = async () => {
    if (!currentFamily || !editingDay || !dayData.dayTemplateId) {
      Alert.alert('Error', 'Please select a daily routine');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        dayTemplateId: dayData.dayTemplateId,
      };

      const response = await weekTemplateApi.updateTemplateDay(
        currentFamily.id,
        templateId,
        editingDay.id,
        updateData
      );
      if (response.data) {
        await loadData(); // Reload to get full day data
        setMessageWithAutoDismiss({ type: 'success', text: 'Day updated successfully' });
        setIsEditDayModalOpen(false);
        setEditingDay(null);
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to update day' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDay = async (day: WeekTemplateDay) => {
    const dayName = DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek)?.label || 'this day';
    Alert.alert(
      'Remove Day',
      `Are you sure you want to remove ${dayName} from this weekly routine?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!currentFamily) return;

            setIsLoading(true);
            try {
              await weekTemplateApi.removeTemplateDay(currentFamily.id, templateId, day.id);
              await loadData();
              setMessageWithAutoDismiss({ type: 'success', text: 'Day removed successfully' });
            } catch (error) {
              setMessageWithAutoDismiss({ type: 'error', text: 'Failed to remove day' });
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDayPress = (day: WeekTemplateDay) => {
    if (!isAdmin) return;
    
    const dayName = DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek)?.label || 'this day';
    Alert.alert(
      'Day Actions',
      `What would you like to do with ${dayName}?`,
      [
        { text: 'Edit', onPress: () => handleEditDay(day) },
        { text: 'Remove', onPress: () => handleDeleteDay(day), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderDayCard = (day: WeekTemplateDay) => {
    const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek);
    return (
      <TouchableOpacity
        key={day.id}
        style={styles.dayCard}
        onPress={() => handleDayPress(day)}
        activeOpacity={0.7}
      >
        <View style={styles.dayIcon}>
          <Text style={styles.dayIconText}>{dayInfo?.short || '?'}</Text>
        </View>
        <View style={styles.dayInfo}>
          <Text style={styles.dayName}>{dayInfo?.label || 'Unknown'}</Text>
          <Text style={styles.dayTemplate}>
            {day.dayTemplate?.name || 'No template'}
          </Text>
          {day.dayTemplate?.description && (
            <Text style={styles.dayTemplateDescription}>
              {day.dayTemplate.description}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  // Sort days by day of week
  const sortedDays = [...templateDays].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

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
        description="Configure days for this weekly routine"
        showBackButton
        showLogo={false}
      />

      {/* Messages */}
      {message && (
        <View style={[styles.message, styles[`message${message.type}`]]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      {/* Day Count */}
      <View style={styles.dayCount}>
        <Text style={styles.dayCountText}>
          {sortedDays.length} of 7 days configured
        </Text>
        {isAdmin && sortedDays.length < 7 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddDay}
          >
            <Text style={styles.addButtonText}>+ Add Day</Text>
          </TouchableOpacity>
        )}
      </View>

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
            <Text style={styles.loadingText}>Loading days...</Text>
          </View>
        ) : sortedDays.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No days configured</Text>
            <Text style={styles.emptyDescription}>
              {isAdmin
                ? 'Configure days for this weekly routine to organize activities throughout the week.'
                : 'Your family admin can configure days for this weekly routine.'
              }
            </Text>
            {isAdmin && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddDay}>
                <Text style={styles.emptyButtonText}>Configure First Day</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.daysList}>
            {sortedDays.map(renderDayCard)}
          </View>
        )}
      </ScrollView>

      {/* Add Day Modal */}
      <Modal
        visible={isAddDayModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddDayModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAddDayModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Day</Text>
            <TouchableOpacity onPress={handleCreateDay} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Day of Week</Text>
              <View style={styles.daySelector}>
                {getAvailableDays().map(day => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayOption,
                      dayData.dayOfWeek === day.value && styles.dayOptionSelected
                    ]}
                    onPress={() => setDayData(prev => ({ ...prev, dayOfWeek: day.value }))}
                  >
                    <Text style={[
                      styles.dayOptionText,
                      dayData.dayOfWeek === day.value && styles.dayOptionTextSelected
                    ]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Daily Routine</Text>
              <View style={styles.templateSelector}>
                {availableDayTemplates.map(template => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateOption,
                      dayData.dayTemplateId === template.id && styles.templateOptionSelected
                    ]}
                    onPress={() => setDayData(prev => ({ ...prev, dayTemplateId: template.id }))}
                  >
                    <Text style={[
                      styles.templateOptionTitle,
                      dayData.dayTemplateId === template.id && styles.templateOptionTitleSelected
                    ]}>
                      {template.name}
                    </Text>
                    {template.description && (
                      <Text style={styles.templateOptionDescription}>
                        {template.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Day Modal */}
      <Modal
        visible={isEditDayModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditDayModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditDayModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Day</Text>
            <TouchableOpacity onPress={handleUpdateDay} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {DAYS_OF_WEEK.find(d => d.value === dayData.dayOfWeek)?.label || 'Day'}
              </Text>
              <View style={styles.templateSelector}>
                {availableDayTemplates.map(template => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateOption,
                      dayData.dayTemplateId === template.id && styles.templateOptionSelected
                    ]}
                    onPress={() => setDayData(prev => ({ ...prev, dayTemplateId: template.id }))}
                  >
                    <Text style={[
                      styles.templateOptionTitle,
                      dayData.dayTemplateId === template.id && styles.templateOptionTitleSelected
                    ]}>
                      {template.name}
                    </Text>
                    {template.description && (
                      <Text style={styles.templateOptionDescription}>
                        {template.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
  dayCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dayCountText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  daysList: {
    padding: 16,
    paddingBottom: 24,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dayIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dayIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  dayTemplate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  dayTemplateDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#9ca3af',
    marginLeft: 8,
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
  daySelector: {
    flexDirection: 'column',
    gap: 8,
  },
  dayOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  dayOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  dayOptionText: {
    fontSize: 16,
    color: '#6b7280',
  },
  dayOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  templateSelector: {
    flexDirection: 'column',
    gap: 8,
  },
  templateOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  templateOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  templateOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  templateOptionTitleSelected: {
    color: '#3b82f6',
  },
  templateOptionDescription: {
    fontSize: 14,
    color: '#6b7280',
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