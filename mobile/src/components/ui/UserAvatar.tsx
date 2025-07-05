import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: 'extra-small' | 'small' | 'medium' | 'large';
  style?: any;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  firstName,
  lastName,
  avatarUrl,
  size = 'medium',
  style
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Generate initials
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  
  // Generate a consistent color based on the user's name
  const generateColor = (name: string) => {
    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#eab308', // yellow
      '#22c55e', // green
      '#06b6d4', // cyan
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#f59e0b', // amber
      '#10b981', // emerald
      '#6366f1', // indigo
      '#84cc16', // lime
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const backgroundColor = generateColor(`${firstName}${lastName}`);
  
  // Get size styles
  const getSizeStyle = () => {
    switch (size) {
      case 'extra-small':
        return styles.extraSmall;
      case 'small':
        return styles.small;
      case 'medium':
        return styles.medium;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };
  
  const getFontSize = () => {
    switch (size) {
      case 'extra-small':
        return 8;
      case 'small':
        return 12;
      case 'medium':
        return 14;
      case 'large':
        return 16;
      default:
        return 14;
    }
  };

  const shouldShowImage = avatarUrl && !imageError;

  return (
    <View style={[styles.container, getSizeStyle(), style]}>
      {shouldShowImage ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, getSizeStyle()]}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.initials, getSizeStyle(), { backgroundColor }]}>
          <Text style={[styles.initialsText, { fontSize: getFontSize() }]}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 50,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: 50,
  },
  initials: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  initialsText: {
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  extraSmall: {
    width: 20,
    height: 20,
  },
  small: {
    width: 32,
    height: 32,
  },
  medium: {
    width: 40,
    height: 40,
  },
  large: {
    width: 48,
    height: 48,
  },
});

export default UserAvatar; 