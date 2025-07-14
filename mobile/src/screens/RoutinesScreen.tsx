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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFamily } from '../contexts/FamilyContext';
import type { RoutinesStackParamList } from '../navigation/RoutinesStackNavigator';
import { dayTemplateApi, weekTemplateApi } from '../services/api';
import { Button, LoadingSpinner, PageHeader, headerButtonStyles } from '../components/ui';
import type { DayTemplate, WeekTemplate } from '../types';

export const RoutinesScreen: React.FC = () => {
  const { currentFamily } = useFamily();
  const navigation = useNavigation<StackNavigationProp<RoutinesStackParamList>>();

  // State for templates
  const [dayTemplates, setDayTemplates] = useState<DayTemplate[]>([]);
  const [weekTemplates, setWeekTemplates] = useState<WeekTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [messageTimeout, setMessageTimeout] = useState<NodeJS.Timeout | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'day-templates' | 'week-templates'>('day-templates');

  // Modal states for day templates
  const [isAddDayTemplateModalOpen, setIsAddDayTemplateModalOpen] = useState(false);
  const [isEditDayTemplateModalOpen, setIsEditDayTemplateModalOpen] = useState(false);
  const [editingDayTemplate, setEditingDayTemplate] = useState<DayTemplate | null>(null);
  const [dayTemplateData, setDayTemplateData] = useState({
    name: '',
    description: '',
  });

  // Modal states for week templates
  const [isAddWeekTemplateModalOpen, setIsAddWeekTemplateModalOpen] = useState(false);
  const [isEditWeekTemplateModalOpen, setIsEditWeekTemplateModalOpen] = useState(false);
  const [editingWeekTemplate, setEditingWeekTemplate] = useState<WeekTemplate | null>(null);
  const [weekTemplateData, setWeekTemplateData] = useState({
    name: '',
    description: '',
    isDefault: false,
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

  // Load templates when component mounts
  useEffect(() => {
    if (currentFamily) {
      loadTemplates();
    }
  }, [currentFamily]);

  const loadTemplates = async () => {
    if (!currentFamily) return;

    setIsLoading(true);
    try {
      // Load day templates
      const dayResponse = await dayTemplateApi.getTemplates(currentFamily.id);
      setDayTemplates(dayResponse.data.templates || []);

      // Load week templates
      const weekResponse = await weekTemplateApi.getTemplates(currentFamily.id);
      setWeekTemplates(weekResponse.data.templates || []);
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to load routines' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTemplates();
    setIsRefreshing(false);
  }, [currentFamily]);

  // Day template functions
  const handleAddDayTemplate = () => {
    setDayTemplateData({ name: '', description: '' });
    setIsAddDayTemplateModalOpen(true);
  };

  const handleEditDayTemplate = (template: DayTemplate) => {
    setEditingDayTemplate(template);
    setDayTemplateData({
      name: template.name,
      description: template.description || '',
    });
    setIsEditDayTemplateModalOpen(true);
  };

  const handleCreateDayTemplate = async () => {
    if (!currentFamily || !dayTemplateData.name.trim()) {
      Alert.alert('Error', 'Template name is required');
      return;
    }

    setIsLoading(true);
    try {
      const createData = {
        name: dayTemplateData.name.trim(),
        description: dayTemplateData.description.trim() || undefined,
      };

      const response = await dayTemplateApi.createTemplate(currentFamily.id, createData);
      if (response.data) {
        setDayTemplates(prev => [...prev, response.data]);
        setMessageWithAutoDismiss({ type: 'success', text: 'Daily routine created successfully' });
        setIsAddDayTemplateModalOpen(false);
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to create daily routine' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDayTemplate = async () => {
    if (!currentFamily || !editingDayTemplate || !dayTemplateData.name.trim()) {
      Alert.alert('Error', 'Template name is required');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        name: dayTemplateData.name.trim(),
        description: dayTemplateData.description.trim() || undefined,
      };

      const response = await dayTemplateApi.updateTemplate(currentFamily.id, editingDayTemplate.id, updateData);
      if (response.data) {
        setDayTemplates(prev =>
          prev.map(template => template.id === editingDayTemplate.id ? response.data : template)
        );
        setMessageWithAutoDismiss({ type: 'success', text: 'Daily routine updated successfully' });
        setIsEditDayTemplateModalOpen(false);
        setEditingDayTemplate(null);
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to update daily routine' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDayTemplate = async (template: DayTemplate) => {
    Alert.alert(
      'Delete Daily Routine',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentFamily) return;

            setIsLoading(true);
            try {
              await dayTemplateApi.deleteTemplate(currentFamily.id, template.id);
              setDayTemplates(prev => prev.filter(t => t.id !== template.id));
              setMessageWithAutoDismiss({ type: 'success', text: 'Daily routine deleted successfully' });
            } catch (error) {
              setMessageWithAutoDismiss({ type: 'error', text: 'Failed to delete daily routine' });
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Week template functions
  const handleAddWeekTemplate = () => {
    setWeekTemplateData({ name: '', description: '', isDefault: false });
    setIsAddWeekTemplateModalOpen(true);
  };

  const handleEditWeekTemplate = (template: WeekTemplate) => {
    setEditingWeekTemplate(template);
    setWeekTemplateData({
      name: template.name,
      description: template.description || '',
      isDefault: template.isDefault,
    });
    setIsEditWeekTemplateModalOpen(true);
  };

  const handleCreateWeekTemplate = async () => {
    if (!currentFamily || !weekTemplateData.name.trim()) {
      Alert.alert('Error', 'Template name is required');
      return;
    }

    setIsLoading(true);
    try {
      const createData = {
        name: weekTemplateData.name.trim(),
        description: weekTemplateData.description.trim() || undefined,
        isDefault: weekTemplateData.isDefault,
      };

      const response = await weekTemplateApi.createTemplate(currentFamily.id, createData);
      if (response.data) {
        setWeekTemplates(prev => [...prev, response.data]);
        setMessageWithAutoDismiss({ type: 'success', text: 'Weekly routine created successfully' });
        setIsAddWeekTemplateModalOpen(false);
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to create weekly routine' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateWeekTemplate = async () => {
    if (!currentFamily || !editingWeekTemplate || !weekTemplateData.name.trim()) {
      Alert.alert('Error', 'Template name is required');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        name: weekTemplateData.name.trim(),
        description: weekTemplateData.description.trim() || undefined,
        isDefault: weekTemplateData.isDefault,
      };

      const response = await weekTemplateApi.updateTemplate(currentFamily.id, editingWeekTemplate.id, updateData);
      if (response.data) {
        setWeekTemplates(prev =>
          prev.map(template => template.id === editingWeekTemplate.id ? response.data : template)
        );
        setMessageWithAutoDismiss({ type: 'success', text: 'Weekly routine updated successfully' });
        setIsEditWeekTemplateModalOpen(false);
        setEditingWeekTemplate(null);
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to update weekly routine' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWeekTemplate = async (template: WeekTemplate) => {
    Alert.alert(
      'Delete Weekly Routine',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentFamily) return;

            setIsLoading(true);
            try {
              await weekTemplateApi.deleteTemplate(currentFamily.id, template.id);
              setWeekTemplates(prev => prev.filter(t => t.id !== template.id));
              setMessageWithAutoDismiss({ type: 'success', text: 'Weekly routine deleted successfully' });
            } catch (error) {
              setMessageWithAutoDismiss({ type: 'error', text: 'Failed to delete weekly routine' });
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDayTemplatePress = (template: DayTemplate) => {
    if (!isAdmin) {
      // Non-admin users navigate directly to manage tasks
      navigation.navigate('DayTemplateTasks', {
        templateId: template.id,
        templateName: template.name,
      });
      return;
    }

    // Admin users get action menu
    Alert.alert(
      'Daily Routine Actions',
      `What would you like to do with "${template.name}"?`,
      [
        {
          text: 'Manage Tasks',
          onPress: () => navigation.navigate('DayTemplateTasks', {
            templateId: template.id,
            templateName: template.name,
          })
        },
        { text: 'Edit', onPress: () => handleEditDayTemplate(template) },
        { text: 'Delete', onPress: () => handleDeleteDayTemplate(template), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderDayTemplateCard = (template: DayTemplate) => (
    <TouchableOpacity
      key={template.id}
      style={[
        styles.templateCard,
        { 
          borderLeftColor: '#8b5cf6', // Purple for daily routines
          backgroundColor: '#8b5cf610' // Light purple tint
        }
      ]}
      onPress={() => handleDayTemplatePress(template)}
      activeOpacity={0.7}
    >
      <View style={styles.templateInfo}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateIcon}>📅</Text>
          <Text style={styles.templateName}>{template.name}</Text>
          <View style={styles.templateBadges}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>Daily</Text>
            </View>
          </View>
        </View>
        {template.description && (
          <Text style={styles.templateDescription}>{template.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleWeekTemplatePress = (template: WeekTemplate) => {
    if (!isAdmin) {
      // Non-admin users navigate directly to configure days
      navigation.navigate('WeekTemplateDays', {
        templateId: template.id,
        templateName: template.name,
      });
      return;
    }

    // Admin users get action menu
    Alert.alert(
      'Weekly Routine Actions',
      `What would you like to do with "${template.name}"?`,
      [
        {
          text: 'Configure Days',
          onPress: () => navigation.navigate('WeekTemplateDays', {
            templateId: template.id,
            templateName: template.name,
          })
        },
        { text: 'Edit', onPress: () => handleEditWeekTemplate(template) },
        { text: 'Delete', onPress: () => handleDeleteWeekTemplate(template), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderWeekTemplateCard = (template: WeekTemplate) => (
    <TouchableOpacity
      key={template.id}
      style={[
        styles.templateCard,
        { 
          borderLeftColor: '#06b6d4', // Cyan for weekly routines
          backgroundColor: '#06b6d410' // Light cyan tint
        }
      ]}
      onPress={() => handleWeekTemplatePress(template)}
      activeOpacity={0.7}
    >
      <View style={styles.templateInfo}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateIcon}>📆</Text>
          <Text style={styles.templateName}>{template.name}</Text>
          <View style={styles.templateBadges}>
            <View style={[styles.typeBadge, { backgroundColor: '#e0f7fa', borderColor: '#b2ebf2' }]}>
              <Text style={[styles.typeBadgeText, { color: '#00838f' }]}>Weekly</Text>
            </View>
            {template.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
        </View>
        {template.description && (
          <Text style={styles.templateDescription}>{template.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

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
        title="Routines"
        description="Create and manage daily & weekly routines"
        showLogo
      />

      {/* Messages */}
      {message && (
        <View style={[styles.message, styles[`message${message.type}`]]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'day-templates' && styles.activeTab]}
          onPress={() => setActiveTab('day-templates')}
        >
          <Text style={[styles.tabText, activeTab === 'day-templates' && styles.activeTabText]}>
            Daily Routines
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'week-templates' && styles.activeTab]}
          onPress={() => setActiveTab('week-templates')}
        >
          <Text style={[styles.tabText, activeTab === 'week-templates' && styles.activeTabText]}>
            Weekly Routines
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Content based on active tab */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'day-templates' ? 'Daily Routines' : 'Weekly Routines'}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={activeTab === 'day-templates' ? handleAddDayTemplate : handleAddWeekTemplate}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeTab === 'day-templates' ? (
            dayTemplates.length > 0 ? (
              dayTemplates.map(renderDayTemplateCard)
            ) : (
              <Text style={styles.emptyText}>
                No daily routines yet. {isAdmin ? 'Create your first one!' : ''}
              </Text>
            )
          ) : (
            weekTemplates.length > 0 ? (
              weekTemplates.map(renderWeekTemplateCard)
            ) : (
              <Text style={styles.emptyText}>
                No weekly routines yet. {isAdmin ? 'Create your first one!' : ''}
              </Text>
            )
          )}
        </View>
      </ScrollView>

      {/* Add Day Template Modal */}
      <Modal
        visible={isAddDayTemplateModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddDayTemplateModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAddDayTemplateModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Daily Routine</Text>
            <TouchableOpacity onPress={handleCreateDayTemplate} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Routine Name</Text>
              <TextInput
                style={styles.input}
                value={dayTemplateData.name}
                onChangeText={(text) => setDayTemplateData(prev => ({ ...prev, name: text }))}
                placeholder="Enter routine name (e.g., School Day, Weekend)"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={dayTemplateData.description}
                onChangeText={(text) => setDayTemplateData(prev => ({ ...prev, description: text }))}
                placeholder="Describe this daily routine"
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Day Template Modal */}
      <Modal
        visible={isEditDayTemplateModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditDayTemplateModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditDayTemplateModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Daily Routine</Text>
            <TouchableOpacity onPress={handleUpdateDayTemplate} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Routine Name</Text>
              <TextInput
                style={styles.input}
                value={dayTemplateData.name}
                onChangeText={(text) => setDayTemplateData(prev => ({ ...prev, name: text }))}
                placeholder="Enter routine name"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={dayTemplateData.description}
                onChangeText={(text) => setDayTemplateData(prev => ({ ...prev, description: text }))}
                placeholder="Describe this daily routine"
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Week Template Modal */}
      <Modal
        visible={isAddWeekTemplateModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddWeekTemplateModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAddWeekTemplateModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Weekly Routine</Text>
            <TouchableOpacity onPress={handleCreateWeekTemplate} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Routine Name</Text>
              <TextInput
                style={styles.input}
                value={weekTemplateData.name}
                onChangeText={(text) => setWeekTemplateData(prev => ({ ...prev, name: text }))}
                placeholder="Enter routine name"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={weekTemplateData.description}
                onChangeText={(text) => setWeekTemplateData(prev => ({ ...prev, description: text }))}
                placeholder="Describe this weekly routine"
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={[styles.checkbox, weekTemplateData.isDefault && styles.checkboxChecked]}
                  onPress={() => setWeekTemplateData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                >
                  {weekTemplateData.isDefault && <Text style={styles.checkboxCheck}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Set as default routine</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Week Template Modal */}
      <Modal
        visible={isEditWeekTemplateModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditWeekTemplateModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditWeekTemplateModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Weekly Routine</Text>
            <TouchableOpacity onPress={handleUpdateWeekTemplate} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Routine Name</Text>
              <TextInput
                style={styles.input}
                value={weekTemplateData.name}
                onChangeText={(text) => setWeekTemplateData(prev => ({ ...prev, name: text }))}
                placeholder="Enter routine name"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={weekTemplateData.description}
                onChangeText={(text) => setWeekTemplateData(prev => ({ ...prev, description: text }))}
                placeholder="Describe this weekly routine"
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={[styles.checkbox, weekTemplateData.isDefault && styles.checkboxChecked]}
                  onPress={() => setWeekTemplateData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                >
                  {weekTemplateData.isDefault && <Text style={styles.checkboxCheck}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Set as default routine</Text>
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
    backgroundColor: '#f8f9fa',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  templateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  templateInfo: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  templateIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    lineHeight: 20,
  },
  templateBadges: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  typeBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5b21b6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  defaultBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templateDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    fontStyle: 'italic',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxCheck: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
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