import React from 'react';

interface HomeIconProps {
  className?: string;
  size?: number;
}

const HomeIcon: React.FC<HomeIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* House base */}
      <rect x="4" y="10" width="16" height="12" />
      {/* Roof triangle */}
      <path d="M2 12 L12 2 L22 12 L20 12 L12 4 L4 12 Z" />
      {/* Door */}
      <rect x="10" y="16" width="4" height="6" fill="white" />
    </svg>
  );
};

export default HomeIcon; 