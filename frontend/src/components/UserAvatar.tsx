import React from 'react';
import './UserAvatar.css';

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  firstName,
  lastName,
  avatarUrl,
  size = 'medium',
  className = ''
}) => {
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

  if (avatarUrl) {
    return (
      <div className={`user-avatar user-avatar-${size} ${className}`}>
        <img
          src={avatarUrl}
          alt={`${firstName} ${lastName}`}
          className="user-avatar-image"
          onError={(e) => {
            // If image fails to load, hide it and show initials
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const initialsElement = parent.querySelector('.user-avatar-initials');
              if (initialsElement) {
                (initialsElement as HTMLElement).style.display = 'flex';
              }
            }
          }}
        />
        <div 
          className="user-avatar-initials user-avatar-fallback"
          style={{ backgroundColor }}
        >
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div className={`user-avatar user-avatar-${size} ${className}`}>
      <div 
        className="user-avatar-initials"
        style={{ backgroundColor }}
      >
        {initials}
      </div>
    </div>
  );
}; 