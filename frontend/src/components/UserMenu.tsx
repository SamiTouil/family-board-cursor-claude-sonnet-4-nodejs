import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import './UserMenu.css';

interface UserMenuProps {
  onEditProfile: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onEditProfile }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Logout error handling - error is logged in AuthContext
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <div className="user-menu-info">
        <span className="user-menu-name">
          {user.firstName} {user.lastName}
        </span>
        <span className="user-menu-email">{user.email}</span>
      </div>
      
      <UserAvatar
        firstName={user.firstName}
        lastName={user.lastName}
        avatarUrl={user.avatarUrl}
        size="medium"
        className="user-menu-avatar"
      />
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="user-menu-button"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`user-menu-dropdown-icon ${isOpen ? 'user-menu-dropdown-icon-open' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <button
            onClick={() => {
              onEditProfile();
              setIsOpen(false);
            }}
            className="user-menu-item"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {t('user.editProfile')}
          </button>
          
          <div className="user-menu-divider" />
          
          <button
            onClick={() => {
              handleLogout();
              setIsOpen(false);
            }}
            className="user-menu-item user-menu-item-logout"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  );
}; 