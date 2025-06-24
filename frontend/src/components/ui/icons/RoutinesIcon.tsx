import React from 'react';

interface RoutinesIconProps {
  className?: string;
  size?: number;
}

const RoutinesIcon: React.FC<RoutinesIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* Outer circle (clock face) */}
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      
      {/* Clock hands showing routine time (white, thicker) - pointing to 9:00 */}
      <path d="M12 6 L12 12 L8 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default RoutinesIcon; 