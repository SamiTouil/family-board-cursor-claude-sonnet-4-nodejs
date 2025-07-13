import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../../contexts/FamilyContext';
import { taskApi, familyApi, dayTemplateApi } from '../../../services/api';
import type { Task, DayTemplate, DayTemplateItem, CreateDayTemplateData, FamilyMember } from '../../../types';
import { TaskOverrideCard } from '../../../components/ui/TaskOverrideCard';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import Modal from '../../../components/ui/Modal';
import { useMessage } from '../../../hooks';
import './DayTemplateManagement.css';

export const DayTemplateManagement = forwardRef((_, ref) => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useMessage();

  // DayTemplate state
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [templateItems, setTemplateItems] = useState<Record<string, DayTemplateItem[]>>({});
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Template form state - convert to modal
  const [isAddRoutineModalOpen, setIsAddRoutineModalOpen] = useState(false);
  const [isEditRoutineModalOpen, setIsEditRoutineModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DayTemplate | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
  });
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});

  // Template item form state - convert to modal
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTemplateItem, setEditingTemplateItem] = useState<{ templateId: string; item: any } | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [templateItemData, setTemplateItemData] = useState({
    taskId: '',
    memberId: '',
    overrideTime: '',
    overrideDuration: ''
  });
  const [templateItemErrors, setTemplateItemErrors] = useState<Record<string, string>>({});

  // Check if user is admin (can create/manage templates)
  const isAdmin = currentFamily?.userRole === 'ADMIN';

  // Expose handleAddTemplate method to parent component
  useImperativeHandle(ref, () => ({
    handleAddTemplate
  }));

  useEffect(() => {
    if (currentFamily) {
      loadTasks();
      loadTemplates();
      loadFamilyMembers();
    }
  }, [currentFamily]);

  const loadTasks = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await taskApi.getFamilyTasks(currentFamily.id, { isActive: true });
      setTasks(response.data.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load tasks' });
    }
  };

  const loadTemplates = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await dayTemplateApi.getTemplates(currentFamily.id);
      setTemplates(response.data.templates);
    } catch (error) {
      // Set empty array on error to prevent UI issues
      setTemplates([]);
    }
  };

  const loadFamilyMembers = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await familyApi.getMembers(currentFamily.id);
      setFamilyMembers(response.data.data);
    } catch (error) {
      // Error loading family members
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
  };

  const getEffectiveTime = (item: any): string => {
    return item.overrideTime || item.task?.defaultStartTime || '00:00';
  };

  const sortTemplateItemsByTime = (items: any[]): any[] => {
    return [...items].sort((a, b) => {
      const timeA = getEffectiveTime(a);
      const timeB = getEffectiveTime(b);
      return timeA.localeCompare(timeB);
    });
  };

  const validateTemplateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!templateData.name.trim()) {
      errors['name'] = 'Template name is required';
    } else if (templateData.name.trim().length < 2) {
      errors['name'] = 'Template name must be at least 2 characters';
    } else if (templateData.name.trim().length > 100) {
      errors['name'] = 'Template name must be less than 100 characters';
    }

    if (templateData.description.length > 500) {
      errors['description'] = 'Description must be less than 500 characters';
    }

    setTemplateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTemplate = () => {
    setIsAddRoutineModalOpen(true);
    setEditingTemplate(null);
    setMessage(null);
    setTemplateErrors({});
    // Reset form data
    setTemplateData({
      name: '',
      description: '',
    });
  };

  const handleEditTemplate = (template: DayTemplate) => {
    setIsEditRoutineModalOpen(true);
    setEditingTemplate(template);
    setMessage(null);
    setTemplateErrors({});
    // Pre-fill form with template data
    setTemplateData({
      name: template.name,
      description: template.description || '',
    });
  };

  const handleCancelTemplateForm = (preserveMessage?: boolean) => {
    setIsAddRoutineModalOpen(false);
    setIsEditRoutineModalOpen(false);
    setEditingTemplate(null);
    
    if (!preserveMessage) {
      setMessage(null);
    }
    setTemplateErrors({});
    // Reset form data
    setTemplateData({
      name: '',
      description: '',
    });
  };

  const handleApplyTemplate = async () => {
    if (editingTemplate) {
      await handleUpdateTemplate();
    } else {
      await handleCreateTemplate();
    }
  };

  const handleUpdateTemplate = async () => {
    if (!validateTemplateForm() || !currentFamily || !editingTemplate) {
      return;
    }

    setIsLoading(true);
    try {
      const trimmedDescription = templateData.description.trim();
      const updateData: any = {
        name: templateData.name.trim(),
      };
      
      // Only add description if it's not empty
      if (trimmedDescription) {
        updateData.description = trimmedDescription;
      }

      const response = await dayTemplateApi.updateTemplate(currentFamily.id, editingTemplate.id, updateData);

      // Update the template in the list
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id ? response.data : t
      ));
      
      // Show success message
      setMessage({ type: 'success', text: 'Template updated successfully' });
      
      // Close the modal but preserve the success message
      handleCancelTemplateForm(true);
    } catch (error: any) {
      let errorMessage = 'Failed to update template';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!validateTemplateForm() || !currentFamily) {
      return;
    }

    setIsLoading(true);
    try {
      const trimmedDescription = templateData.description.trim();
      const createData: CreateDayTemplateData = {
        name: templateData.name.trim(),
      };
      
      // Only add description if it's not empty
      if (trimmedDescription) {
        createData.description = trimmedDescription;
      }

      const response = await dayTemplateApi.createTemplate(currentFamily.id, createData);

      // Add the new template to the list
      setTemplates(prev => [...prev, response.data]);
      
      // Show success message
      setMessage({ type: 'success', text: 'Template created successfully' });
      
      // Close the modal but preserve the success message
      handleCancelTemplateForm(true);
    } catch (error: any) {
      let errorMessage = 'Failed to create template';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (templateErrors[name]) {
      setTemplateErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await dayTemplateApi.deleteTemplate(currentFamily!.id, templateId);
      
      // Remove the template from the list
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      
      // Remove template items from cache
      setTemplateItems(prev => {
        const newItems = { ...prev };
        delete newItems[templateId];
        return newItems;
      });
      
      setMessage({ type: 'success', text: 'Template deleted successfully' });
    } catch (error: any) {
      let errorMessage = 'Failed to delete template';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplateItems = async (templateId: string) => {
    if (templateItems[templateId]) {
      return; // Already loaded
    }

    if (!currentFamily) return;

    try {
      const response = await dayTemplateApi.getItems(currentFamily!.id, templateId);
      setTemplateItems(prev => ({
        ...prev,
        [templateId]: response.data.items
      }));
    } catch (error) {
      // Set empty array on error
      setTemplateItems(prev => ({
        ...prev,
        [templateId]: []
      }));
    }
  };

  const handleDeleteTemplateItem = async (templateId: string, itemId: string) => {
    if (!window.confirm('Are you sure you want to remove this task from the template?')) {
      return;
    }

    if (!currentFamily) return;

    setIsLoading(true);
    try {
      await dayTemplateApi.removeItem(currentFamily!.id, templateId, itemId);
      
      // Remove the item from the cache
      setTemplateItems(prev => ({
        ...prev,
        [templateId]: (prev[templateId] || []).filter(item => item.id !== itemId)
      }));
      
      setMessage({ type: 'success', text: 'Task removed from template successfully' });
    } catch (error: any) {
      let errorMessage = 'Failed to remove task from template';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTemplateItem = (templateId: string) => {
    setCurrentTemplateId(templateId);
    setIsAddTaskModalOpen(true);
    setMessage(null);
    setTemplateItemErrors({});
    // Reset form data
    setTemplateItemData({
      taskId: '',
      memberId: '',
      overrideTime: '',
      overrideDuration: ''
    });
  };

  const handleEditTemplateItem = (templateId: string, item: any) => {
    setEditingTemplateItem({ templateId, item });
    setIsEditTaskModalOpen(true);
    setMessage(null);
    setTemplateItemErrors({});
    // Pre-fill form with item data
    setTemplateItemData({
      taskId: item.taskId,
      memberId: item.memberId || '',
      overrideTime: item.overrideTime || '',
      overrideDuration: item.overrideDuration ? String(item.overrideDuration) : ''
    });
  };

  const handleCancelTemplateItemForm = () => {
    setIsAddTaskModalOpen(false);
    setIsEditTaskModalOpen(false);
    setEditingTemplateItem(null);
    setCurrentTemplateId(null);
    setTemplateItemErrors({});
    // Reset form data
    setTemplateItemData({
      taskId: '',
      memberId: '',
      overrideTime: '',
      overrideDuration: ''
    });
  };

  const handleTemplateItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTemplateItemData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing/selecting
    if (templateItemErrors[name]) {
      setTemplateItemErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateTemplateItemForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!templateItemData.taskId) {
      errors['taskId'] = 'Please select a task';
    }

    // Validate override time format if provided
    if (templateItemData.overrideTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(templateItemData.overrideTime)) {
      errors['overrideTime'] = 'Time must be in HH:MM format (e.g., 09:30)';
    }

    // Validate override duration if provided
    if (templateItemData.overrideDuration) {
      const duration = parseInt(templateItemData.overrideDuration);
      if (isNaN(duration) || duration < 1 || duration > 1440) {
        errors['overrideDuration'] = 'Duration must be between 1 and 1440 minutes';
      }
    }

    setTemplateItemErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplyTemplateItem = async () => {
    if (editingTemplateItem) {
      await handleUpdateTemplateItem();
    } else {
      await handleCreateTemplateItem();
    }
  };

  const handleCreateTemplateItem = async () => {
    if (!validateTemplateItemForm() || !currentTemplateId || !currentFamily) {
      return;
    }

    setIsLoading(true);
    try {
      const createData: any = {
        taskId: templateItemData.taskId,
      };

      // Only add memberId if it's not empty (empty means unassigned)
      if (templateItemData.memberId) {
        createData.memberId = templateItemData.memberId;
      }

      // Only add overrides if they're provided
      if (templateItemData.overrideTime) {
        createData.overrideTime = templateItemData.overrideTime;
      }

      if (templateItemData.overrideDuration) {
        createData.overrideDuration = parseInt(templateItemData.overrideDuration);
      }

      const response = await dayTemplateApi.addItem(currentFamily.id, currentTemplateId, createData);
      
      // Add the new item to the cache
      setTemplateItems(prev => ({
        ...prev,
        [currentTemplateId]: [...(prev[currentTemplateId] || []), response.data]
      }));
      
      // Show success message
      setMessage({ type: 'success', text: 'Task added to template successfully' });
      
      // Close the modal
      handleCancelTemplateItemForm();
    } catch (error: any) {
      let errorMessage = 'Failed to add task to template';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTemplateItem = async () => {
    if (!validateTemplateItemForm() || !editingTemplateItem || !currentFamily) {
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {};

      // Only add memberId if it's different from current (empty means unassigned)
      if (templateItemData.memberId !== (editingTemplateItem.item.memberId || '')) {
        updateData.memberId = templateItemData.memberId || null;
      }

      // Only add overrides if they're different from current
      if (templateItemData.overrideTime !== (editingTemplateItem.item.overrideTime || '')) {
        updateData.overrideTime = templateItemData.overrideTime || null;
      }

      const newDuration = templateItemData.overrideDuration ? parseInt(templateItemData.overrideDuration) : null;
      if (newDuration !== editingTemplateItem.item.overrideDuration) {
        updateData.overrideDuration = newDuration;
      }

      // Only make API call if there are changes
      if (Object.keys(updateData).length === 0) {
        setMessage({ type: 'success', text: 'No changes to save' });
        handleCancelTemplateItemForm();
        return;
      }

      const response = await dayTemplateApi.updateItem(
        currentFamily.id, 
        editingTemplateItem.templateId, 
        editingTemplateItem.item.id, 
        updateData
      );
      
      // Update the item in the cache
      setTemplateItems(prev => ({
        ...prev,
        [editingTemplateItem.templateId]: (prev[editingTemplateItem.templateId] || []).map(item => 
          item.id === editingTemplateItem.item.id ? response.data : item
        )
      }));
      
      // Show success message
      setMessage({ type: 'success', text: 'Task assignment updated successfully' });
      
      // Close the modal
      handleCancelTemplateItemForm();
    } catch (error: any) {
      let errorMessage = 'Failed to update task assignment';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Load template items when templates are loaded
  useEffect(() => {
    templates.forEach(template => {
      loadTemplateItems(template.id);
    });
  }, [templates]);

  if (!currentFamily) {
    return null;
  }

  return (
    <div className="day-template-management">
      <div className="day-template-management-header">
        <h2 className="day-template-management-title">{t('dailyRoutines.title')}</h2>
      </div>
      
      <div className="day-template-management-content">
        {/* Success/Error Messages */}
        {message && (
          <div className={`day-template-management-message day-template-management-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* DayTemplate Section */}
        <div className="day-template-management-subsection">
          <div className="day-template-management-subsection-header">
            <h3 className="day-template-management-subsection-title">
              {t('dailyRoutines.routines.title')}
              <span className="day-template-management-count-badge">
                {templates.length}
              </span>
            </h3>
          </div>

          {/* Templates List */}
          <div className="day-template-management-templates-list">
            {templates.length === 0 ? (
              <div className="day-template-management-empty-state">
                <div className="day-template-management-empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="2"/>
                    <path d="M12 12v4"/>
                    <path d="M10 14h4"/>
                  </svg>
                </div>
                <h5 className="day-template-management-empty-title">No Templates Yet</h5>
                <p className="day-template-management-empty-description">Create reusable templates to quickly schedule recurring task patterns</p>
                {isAdmin && (
                  <button
                    onClick={handleAddTemplate}
                    className="day-template-management-button day-template-management-button-primary"
                  >
                    Create First Template
                  </button>
                )}
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="day-template-management-template">
                  <div className="day-template-management-template-header">
                    <div className="day-template-management-template-info">
                      <h6 className="day-template-management-template-name">{template.name}</h6>
                      {template.description && (
                        <p className="day-template-management-template-description">{template.description}</p>
                      )}
                      {isAdmin && (
                        <div className="day-template-management-template-actions">
                          <button
                            className="day-template-management-button day-template-management-button-primary day-template-management-button-sm"
                            onClick={() => handleAddTemplateItem(template.id)}
                            disabled={isLoading}
                          >
                            {t('dailyRoutines.addTask')}
                          </button>
                          <button
                            className="day-template-management-button day-template-management-button-sm day-template-management-button-secondary"
                            onClick={() => handleEditTemplate(template)}
                            disabled={isLoading}
                          >
                            {t('dailyRoutines.actions.edit')}
                          </button>
                          <button
                            className="day-template-management-template-action delete"
                            title={t('dailyRoutines.actions.delete')}
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={isLoading}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Template Items */}
                  <div className="day-template-management-template-items">
                    {templateItems[template.id]?.length === 0 ? (
                      <div className="day-template-management-template-empty">
                        <p>No tasks in this template yet</p>
                        {isAdmin && (
                          <p className="day-template-management-help-text">
                            Add tasks to this template to create reusable scheduling patterns
                          </p>
                        )}
                      </div>
                    ) : templateItems[template.id] ? (
                      <div className="day-template-management-template-items-grid">
                        {sortTemplateItemsByTime(templateItems[template.id]?.filter(item => item.task) || []).map((item) => {
                          const taskOverrideProps: any = {
                            key: item.id,
                            task: {
                              taskId: item.taskId,
                              memberId: item.memberId,
                              overrideTime: item.overrideTime,
                              overrideDuration: item.overrideDuration,
                              source: 'template' as const,
                              member: item.member || null,
                              task: item.task!,
                            },
                            taskIndex: 0,
                            isAdmin: isAdmin,
                            formatTime: (time: string) => time,
                            formatDuration: formatDuration,
                            showDescription: true
                          };

                          if (isAdmin) {
                            taskOverrideProps.onEdit = (_task: any) => handleEditTemplateItem(template.id, item);
                            taskOverrideProps.onRemove = (_task: any) => handleDeleteTemplateItem(template.id, item.id);
                          }

                          return <TaskOverrideCard {...taskOverrideProps} />;
                        })}
                      </div>
                    ) : (
                      <div className="day-template-management-template-empty">
                        <p>{t('dailyRoutines.loadingTasks')}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Routine Modal */}
      <Modal
        title={editingTemplate ? t('dailyRoutines.routines.edit') : t('dailyRoutines.routines.add')}
        isOpen={isAddRoutineModalOpen || isEditRoutineModalOpen}
        onClose={handleCancelTemplateForm}
        onApply={handleApplyTemplate}
      >
        <div className="modal-form">
          <div className="modal-form-group">
            <label htmlFor="templateName" className="modal-form-label">
              {t('dailyRoutines.fields.name')}
            </label>
            <input
              type="text"
              id="templateName"
              name="name"
              className="modal-form-input"
              placeholder={t('dailyRoutines.placeholders.name')}
              disabled={isLoading}
              autoFocus
              value={templateData.name}
              onChange={handleTemplateInputChange}
            />
            {templateErrors['name'] && (
              <p className="modal-form-error">{templateErrors['name']}</p>
            )}
          </div>

          <div className="modal-form-group">
            <label htmlFor="templateDescription" className="modal-form-label">
              {t('dailyRoutines.fields.description')}
            </label>
            <textarea
              id="templateDescription"
              name="description"
              className="modal-form-input"
              placeholder={t('dailyRoutines.placeholders.description')}
              rows={3}
              disabled={isLoading}
              value={templateData.description}
              onChange={handleTemplateInputChange}
            />
            {templateErrors['description'] && (
              <p className="modal-form-error">{templateErrors['description']}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Add/Edit Task Modal */}
      <Modal
        title={editingTemplateItem ? 'Edit Task Assignment' : t('dailyRoutines.addTask')}
        isOpen={isAddTaskModalOpen || isEditTaskModalOpen}
        onClose={handleCancelTemplateItemForm}
        onApply={handleApplyTemplateItem}
      >
        <div className="modal-form">
          <div className="modal-form-group">
            <label htmlFor="templateItemTask" className="modal-form-label">
              Task *
            </label>
            {editingTemplateItem ? (
              <div className="modal-form-input-readonly">
                {editingTemplateItem.item.task?.icon} {editingTemplateItem.item.task?.name} 
                ({editingTemplateItem.item.task?.defaultStartTime}, {formatDuration(editingTemplateItem.item.task?.defaultDuration || 0)})
              </div>
            ) : (
              <CustomSelect
                id="templateItemTask"
                value={templateItemData.taskId}
                onChange={(value) => setTemplateItemData(prev => ({ ...prev, taskId: String(value) }))}
                options={[
                  { value: '', label: 'Select a task...' },
                  ...tasks
                    .filter(task => task.isActive)
                    .sort((a, b) => a.defaultStartTime.localeCompare(b.defaultStartTime))
                    .map(task => ({
                      value: task.id,
                      label: `${task.icon} ${task.name} (${task.defaultStartTime}, ${formatDuration(task.defaultDuration)})`
                    }))
                ]}
                disabled={isLoading}
                placeholder="Select a task..."
              />
            )}
            {templateItemErrors['taskId'] && (
              <p className="modal-form-error">{templateItemErrors['taskId']}</p>
            )}
          </div>

          <div className="modal-form-group">
            <label htmlFor="templateItemMember" className="modal-form-label">
              Assign to Member (Optional)
            </label>
            <CustomSelect
              id="templateItemMember"
              value={templateItemData.memberId}
              onChange={(value) => setTemplateItemData(prev => ({ ...prev, memberId: String(value) }))}
              options={[
                { value: '', label: 'Unassigned (any member can do this)' },
                ...familyMembers.map(member => ({
                  value: member.user?.id || '',
                  label: `${member.user?.firstName} ${member.user?.lastName}`
                }))
              ]}
              disabled={isLoading}
              placeholder="Unassigned (any member can do this)"
            />
          </div>

          <div className="modal-form-row">
            <div className="modal-form-group">
              <label htmlFor="templateItemTime" className="modal-form-label">
                Override Time (Optional)
              </label>
              <input
                type="time"
                id="templateItemTime"
                name="overrideTime"
                className="modal-form-input"
                value={templateItemData.overrideTime}
                onChange={handleTemplateItemInputChange}
                disabled={isLoading}
                placeholder="HH:MM"
              />
              {templateItemErrors['overrideTime'] && (
                <p className="modal-form-error">{templateItemErrors['overrideTime']}</p>
              )}
            </div>

            <div className="modal-form-group">
              <label htmlFor="templateItemDuration" className="modal-form-label">
                Override Duration (Optional)
              </label>
              <input
                type="number"
                id="templateItemDuration"
                name="overrideDuration"
                className="modal-form-input"
                value={templateItemData.overrideDuration}
                onChange={handleTemplateItemInputChange}
                disabled={isLoading}
                placeholder="Minutes"
                min="1"
                max="1440"
              />
              {templateItemErrors['overrideDuration'] && (
                <p className="modal-form-error">{templateItemErrors['overrideDuration']}</p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
});

DayTemplateManagement.displayName = 'DayTemplateManagement';