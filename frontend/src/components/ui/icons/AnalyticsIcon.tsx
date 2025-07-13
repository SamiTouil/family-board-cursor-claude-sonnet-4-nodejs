import React from 'react';

interface AnalyticsIconProps {
  className?: string;
  size?: number;
}

const AnalyticsIcon: React.FC<AnalyticsIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* Bar chart with three bars of different heights */}
      <rect x="4" y="14" width="4" height="6" rx="0.5" />
      <rect x="10" y="10" width="4" height="10" rx="0.5" />
      <rect x="16" y="6" width="4" height="14" rx="0.5" />
      {/* Trend line */}
      <path 
        d="M6 12 L12 8 L18 4" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Dots on trend line */}
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
      <circle cx="18" cy="4" r="1.5" />
    </svg>
  );
};

export default AnalyticsIcon;