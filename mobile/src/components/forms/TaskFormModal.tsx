import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Button, LoadingSpinner } from '../ui';
import type { Task, CreateTaskData, UpdateTaskData } from '../../types';

interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskData | UpdateTaskData) => Promise<void>;
  task?: Task; // If provided, this is edit mode
  isLoading?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

// Common emojis for tasks
const COMMON_EMOJIS = [
  '📋', '✅', '📝', '🏠', '🧹', '🍳', '🛒', '🚗', '💡', '📚',
  '🎯', '⏰', '🔧', '🎨', '🏃', '💼', '🎵', '🌱', '📞', '💻',
  '🍽️', '🛏️', '🚿', '🧺', '🗑️', '📦', '🔑', '💊', '🐕', '🌸'
];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  task,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CreateTaskData>({
    name: '',
    description: '',
    icon: '📋',
    color: '#6366f1',
    defaultStartTime: '09:00',
    defaultDuration: 30,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!task;

  useEffect(() => {
    if (task) {
      // Edit mode - populate form with task data
      setFormData({
        name: task.name,
        description: task.description || '',
        icon: task.icon || '📋',
        color: task.color,
        defaultStartTime: task.defaultStartTime,
        defaultDuration: task.defaultDuration,
      });
    } else {
      // Add mode - reset form
      setFormData({
        name: '',
        description: '',
        icon: '📋',
        color: '#6366f1',
        defaultStartTime: '09:00',
        defaultDuration: 30,
      });
    }
    setErrors({});
    setShowEmojiPicker(false);
  }, [task, visible]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Task name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Task name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.defaultDuration < 1) {
      newErrors.defaultDuration = 'Duration must be at least 1 minute';
    } else if (formData.defaultDuration > 1440) {
      newErrors.defaultDuration = 'Duration cannot exceed 24 hours (1440 minutes)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      };

      await onSubmit(submitData);
      onClose();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || `Failed to ${isEditMode ? 'update' : 'create'} task`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateTaskData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    handleInputChange('icon', emoji);
    setShowEmojiPicker(false);
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
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>
            {isEditMode ? 'Edit Task' : 'New Task'}
          </Text>
          
          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? (
              <LoadingSpinner size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Update' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Task Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Task Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter task name"
              maxLength={100}
              editable={!isSubmitting}
              autoFocus={!isEditMode}
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>

          {/* Icon Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconSelector}>
              <TouchableOpacity
                style={styles.selectedIcon}
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={isSubmitting}
              >
                <Text style={styles.selectedIconEmoji}>{formData.icon}</Text>
                <Text style={styles.selectedIconLabel}>Tap to change</Text>
              </TouchableOpacity>
            </View>
            
            {showEmojiPicker && (
              <View style={styles.emojiPicker}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emojiPickerContent}
                >
                  {COMMON_EMOJIS.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.emojiOption,
                        formData.icon === emoji && styles.emojiOptionSelected
                      ]}
                      onPress={() => handleEmojiSelect(emoji)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.emojiOptionText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Color Picker */}
          <View style={styles.section}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorPicker}>
              {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    formData.color === color && styles.colorOptionSelected
                  ]}
                  onPress={() => handleInputChange('color', color)}
                  disabled={isSubmitting}
                >
                  {formData.color === color && (
                    <Text style={styles.colorOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Add a description..."
              multiline
              numberOfLines={3}
              maxLength={500}
              editable={!isSubmitting}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          {/* Time and Duration */}
          <View style={styles.row}>
            <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={formData.defaultStartTime}
                onChangeText={(text) => handleInputChange('defaultStartTime', text)}
                placeholder="09:00"
                editable={!isSubmitting}
              />
              <Text style={styles.helperText}>
                {formatTime(formData.defaultStartTime)}
              </Text>
            </View>

            <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                style={[styles.input, errors.defaultDuration && styles.inputError]}
                value={formData.defaultDuration.toString()}
                onChangeText={(text) => {
                  const duration = parseInt(text) || 0;
                  handleInputChange('defaultDuration', duration);
                }}
                placeholder="30"
                keyboardType="numeric"
                editable={!isSubmitting}
              />
              <Text style={styles.helperText}>
                {formatDuration(formData.defaultDuration)}
              </Text>
              {errors.defaultDuration && (
                <Text style={styles.errorText}>{errors.defaultDuration}</Text>
              )}
            </View>
          </View>

          {/* Preview */}
          <View style={styles.section}>
            <Text style={styles.label}>Preview</Text>
            <View style={styles.preview}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewIcon}>{formData.icon}</Text>
                <Text style={styles.previewName}>{formData.name || 'Task Name'}</Text>
                <View style={[styles.previewColor, { backgroundColor: formData.color }]} />
              </View>
              {formData.description && (
                <Text style={styles.previewDescription} numberOfLines={2}>
                  {formData.description}
                </Text>
              )}
              <View style={styles.previewFooter}>
                <Text style={styles.previewTime}>
                  {formatTime(formData.defaultStartTime)}
                </Text>
                <Text style={styles.previewDuration}>
                  {formatDuration(formData.defaultDuration)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
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
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  iconSelector: {
    alignItems: 'flex-start',
  },
  selectedIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedIconEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  selectedIconLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  emojiPicker: {
    marginTop: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  emojiPickerContent: {
    paddingHorizontal: 4,
  },
  emojiOption: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  emojiOptionSelected: {
    backgroundColor: '#e0e7ff',
  },
  emojiOptionText: {
    fontSize: 20,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#1f2937',
  },
  colorOptionCheck: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  preview: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  previewColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  previewDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  previewFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  previewTime: {
    fontSize: 12,
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '500',
  },
  previewDuration: {
    fontSize: 12,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '500',
  },
}); 