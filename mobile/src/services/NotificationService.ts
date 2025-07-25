import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior for background and foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📱 Handling notification:', notification.request.content.title);

    // Always show notifications, especially when app is in background
    // This ensures notifications appear even when the app is backgrounded
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      // iOS specific: ensure notifications show in foreground
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

export class NotificationService {
  private static pushToken: string | null = null;
  private static isInitialized: boolean = false;

  /**
   * Initialize the notification service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initializing NotificationService...');
      
      // Set up notification categories
      await this.setNotificationCategories();
      
      // Request permissions with enhanced options
      await this.requestPermissions();

      // Configure local notifications only (skip push notification registration)
      await this.configureLocalNotifications();
      
      this.isInitialized = true;
      console.log('✅ NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing NotificationService:', error);
    }
  }

  /**
   * Request notification permissions with enhanced iOS options
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔐 Requesting notification permissions...');
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📋 Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      
      // Only ask if permissions have not already been determined
      if (existingStatus !== 'granted') {
        console.log('📝 Requesting new permissions...');
        
        // Request permissions with all iOS options
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: true,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }
      
      console.log('📊 Final permission status:', finalStatus);
      
      if (finalStatus !== 'granted') {
        console.log('❌ Notification permissions not granted');
        console.log('💡 User needs to enable notifications in iPhone Settings');
        return false;
      }
      
      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Configure local notifications only (no push notifications)
   */
  static async configureLocalNotifications(): Promise<void> {
    try {
      console.log('🔔 Configuring local notifications...');

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('family-board', {
          name: 'Family Board Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
          sound: 'default',
        });
        console.log('✅ Android notification channel configured');
      }

      console.log('✅ Local notifications configured successfully');
      console.log('📱 Note: Using LOCAL notifications only (no push notifications)');
    } catch (error) {
      console.error('❌ Error configuring local notifications:', error);
    }
  }

  /**
   * Register for push notifications and get push token (DISABLED for local-only mode)
   */
  static async registerForPushNotifications(): Promise<string | null> {
    console.log('🚫 Push notifications disabled - using local notifications only');
    return null;
  }

  /**
   * Get the current push token
   */
  static getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Schedule a local notification
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    delay: number = 0
  ): Promise<string> {
    try {
      const trigger: Notifications.NotificationTriggerInput | null = delay > 0 
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delay }
        : null;
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Show an immediate local notification
   */
  static async showLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<string> {
    return this.scheduleLocalNotification(title, body, data, 0);
  }

  /**
   * Show a notification (alias for showLocalNotification for compatibility)
   */
  static async showNotification(options: {
    title: string;
    body: string;
    data?: any;
  }): Promise<string> {
    return this.showLocalNotification(options.title, options.body, options.data);
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Set the app icon badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Update badge count (alias for setBadgeCount for compatibility)
   */
  static async updateBadgeCount(count: number): Promise<void> {
    return this.setBadgeCount(count);
  }

  /**
   * Get the current app icon badge count
   */
  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Clear the app icon badge
   */
  static async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  /**
   * Clear delivered notifications from notification center
   */
  static async clearDeliveredNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error clearing delivered notifications:', error);
    }
  }

  /**
   * Get notification categories for actionable notifications
   */
  static async setNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('family-request', [
        {
          identifier: 'approve',
          buttonTitle: 'Approve',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'reject',
          buttonTitle: 'Reject',
          options: {
            isDestructive: true,
            isAuthenticationRequired: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('task-assignment', [
        {
          identifier: 'view',
          buttonTitle: 'View',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);
    } catch (error) {
      console.error('Error setting notification categories:', error);
    }
  }

  /**
   * Handle notification response (when user taps on notification or action buttons)
   */
  static addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Handle incoming notifications while app is in foreground
   */
  static addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Get notification types with proper icons and titles
   */
  static getNotificationConfig(type: string): { icon: string; title: string; category?: string } {
    switch (type) {
      case 'join-request-created':
        return {
          icon: '👥',
          title: 'New Join Request',
          category: 'family-request',
        };
      case 'join-request-approved':
        return {
          icon: '✅',
          title: 'Join Request Approved',
        };
      case 'join-request-rejected':
        return {
          icon: '❌',
          title: 'Join Request Rejected',
        };
      case 'member-joined':
        return {
          icon: '👋',
          title: 'New Member Joined',
        };
      case 'family-updated':
        return {
          icon: '📝',
          title: 'Family Updated',
        };
      case 'member-role-changed':
        return {
          icon: '🔄',
          title: 'Role Changed',
        };
      case 'task-assigned':
        return {
          icon: '📋',
          title: 'Task Assigned',
          category: 'task-assignment',
        };
      case 'task-unassigned':
        return {
          icon: '❌',
          title: 'Task Unassigned',
        };
      case 'task-schedule-updated':
        return {
          icon: '📅',
          title: 'Schedule Updated',
        };
      case 'week-schedule-reverted':
        return {
          icon: '↩️',
          title: 'Schedule Reverted',
        };
      default:
        return {
          icon: '🔔',
          title: 'Notification',
        };
    }
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  }
} 