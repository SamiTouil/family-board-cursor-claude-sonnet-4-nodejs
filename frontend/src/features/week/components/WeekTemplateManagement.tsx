import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../../contexts/FamilyContext';
import { weekTemplateApi, dayTemplateApi } from '../../../services/api';
import type { WeekTemplate, DayTemplate, DayTemplateItem, CreateWeekTemplateData, UpdateWeekTemplateData } from '../../../types';
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

  // Week template form state
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WeekTemplate | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
  });
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});

  // Day assignment state
  const [assigningDays, setAssigningDays] = useState<string | null>(null); // templateId when assigning days
  const [selectedDayTemplates, setSelectedDayTemplates] = useState<Record<number, string>>({});

  // Week application state
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
  const [applyData, setApplyData] = useState({
    startDate: '',
    overrideMemberAssignments: false,
  });

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
    setAddingTemplate(true);
    setEditingTemplate(null);
    setMessage(null);
    setTemplateErrors({});
    setTemplateData({
      name: '',
      description: '',
    });
  };

  const handleEditTemplate = (template: WeekTemplate) => {
    setEditingTemplate(template);
    setAddingTemplate(false);
    setMessage(null);
    setTemplateErrors({});
    setTemplateData({
      name: template.name,
      description: template.description || '',
    });
  };

  const handleCancelForm = () => {
    setAddingTemplate(false);
    setEditingTemplate(null);
    setTemplateErrors({});
    setMessage(null);
    setTemplateData({
      name: '',
      description: '',
    });
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
      };

      const response = await weekTemplateApi.createTemplate(currentFamily.id, createData);
      // Backend returns the template data directly, not wrapped in success object
      setWeekTemplates(prev => [...prev, response.data]);
      setMessage({ type: 'success', text: t('weekTemplates.createSuccess') });
      handleCancelForm();
    } catch (error: any) {
      if (error.response?.status === 409) {
        setTemplateErrors({ name: t('weekTemplates.validation.nameExists') });
      } else {
        setMessage({ type: 'error', text: error.response?.data?.message || t('weekTemplates.createError') });
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
      } else {
        setMessage({ type: 'error', text: error.response?.data?.message || t('weekTemplates.updateError') });
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
    setAssigningDays(templateId);
    setSelectedDayTemplates({});
    setMessage(null);
  };

  const handleCancelAssignDays = () => {
    setAssigningDays(null);
    setSelectedDayTemplates({});
  };

  const handleDayTemplateChange = (dayOfWeek: number, dayTemplateId: string) => {
    setSelectedDayTemplates(prev => ({
      ...prev,
      [dayOfWeek]: dayTemplateId,
    }));
  };

  const handleSaveDayAssignments = async () => {
    if (!currentFamily || !assigningDays) return;

    try {
      // Save each day assignment
      for (const [dayOfWeek, dayTemplateId] of Object.entries(selectedDayTemplates)) {
        if (dayTemplateId) {
          await weekTemplateApi.addTemplateDay(currentFamily.id, assigningDays, {
            dayOfWeek: parseInt(dayOfWeek),
            dayTemplateId,
          });
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

  const handleApplyTemplate = (templateId: string) => {
    setApplyingTemplate(templateId);
    setApplyData({
      startDate: getNextMonday(),
      overrideMemberAssignments: false,
    });
    setMessage(null);
  };

  const handleCancelApplyTemplate = () => {
    setApplyingTemplate(null);
    setApplyData({
      startDate: '',
      overrideMemberAssignments: false,
    });
  };

  const handleApplyTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !applyingTemplate || !applyData.startDate) return;

    try {
      await weekTemplateApi.applyTemplate(currentFamily.id, applyingTemplate, {
        startDate: applyData.startDate,
        overrideMemberAssignments: applyData.overrideMemberAssignments,
      });
      // Backend returns success directly, no need to check response.data.success
      setMessage({ type: 'success', text: t('weeklyRoutines.applySuccess') });
      handleCancelApplyTemplate();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('weeklyRoutines.applyError') });
    }
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = days[dayOfWeek];
    return dayKey ? t(`weeklyRoutines.days.${dayKey}` as any) : `Day ${dayOfWeek}`;
  };

  const getNextMonday = (): string => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Sunday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0]!;
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

  const getEffectiveDuration = (item: DayTemplateItem): number => {
    return item.overrideDuration || item.task?.defaultDuration || 0;
  };

  const sortTemplateItemsByTime = (items: DayTemplateItem[]): DayTemplateItem[] => {
    return [...items].sort((a, b) => {
      const timeA = getEffectiveTime(a);
      const timeB = getEffectiveTime(b);
      return timeA.localeCompare(timeB);
    });
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

          {/* Add/Edit Template Form */}
          {(addingTemplate || editingTemplate) && (
            <div className="week-template-management-form-container">
              <h4 className="week-template-management-form-title">
                {editingTemplate ? t('weeklyRoutines.routines.edit') : t('weeklyRoutines.routines.add')}
              </h4>
              <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} className="week-template-management-form">
                <div className="week-template-management-form-group">
                  <label className="week-template-management-label">
                    {t('weeklyRoutines.fields.name')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={templateData.name}
                    onChange={handleTemplateInputChange}
                    className={`week-template-management-input ${templateErrors['name'] ? 'week-template-management-input-error' : ''}`}
                    placeholder={t('weeklyRoutines.placeholders.name')}
                    maxLength={100}
                  />
                  {templateErrors['name'] && (
                    <div className="week-template-management-error">{templateErrors['name']}</div>
                  )}
                </div>

                <div className="week-template-management-form-group">
                  <label className="week-template-management-label">
                    {t('weeklyRoutines.fields.description')}
                  </label>
                  <textarea
                    name="description"
                    value={templateData.description}
                    onChange={handleTemplateInputChange}
                    className={`week-template-management-input ${templateErrors['description'] ? 'week-template-management-input-error' : ''}`}
                    placeholder={t('weeklyRoutines.placeholders.description')}
                    rows={3}
                    maxLength={500}
                  />
                  {templateErrors['description'] && (
                    <div className="week-template-management-error">{templateErrors['description']}</div>
                  )}
                </div>

                <div className="week-template-management-form-actions">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="week-template-management-button week-template-management-button-secondary"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="week-template-management-button week-template-management-button-primary"
                    disabled={isLoading}
                  >
                    {editingTemplate ? t('common.update') : t('common.create')}
                  </button>
                </div>
              </form>
            </div>
          )}

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
              {isAdmin && !(addingTemplate || editingTemplate) && (
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
                      </div>
                    </div>
                    <div className="week-template-management-template-actions">
                      <button
                        onClick={() => handleApplyTemplate(template.id)}
                        className="week-template-management-template-action week-template-management-button week-template-management-button-primary week-template-management-button-sm"
                        title={t('weeklyRoutines.actions.apply')}
                      >
                        ▶️ {t('weeklyRoutines.actions.apply')}
                      </button>
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
                                      sortTemplateItemsByTime(dayTemplateItems[day.dayTemplate.id]!).map(item => (
                                        <div key={item.id} className="week-template-management-task-item">
                                          <div className="week-template-management-task-item-content">
                                            {/* Member Avatar */}
                                            <div className="week-template-management-task-avatar">
                                              {item.member?.avatarUrl ? (
                                                <img 
                                                  src={item.member.avatarUrl} 
                                                  alt={`${item.member.firstName} ${item.member.lastName}`}
                                                />
                                              ) : item.member ? (
                                                `${item.member.firstName.charAt(0)}${item.member.lastName.charAt(0)}`
                                              ) : (
                                                '?'
                                              )}
                                            </div>
                                            
                                            {/* Task Info */}
                                            <div className="week-template-management-task-info">
                                              <div className="week-template-management-task-header">
                                                <span 
                                                  className="week-template-management-task-icon"
                                                  style={{ backgroundColor: item.task?.color || '#6366f1' }}
                                                >
                                                  {item.task?.icon || '📝'}
                                                </span>
                                                <span className="week-template-management-task-name">
                                                  {item.task?.name || 'Unknown Task'}
                                                </span>
                                              </div>
                                              <div className="week-template-management-task-details">
                                                <span className="week-template-management-task-time">
                                                  {getEffectiveTime(item)}
                                                </span>
                                                <span className="week-template-management-task-duration">
                                                  {formatDuration(getEffectiveDuration(item))}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
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

        {/* Day Assignment Modal */}
        {assigningDays && (
          <div className="week-template-management-modal-overlay">
            <div className="week-template-management-modal">
              <div className="week-template-management-modal-header">
                <h3>{t('weeklyRoutines.assignDays.title')}</h3>
                <button
                  onClick={handleCancelAssignDays}
                  className="week-template-management-modal-close"
                >
                  ✕
                </button>
              </div>
              <div className="week-template-management-modal-content">
                <p>{t('weeklyRoutines.assignDays.description')}</p>
                <div className="week-template-management-days-assignment">
                  {[1, 2, 3, 4, 5, 6, 0].map(dayOfWeek => ( // Monday to Sunday
                    <div key={dayOfWeek} className="week-template-management-day-row">
                      <label className="week-template-management-day-label">
                        {getDayName(dayOfWeek)}
                      </label>
                      <select
                        value={selectedDayTemplates[dayOfWeek] || ''}
                        onChange={(e) => handleDayTemplateChange(dayOfWeek, e.target.value)}
                        className="week-template-management-input"
                      >
                        <option value="">{t('weeklyRoutines.assignDays.selectRoutine')}</option>
                        {dayTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="week-template-management-modal-actions">
                <button
                  onClick={handleCancelAssignDays}
                  className="week-template-management-button week-template-management-button-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveDayAssignments}
                  className="week-template-management-button week-template-management-button-primary"
                  disabled={Object.keys(selectedDayTemplates).length === 0}
                >
                  {t('weeklyRoutines.assignDays.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Apply Template Modal */}
        {applyingTemplate && (
          <div className="week-template-management-modal-overlay">
            <div className="week-template-management-modal">
              <div className="week-template-management-modal-header">
                <h3>{t('weeklyRoutines.apply.title')}</h3>
                <button
                  onClick={handleCancelApplyTemplate}
                  className="week-template-management-modal-close"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleApplyTemplateSubmit} className="week-template-management-modal-content">
                <p>{t('weeklyRoutines.apply.description')}</p>
                
                <div className="week-template-management-form-group">
                  <label className="week-template-management-label">
                    {t('weeklyRoutines.apply.startDate')} *
                  </label>
                  <input
                    type="date"
                    value={applyData.startDate}
                    onChange={(e) => setApplyData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="week-template-management-input"
                    min={getNextMonday()}
                    required
                  />
                  <div className="week-template-management-help-text">
                    {t('weeklyRoutines.apply.startDateHelp')}
                  </div>
                </div>

                <div className="week-template-management-form-group">
                  <label className="week-template-management-checkbox-label">
                    <input
                      type="checkbox"
                      checked={applyData.overrideMemberAssignments}
                      onChange={(e) => setApplyData(prev => ({ ...prev, overrideMemberAssignments: e.target.checked }))}
                    />
                    {t('weeklyRoutines.apply.overrideAssignments')}
                  </label>
                  <div className="week-template-management-help-text">
                    {t('weeklyRoutines.apply.overrideAssignmentsHelp')}
                  </div>
                </div>

                <div className="week-template-management-modal-actions">
                  <button
                    type="button"
                    onClick={handleCancelApplyTemplate}
                    className="week-template-management-button week-template-management-button-secondary"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="week-template-management-button week-template-management-button-primary"
                    disabled={!applyData.startDate}
                  >
                    {t('weeklyRoutines.apply.confirm')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 