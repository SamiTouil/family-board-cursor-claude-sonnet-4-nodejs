import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useFamily } from '../../../contexts/FamilyContext';
import { taskApi } from '../../../services/api';
import type { Task, CreateTaskData } from '../../../types';
import { TaskOverrideCard, Modal, Button } from '../../../components/ui';
import { useMessage } from '../../../hooks';
import './TaskManagement.css';

export const TaskManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [message, setMessage] = useMessage();

  // Modal state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);

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

  // Check if user is admin (can create/manage tasks)
  const isAdmin = currentFamily?.userRole === 'ADMIN';

  useEffect(() => {
    if (currentFamily) {
      loadTasks();
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
    setEditingTask(null);
    setMessage(null);
    setTaskErrors({});
    setShowEmojiPicker(false);
    setIsAddTaskModalOpen(true);
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
    setMessage(null);
    setTaskErrors({});
    setShowEmojiPicker(false);
    setIsEditTaskModalOpen(true);
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
    setEditingTask(null);
    setShowEmojiPicker(false);
    setIsAddTaskModalOpen(false);
    setIsEditTaskModalOpen(false);
    
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
      
      // Close the modal but preserve the success message
      setIsAddTaskModalOpen(false);
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
      
      // Only add description if it's not empty
      if (trimmedDescription) {
        updateData.description = trimmedDescription;
      }

      const response = await taskApi.updateTask(editingTask.id, updateData);

      // Update the task in the list
      setTasks(prev => prev.map(task => 
        task.id === editingTask.id ? response.data.data : task
      ));
      
      // Show success message
      setMessage({ type: 'success', text: t('tasks.updated') });
      
      // Close the modal but preserve the success message
      setIsEditTaskModalOpen(false);
      handleCancelForm(true);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || t('tasks.updateError');
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm(t('tasks.confirmDelete'))) {
      return;
    }

    setIsLoading(true);
    try {
      await taskApi.deleteTask(taskId);
      
      // Remove the task from the list
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      // Show success message
      setMessage({ type: 'success', text: t('tasks.deleted') });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || t('tasks.deleteError');
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: string): string => {
    return time;
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
  


  // Helper function to transform Task into ResolvedTask format for TaskOverrideCard
  const adaptTaskForCard = (task: Task) => {
    return {
      taskId: task.id,
      memberId: null, // No specific member assigned for task management view
      overrideTime: null, // Will fall back to task.defaultStartTime
      overrideDuration: null, // Will fall back to task.defaultDuration
      source: 'template' as const, // Regular tasks are considered template-based
      task: task,
      member: null // No specific member assigned for task management view
    };
  };

  return (
    <div className="task-management">
      <div className="task-management-header">
        <h2 className="task-management-title">{t('tasks.management')}</h2>
        {isAdmin && (
          <button
            onClick={handleAddTask}
            className="task-management-header-button"
            disabled={isLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            {t('tasks.createTask')}
          </button>
        )}
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
                {isAdmin && (
                  <Button
                    variant="primary"
                    onClick={handleAddTask}
                  >
                    {t('tasks.createFirstTask')}
                  </Button>
                )}
              </div>
            ) : (
              sortedActiveTasks.map((task) => (
                <div
                  key={task.id}
                  className="task-management-task-wrapper"
                >
                  <TaskOverrideCard
                    task={adaptTaskForCard(task)}
                    taskIndex={0} // Not used for task management
                    isAdmin={isAdmin}
                    {...(isAdmin && { onRemove: (resolvedTask) => handleDeleteTask(resolvedTask.taskId) })}
                    {...(isAdmin && { onEdit: (resolvedTask) => handleEditTask(resolvedTask.task) })}
                    formatTime={formatTime}
                    formatDuration={formatDuration}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      <Modal
        title={t('tasks.createTask')}
        isOpen={isAddTaskModalOpen}
        onClose={handleCancelForm}
        onApply={() => handleCreateTask({ preventDefault: () => {} } as React.FormEvent)}
        variant="standard"
      >
        <div className="task-management-modal-content">
          <div className="task-management-form-row">
            <div className="task-management-form-group">
              <label htmlFor="addTaskName" className="task-management-label">
                {t('tasks.name')}
              </label>
              <input
                type="text"
                id="addTaskName"
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
              <label htmlFor="addTaskColor" className="task-management-label">
                {t('tasks.color')}
              </label>
              <input
                type="color"
                id="addTaskColor"
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
                
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={isLoading}
                >
                  {showEmojiPicker ? 'Close Emoji Picker' : 'Choose Emoji'}
                </Button>
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
            <label htmlFor="addTaskDescription" className="task-management-label">
              {t('tasks.description')} ({t('common.optional')})
            </label>
            <textarea
              id="addTaskDescription"
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
              <label htmlFor="addTaskStartTime" className="task-management-label">
                {t('tasks.defaultStartTime')}
              </label>
              <input
                type="time"
                id="addTaskStartTime"
                name="defaultStartTime"
                className="task-management-input"
                value={taskData.defaultStartTime}
                disabled={isLoading}
                onChange={handleTaskInputChange}
              />
            </div>

            <div className="task-management-form-group">
              <label htmlFor="addTaskDuration" className="task-management-label">
                {t('tasks.defaultDuration')} ({t('tasks.minutes')})
              </label>
              <input
                type="number"
                id="addTaskDuration"
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
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        title="Edit Task"
        isOpen={isEditTaskModalOpen}
        onClose={handleCancelForm}
        onApply={() => handleUpdateTask({ preventDefault: () => {} } as React.FormEvent)}
        variant="standard"
      >
        <div className="task-management-modal-content">
          <div className="task-management-form-row">
            <div className="task-management-form-group">
              <label htmlFor="editTaskName" className="task-management-label">
                {t('tasks.name')}
              </label>
              <input
                type="text"
                id="editTaskName"
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
              <label htmlFor="editTaskColor" className="task-management-label">
                {t('tasks.color')}
              </label>
              <input
                type="color"
                id="editTaskColor"
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
            <label htmlFor="editTaskDescription" className="task-management-label">
              {t('tasks.description')} ({t('common.optional')})
            </label>
            <textarea
              id="editTaskDescription"
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
              <label htmlFor="editTaskStartTime" className="task-management-label">
                {t('tasks.defaultStartTime')}
              </label>
              <input
                type="time"
                id="editTaskStartTime"
                name="defaultStartTime"
                className="task-management-input"
                value={taskData.defaultStartTime}
                disabled={isLoading}
                onChange={handleTaskInputChange}
              />
            </div>

            <div className="task-management-form-group">
              <label htmlFor="editTaskDuration" className="task-management-label">
                {t('tasks.defaultDuration')} ({t('tasks.minutes')})
              </label>
              <input
                type="number"
                id="editTaskDuration"
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
        </div>
      </Modal>
    </div>
  );
}; 