import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserSummaryCard } from '../components/UserSummaryCard';
import './pages.css';

const TasksPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="tasks-page">
      <div className="dashboard-top-section">
        <UserSummaryCard />
        
        <div className="tasks-content">
          <div className="page-header">
            <h1 className="page-title">{t('tasks.title', 'Tasks')}</h1>
            <p className="page-description">
              {t('tasks.description', 'Manage your family tasks and assignments here.')}
            </p>
          </div>
          
          <div className="placeholder-content">
            <h2>{t('tasks.comingSoon', 'Coming Soon')}</h2>
            <p>{t('tasks.comingSoonDescription', 'Task management functionality will be available here soon.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksPage; 