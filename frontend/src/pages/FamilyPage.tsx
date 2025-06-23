import React from 'react';
import { FamilyManagement } from '../features/family/components/FamilyManagement';
import { UserSummaryCard } from '../features/auth/components/UserSummaryCard';
import '../styles/pages.css';

const FamilyPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-layout">
        <UserSummaryCard />
        <FamilyManagement />
      </div>
    </div>
  );
};

export default FamilyPage; 