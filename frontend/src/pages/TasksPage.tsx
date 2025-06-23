import React from 'react';
import { TaskManagement } from '../features/tasks/components/TaskManagement';
import { UserSummaryCard } from '../features/auth/components/UserSummaryCard';
import '../styles/pages.css';

const TasksPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-layout">
        <UserSummaryCard />
        <div className="page-content">
          <TaskManagement />
        </div>
      </div>
    </div>
  );
};

export default TasksPage; 