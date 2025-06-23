import React from 'react';
import { UserSummaryCard } from '../features/auth/components/UserSummaryCard';
import '../styles/pages.css';

const WeekPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-layout">
        <UserSummaryCard />
        
      </div>
    </div>
  );
};

export default WeekPage; 