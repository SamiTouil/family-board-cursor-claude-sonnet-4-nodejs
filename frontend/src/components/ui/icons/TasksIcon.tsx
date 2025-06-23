import React from 'react';

interface TasksIconProps {
  className?: string;
  size?: number;
}

const TasksIcon: React.FC<TasksIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* Filled square/checkbox */}
      <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
      {/* White checkmark */}
      <path d="M7.5 12L10.5 15L16.5 9" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default TasksIcon; 