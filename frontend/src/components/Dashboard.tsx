import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../contexts/FamilyContext';
import { UserSummaryCard } from './UserSummaryCard';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();

  // Update document title when family changes
  useEffect(() => {
    if (currentFamily) {
      document.title = `${currentFamily.name} Board`;
    } else {
      document.title = t('app.title');
    }
  }, [currentFamily, t]);

  return (
    <div className="dashboard">
      <div className="dashboard-top-section">
        <UserSummaryCard />
        
        <div className="dashboard-content">
          <div className="dashboard-placeholder">
            <h3>Coming Soon</h3>
            <p>Family board features will be implemented here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 