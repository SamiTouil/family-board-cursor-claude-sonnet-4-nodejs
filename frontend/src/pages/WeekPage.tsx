import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserSummaryCard } from '../features/auth/components/UserSummaryCard';
import { WeekTemplateManagement } from '../features/week/components/WeekTemplateManagement';
import { DayTemplateManagement } from '../features/templates/components/DayTemplateManagement';
import '../styles/pages.css';
import './RoutinesPage.css';

const RoutinesPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'day-templates' | 'week-templates'>('day-templates');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addRoutineRef = useRef<HTMLDivElement>(null);
  const dayTemplateRef = useRef<any>(null);
  const weekTemplateRef = useRef<any>(null);

  // Handle clicks outside dropdown and keyboard navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addRoutineRef.current && !addRoutineRef.current.contains(event.target as Node)) {
        setShowAddDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAddDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleAddRoutine = (type: 'daily' | 'weekly') => {
    setShowAddDropdown(false);
    if (type === 'daily') {
      // Trigger add routine in DayTemplateManagement
      if (dayTemplateRef.current?.handleAddTemplate) {
        dayTemplateRef.current.handleAddTemplate();
      }
    } else {
      // Trigger add routine in WeekTemplateManagement
      if (weekTemplateRef.current?.handleAddTemplate) {
        weekTemplateRef.current.handleAddTemplate();
      }
    }
  };

  return (
    <div className="page-container">
      <div className="templates-page-layout">
        {/* Left Column */}
        <div className="templates-page-left-column">
          <UserSummaryCard />
          
          {/* Tab Navigation */}
          <div className="templates-page-tabs">
            <button
              className={`templates-page-tab ${activeTab === 'day-templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('day-templates')}
            >
              Daily Routines
            </button>
            <button
              className={`templates-page-tab ${activeTab === 'week-templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('week-templates')}
            >
              Weekly Routines
            </button>
          </div>
        </div>

        {/* Right Column - Tab Content */}
        <div className="templates-page-right-column">
          {/* Modern Add Routine Control in Top Bar */}
          <div className="routines-page-header">
            <div className="routines-add-control" ref={addRoutineRef}>
              <button
                className={`routines-add-button ${showAddDropdown ? 'active' : ''}`}
                onClick={() => setShowAddDropdown(!showAddDropdown)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <span>{t('dailyRoutines.routines.add')}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="routines-add-chevron">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {showAddDropdown && (
                <div className="routines-add-dropdown">
                  <div className="routines-dropdown-title">Create New Routine</div>
                  
                  <button
                    className="routines-dropdown-option"
                    onClick={() => handleAddRoutine('daily')}
                  >
                    <div className="routines-option-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div className="routines-option-content">
                      <div className="routines-option-title">Daily Routine</div>
                      <div className="routines-option-description">Create a routine for daily tasks</div>
                    </div>
                  </button>
                  
                  <button
                    className="routines-dropdown-option"
                    onClick={() => handleAddRoutine('weekly')}
                  >
                    <div className="routines-option-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                        <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01"></path>
                      </svg>
                    </div>
                    <div className="routines-option-content">
                      <div className="routines-option-title">Weekly Routine</div>
                      <div className="routines-option-description">Create a routine for weekly schedules</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'day-templates' ? (
            <DayTemplateManagement ref={dayTemplateRef} />
          ) : (
            <WeekTemplateManagement ref={weekTemplateRef} />
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutinesPage; 