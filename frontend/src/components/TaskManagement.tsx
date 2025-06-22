import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useFamily } from '../contexts/FamilyContext';
import { taskApi, Task, CreateTaskData, dayTemplateApi, DayTemplate, DayTemplateItem, CreateDayTemplateData } from '../services/api';
import { TaskAssignmentCard } from './TaskAssignmentCard';
import './TaskManagement.css';

export const TaskManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for task creation/editing
  const [taskData, setTaskData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    icon: '✅',
    defaultStartTime: '09:00',
    defaultDuration: 30,
  });
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // DayTemplate state
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [templateItems, setTemplateItems] = useState<Record<string, DayTemplateItem[]>>({});

  const [addingTemplate, setAddingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DayTemplate | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
  });
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});
  const [showTemplateItems, setShowTemplateItems] = useState<Record<string, boolean>>({});

  // Check if user is admin (can create/manage tasks)
  const isAdmin = currentFamily?.userRole === 'ADMIN';

  useEffect(() => {
    if (currentFamily) {
      loadTasks();
      loadTemplates();
    }
  }, [currentFamily]);

  const loadTasks = async () => {
    if (!currentFamily) return;
    
    setIsLoading(true);
    try {
      const response = await taskApi.getFamilyTasks(currentFamily.id, { isActive: true });
      setTasks(response.data.data);
    } catch (error) {
      setMessage({ type: 'error', text: t('tasks.loadError') });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await dayTemplateApi.getFamilyTemplates(currentFamily.id);
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const validateTaskForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!taskData.name.trim()) {
      errors['name'] = t('tasks.validation.nameRequired');
    } else if (taskData.name.trim().length < 2) {
      errors['name'] = t('tasks.validation.nameTooShort');
    } else if (taskData.name.trim().length > 100) {
      errors['name'] = t('tasks.validation.nameTooLong');
    }

    if (taskData.description.length > 500) {
      errors['description'] = t('tasks.validation.descriptionTooLong');
    }

    if (taskData.defaultDuration < 1) {
      errors['defaultDuration'] = t('tasks.validation.durationTooShort');
    } else if (taskData.defaultDuration > 1440) {
      errors['defaultDuration'] = t('tasks.validation.durationTooLong');
    }

    setTaskErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTask = () => {
    setAddingTask(true);
    setEditingTask(null);
    setMessage(null);
    setTaskErrors({});
    setShowEmojiPicker(false);
    // Reset form data
    setTaskData({
      name: '',
      description: '',
      color: '#6366f1',
      icon: '✅',
      defaultStartTime: '09:00',
      defaultDuration: 30,
    });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setAddingTask(false);
    setMessage(null);
    setTaskErrors({});
    setShowEmojiPicker(false);
    // Pre-fill form with task data
    setTaskData({
      name: task.name,
      description: task.description || '',
      color: task.color,
      icon: task.icon || '✅',
      defaultStartTime: task.defaultStartTime,
      defaultDuration: task.defaultDuration,
    });
  };

  const handleCancelForm = (preserveMessageOrEvent?: boolean | React.MouseEvent) => {
    setAddingTask(false);
    setEditingTask(null);
    setShowEmojiPicker(false);
    
    // If it's a boolean or undefined, use it as preserveMessage flag
    // If it's a mouse event, don't preserve the message (default behavior)
    const preserveMessage = typeof preserveMessageOrEvent === 'boolean' ? preserveMessageOrEvent : false;
    
    if (!preserveMessage) {
      setMessage(null);
    }
    setTaskErrors({});
    // Reset form data
    setTaskData({
      name: '',
      description: '',
      color: '#6366f1',
      icon: '✅',
      defaultStartTime: '09:00',
      defaultDuration: 30,
    });
  };

  const handleTaskInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTaskData(prev => ({
      ...prev,
      [name]: name === 'defaultDuration' ? parseInt(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (taskErrors[name]) {
      setTaskErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTaskForm() || !currentFamily) {
      return;
    }

    setIsLoading(true);
    try {
      const trimmedDescription = taskData.description.trim();
      const createData: CreateTaskData = {
        name: taskData.name.trim(),
        color: taskData.color,
        icon: taskData.icon,
        defaultStartTime: taskData.defaultStartTime,
        defaultDuration: taskData.defaultDuration,
      };
      
      // Only add description if it's not empty
      if (trimmedDescription) {
        createData.description = trimmedDescription;
      }

      const response = await taskApi.createTask(currentFamily.id, createData);

      // Add the new task to the list
      setTasks(prev => [...prev, response.data.data]);
      
      // Show success message
      setMessage({ type: 'success', text: t('tasks.created') });
      
      // Close the form but preserve the success message
      handleCancelForm(true);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || t('tasks.createError');
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTaskForm() || !editingTask) {
      return;
    }

    setIsLoading(true);
    try {
      const trimmedDescription = taskData.description.trim();
      const updateData: any = {
        name: taskData.name.trim(),
        color: taskData.color,
        icon: taskData.icon,
        defaultStartTime: taskData.defaultStartTime,
        defaultDuration: taskData.defaultDuration,
      };
      
      // Only add description if it's not empty, otherwise set to undefined to clear it
      if (trimmedDescription) {
        updateData.description = trimmedDescription;
      } else {
        updateData.description = undefined;
      }

      const response = await taskApi.update(editingTask.id, updateData);
      
      // Update the task in the list
      setTasks(prev => prev.map(task => 
        task.id === editingTask.id ? response.data.data : task
      ));
      
      // Show success message
      setMessage({ type: 'success', text: 'Task updated successfully' });
      
      // Close the form but preserve the success message
      handleCancelForm(true);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update task';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    setIsLoading(true);
    try {
      await taskApi.delete(taskId);
      
      // Remove the task from the list
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      // Show success message
      setMessage({ type: 'success', text: 'Task deleted successfully' });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete task';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
    return `${mins}m`;
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setTaskData(prev => ({ ...prev, icon: emojiData.emoji }));
    setShowEmojiPicker(false);
  };

  // DayTemplate management functions
  const validateTemplateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!templateData.name.trim()) {
      errors['name'] = 'Template name is required';
    } else if (templateData.name.trim().length < 2) {
      errors['name'] = 'Template name must be at least 2 characters';
    } else if (templateData.name.trim().length > 100) {
      errors['name'] = 'Template name cannot exceed 100 characters';
    }

    if (templateData.description.length > 500) {
      errors['description'] = 'Description cannot exceed 500 characters';
    }

    setTemplateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTemplate = () => {
    setAddingTemplate(true);
    setEditingTemplate(null);
    setMessage(null);
    setTemplateErrors({});
    setTemplateData({
      name: '',
      description: '',
    });
  };

  const handleEditTemplate = (template: DayTemplate) => {
    setEditingTemplate(template);
    setAddingTemplate(false);
    setMessage(null);
    setTemplateErrors({});
    setTemplateData({
      name: template.name,
      description: template.description || '',
    });
  };

  const handleCancelTemplateForm = (preserveMessage?: boolean) => {
    setAddingTemplate(false);
    setEditingTemplate(null);
    
    if (!preserveMessage) {
      setMessage(null);
    }
    setTemplateErrors({});
    setTemplateData({
      name: '',
      description: '',
    });
  };

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (templateErrors[name]) {
      setTemplateErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTemplateForm() || !currentFamily) {
      console.log('Validation failed or no current family:', { 
        validationPassed: validateTemplateForm(), 
        currentFamily: currentFamily?.id 
      });
      return;
    }

    console.log('Creating template with data:', {
      familyId: currentFamily.id,
      templateData: templateData
    });

    setIsLoading(true);
    try {
      const trimmedDescription = templateData.description.trim();
      const createData: CreateDayTemplateData = {
        name: templateData.name.trim(),
      };
      
      if (trimmedDescription) {
        createData.description = trimmedDescription;
      }

      console.log('Sending API request with:', createData);
      const response = await dayTemplateApi.create(currentFamily.id, createData);
      console.log('API response:', response);

      // Add the new template to the list
      setTemplates(prev => [...prev, response.data]);
      
      // Show success message
      setMessage({ type: 'success', text: 'Template created successfully' });
      
      // Close the form but preserve the success message
      handleCancelTemplateForm(true);
    } catch (error: any) {
      console.error('Template creation error:', error);
      console.error('Error response:', error?.response);
      const errorMessage = error?.response?.data?.message || 'Failed to create template';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTemplateForm() || !editingTemplate || !currentFamily) {
      return;
    }

    setIsLoading(true);
    try {
      const trimmedDescription = templateData.description.trim();
      const updateData: any = {
        name: templateData.name.trim(),
      };
      
      if (trimmedDescription) {
        updateData.description = trimmedDescription;
      } else {
        updateData.description = undefined;
      }

      const response = await dayTemplateApi.update(currentFamily.id, editingTemplate.id, updateData);
      
      // Update the template in the list
      setTemplates(prev => prev.map(template => 
        template.id === editingTemplate.id ? response.data : template
      ));
      
      // Show success message
      setMessage({ type: 'success', text: 'Template updated successfully' });
      
      // Close the form but preserve the success message
      handleCancelTemplateForm(true);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update template';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This will also remove all template items.')) {
      return;
    }

    if (!currentFamily) return;

    setIsLoading(true);
    try {
      await dayTemplateApi.delete(currentFamily.id, templateId);
      
      // Remove the template from the list
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      
      // Remove template items from cache
      setTemplateItems(prev => {
        const newItems = { ...prev };
        delete newItems[templateId];
        return newItems;
      });
      
      // Show success message
      setMessage({ type: 'success', text: 'Template deleted successfully' });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete template';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplateItems = async (templateId: string) => {
    if (!currentFamily) return;
    
    try {
      const response = await dayTemplateApi.getItems(currentFamily.id, templateId);
      setTemplateItems(prev => ({
        ...prev,
        [templateId]: response.data
      }));
    } catch (error) {
      console.error('Error loading template items:', error);
    }
  };

  const toggleTemplateItems = async (templateId: string) => {
    const isCurrentlyShown = showTemplateItems[templateId];
    
    setShowTemplateItems(prev => ({
      ...prev,
      [templateId]: !isCurrentlyShown
    }));
    
    // Load items if we're showing them and haven't loaded them yet
    if (!isCurrentlyShown && !templateItems[templateId]) {
      await loadTemplateItems(templateId);
    }
  };

  const handleDeleteTemplateItem = async (templateId: string, itemId: string) => {
    if (!confirm('Are you sure you want to remove this task from the template?')) {
      return;
    }

    if (!currentFamily) return;

    setIsLoading(true);
    try {
      await dayTemplateApi.removeItem(currentFamily.id, templateId, itemId);
      
      // Remove the item from the cache
      setTemplateItems(prev => ({
        ...prev,
        [templateId]: prev[templateId]?.filter(item => item.id !== itemId) || []
      }));
      
      // Show success message
      setMessage({ type: 'success', text: 'Task removed from template' });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to remove task from template';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentFamily) {
    return null;
  }

  const activeTasks = tasks.filter(task => task.isActive);
  
  // Sort tasks by default start time (chronological order)
  const sortedActiveTasks = [...activeTasks].sort((a, b) => {
    // Convert time strings (HH:MM) to comparable numbers for sorting
    const timeA = a.defaultStartTime.split(':').map(Number);
    const timeB = b.defaultStartTime.split(':').map(Number);
    
    // Ensure we have valid time components
    const hoursA = timeA[0] ?? 0;
    const minutesA = timeA[1] ?? 0;
    const hoursB = timeB[0] ?? 0;
    const minutesB = timeB[1] ?? 0;
    
    // Compare hours first, then minutes
    const hoursComparison = hoursA - hoursB;
    if (hoursComparison !== 0) {
      return hoursComparison;
    }
    
    return minutesA - minutesB;
  });
  
  const isFormOpen = addingTask || editingTask;

  return (
    <div className="task-management">
      <div className="task-management-header">
        <h2 className="task-management-title">{t('tasks.management')}</h2>
      </div>
      
      <div className="task-management-content">
        {/* Success/Error Messages */}
        {message && (
          <div className={`task-management-message task-management-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Tasks Section */}
        <div className="task-management-subsection">
          <div className="task-management-subsection-header">
            <h4 className="task-management-subsection-title">
              {t('tasks.currentTasks')}
              {sortedActiveTasks.length > 0 && (
                <span className="task-management-count-badge">{sortedActiveTasks.length}</span>
              )}
            </h4>
            {isAdmin && (
              <div className="task-management-button-group">
                <button
                  onClick={isFormOpen ? handleCancelForm : handleAddTask}
                  className="task-management-button task-management-button-primary task-management-button-sm"
                  disabled={isLoading}
                >
                  {isFormOpen ? t('common.cancel') : t('tasks.createTask')}
                </button>
              </div>
            )}
          </div>

          {/* Task Creation/Edit Form - Inline */}
          {isAdmin && isFormOpen && (
            <div className="task-management-task-add-inline">
              <h5 className="task-management-form-title">
                {editingTask ? 'Edit Task' : t('tasks.createTask')}
              </h5>
              <p className="task-management-help-text">
                {editingTask ? 'Update task details' : t('tasks.createTaskHelp')}
              </p>
              <form className="task-management-form" onSubmit={editingTask ? handleUpdateTask : handleCreateTask}>
                <div className="task-management-form-row">
                  <div className="task-management-form-group">
                    <label htmlFor="taskName" className="task-management-label">
                      {t('tasks.name')}
                    </label>
                    <input
                      type="text"
                      id="taskName"
                      name="name"
                      className="task-management-input"
                      placeholder={t('tasks.namePlaceholder')}
                      disabled={isLoading}
                      autoFocus
                      value={taskData.name}
                      onChange={handleTaskInputChange}
                    />
                    {taskErrors['name'] && (
                      <p className="task-management-error">{taskErrors['name']}</p>
                    )}
                  </div>

                  <div className="task-management-form-group">
                    <label htmlFor="taskColor" className="task-management-label">
                      {t('tasks.color')}
                    </label>
                    <input
                      type="color"
                      id="taskColor"
                      name="color"
                      className="task-management-input task-management-color-input"
                      value={taskData.color}
                      disabled={isLoading}
                      onChange={handleTaskInputChange}
                    />
                  </div>
                </div>

                <div className="task-management-form-group">
                  <label className="task-management-label">
                    Icon
                  </label>
                  <div className="task-management-icon-selector">
                    <div className="task-management-icon-selector-row">
                      <div className="task-management-icon-preview">
                        <span className="task-management-icon-preview-emoji">{taskData.icon || '✅'}</span>
                        <span className="task-management-icon-preview-label">Selected</span>
                      </div>
                      
                      <button
                        type="button"
                        className="task-management-emoji-picker-button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={isLoading}
                      >
                        {showEmojiPicker ? 'Close Emoji Picker' : 'Choose Emoji'}
                      </button>
                    </div>
                    
                    {showEmojiPicker && (
                      <div className="task-management-emoji-picker-container">
                        <EmojiPicker
                          onEmojiClick={handleEmojiSelect}
                          width="100%"
                          height={400}
                          searchPlaceholder="Search emojis..."
                          previewConfig={{
                            showPreview: false
                          }}
                          skinTonesDisabled={true}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="task-management-form-group">
                  <label htmlFor="taskDescription" className="task-management-label">
                    {t('tasks.description')} ({t('common.optional')})
                  </label>
                  <textarea
                    id="taskDescription"
                    name="description"
                    className="task-management-input"
                    placeholder={t('tasks.descriptionPlaceholder')}
                    rows={3}
                    disabled={isLoading}
                    value={taskData.description}
                    onChange={handleTaskInputChange}
                  />
                  {taskErrors['description'] && (
                    <p className="task-management-error">{taskErrors['description']}</p>
                  )}
                </div>

                <div className="task-management-form-row">
                  <div className="task-management-form-group">
                    <label htmlFor="taskStartTime" className="task-management-label">
                      {t('tasks.defaultStartTime')}
                    </label>
                    <input
                      type="time"
                      id="taskStartTime"
                      name="defaultStartTime"
                      className="task-management-input"
                      value={taskData.defaultStartTime}
                      disabled={isLoading}
                      onChange={handleTaskInputChange}
                    />
                  </div>

                  <div className="task-management-form-group">
                    <label htmlFor="taskDuration" className="task-management-label">
                      {t('tasks.defaultDuration')} ({t('tasks.minutes')})
                    </label>
                    <input
                      type="number"
                      id="taskDuration"
                      name="defaultDuration"
                      className="task-management-input"
                      placeholder="30"
                      min="1"
                      max="1440"
                      disabled={isLoading}
                      value={taskData.defaultDuration}
                      onChange={handleTaskInputChange}
                    />
                    {taskErrors['defaultDuration'] && (
                      <p className="task-management-error">{taskErrors['defaultDuration']}</p>
                    )}
                  </div>
                </div>

                <div className="task-management-form-actions">
                  <button
                    type="submit"
                    className="task-management-button task-management-button-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? t('tasks.creating') : (editingTask ? 'Update Task' : t('tasks.createTask'))}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="task-management-button task-management-button-secondary"
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tasks List */}
          <div className="task-management-tasks-list">
            {sortedActiveTasks.length === 0 ? (
              <div className="task-management-empty-state">
                <div className="task-management-empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 11H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="7" width="6" height="4" rx="2"/>
                    <path d="M12 12v4"/>
                    <path d="M10 14h4"/>
                  </svg>
                </div>
                <h5 className="task-management-empty-title">{t('tasks.noTasks')}</h5>
                <p className="task-management-empty-description">{t('tasks.noTasksDescription')}</p>
                {isAdmin && !isFormOpen && (
                  <button
                    onClick={handleAddTask}
                    className="task-management-button task-management-button-primary"
                  >
                    {t('tasks.createFirstTask')}
                  </button>
                )}
              </div>
            ) : (
              sortedActiveTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`task-management-task ${isAdmin ? 'task-management-task-clickable' : ''}`}
                  style={{ 
                    borderColor: task.color,
                    backgroundColor: `${task.color}18`
                  }}
                  onClick={isAdmin ? () => handleEditTask(task) : undefined}
                  title={isAdmin ? 'Click to edit task' : undefined}
                >
                  <div className="task-management-task-info">
                    <div className="task-management-task-header">
                      <div className="task-management-task-title">
                        <span className="task-management-task-icon-emoji">{task.icon || '✅'}</span>
                        <h6 className="task-management-task-name">{task.name}</h6>
                      </div>
                      <div className="task-management-task-time-container">
                        <span className="task-management-task-time">{task.defaultStartTime}</span>
                      </div>
                    </div>
                    <div className="task-management-task-description-row">
                      {task.description ? (
                        <p className="task-management-task-description">{task.description}</p>
                      ) : (
                        <div className="task-management-task-description-spacer"></div>
                      )}
                      <span className="task-management-task-duration">{formatDuration(task.defaultDuration)}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="task-management-task-actions">
                      <button
                        className="task-management-task-action delete"
                        title={t('common.delete')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        disabled={isLoading}
                      >
×
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* DayTemplate Section */}
        <div className="task-management-subsection">
          <div className="task-management-subsection-header">
            <h4 className="task-management-subsection-title">
              Day Templates
              {templates.length > 0 && (
                <span className="task-management-count-badge">{templates.length}</span>
              )}
            </h4>
            {isAdmin && (
              <div className="task-management-button-group">
                <button
                  onClick={addingTemplate || editingTemplate ? () => handleCancelTemplateForm() : handleAddTemplate}
                  className="task-management-button task-management-button-primary task-management-button-sm"
                  disabled={isLoading}
                >
                  {addingTemplate || editingTemplate ? 'Cancel' : 'Create Template'}
                </button>
              </div>
            )}
          </div>

          {/* Template Creation/Edit Form - Inline */}
          {isAdmin && (addingTemplate || editingTemplate) && (
            <div className="task-management-task-add-inline">
              <h5 className="task-management-form-title">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h5>
              <p className="task-management-help-text">
                {editingTemplate ? 'Update template details' : 'Create a reusable template for scheduling tasks'}
              </p>
              <form className="task-management-form" onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                <div className="task-management-form-group">
                  <label htmlFor="templateName" className="task-management-label">
                    Template Name
                  </label>
                  <input
                    type="text"
                    id="templateName"
                    name="name"
                    className="task-management-input"
                    placeholder="e.g., Weekday, Weekend, School Day"
                    disabled={isLoading}
                    autoFocus
                    value={templateData.name}
                    onChange={handleTemplateInputChange}
                  />
                  {templateErrors['name'] && (
                    <p className="task-management-error">{templateErrors['name']}</p>
                  )}
                </div>

                <div className="task-management-form-group">
                  <label htmlFor="templateDescription" className="task-management-label">
                    Description (Optional)
                  </label>
                  <textarea
                    id="templateDescription"
                    name="description"
                    className="task-management-input"
                    placeholder="Describe when this template should be used"
                    rows={3}
                    disabled={isLoading}
                    value={templateData.description}
                    onChange={handleTemplateInputChange}
                  />
                  {templateErrors['description'] && (
                    <p className="task-management-error">{templateErrors['description']}</p>
                  )}
                </div>

                <div className="task-management-form-actions">
                  <button
                    type="submit"
                    className="task-management-button task-management-button-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCancelTemplateForm();
                    }}
                    className="task-management-button task-management-button-secondary"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Templates List */}
          <div className="task-management-templates-list">
            {templates.length === 0 ? (
              <div className="task-management-empty-state">
                <div className="task-management-empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="2"/>
                    <path d="M12 12v4"/>
                    <path d="M10 14h4"/>
                  </svg>
                </div>
                <h5 className="task-management-empty-title">No Templates Yet</h5>
                <p className="task-management-empty-description">Create reusable templates to quickly schedule recurring task patterns</p>
                {isAdmin && !(addingTemplate || editingTemplate) && (
                  <button
                    onClick={handleAddTemplate}
                    className="task-management-button task-management-button-primary"
                  >
                    Create First Template
                  </button>
                )}
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="task-management-template">
                  <div className="task-management-template-header">
                    <div className="task-management-template-info">
                      <h6 className="task-management-template-name">{template.name}</h6>
                      {template.description && (
                        <p className="task-management-template-description">{template.description}</p>
                      )}
                    </div>
                    <div className="task-management-template-actions">
                      <button
                        className="task-management-button task-management-button-sm task-management-button-secondary"
                        onClick={() => toggleTemplateItems(template.id)}
                        disabled={isLoading}
                      >
                        {showTemplateItems[template.id] ? 'Hide Items' : 'Show Items'}
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            className="task-management-button task-management-button-sm task-management-button-secondary"
                            onClick={() => handleEditTemplate(template)}
                            disabled={isLoading}
                          >
                            Edit
                          </button>
                          <button
                            className="task-management-template-action delete"
                            title="Delete template"
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={isLoading}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Template Items */}
                  {showTemplateItems[template.id] && (
                    <div className="task-management-template-items">
                      {templateItems[template.id]?.length === 0 ? (
                        <div className="task-management-template-empty">
                          <p>No tasks in this template yet</p>
                          {isAdmin && (
                            <p className="task-management-help-text">
                              Add tasks to this template to create reusable scheduling patterns
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="task-management-template-items-grid">
                          {templateItems[template.id]?.filter(item => item.task).map((item) => (
                            <TaskAssignmentCard
                              key={item.id}
                              assignment={{
                                id: item.id,
                                memberId: item.memberId,
                                taskId: item.taskId,
                                overrideTime: item.overrideTime,
                                overrideDuration: item.overrideDuration,
                                assignedDate: new Date().toISOString(), // Template items don't have assigned date
                                createdAt: item.createdAt,
                                updatedAt: item.updatedAt,
                                member: item.member || null,
                                task: item.task!,
                              }}
                              {...(isAdmin && {
                                onDelete: (itemId) => {
                                  handleDeleteTemplateItem(template.id, itemId);
                                }
                              })}
                              isAdmin={isAdmin}
                              isLoading={isLoading}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 