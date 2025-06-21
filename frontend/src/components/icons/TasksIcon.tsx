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
      {/* Workbench top */}
      <rect x="2" y="8" width="20" height="3" />
      {/* Left leg */}
      <rect x="3" y="11" width="2" height="9" />
      {/* Right leg */}
      <rect x="19" y="11" width="2" height="9" />
      {/* Tool 1 - Hammer handle */}
      <rect x="7" y="3" width="1.5" height="8" />
      {/* Tool 1 - Hammer head */}
      <rect x="5.5" y="2" width="4.5" height="2" />
      {/* Tool 2 - Screwdriver */}
      <rect x="12" y="2" width="1" height="9" />
      {/* Tool 2 - Screwdriver handle */}
      <rect x="11.5" y="1.5" width="2" height="1" />
    </svg>
  );
};

export default TasksIcon; 