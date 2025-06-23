import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../contexts/FamilyContext';
import { UserSummaryCard } from '../../features/auth/components/UserSummaryCard';
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
      </div>
    </div>
  );
}; 