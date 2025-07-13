import React from 'react';
import Analytics from './Analytics/Analytics';
import { UserSummaryCard } from '../features/auth/components/UserSummaryCard';
import '../styles/pages.css';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-layout">
        <UserSummaryCard />
        <Analytics />
      </div>
    </div>
  );
};

export default AnalyticsPage;