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
      
      // Use task icon if available for task notifications
      const icon = (isTaskEvent && notification.data?.taskIcon) ? notification.data.taskIcon : config.icon;
      
      await NotificationService.showNotification({
        title: `${icon} ${notification.title}`,
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
    
    // Check if already connecting or connected
    if (socketRef.current?.connected) {
      console.log('✅ Socket already connected, skipping connection');
      return;
    }
    
    const token = await AsyncStorage.getItem('authToken');
    console.log('🔑 Retrieved token:', token ? 'Token exists' : 'No token');
    console.log('📊 Current state:', {
      hasToken: !!token,
      isAlreadyConnected: socketRef.current?.connected
    });
    
    if (!token) {
      console.log('⏹️ Connect aborted: No token');
      return;
    }

    // Get WebSocket URL from app config
    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.24:3001/api';

    // Construct WebSocket URL based on environment
    let baseUrl: string;
    let fallbackUrl: string | null = null;

    if (apiUrl.includes('mabt.eu')) {
      // Production: try multiple URL formats
      baseUrl = 'https://mabt.eu';
      fallbackUrl = 'wss://mabt.eu'; // WebSocket-specific URL as fallback
    } else {
      // Development: remove /api from the end to get the base WebSocket URL
      baseUrl = apiUrl.replace(/\/api$/, '');
    }

    console.log('🔌 Connecting to WebSocket:', baseUrl);
    if (fallbackUrl) console.log('🔄 Fallback URL available:', fallbackUrl);
    console.log('🌐 API URL:', apiUrl);
    console.log('🏗️ Environment:', Constants.expoConfig?.extra?.environment);
    console.log('🔐 Auth token present:', !!token);
    console.log('📱 Platform:', Platform.OS);
    console.log('🆔 Device info:', {
      isDevice: Device.isDevice,
      deviceName: Device.deviceName,
      osName: Device.osName,
      osVersion: Device.osVersion
    });
    
    console.log('🔗 Creating socket connection...');
    const newSocket = io(baseUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000, // Reduced timeout for faster debugging
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3, // Reduced for faster debugging
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      autoConnect: true,
      // Add ping/pong to keep connection alive
      pingInterval: 25000,
      pingTimeout: 60000,
      // Production-specific settings
      upgrade: true,
      rememberUpgrade: true,
    });

    console.log('🔗 Socket created, setting up event handlers...');

    // Add a connection timeout to debug connection issues
    const connectionTimeout = setTimeout(() => {
      if (!newSocket.connected) {
        console.error('⏰ WebSocket connection timeout after 15 seconds');
        console.error('🔍 Debug info:');
        console.error('  - URL:', baseUrl);
        console.error('  - Socket state:', newSocket.connected ? 'connected' : 'disconnected');
        console.error('  - Transport:', newSocket.io.engine?.transport?.name || 'none');
        console.error('  - Ready state:', newSocket.io.engine?.readyState || 'unknown');
      }
    }, 15000);

    // Connection event handlers
    newSocket.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('✅ WebSocket connected successfully');
      console.log('🆔 Socket ID:', newSocket.id);
      console.log('🔗 Connected to:', baseUrl);
      console.log('🌐 Transport:', newSocket.io.engine.transport.name);
      console.log('📡 Upgraded:', newSocket.io.engine.upgraded);
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Test connection by emitting a ping
      console.log('🏓 Sending connection test ping...');
      newSocket.emit('ping', { timestamp: Date.now() });
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
      console.error('🌐 Attempted connection to:', baseUrl);
      console.error('🔐 Token present:', !!token);
      console.error('📱 Environment:', Constants.expoConfig?.extra?.environment);

      // Try fallback URL if available and this is the first attempt with primary URL
      if (fallbackUrl && baseUrl !== fallbackUrl && reconnectAttempts.current === 0) {
        console.log('🔄 Trying fallback WebSocket URL:', fallbackUrl);
        newSocket.disconnect();

        // Create new socket with fallback URL
        const fallbackSocket = io(fallbackUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        // Note: setupSocketHandlers function needs to be implemented
        // For now, just log that we would try fallback
        console.log('🔄 Would try fallback, but setupSocketHandlers not implemented yet');
        return;
      }

      setIsConnected(false);

      if (reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    });
    
    // Add error event handler
    newSocket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Add pong handler for connection testing
    newSocket.on('pong', (data) => {
      console.log('🏓 Received pong:', data);
    });

    // Add transport change handlers
    newSocket.io.on('upgrade', () => {
      console.log('⬆️ WebSocket transport upgraded to:', newSocket.io.engine.transport.name);
    });

    newSocket.io.on('upgradeError', (error) => {
      console.error('⬆️❌ WebSocket upgrade error:', error);
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

    // Week schedule reverted event
    newSocket.on('week-schedule-reverted', (data) => {
      console.log('📅 Week schedule reverted event received:', data);
      addNotification({
        type: 'week-schedule-reverted',
        title: 'Schedule Reverted',
        message: data.message,
        data: {
          ...data,
          screen: 'Home', // Navigate to home/calendar when tapped
        },
      });
      // Forward the event to any registered listeners
      eventListeners.current['week-schedule-reverted']?.forEach(callback => callback(data));
    });

    // Week schedule updated event (when applying routines)
    newSocket.on('week-schedule-updated', (data) => {
      console.log('📅 Week schedule updated event received:', data);
      console.log('📅 Event data details:', JSON.stringify(data, null, 2));
      console.log('📅 Registered listeners for week-schedule-updated:', eventListeners.current['week-schedule-updated']?.length || 0);
      
      addNotification({
        type: 'week-schedule-updated',
        title: 'Schedule Updated',
        message: data.message,
        data: {
          ...data,
          screen: 'Home', // Navigate to home/calendar when tapped
        },
      });
      
      // Forward the event to any registered listeners
      eventListeners.current['week-schedule-updated']?.forEach((callback, index) => {
        console.log(`📅 Calling listener ${index + 1} for week-schedule-updated`);
        callback(data);
      });
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
  }, [isAuthenticated]); // Remove connect and disconnect from dependencies to prevent loops

  // Handle app state changes for background notifications
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 App state changed to:', nextAppState);
      if (nextAppState === 'active') {
        // App came to foreground - clear any pending notifications
        NotificationService.clearDeliveredNotifications();
        
        // Reconnect WebSocket if disconnected
        if (isAuthenticated && !socketRef.current?.connected) {
          console.log('📱 App active - reconnecting WebSocket...');
          connect();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated, connect]);

  // Initialize notification service
  useEffect(() => {
    NotificationService.initialize();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only disconnect when component is truly unmounting
      if (socketRef.current) {
        console.log('🔌 Component unmounting - disconnecting WebSocket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty deps - only run on mount/unmount

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