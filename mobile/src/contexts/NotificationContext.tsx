import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { NotificationService } from '../services/NotificationService';
import type { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const eventListeners = useRef<Record<string, ((data: any) => void)[]>>({});
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Calculate unread notifications count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Generate unique ID for notifications
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Add notification
  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only last 50 notifications
    
    // Update badge count
    const newUnreadCount = notifications.filter(n => !n.read).length + 1;
    await NotificationService.updateBadgeCount(newUnreadCount);
    
    // Show native notification for task-related events (both foreground and background)
    const isTaskEvent = notification.type === 'task-assigned' || notification.type === 'task-unassigned';
    
    if (AppState.currentState !== 'active' || isTaskEvent) {
      // Get notification config for better icons and formatting
      const config = NotificationService.getNotificationConfig(notification.type);
      
      await NotificationService.showNotification({
        title: `${config.icon} ${notification.title}`,
        body: notification.message,
        data: notification.data,
      });
    }
  }, [notifications]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      const newUnreadCount = updated.filter(n => !n.read).length;
      NotificationService.updateBadgeCount(newUnreadCount);
      return updated;
    });
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await NotificationService.updateBadgeCount(0);
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(async () => {
    setNotifications([]);
    await NotificationService.updateBadgeCount(0);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    console.log('🚀 Connect function called');
    const token = await AsyncStorage.getItem('authToken');
    console.log('🔑 Retrieved token:', token ? 'Token exists' : 'No token');
    console.log('📊 Current state:', {
      hasToken: !!token,
      isAlreadyConnected: socketRef.current?.connected
    });
    
    if (!token || socketRef.current?.connected) {
      console.log('⏹️ Connect aborted:', {
        reason: !token ? 'No token' : 'Already connected'
      });
      return;
    }

    // Get WebSocket URL from app config
    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.24:3001/api';
    // Remove /api from the end to get the base WebSocket URL
    const baseUrl = apiUrl.replace(/\/api$/, '');
    
    console.log('🔌 Connecting to WebSocket:', baseUrl);
    console.log('🔐 Auth token present:', !!token);
    
    const newSocket = io(baseUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      console.log('🆔 Socket ID:', newSocket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // Only try to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error.message);
      console.error('Error type:', error.type);
      console.error('Error data:', error.data);
      console.error('Full error:', error);
      setIsConnected(false);
      
      if (reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    });
    
    // Add error event handler
    newSocket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Real-time event handlers
    newSocket.on('join-request-created', (data) => {
      addNotification({
        type: 'join-request-created',
        title: 'New Join Request',
        message: `New join request from ${data.joinRequest.user.firstName} ${data.joinRequest.user.lastName}`,
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['join-request-created']?.forEach(callback => callback(data));
    });

    newSocket.on('join-request-approved', (data) => {
      addNotification({
        type: 'join-request-approved',
        title: 'Join Request Approved',
        message: data.message,
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['join-request-approved']?.forEach(callback => callback(data));
    });

    newSocket.on('join-request-rejected', (data) => {
      addNotification({
        type: 'join-request-rejected',
        title: 'Join Request Rejected',
        message: data.message,
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['join-request-rejected']?.forEach(callback => callback(data));
    });

    newSocket.on('member-joined', (data) => {
      addNotification({
        type: 'member-joined',
        title: 'New Family Member',
        message: 'A new member has joined your family',
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['member-joined']?.forEach(callback => callback(data));
    });

    newSocket.on('family-updated', (data) => {
      addNotification({
        type: 'family-updated',
        title: 'Family Updated',
        message: 'Family information has been updated',
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['family-updated']?.forEach(callback => callback(data));
    });

    newSocket.on('member-role-changed', (data) => {
      addNotification({
        type: 'member-role-changed',
        title: 'Role Changed',
        message: 'A member\'s role has been changed',
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['member-role-changed']?.forEach(callback => callback(data));
    });

    // Task reassignment event handlers
    newSocket.on('task-assigned', (data) => {
      console.log('📋 Task assigned event received:', data);
      // Use the message from backend which already has all the details
      addNotification({
        type: 'task-assigned',
        title: 'New Task Assigned',
        message: data.message,
        data: {
          ...data,
          screen: 'Home', // Navigate to home/calendar when tapped
        },
      });
      // Forward the event to any registered listeners
      eventListeners.current['task-assigned']?.forEach(callback => callback(data));
    });

    newSocket.on('task-unassigned', (data) => {
      console.log('❌ Task unassigned event received:', data);
      // Use the message from backend which already has all the details
      addNotification({
        type: 'task-unassigned',
        title: 'Task Removed',
        message: data.message,
        data: {
          ...data,
          screen: 'Home', // Navigate to home/calendar when tapped
        },
      });
      // Forward the event to any registered listeners
      eventListeners.current['task-unassigned']?.forEach(callback => callback(data));
    });

    newSocket.on('task-schedule-updated', (data) => {
      // This event is used for updating the shift indicator and other components
      // We don't add a notification for this, just forward to listeners
      eventListeners.current['task-schedule-updated']?.forEach(callback => callback(data));
    });

    socketRef.current = newSocket;
  }, [addNotification]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;
    
    reconnectAttempts.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
    
    console.log(`Scheduling reconnect attempt ${reconnectAttempts.current} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Socket event methods
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    // Add to our event listeners registry
    if (!eventListeners.current[event]) {
      eventListeners.current[event] = [];
    }
    eventListeners.current[event].push(callback);
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (callback && eventListeners.current[event]) {
      // Remove specific callback from registry
      const index = eventListeners.current[event].indexOf(callback);
      if (index > -1) {
        eventListeners.current[event].splice(index, 1);
      }
    } else if (eventListeners.current[event]) {
      // Remove all callbacks for this event
      eventListeners.current[event] = [];
    }
  }, []);

  // Handle authentication changes
  useEffect(() => {
    console.log('🔐 NotificationContext auth effect - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('📞 Calling connect()...');
      connect();
    } else {
      console.log('🔌 Calling disconnect()...');
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  // Handle app state changes for background notifications
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App came to foreground - clear any pending notifications
        NotificationService.clearDeliveredNotifications();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Initialize notification service
  useEffect(() => {
    NotificationService.initialize();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    emit,
    on,
    off,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 