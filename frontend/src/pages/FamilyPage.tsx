import React from 'react';
import { FamilyManagement } from '../components/FamilyManagement';
import { UserSummaryCard } from '../components/UserSummaryCard';
import './pages.css';

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