import React from 'react';

interface WeekIconProps {
  className?: string;
  size?: number;
}

const WeekIcon: React.FC<WeekIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* Calendar header */}
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* Calendar binding holes */}
      <circle cx="8" cy="2" r="1" fill="currentColor" />
      <circle cx="16" cy="2" r="1" fill="currentColor" />
      {/* Calendar binding lines */}
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Week divider line */}
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" />
      {/* Week days dots */}
      <circle cx="6" cy="13" r="1" fill="currentColor" />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="12" cy="13" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <circle cx="18" cy="13" r="1" fill="currentColor" />
    </svg>
  );
};

export default WeekIcon; 