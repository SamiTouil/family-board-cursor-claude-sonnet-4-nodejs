import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../contexts/FamilyContext';
import { taskApi, Task, CreateTaskData } from '../services/api';
import TasksIcon from './icons/TasksIcon';
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
    setAddingTask(true);
    setEditingTask(null);
    setMessage(null);
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

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setAddingTask(false);
    setMessage(null);
    setTaskErrors({});
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

  // Comprehensive emoji database with search keywords
  const emojiDatabase = [
    // Task & Work
    { emoji: '✅', keywords: ['check', 'done', 'task', 'complete', 'finish', 'checkmark'] },
    { emoji: '📝', keywords: ['note', 'write', 'document', 'text', 'memo', 'plan'] },
    { emoji: '💼', keywords: ['work', 'business', 'office', 'job', 'briefcase', 'professional'] },
    { emoji: '📚', keywords: ['book', 'study', 'learn', 'education', 'reading', 'library'] },
    { emoji: '📞', keywords: ['phone', 'call', 'contact', 'communication', 'telephone'] },
    { emoji: '💻', keywords: ['computer', 'laptop', 'code', 'programming', 'tech', 'work'] },
    { emoji: '📊', keywords: ['chart', 'graph', 'data', 'analytics', 'report', 'statistics'] },
    { emoji: '📅', keywords: ['calendar', 'schedule', 'date', 'appointment', 'meeting', 'plan'] },
    
    // Home & Lifestyle
    { emoji: '🏠', keywords: ['home', 'house', 'family', 'domestic', 'residence'] },
    { emoji: '🍳', keywords: ['cook', 'cooking', 'kitchen', 'food', 'meal', 'recipe'] },
    { emoji: '🧹', keywords: ['clean', 'cleaning', 'tidy', 'sweep', 'housework', 'chores'] },
    { emoji: '🛒', keywords: ['shop', 'shopping', 'grocery', 'buy', 'purchase', 'store'] },
    { emoji: '🌱', keywords: ['plant', 'garden', 'grow', 'nature', 'green', 'gardening'] },
    { emoji: '🔧', keywords: ['tool', 'fix', 'repair', 'maintenance', 'wrench', 'diy'] },
    { emoji: '🧺', keywords: ['laundry', 'basket', 'clothes', 'washing', 'household'] },
    { emoji: '🍽️', keywords: ['dinner', 'meal', 'eat', 'food', 'dining', 'plate'] },
    
    // Health & Fitness
    { emoji: '🏃‍♂️', keywords: ['run', 'running', 'exercise', 'fitness', 'sport', 'jog'] },
    { emoji: '🧘‍♀️', keywords: ['yoga', 'meditation', 'relax', 'mindfulness', 'zen', 'peace'] },
    { emoji: '💪', keywords: ['strong', 'strength', 'gym', 'workout', 'muscle', 'fitness'] },
    { emoji: '🚴‍♂️', keywords: ['bike', 'cycling', 'bicycle', 'exercise', 'ride'] },
    { emoji: '🏊‍♂️', keywords: ['swim', 'swimming', 'pool', 'water', 'exercise'] },
    { emoji: '⚽', keywords: ['football', 'soccer', 'sport', 'game', 'play'] },
    
    // Creative & Entertainment
    { emoji: '🎵', keywords: ['music', 'song', 'audio', 'listen', 'melody', 'sound'] },
    { emoji: '🎨', keywords: ['art', 'paint', 'creative', 'design', 'draw', 'artistic'] },
    { emoji: '📷', keywords: ['photo', 'camera', 'picture', 'photography', 'capture'] },
    { emoji: '🎬', keywords: ['movie', 'film', 'video', 'cinema', 'watch', 'entertainment'] },
    { emoji: '🎮', keywords: ['game', 'gaming', 'play', 'video game', 'controller'] },
    { emoji: '📖', keywords: ['read', 'reading', 'book', 'story', 'novel', 'literature'] },
    
    // Travel & Transportation
    { emoji: '🚗', keywords: ['car', 'drive', 'vehicle', 'transport', 'travel', 'road'] },
    { emoji: '✈️', keywords: ['plane', 'flight', 'travel', 'vacation', 'trip', 'fly'] },
    { emoji: '🚌', keywords: ['bus', 'public transport', 'commute', 'travel'] },
    { emoji: '🚲', keywords: ['bicycle', 'bike', 'cycle', 'pedal', 'eco'] },
    { emoji: '🗺️', keywords: ['map', 'navigation', 'direction', 'location', 'travel'] },
    
    // Goals & Motivation
    { emoji: '🎯', keywords: ['target', 'goal', 'aim', 'focus', 'objective', 'achievement'] },
    { emoji: '⭐', keywords: ['star', 'favorite', 'important', 'priority', 'special'] },
    { emoji: '🔥', keywords: ['fire', 'hot', 'urgent', 'priority', 'energy', 'passion'] },
    { emoji: '💡', keywords: ['idea', 'light', 'bulb', 'creative', 'inspiration', 'think'] },
    { emoji: '🎉', keywords: ['party', 'celebrate', 'celebration', 'fun', 'happy', 'achievement'] },
    { emoji: '❤️', keywords: ['love', 'heart', 'care', 'family', 'relationship', 'important'] },
    { emoji: '⚡', keywords: ['energy', 'power', 'fast', 'quick', 'urgent', 'electric'] },
    { emoji: '🏆', keywords: ['trophy', 'win', 'achievement', 'success', 'award', 'victory'] },
    
    // Time & Schedule
    { emoji: '⏰', keywords: ['time', 'clock', 'alarm', 'schedule', 'reminder', 'deadline'] },
    { emoji: '📆', keywords: ['date', 'calendar', 'schedule', 'appointment', 'plan'] },
    { emoji: '⏳', keywords: ['hourglass', 'time', 'deadline', 'waiting', 'patience'] },
    { emoji: '🕐', keywords: ['one', 'clock', 'time', 'hour', 'schedule'] },
    
    // Money & Finance
    { emoji: '💰', keywords: ['money', 'cash', 'finance', 'budget', 'pay', 'income'] },
    { emoji: '💳', keywords: ['card', 'credit', 'payment', 'purchase', 'money'] },
    { emoji: '📈', keywords: ['growth', 'increase', 'profit', 'success', 'improvement'] },
    { emoji: '💎', keywords: ['diamond', 'valuable', 'precious', 'luxury', 'expensive'] },
    
    // Weather & Nature
    { emoji: '☀️', keywords: ['sun', 'sunny', 'bright', 'weather', 'day', 'warm'] },
    { emoji: '🌧️', keywords: ['rain', 'weather', 'wet', 'storm', 'cloud'] },
    { emoji: '🌳', keywords: ['tree', 'nature', 'environment', 'green', 'outdoor'] },
    { emoji: '🌸', keywords: ['flower', 'spring', 'beautiful', 'nature', 'pink'] },
    
    // Food & Cooking
    { emoji: '🍎', keywords: ['apple', 'fruit', 'healthy', 'food', 'snack', 'red'] },
    { emoji: '🥗', keywords: ['salad', 'healthy', 'green', 'vegetable', 'diet'] },
    { emoji: '☕', keywords: ['coffee', 'drink', 'morning', 'caffeine', 'energy'] },
    { emoji: '🍕', keywords: ['pizza', 'food', 'dinner', 'italian', 'meal'] },
    
    // Communication
    { emoji: '💬', keywords: ['chat', 'message', 'talk', 'communication', 'conversation'] },
    { emoji: '📧', keywords: ['email', 'mail', 'message', 'communication', 'send'] },
    { emoji: '📱', keywords: ['phone', 'mobile', 'smartphone', 'device', 'communication'] },
    
    // Miscellaneous
    { emoji: '🎁', keywords: ['gift', 'present', 'surprise', 'celebration', 'birthday'] },
    { emoji: '🔑', keywords: ['key', 'access', 'unlock', 'important', 'security'] },
    { emoji: '🌟', keywords: ['star', 'sparkle', 'special', 'magic', 'outstanding'] },
    { emoji: '🚀', keywords: ['rocket', 'launch', 'fast', 'space', 'progress', 'startup'] },
    { emoji: '🎪', keywords: ['circus', 'fun', 'entertainment', 'colorful', 'event'] }
  ];

  // Icon search state
  const [iconSearch, setIconSearch] = useState('');
  const [filteredIcons, setFilteredIcons] = useState(emojiDatabase.slice(0, 24));

  // Filter icons based on search
  const handleIconSearch = (searchTerm: string) => {
    setIconSearch(searchTerm);
    
    if (!searchTerm.trim()) {
      // Show default selection when no search
      setFilteredIcons(emojiDatabase.slice(0, 24));
      return;
    }
    
    const filtered = emojiDatabase.filter(item => 
      item.keywords.some(keyword => 
        keyword.toLowerCase().includes(searchTerm.toLowerCase())
      ) || item.emoji.includes(searchTerm)
    );
    
    setFilteredIcons(filtered.slice(0, 32)); // Show more results when searching
  };

  const handleIconSelect = (icon: string) => {
    setTaskData(prev => ({ ...prev, icon }));
  };

  if (!currentFamily) {
    return null;
  }

  const activeTasks = tasks.filter(task => task.isActive);
  const isFormOpen = addingTask || editingTask;

  return (
    <div className="task-management">
      <div className="task-management-header">
        <div className="task-management-avatar">
          <div className="task-management-avatar-icon">
            <TasksIcon size={24} />
          </div>
        </div>
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
              {activeTasks.length > 0 && (
                <span className="task-management-count-badge">{activeTasks.length}</span>
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
                    <div className="task-management-icon-preview">
                      <span className="task-management-icon-preview-emoji">{taskData.icon}</span>
                      <span className="task-management-icon-preview-label">Selected</span>
                    </div>
                    
                    <div className="task-management-icon-search">
                      <input
                        type="text"
                        placeholder="Search icons... (e.g., 'work', 'home', 'fitness')"
                        value={iconSearch}
                        onChange={(e) => handleIconSearch(e.target.value)}
                        className="task-management-icon-search-input"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="task-management-icon-grid">
                      {filteredIcons.length > 0 ? (
                        filteredIcons.map((item) => (
                          <button
                            key={item.emoji}
                            type="button"
                            className={`task-management-icon-option ${taskData.icon === item.emoji ? 'selected' : ''}`}
                            onClick={() => handleIconSelect(item.emoji)}
                            title={item.keywords.join(', ')}
                            disabled={isLoading}
                          >
                            {item.emoji}
                          </button>
                        ))
                      ) : (
                        <div className="task-management-icon-no-results">
                          No icons found for "{iconSearch}"
                        </div>
                      )}
                    </div>
                    
                    {iconSearch && (
                      <div className="task-management-icon-search-info">
                        {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} found
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
            {activeTasks.length === 0 ? (
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
              activeTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`task-management-task ${isAdmin ? 'task-management-task-clickable' : ''}`}
                  style={{ 
                    borderColor: task.color,
                    backgroundColor: `${task.color}08`
                  }}
                  onClick={isAdmin ? () => handleEditTask(task) : undefined}
                  title={isAdmin ? 'Click to edit task' : undefined}
                >
                  <div className="task-management-task-info">
                    <div className="task-management-task-header">
                      <div className="task-management-task-title">
                        <span className="task-management-task-icon-emoji">{task.icon}</span>
                        <h6 className="task-management-task-name">{task.name}</h6>
                      </div>
                      <div className="task-management-task-meta">
                        <span className="task-management-task-time">{task.defaultStartTime}</span>
                        <span className="task-management-task-duration">{formatDuration(task.defaultDuration)}</span>
                      </div>
                    </div>
                    {task.description && (
                      <p className="task-management-task-description">{task.description}</p>
                    )}
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
      </div>
    </div>
  );
}; 