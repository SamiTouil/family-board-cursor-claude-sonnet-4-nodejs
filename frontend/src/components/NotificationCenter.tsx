import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import './NotificationCenter.css';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, clearNotifications } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

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

  return (
    <div className={`notification-center ${className}`} ref={dropdownRef}>
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={toggleDropdown}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="m13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <div className="notification-actions">
                {unreadCount > 0 && (
                  <button
                    className="action-button"
                    onClick={handleMarkAllAsRead}
                    title="Mark all as read"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  className="action-button"
                  onClick={handleClearAll}
                  title="Clear all notifications"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <div className="no-notifications-icon">🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={(e) => handleNotificationClick(notification.id, e)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  {!notification.read && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 