import React from 'react';
import { TaskManagement } from '../components/TaskManagement';
import { UserSummaryCard } from '../components/UserSummaryCard';
import './pages.css';

const TasksPage: React.FC = () => {
  return (
    <div className="tasks-page">
      <div className="family-layout">
        <UserSummaryCard />
        <TaskManagement />
      </div>
    </div>
  );
};

export default TasksPage; 