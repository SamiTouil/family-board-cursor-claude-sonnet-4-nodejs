import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../../contexts/FamilyContext';
import { weekTemplateApi, dayTemplateApi } from '../../../services/api';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { TaskOverrideCard } from '../../../components/ui/TaskOverrideCard';
import Modal from '../../../components/ui/Modal';
import type { WeekTemplate, DayTemplate, DayTemplateItem, CreateWeekTemplateData, UpdateWeekTemplateData, ResolvedTask, Task } from '../../../types';
import './WeekTemplateManagement.css';

export const WeekTemplateManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  
  const [weekTemplates, setWeekTemplates] = useState<WeekTemplate[]>([]);
  const [dayTemplates, setDayTemplates] = useState<DayTemplate[]>([]);
  const [dayTemplateItems, setDayTemplateItems] = useState<Record<string, DayTemplateItem[]>>({});
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Week template form state - convert to modal
  const [isAddRoutineModalOpen, setIsAddRoutineModalOpen] = useState(false);
  const [isEditRoutineModalOpen, setIsEditRoutineModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WeekTemplate | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    isDefault: false,
    applyRule: null as 'EVEN_WEEKS' | 'ODD_WEEKS' | null,
    priority: 0,
  });
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});

  // Day assignment state - convert to modal
  const [isAssignDaysModalOpen, setIsAssignDaysModalOpen] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [selectedDayTemplates, setSelectedDayTemplates] = useState<Record<number, string>>({});

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  useEffect(() => {
    if (currentFamily) {
      loadWeekTemplates();
      loadDayTemplates();
    }
  }, [currentFamily]);

  const loadWeekTemplates = async () => {
    if (!currentFamily) return;
    
    setIsLoading(true);
    try {
      const response = await weekTemplateApi.getTemplates(currentFamily.id);
      setWeekTemplates(response.data.templates || []);
    } catch (error) {
      setMessage({ type: 'error', text: t('weekTemplates.loadError') });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDayTemplates = async () => {
    if (!currentFamily) return;
    
    try {
      const response = await dayTemplateApi.getTemplates(currentFamily.id);
      setDayTemplates(response.data.templates || []);
    } catch (error) {
      // Set empty array on error to prevent UI issues
      setDayTemplates([]);
    }
  };

  const loadDayTemplateItems = async (dayTemplateId: string) => {
    if (!currentFamily || loadingItems[dayTemplateId] || dayTemplateItems[dayTemplateId]) {
      return; // Already loading or loaded
    }

    setLoadingItems(prev => ({ ...prev, [dayTemplateId]: true }));
    
    try {
      const response = await dayTemplateApi.getItems(currentFamily.id, dayTemplateId);
      setDayTemplateItems(prev => ({
        ...prev,
        [dayTemplateId]: response.data.items || []
      }));
    } catch (error) {
      // Set empty array on error
      setDayTemplateItems(prev => ({
        ...prev,
        [dayTemplateId]: []
      }));
    } finally {
      setLoadingItems(prev => ({ ...prev, [dayTemplateId]: false }));
    }
  };

  const toggleTemplateExpansion = (templateId: string) => {
    const isExpanding = !expandedTemplates[templateId];
    
    setExpandedTemplates(prev => ({
      ...prev,
      [templateId]: isExpanding
    }));

    // Load items for all day templates in this week template when expanding
    if (isExpanding) {
      const template = weekTemplates.find(t => t.id === templateId);
      if (template?.days) {
        template.days.forEach(day => {
          if (day.dayTemplate?.id) {
            loadDayTemplateItems(day.dayTemplate.id);
          }
        });
      }
    }
  };

  const validateTemplateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!templateData.name.trim()) {
      errors['name'] = t('weekTemplates.validation.nameRequired');
    } else if (templateData.name.trim().length < 2) {
      errors['name'] = t('weekTemplates.validation.nameTooShort');
    } else if (templateData.name.trim().length > 100) {
      errors['name'] = t('weekTemplates.validation.nameTooLong');
    }

    if (templateData.description.length > 500) {
      errors['description'] = t('weekTemplates.validation.descriptionTooLong');
    }

    setTemplateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTemplate = () => {
    setIsAddRoutineModalOpen(true);
    setEditingTemplate(null);
    setMessage(null);
    setTemplateErrors({});
    setTemplateData({
      name: '',
      description: '',
      isDefault: false,
      applyRule: null,
      priority: 0,
    });
  };

  const handleEditTemplate = (template: WeekTemplate) => {
    setEditingTemplate(template);
    setIsEditRoutineModalOpen(true);
    setMessage(null);
    setTemplateErrors({});
    setTemplateData({
      name: template.name,
      description: template.description || '',
      isDefault: template.isDefault,
      applyRule: template.applyRule,
      priority: template.priority,
    });
  };

  const handleCancelForm = () => {
    setIsAddRoutineModalOpen(false);
    setIsEditRoutineModalOpen(false);
    setEditingTemplate(null);
    setTemplateErrors({});
    setMessage(null);
    setTemplateData({
      name: '',
      description: '',
      isDefault: false,
      applyRule: null,
      priority: 0,
    });
  };

  const handleApplyTemplate = async () => {
    if (editingTemplate) {
      await handleUpdateTemplateModal();
    } else {
      await handleCreateTemplateModal();
    }
  };

  const handleCreateTemplateModal = async () => {
    if (!currentFamily || !validateTemplateForm()) return;

    setIsLoading(true);
    try {
      const trimmedDescription = templateData.description.trim();
      const createData: CreateWeekTemplateData = {
        name: templateData.name.trim(),
      };
      
      if (trimmedDescription) {
        createData.description = trimmedDescription;
      }

      if (templateData.isDefault) {
        createData.isDefault = templateData.isDefault;
      }

      if (templateData.applyRule) {
        createData.applyRule = templateData.applyRule;
      }

      if (templateData.priority > 0) {
        createData.priority = templateData.priority;
      }

      const response = await weekTemplateApi.createTemplate(currentFamily.id, createData);
      setWeekTemplates(prev => [...prev, response.data]);
      setMessage({ type: 'success', text: t('weeklyRoutines.createSuccess') });
      handleCancelForm();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('weeklyRoutines.createError') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTemplateModal = async () => {
    if (!currentFamily || !editingTemplate || !validateTemplateForm()) return;

    setIsLoading(true);
    try {
      const trimmedDescription = templateData.description.trim();
      const updateData: UpdateWeekTemplateData = {
        name: templateData.name.trim(),
      };
      
      if (trimmedDescription) {
        updateData.description = trimmedDescription;
      }

      updateData.isDefault = templateData.isDefault;
      updateData.applyRule = templateData.applyRule;
      updateData.priority = templateData.priority;

      const response = await weekTemplateApi.updateTemplate(currentFamily.id, editingTemplate.id, updateData);
      setWeekTemplates(prev => prev.map(t => t.id === editingTemplate.id ? response.data : t));
      setMessage({ type: 'success', text: t('weeklyRoutines.updateSuccess') });
      handleCancelForm();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('weeklyRoutines.updateError') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value,
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
    if (!currentFamily || !validateTemplateForm()) return;

    try {
      const createData: CreateWeekTemplateData = {
        name: templateData.name.trim(),
        ...(templateData.description.trim() && { description: templateData.description.trim() }),
        isDefault: templateData.isDefault,
        applyRule: templateData.applyRule,
        priority: templateData.priority,
      };

      const response = await weekTemplateApi.createTemplate(currentFamily.id, createData);
      // Backend returns the template data directly, not wrapped in success object
      setWeekTemplates(prev => [...prev, response.data]);
      setMessage({ type: 'success', text: t('weekTemplates.createSuccess') });
      handleCancelForm();
    } catch (error: any) {
      if (error.response?.status === 409) {
        setTemplateErrors({ name: t('weekTemplates.validation.nameExists') });
      } else if (error.response?.status === 401) {
        setMessage({ type: 'error', text: t('auth.sessionExpired') });
      } else {
        const errorMessage = error.response?.data?.message || error.message || t('weekTemplates.createError');
        setMessage({ type: 'error', text: errorMessage });
      }
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !editingTemplate || !validateTemplateForm()) return;

    try {
      const updateData: UpdateWeekTemplateData = {
        name: templateData.name.trim(),
        ...(templateData.description.trim() && { description: templateData.description.trim() }),
        isDefault: templateData.isDefault,
        applyRule: templateData.applyRule,
        priority: templateData.priority,
      };

      const response = await weekTemplateApi.updateTemplate(currentFamily.id, editingTemplate.id, updateData);
      // Backend returns the template data directly, not wrapped in success object
      setWeekTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id ? response.data : t
      ));
      setMessage({ type: 'success', text: t('weekTemplates.updateSuccess') });
      handleCancelForm();
    } catch (error: any) {
      if (error.response?.status === 409) {
        setTemplateErrors({ name: t('weekTemplates.validation.nameExists') });
      } else if (error.response?.status === 401) {
        setMessage({ type: 'error', text: t('auth.sessionExpired') });
      } else {
        const errorMessage = error.response?.data?.message || error.message || t('weekTemplates.updateError');
        setMessage({ type: 'error', text: errorMessage });
      }
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!currentFamily) return;
    
    const template = weekTemplates.find(t => t.id === templateId);
    if (!template) return;

    const confirmed = window.confirm(
      t('weekTemplates.deleteConfirm', { name: template.name })
    );
    if (!confirmed) return;

    try {
      await weekTemplateApi.deleteTemplate(currentFamily.id, templateId);
      setWeekTemplates(prev => prev.filter(t => t.id !== templateId));
      setMessage({ type: 'success', text: t('weekTemplates.deleteSuccess') });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('weekTemplates.deleteError') });
    }
  };

  const handleAssignDays = (templateId: string) => {
    setCurrentTemplateId(templateId);
    setIsAssignDaysModalOpen(true);
    setMessage(null);
    
    // Pre-populate with existing day assignments
    const template = weekTemplates.find(t => t.id === templateId);
    const existingAssignments: Record<number, string> = {};
    
    if (template?.days) {
      template.days.forEach(day => {
        existingAssignments[day.dayOfWeek] = day.dayTemplateId;
      });
    }
    
    setSelectedDayTemplates(existingAssignments);
  };

  const handleCancelAssignDays = () => {
    setCurrentTemplateId(null);
    setIsAssignDaysModalOpen(false);
    setSelectedDayTemplates({});
  };

  const handleDayTemplateChange = (dayOfWeek: number, dayTemplateId: string) => {
    setSelectedDayTemplates(prev => ({
      ...prev,
      [dayOfWeek]: dayTemplateId,
    }));
  };

  const handleSaveDayAssignments = async () => {
    if (!currentFamily || !currentTemplateId) return;

    try {
      // Get the current template to compare existing assignments
      const template = weekTemplates.find(t => t.id === currentTemplateId);
      const existingDays = template?.days || [];
      
      // Build a map of existing assignments
      const existingAssignments = new Map<number, string>();
      const existingDayIds = new Map<number, string>();
      existingDays.forEach(day => {
        existingAssignments.set(day.dayOfWeek, day.dayTemplateId);
        existingDayIds.set(day.dayOfWeek, day.id);
      });

      // Process each day of week
      for (const [dayOfWeekStr, newDayTemplateId] of Object.entries(selectedDayTemplates)) {
        const dayOfWeek = parseInt(dayOfWeekStr);
        const existingDayTemplateId = existingAssignments.get(dayOfWeek);
        const existingDayId = existingDayIds.get(dayOfWeek);

        if (newDayTemplateId) {
          // User selected a day template for this day
          if (existingDayTemplateId) {
            // Day already has an assignment - update it if different
            if (existingDayTemplateId !== newDayTemplateId) {
              await weekTemplateApi.updateTemplateDay(currentFamily.id, currentTemplateId, existingDayId!, {
                dayTemplateId: newDayTemplateId,
              });
            }
            // If same template, no action needed
          } else {
            // Day doesn't have an assignment - create new one
            await weekTemplateApi.addTemplateDay(currentFamily.id, currentTemplateId, {
              dayOfWeek,
              dayTemplateId: newDayTemplateId,
            });
          }
        } else {
          // User cleared the selection for this day
          if (existingDayTemplateId && existingDayId) {
            // Remove existing assignment
            await weekTemplateApi.removeTemplateDay(currentFamily.id, currentTemplateId, existingDayId);
          }
          // If no existing assignment, no action needed
        }
      }

      // Handle days that were not in selectedDayTemplates but exist in the template
      // (This handles the case where a day had an assignment but user didn't touch it in the dialog)
      for (const existingDay of existingDays) {
        if (!Object.prototype.hasOwnProperty.call(selectedDayTemplates, existingDay.dayOfWeek)) {
          // This day exists in template but wasn't in the dialog selection - remove it
          await weekTemplateApi.removeTemplateDay(currentFamily.id, currentTemplateId, existingDay.id);
        }
      }
      
      setMessage({ type: 'success', text: t('weeklyRoutines.daysAssignedSuccess') });
      handleCancelAssignDays();
      loadWeekTemplates(); // Reload to show updated assignments
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('weeklyRoutines.daysAssignError') });
    }
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    if (!currentFamily) return;
    
    const template = weekTemplates.find(t => t.id === templateId);
    if (!template) return;

    const newName = prompt(t('weeklyRoutines.duplicatePrompt'), `${template.name} (Copy)`);
    if (!newName || !newName.trim()) return;

    try {
      const response = await weekTemplateApi.duplicateTemplate(currentFamily.id, templateId, {
        name: newName.trim(),
      });
      // Backend returns the template data directly, not wrapped in success object
      setWeekTemplates(prev => [...prev, response.data]);
      setMessage({ type: 'success', text: t('weeklyRoutines.duplicateSuccess') });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('weeklyRoutines.duplicateError') });
    }
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = days[dayOfWeek];
    return dayKey ? t(`weeklyRoutines.days.${dayKey}` as any) : `Day ${dayOfWeek}`;
  };



  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
  };

  const getEffectiveTime = (item: DayTemplateItem): string => {
    return item.overrideTime || item.task?.defaultStartTime || '00:00';
  };



  const sortTemplateItemsByTime = (items: DayTemplateItem[]): DayTemplateItem[] => {
    return [...items].sort((a, b) => {
      const timeA = getEffectiveTime(a);
      const timeB = getEffectiveTime(b);
      return timeA.localeCompare(timeB);
    });
  };

  const convertToResolvedTask = (item: DayTemplateItem): ResolvedTask => {
    // Create a complete Task object from the partial task data
    const task: Task = {
      id: item.task?.id || '',
      name: item.task?.name || '',
      description: item.task?.description || null,
      color: item.task?.color || '#6366f1',
      icon: item.task?.icon || '📝',
      defaultStartTime: item.task?.defaultStartTime || '09:00',
      defaultDuration: item.task?.defaultDuration || 30,
      familyId: item.task?.familyId || '',
      isActive: true, // Assume active for template items
      createdAt: new Date().toISOString(), // Default values for missing fields
      updatedAt: new Date().toISOString()
    };

    return {
      taskId: item.task?.id || '',
      memberId: item.member?.id || null,
      task: task,
      member: item.member || null,
      source: 'template' as const,
      overrideTime: item.overrideTime,
      overrideDuration: item.overrideDuration
    };
  };

  return (
    <div className="week-template-management">
      <div className="week-template-management-header">
        <h2 className="week-template-management-title">{t('weeklyRoutines.title')}</h2>
      </div>
      
      <div className="week-template-management-content">
        {/* Messages */}
        {message && (
          <div className={`week-template-management-message week-template-management-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Week Templates Section */}
        <div className="week-template-management-subsection">
          <div className="week-template-management-subsection-header">
            <h3 className="week-template-management-subsection-title">
              {t('weeklyRoutines.routines.title')}
              <span className="week-template-management-count-badge">
                {weekTemplates.length}
              </span>
            </h3>
            {isAdmin && (
              <div className="week-template-management-button-group">
                <button
                  onClick={handleAddTemplate}
                  className="week-template-management-button week-template-management-button-primary"
                  disabled={isLoading}
                >
                  + {t('weeklyRoutines.routines.add')}
                </button>
              </div>
            )}
          </div>



          {/* Templates List */}
          {isLoading ? (
            <div className="week-template-management-loading">
              {t('common.loading')}...
            </div>
          ) : weekTemplates.length === 0 ? (
            <div className="week-template-management-empty-state">
              <div className="week-template-management-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 2v4"/>
                  <path d="M16 2v4"/>
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M3 10h18"/>
                  <path d="M8 14h.01"/>
                  <path d="M12 14h.01"/>
                  <path d="M16 14h.01"/>
                  <path d="M8 18h.01"/>
                  <path d="M12 18h.01"/>
                  <path d="M16 18h.01"/>
                </svg>
              </div>
              <h5 className="week-template-management-empty-title">No Week Templates Yet</h5>
              <p className="week-template-management-empty-description">Create reusable week templates to quickly schedule recurring weekly patterns</p>
              {isAdmin && (
                <button
                  onClick={handleAddTemplate}
                  className="week-template-management-button week-template-management-button-primary"
                >
                  Create First Template
                </button>
              )}
            </div>
          ) : (
            <div className="week-template-management-templates-list">
              {weekTemplates.map(template => (
                <div key={template.id} className="week-template-management-template">
                  <div className="week-template-management-template-header">
                    <div className="week-template-management-template-info">
                      <h4 className="week-template-management-template-name">
                        {template.name}
                      </h4>
                      {template.description && (
                        <p className="week-template-management-template-description">
                          {template.description}
                        </p>
                      )}
                      <div className="week-template-management-template-meta">
                        <span className="week-template-management-template-days-count">
                          {template.days?.length || 0} {t('weeklyRoutines.daysAssigned')}
                        </span>
                        {template.isDefault && (
                          <span className="week-template-management-template-badge default">
                            Default
                          </span>
                        )}
                        {template.applyRule && (
                          <span className="week-template-management-template-badge rule">
                            {template.applyRule === 'EVEN_WEEKS' ? 'Even Weeks' : 'Odd Weeks'}
                          </span>
                        )}
                        {template.priority > 0 && (
                          <span className="week-template-management-template-badge priority">
                            Priority: {template.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="week-template-management-template-actions">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleAssignDays(template.id)}
                            className="week-template-management-template-action"
                            title={t('weeklyRoutines.actions.assignDays')}
                          >
                            📋
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template.id)}
                            className="week-template-management-template-action"
                            title={t('weeklyRoutines.actions.duplicate')}
                          >
                            📄
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="week-template-management-template-action"
                            title={t('weeklyRoutines.actions.edit')}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="week-template-management-template-action delete"
                            title={t('weeklyRoutines.actions.delete')}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Show assigned days */}
                  {template.days && template.days.length > 0 && (
                    <div className="week-template-management-template-days">
                      <div className="week-template-management-days-header">
                        <h5>{t('weeklyRoutines.assignedDays')}:</h5>
                        <button
                          onClick={() => toggleTemplateExpansion(template.id)}
                          className="week-template-management-expand-button"
                          title={expandedTemplates[template.id] ? 'Collapse details' : 'Expand details'}
                        >
                          {expandedTemplates[template.id] ? '▼' : '▶'}
                        </button>
                      </div>
                      
                      <div className="week-template-management-days-grid">
                        {template.days
                          .sort((a, b) => a.dayOfWeek - b.dayOfWeek) // Sort by day of week
                          .map(day => (
                          <div key={day.id} className="week-template-management-day-assignment">
                            <div className="week-template-management-day-header">
                              <span className="week-template-management-day-name">
                                {getDayName(day.dayOfWeek)}
                              </span>
                              <span className="week-template-management-day-template">
                                {day.dayTemplate?.name || t('weeklyRoutines.unknownRoutine')}
                              </span>
                            </div>
                            
                            {/* Show day template content when expanded */}
                            {expandedTemplates[template.id] && day.dayTemplate?.id && (
                              <div className="week-template-management-day-content">
                                {loadingItems[day.dayTemplate.id] ? (
                                  <div className="week-template-management-day-loading">
                                    {t('dailyRoutines.loadingTasks')}
                                  </div>
                                ) : dayTemplateItems[day.dayTemplate.id] ? (
                                  <div className="week-template-management-day-tasks">
                                    {dayTemplateItems[day.dayTemplate.id]!.length === 0 ? (
                                      <div className="week-template-management-day-empty">
                                        {t('dailyRoutines.noTasks')}
                                      </div>
                                    ) : (
                                      sortTemplateItemsByTime(dayTemplateItems[day.dayTemplate.id]!).map((item, index) => (
                                        <TaskOverrideCard
                                          key={item.id}
                                          task={convertToResolvedTask(item)}
                                          taskIndex={index}
                                          isAdmin={isAdmin}
                                          formatTime={(time) => time}
                                          formatDuration={formatDuration}
                                          showDescription={false}
                                          compact={true}
                                        />
                                      ))
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>


      </div>

      {/* Add/Edit Routine Modal */}
      <Modal
        title={editingTemplate ? t('weeklyRoutines.routines.edit') : t('weeklyRoutines.routines.add')}
        isOpen={isAddRoutineModalOpen || isEditRoutineModalOpen}
        onClose={handleCancelForm}
        onApply={handleApplyTemplate}
      >
        <div className="modal-form">
          <div className="modal-form-group">
            <label htmlFor="templateName" className="modal-form-label">
              {t('weeklyRoutines.fields.name')} *
            </label>
            <input
              type="text"
              id="templateName"
              name="name"
              className="modal-form-input"
              placeholder={t('weeklyRoutines.placeholders.name')}
              disabled={isLoading}
              autoFocus
              value={templateData.name}
              onChange={handleTemplateInputChange}
              maxLength={100}
            />
            {templateErrors['name'] && (
              <p className="modal-form-error">{templateErrors['name']}</p>
            )}
          </div>

          <div className="modal-form-group">
            <label htmlFor="templateDescription" className="modal-form-label">
              {t('weeklyRoutines.fields.description')}
            </label>
            <textarea
              id="templateDescription"
              name="description"
              className="modal-form-input"
              placeholder={t('weeklyRoutines.placeholders.description')}
              rows={3}
              disabled={isLoading}
              value={templateData.description}
              onChange={handleTemplateInputChange}
              maxLength={500}
            />
            {templateErrors['description'] && (
              <p className="modal-form-error">{templateErrors['description']}</p>
            )}
          </div>

          <div className="modal-form-group">
            <label className="modal-form-label">
              <input
                type="checkbox"
                name="isDefault"
                checked={templateData.isDefault}
                onChange={(e) => setTemplateData(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="modal-form-checkbox"
                style={{ marginRight: '8px' }}
              />
              Default Template
            </label>
            <p className="modal-form-help-text">
              If checked, this template will be used when no other rules apply
            </p>
          </div>

          <div className="modal-form-group">
            <label htmlFor="templateApplyRule" className="modal-form-label">
              Application Rule
            </label>
            <CustomSelect
              id="templateApplyRule"
              value={templateData.applyRule || ''}
              onChange={(value) => setTemplateData(prev => ({ ...prev, applyRule: value as 'EVEN_WEEKS' | 'ODD_WEEKS' | null || null }))}
              options={[
                { value: '', label: 'No specific rule' },
                { value: 'EVEN_WEEKS', label: 'Even weeks only' },
                { value: 'ODD_WEEKS', label: 'Odd weeks only' }
              ]}
              placeholder="No specific rule"
              disabled={isLoading}
            />
            <p className="modal-form-help-text">
              Choose when this template should automatically apply
            </p>
          </div>

          <div className="modal-form-group">
            <label htmlFor="templatePriority" className="modal-form-label">
              Priority
            </label>
            <input
              type="number"
              id="templatePriority"
              name="priority"
              className="modal-form-input"
              value={templateData.priority}
              onChange={(e) => setTemplateData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
              min="0"
              max="1000"
              placeholder="0"
              disabled={isLoading}
            />
            <p className="modal-form-help-text">
              Higher priority templates are chosen when multiple rules match (0-1000)
            </p>
          </div>
        </div>
      </Modal>

      {/* Assign Daily Routines Modal */}
      <Modal
        title={t('weeklyRoutines.assignDays.title')}
        isOpen={isAssignDaysModalOpen}
        onClose={handleCancelAssignDays}
        onApply={handleSaveDayAssignments}
      >
        <div className="modal-form">
          <p>{t('weeklyRoutines.assignDays.description')}</p>
          <div className="modal-form-days-assignment">
            {[1, 2, 3, 4, 5, 6, 0].map(dayOfWeek => ( // Monday to Sunday
              <div key={dayOfWeek} className="modal-form-day-row">
                <label className="modal-form-label">
                  {getDayName(dayOfWeek)}
                </label>
                <CustomSelect
                  value={selectedDayTemplates[dayOfWeek] || ''}
                  onChange={(value) => handleDayTemplateChange(dayOfWeek, String(value))}
                  options={[
                    { value: '', label: t('weeklyRoutines.assignDays.selectRoutine') },
                    ...dayTemplates.map(template => ({
                      value: template.id,
                      label: template.name
                    }))
                  ]}
                  placeholder={t('weeklyRoutines.assignDays.selectRoutine')}
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}; 