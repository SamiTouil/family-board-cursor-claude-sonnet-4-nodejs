import React from 'react';
import { Svg, Defs, LinearGradient, Stop, Rect, Circle, Line } from 'react-native-svg';

interface LogoProps {
  size?: number;
  style?: any;
}

const Logo: React.FC<LogoProps> = ({ size = 46, style }) => {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64"
      style={style}
    >
      {/* Gradient definition */}
      <Defs>
        <LinearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#667eea" stopOpacity={1} />
          <Stop offset="100%" stopColor="#1e3a8a" stopOpacity={1} />
        </LinearGradient>
      </Defs>
      
      {/* Main rounded rectangle background */}
      <Rect 
        x="8" 
        y="8" 
        width="48" 
        height="48" 
        rx="12" 
        ry="12"
        fill="url(#blueGradient)" 
      />
      
      {/* Inner highlight for depth */}
      <Rect 
        x="10" 
        y="10" 
        width="44" 
        height="44" 
        rx="10" 
        ry="10"
        fill="none" 
        stroke="rgba(255,255,255,0.2)" 
        strokeWidth="1"
      />
      
      {/* Geometric family symbol - interconnected circles representing family bonds */}
      <Circle cx="32" cy="32" r="6" fill="white" opacity={0.95} />
      
      {/* Family member circles positioned around center */}
      <Circle cx="22" cy="22" r="4" fill="white" opacity={0.95} />
      <Circle cx="42" cy="22" r="4" fill="white" opacity={0.95} />
      <Circle cx="22" cy="42" r="4" fill="white" opacity={0.95} />
      <Circle cx="42" cy="42" r="4" fill="white" opacity={0.95} />
      
      {/* Connecting lines showing family bonds */}
      <Line x1="26" y1="26" x2="28" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.8} />
      <Line x1="38" y1="26" x2="36" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.8} />
      <Line x1="26" y1="38" x2="28" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.8} />
      <Line x1="38" y1="38" x2="36" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.8} />
      
      {/* Subtle outer glow */}
      <Rect 
        x="6" 
        y="6" 
        width="52" 
        height="52" 
        rx="14" 
        ry="14"
        fill="none" 
        stroke="rgba(255,255,255,0.1)" 
        strokeWidth="1"
      />
    </Svg>
  );
};

export default Logo; 