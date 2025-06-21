import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { UserAvatar } from './UserAvatar';
import './UserMenu.css';

interface UserMenuProps {
  onEditProfile: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onEditProfile }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, clearNotifications } = useWebSocket();
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

  const handleNotificationClick = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllNotificationsAsRead();
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearNotifications();
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'join-request-created':
        return '👥';
      case 'join-request-approved':
        return '✅';
      case 'join-request-rejected':
        return '❌';
      case 'member-joined':
        return '🎉';
      case 'family-updated':
        return '📝';
      case 'member-role-changed':
        return '🔄';
      default:
        return '📢';
    }
  };

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
      
      <div className="user-menu-avatar-container">
        <UserAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarUrl={user.avatarUrl ?? null}
          size="medium"
          className="user-menu-avatar"
          onClick={() => setIsOpen(!isOpen)}
        />
        {unreadCount > 0 && (
          <span className="user-menu-notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </div>

      {isOpen && (
        <div className="user-menu-dropdown">
          {/* Notifications Section */}
          <div className="user-menu-notifications-section">
            <div className="user-menu-notifications-header">
              <h4>Notifications</h4>
              {notifications.length > 0 && (
                <div className="user-menu-notifications-actions">
                  {unreadCount > 0 && (
                    <button
                      className="user-menu-action-button"
                      onClick={handleMarkAllAsRead}
                      title="Mark all as read"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    className="user-menu-action-button"
                    onClick={handleClearAll}
                    title="Clear all notifications"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            <div className="user-menu-notifications-list">
              {notifications.length === 0 ? (
                <div className="user-menu-no-notifications">
                  <div className="user-menu-no-notifications-icon">🔔</div>
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`user-menu-notification-item ${notification.read ? 'read' : 'unread'}`}
                    onClick={(e) => handleNotificationClick(notification.id, e)}
                  >
                    <div className="user-menu-notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="user-menu-notification-content">
                      <p className="user-menu-notification-message">{notification.message}</p>
                      <span className="user-menu-notification-time">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    {!notification.read && <div className="user-menu-unread-dot" />}
                  </div>
                ))
              )}
              {notifications.length > 5 && (
                <div className="user-menu-more-notifications">
                  +{notifications.length - 5} more notifications
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="user-menu-divider" />

          {/* User Actions Section */}
          <div className="user-menu-actions-section">
            <button
              onClick={() => {
                onEditProfile();
                setIsOpen(false);
              }}
              className="user-menu-item"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {t('user.openSettings')}
            </button>
            
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
        </div>
      )}
    </div>
  );
}; 