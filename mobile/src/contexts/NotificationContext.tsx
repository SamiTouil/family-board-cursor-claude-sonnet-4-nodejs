import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '../services/NotificationService';
import type { Notification, NotificationContextType } from '../types';

interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Calculate unread notifications count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Generate unique ID for notifications
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50); // Keep only last 50 notifications
      
      // Update badge count
      const newUnreadCount = updated.filter(n => !n.read).length;
      NotificationService.setBadgeCount(newUnreadCount);
      
      return updated;
    });

    // Show local notification if app is in background or inactive
    if (appState !== 'active') {
      const config = NotificationService.getNotificationConfig(notification.type);
      NotificationService.showLocalNotification(
        config.title,
        notification.message,
        {
          type: notification.type,
          data: notification.data,
          notificationId: newNotification.id,
        }
      );
    }
  }, [appState]);

  // Mark notification as read
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      
      // Update badge count
      const newUnreadCount = updated.filter(n => !n.read).length;
      NotificationService.setBadgeCount(newUnreadCount);
      
      return updated;
    });
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      
      // Clear badge
      NotificationService.clearBadge();
      
      return updated;
    });
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    NotificationService.clearBadge();
  }, []);

  // Request notification permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    return await NotificationService.requestPermissions();
  }, []);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    return await NotificationService.registerForPushNotifications();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
      
      // Clear badge when app becomes active
      if (nextAppState === 'active') {
        const currentUnreadCount = notifications.filter(n => !n.read).length;
        NotificationService.setBadgeCount(currentUnreadCount);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [notifications]);

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      // Set up notification categories
      await NotificationService.setNotificationCategories();
      
      // Request permissions
      await requestPermissions();
      await registerForPushNotifications();
    };

    initializeNotifications();
  }, [requestPermissions, registerForPushNotifications]);

  // Handle notification responses (when user taps on notification)
  useEffect(() => {
    const responseSubscription = NotificationService.addNotificationResponseListener((response) => {
      const { notification } = response;
      const { data } = notification.request.content;
      
      if (data?.notificationId && typeof data.notificationId === 'string') {
        markNotificationAsRead(data.notificationId);
      }
      
      // Handle notification actions
      if (response.actionIdentifier) {
        console.log('Notification action:', response.actionIdentifier);
        // Handle specific actions like approve/reject
      }
    });

    const receivedSubscription = NotificationService.addNotificationReceivedListener((notification) => {
      // Handle foreground notifications
      console.log('Notification received in foreground:', notification);
    });

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [markNotificationAsRead]);

  // Update badge count when unread count changes
  useEffect(() => {
    NotificationService.setBadgeCount(unreadCount);
  }, [unreadCount]);

  // Demo function to add sample notifications for testing
  const addDemoNotifications = useCallback(() => {
    const demoNotifications = [
      {
        type: 'join-request-created',
        title: 'New Join Request',
        message: 'Sarah Johnson wants to join your family',
        data: { userId: 'demo-1' },
      },
      {
        type: 'task-assigned',
        title: 'Task Assigned',
        message: 'You have been assigned to "Take out trash" for tomorrow',
        data: { taskId: 'demo-2' },
      },
      {
        type: 'family-updated',
        title: 'Family Updated',
        message: 'Family information has been updated by John',
        data: { familyId: 'demo-3' },
      },
    ];

    demoNotifications.forEach((notification, index) => {
      setTimeout(() => {
        addNotification(notification);
      }, index * 1000);
    });
  }, [addNotification]);

  // Initialize with demo notifications for testing (remove in production)
  useEffect(() => {
    const timer = setTimeout(() => {
      addDemoNotifications();
    }, 3000); // Add demo notifications after 3 seconds

    return () => clearTimeout(timer);
  }, [addDemoNotifications]);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    requestPermissions,
    registerForPushNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}; 