import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserSummaryCard } from '../components/UserSummaryCard';
import './pages.css';

const FamilyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="tasks-page">
      <div className="dashboard-top-section">
        <UserSummaryCard />
        
        <div className="tasks-content">
          <div className="page-header">
            <h1 className="page-title">{t('family.title', 'Family')}</h1>
            <p className="page-description">
              {t('family.description', 'Manage your family members and settings here.')}
            </p>
          </div>
          
          <div className="placeholder-content">
            <h2>{t('family.comingSoon', 'Coming Soon')}</h2>
            <p>{t('family.comingSoonDescription', 'Family management functionality will be available here soon.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyPage; 