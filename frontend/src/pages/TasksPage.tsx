import React from 'react';
import { TaskManagement } from '../components/TaskManagement';
import { UserSummaryCard } from '../components/UserSummaryCard';
import './pages.css';

const TasksPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-layout">
        <UserSummaryCard />
        <TaskManagement />
      </div>
    </div>
  );
};

export default TasksPage; 