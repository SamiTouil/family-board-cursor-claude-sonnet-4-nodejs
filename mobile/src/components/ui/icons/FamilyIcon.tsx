import React from 'react';
import { Svg, Circle, Path } from 'react-native-svg';

interface FamilyIconProps {
  size?: number;
  color?: string;
}

const FamilyIcon: React.FC<FamilyIconProps> = ({ size = 24, color = 'currentColor' }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
    >
      {/* Parent figure (larger) */}
      <Circle cx="9" cy="7" r="3" fill={color} />
      <Path d="M9 12 C6.2 12 4 14.2 4 17 L4 19 C4 19.6 4.4 20 5 20 L13 20 C13.6 20 14 19.6 14 19 L14 17 C14 14.2 11.8 12 9 12 Z" fill={color} />
      
      {/* Child figure (smaller) */}
      <Circle cx="17" cy="9" r="2.5" fill={color} />
      <Path d="M17 13 C15.3 13 14 14.3 14 16 L14 17.5 C14 18.3 14.7 19 15.5 19 L18.5 19 C19.3 19 20 18.3 20 17.5 L20 16 C20 14.3 18.7 13 17 13 Z" fill={color} />
    </Svg>
  );
};

export default FamilyIcon; 