import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../contexts/FamilyContext';
import TasksIcon from './icons/TasksIcon';
import './TaskManagement.css';

// Task interfaces (will be moved to types later if needed)
export interface Task {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  defaultStartTime: string;
  defaultDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  familyId: string;
}

export const TaskManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for task creation
  const [taskData, setTaskData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
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
      // TODO: Implement task API call
      // const response = await taskApi.getByFamily(currentFamily.id);
      // setTasks(response.data.data);
      
      // Mock data for now
      setTasks([
        {
          id: '1',
          name: 'Clean Kitchen',
          description: 'Clean counters, dishes, and appliances',
          color: '#FF5733',
          icon: 'cleaning',
          defaultStartTime: '09:00',
          defaultDuration: 30,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          familyId: currentFamily.id,
        },
        {
          id: '2',
          name: 'Grocery Shopping',
          description: 'Weekly grocery shopping',
          color: '#33FF57',
          icon: 'shopping',
          defaultStartTime: '10:00',
          defaultDuration: 60,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          familyId: currentFamily.id,
        },
      ]);
    } catch (error) {
      console.error('Error loading tasks:', error);
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
    setMessage(null);
    setTaskErrors({});
    // Reset form data
    setTaskData({
      name: '',
      description: '',
      color: '#6366f1',
      defaultStartTime: '09:00',
      defaultDuration: 30,
    });
  };

  const handleCancelAddTask = () => {
    setAddingTask(false);
    setMessage(null);
    setTaskErrors({});
    // Reset form data
    setTaskData({
      name: '',
      description: '',
      color: '#6366f1',
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
    
    if (!validateTaskForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual API call
      // const response = await taskApi.create({
      //   ...taskData,
      //   familyId: currentFamily!.id
      // });
      
      // For now, create a mock task and add it to the list
      const newTask: Task = {
        id: Date.now().toString(), // Simple ID generation for mock
        name: taskData.name.trim(),
        description: taskData.description.trim() || null,
        color: taskData.color,
        icon: 'task', // Default icon for now
        defaultStartTime: taskData.defaultStartTime,
        defaultDuration: taskData.defaultDuration,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        familyId: currentFamily!.id,
      };

      // Add the new task to the list
      setTasks(prev => [...prev, newTask]);
      
      // Show success message
      setMessage({ type: 'success', text: t('tasks.created') });
      
      // Close the form
      handleCancelAddTask();
    } catch (error) {
      console.error('Error creating task:', error);
      setMessage({ type: 'error', text: t('tasks.createError') });
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

  if (!currentFamily) {
    return null;
  }

  const activeTasks = tasks.filter(task => task.isActive);

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
                  onClick={addingTask ? handleCancelAddTask : handleAddTask}
                  className="task-management-button task-management-button-primary task-management-button-sm"
                  disabled={isLoading}
                >
                  {addingTask ? t('common.cancel') : t('tasks.createTask')}
                </button>
              </div>
            )}
          </div>

          {/* Task Creation Form - Inline */}
          {isAdmin && addingTask && (
            <div className="task-management-task-add-inline">
              <h5 className="task-management-form-title">{t('tasks.createTask')}</h5>
              <p className="task-management-help-text">{t('tasks.createTaskHelp')}</p>
              <form className="task-management-form" onSubmit={handleCreateTask}>
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
                      defaultValue={taskData.color}
                      disabled={isLoading}
                      onChange={handleTaskInputChange}
                    />
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
                      defaultValue={taskData.defaultStartTime}
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
                    {isLoading ? t('tasks.creating') : t('tasks.createTask')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAddTask}
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
                {isAdmin && !addingTask && (
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
                <div key={task.id} className="task-management-task">
                  <div className="task-management-task-color" style={{ backgroundColor: task.color }}></div>
                  <div className="task-management-task-info">
                    <div className="task-management-task-header">
                      <h6 className="task-management-task-name">{task.name}</h6>
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
                        className="task-management-button task-management-button-secondary task-management-button-sm"
                        title={t('common.edit')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="task-management-button task-management-button-danger task-management-button-sm"
                        title={t('common.delete')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
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