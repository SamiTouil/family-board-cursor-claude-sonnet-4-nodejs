import React from 'react';
import { useTranslation } from 'react-i18next';
import { FamilyManagement } from '../components/FamilyManagement';
import { UserSummaryCard } from '../components/UserSummaryCard';
import './pages.css';

const FamilyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="tasks-page">
      <div className="family-layout">
        <UserSummaryCard />
        <FamilyManagement />
      </div>
    </div>
  );
};

export default FamilyPage; 