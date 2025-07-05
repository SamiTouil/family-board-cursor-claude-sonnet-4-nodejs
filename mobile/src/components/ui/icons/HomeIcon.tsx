import React from 'react';
import { Svg, Path } from 'react-native-svg';

interface HomeIconProps {
  size?: number;
  color?: string;
}

const HomeIcon: React.FC<HomeIconProps> = ({ size = 24, color = 'currentColor' }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
    >
      {/* Rounded house shape */}
      <Path d="M12 2.5 C11.7 2.5 11.4 2.6 11.2 2.8 L3.2 10.8 C2.8 11.2 2.8 11.8 3.2 12.2 C3.6 12.6 4.2 12.6 4.6 12.2 L5 11.8 L5 19 C5 20.1 5.9 21 7 21 L9 21 C9.6 21 10 20.6 10 20 L10 16 C10 15.4 10.4 15 11 15 L13 15 C13.6 15 14 15.4 14 16 L14 20 C14 20.6 14.4 21 15 21 L17 21 C18.1 21 19 20.1 19 19 L19 11.8 L19.4 12.2 C19.8 12.6 20.4 12.6 20.8 12.2 C21.2 11.8 21.2 11.2 20.8 10.8 L12.8 2.8 C12.6 2.6 12.3 2.5 12 2.5 Z" />
    </Svg>
  );
};

export default HomeIcon; 