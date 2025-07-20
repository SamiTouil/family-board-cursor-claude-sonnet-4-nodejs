import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_BASE_URL } from '../config/app';

interface WebSocketNotification {
  id: string;
  type: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: WebSocketNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<WebSocketNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
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
  const addNotification = useCallback((notification: Omit<WebSocketNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: WebSocketNotification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only last 50 notifications
  }, []);

  // Mark notification as read
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const token = localStorage.getItem('authToken');
    
    if (!isAuthenticated || !token || socketRef.current?.connected) {
      return;
    }



    const newSocket = io(SOCKET_BASE_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      
      // Only try to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    });

    newSocket.on('connect_error', () => {
      // WebSocket connection error
      setIsConnected(false);

      if (reconnectAttempts.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    });

    newSocket.on('error', () => {
      // WebSocket error occurred
    });

    // Real-time event handlers
    newSocket.on('join-request-created', (data) => {
      addNotification({
        type: 'join-request-created',
        message: `New join request from ${data.joinRequest.user.firstName} ${data.joinRequest.user.lastName}`,
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['join-request-created']?.forEach(callback => callback(data));
    });

    newSocket.on('join-request-approved', (data) => {
      addNotification({
        type: 'join-request-approved',
        message: data.message,
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['join-request-approved']?.forEach(callback => callback(data));
    });

    newSocket.on('join-request-rejected', (data) => {
      addNotification({
        type: 'join-request-rejected',
        message: data.message,
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['join-request-rejected']?.forEach(callback => callback(data));
    });

    newSocket.on('member-joined', (data) => {
      addNotification({
        type: 'member-joined',
        message: 'A new member has joined your family',
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['member-joined']?.forEach(callback => callback(data));
    });

    newSocket.on('family-updated', (data) => {
      addNotification({
        type: 'family-updated',
        message: 'Family information has been updated',
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['family-updated']?.forEach(callback => callback(data));
    });

    newSocket.on('member-role-changed', (data) => {
      addNotification({
        type: 'member-role-changed',
        message: 'A member\'s role has been changed',
        data,
      });
    });

    // Task reassignment event handlers
    newSocket.on('task-assigned', (data) => {
      addNotification({
        type: 'task-assigned',
        message: data.message,
        data,
      });
      // Forward the event to any registered listeners
      eventListeners.current['task-assigned']?.forEach(callback => callback(data));
    });

    newSocket.on('task-unassigned', (data) => {
      addNotification({
        type: 'task-unassigned',
        message: data.message,
        data,
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
    setSocket(newSocket);
  }, [isAuthenticated, addNotification]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;
    
    reconnectAttempts.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
    

    
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
      setSocket(null);
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
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const contextValue: WebSocketContextType = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    emit,
    on,
    off,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}; 