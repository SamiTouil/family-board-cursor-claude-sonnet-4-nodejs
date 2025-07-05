import React from 'react';
import { Svg, Circle, Path } from 'react-native-svg';

interface RoutinesIconProps {
  size?: number;
  color?: string;
}

const RoutinesIcon: React.FC<RoutinesIconProps> = ({ size = 24, color = 'currentColor' }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
    >
      {/* Outer circle (clock face) */}
      <Circle cx="12" cy="12" r="9" fill={color} />
      
      {/* Clock hands showing routine time (white, thicker) - pointing to 9:00 */}
      <Path d="M12 6 L12 12 L8 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

export default RoutinesIcon; 