import React from 'react';
import { Svg, Rect, Path } from 'react-native-svg';

interface TasksIconProps {
  size?: number;
  color?: string;
}

const TasksIcon: React.FC<TasksIconProps> = ({ size = 24, color = 'currentColor' }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
    >
      {/* Filled square/checkbox */}
      <Rect x="4" y="4" width="16" height="16" rx="2" fill={color} />
      {/* White checkmark */}
      <Path d="M7.5 12L10.5 15L16.5 9" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

export default TasksIcon; 