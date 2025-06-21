import React from 'react';

interface LogoReversedProps {
  size?: number;
  className?: string;
}

const LogoReversed: React.FC<LogoReversedProps> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ 
        transition: 'transform 0.2s ease-in-out',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Gradient definition for purple elements */}
      <defs>
        <linearGradient id="purpleGradientReversed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="shadowReversed" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.1)"/>
        </filter>
      </defs>
      
      {/* Main white rounded rectangle background */}
      <rect 
        x="8" 
        y="8" 
        width="48" 
        height="48" 
        rx="12" 
        ry="12"
        fill="white" 
        filter="url(#shadowReversed)"
      />
      
      {/* Inner highlight for depth */}
      <rect 
        x="10" 
        y="10" 
        width="44" 
        height="44" 
        rx="10" 
        ry="10"
        fill="none" 
        stroke="rgba(139, 92, 246, 0.2)" 
        strokeWidth="1"
      />
      
      {/* Geometric family symbol - purple elements on white background */}
      <g fill="url(#purpleGradientReversed)" opacity="0.95">
        {/* Central connecting element */}
        <circle cx="32" cy="32" r="6" fill="url(#purpleGradientReversed)" />
        
        {/* Family member circles positioned around center */}
        <circle cx="22" cy="22" r="4" fill="url(#purpleGradientReversed)" />
        <circle cx="42" cy="22" r="4" fill="url(#purpleGradientReversed)" />
        <circle cx="22" cy="42" r="4" fill="url(#purpleGradientReversed)" />
        <circle cx="42" cy="42" r="4" fill="url(#purpleGradientReversed)" />
        
        {/* Connecting lines showing family bonds */}
        <line x1="26" y1="26" x2="28" y2="28" stroke="url(#purpleGradientReversed)" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="26" x2="36" y2="28" stroke="url(#purpleGradientReversed)" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="38" x2="28" y2="36" stroke="url(#purpleGradientReversed)" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="38" x2="36" y2="36" stroke="url(#purpleGradientReversed)" strokeWidth="2" strokeLinecap="round" />
      </g>
      
      {/* Subtle outer glow */}
      <rect 
        x="6" 
        y="6" 
        width="52" 
        height="52" 
        rx="14" 
        ry="14"
        fill="none" 
        stroke="rgba(139, 92, 246, 0.1)" 
        strokeWidth="1"
      />
    </svg>
  );
};

export default LogoReversed; 