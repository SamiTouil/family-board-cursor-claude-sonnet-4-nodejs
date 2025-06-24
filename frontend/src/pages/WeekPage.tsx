import React, { useState } from 'react';
import { UserSummaryCard } from '../features/auth/components/UserSummaryCard';
import { WeekTemplateManagement } from '../features/week/components/WeekTemplateManagement';
import { DayTemplateManagement } from '../features/templates/components/DayTemplateManagement';
import '../styles/pages.css';

const RoutinesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'day-templates' | 'week-templates'>('day-templates');

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
          {activeTab === 'day-templates' ? (
            <DayTemplateManagement />
          ) : (
            <WeekTemplateManagement />
          )}
      </div>
    </div>
  );
};

export default RoutinesPage; 