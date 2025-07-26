import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { NotificationService } from './NotificationService';

const BACKGROUND_FETCH_TASK = 'background-fetch-task';

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log('🔄 Background task executing...');
  
  try {
    // Check for missed notifications
    await checkForMissedAssignments();
    
    console.log('✅ Background task completed successfully');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Background task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Function to check for missed assignments
async function checkForMissedAssignments(): Promise<void> {
  try {
    console.log('🔍 Checking for missed assignments in background...');
    
    // Get the last time we checked
    const lastCheckTime = await AsyncStorage.getItem('lastNotificationCheck');
    const lastCheck = lastCheckTime ? new Date(lastCheckTime) : new Date(Date.now() - 10 * 60 * 1000); // Default to 10 minutes ago
    
    // Get auth token
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('⏹️ No auth token - skipping background check');
      return;
    }
    
    // Make API call to check for recent assignments
    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.24:3001/api';
    
    const response = await fetch(`${apiUrl}/families/recent-assignments?since=${lastCheck.toISOString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📋 Found ${data.assignments?.length || 0} missed assignments in background`);
      
      // Show notifications for missed assignments
      if (data.assignments && data.assignments.length > 0) {
        for (const assignment of data.assignments) {
          await NotificationService.showNotification({
            title: `📋 ${assignment.taskName}`,
            body: assignment.message,
            data: {
              screen: 'Home',
              taskId: assignment.taskId,
              assignmentId: assignment.id,
            },
          });
        }
      }
      
      // Update last check time
      await AsyncStorage.setItem('lastNotificationCheck', new Date().toISOString());
    } else {
      console.error('❌ Failed to fetch assignments in background:', response.status);
    }
  } catch (error) {
    console.error('❌ Error checking for missed assignments:', error);
  }
}

export class BackgroundTaskService {
  private static isRegistered = false;

  /**
   * Initialize background fetch
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing background task service...');

      // Check if background fetch is available
      const status = await BackgroundFetch.getStatusAsync();
      console.log('📱 Background fetch status:', status);

      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        // Check if task is already registered
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);

        if (!isRegistered) {
          // Register the background task
          await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
            minimumInterval: 15 * 60, // 15 minutes minimum interval
            stopOnTerminate: false, // Continue after app termination
            startOnBoot: true, // Start after device reboot
          });
          console.log('✅ Background fetch registered successfully');
        } else {
          console.log('✅ Background fetch already registered');
        }

        this.isRegistered = true;
      } else {
        console.log('❌ Background fetch not available:', status);
        console.log('💡 Background notifications will only work when app becomes active');
      }
    } catch (error) {
      console.error('❌ Error initializing background task service:', error);
      console.log('💡 Falling back to foreground-only notifications');
    }
  }

  /**
   * Check if background fetch is registered
   */
  static isBackgroundFetchRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * Manually trigger a background check (for testing)
   */
  static async triggerBackgroundCheck(): Promise<void> {
    console.log('🧪 Manually triggering background check...');
    await checkForMissedAssignments();
  }

  /**
   * Unregister background fetch
   */
  static async unregister(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      this.isRegistered = false;
      console.log('✅ Background fetch unregistered');
    } catch (error) {
      console.error('❌ Error unregistering background fetch:', error);
    }
  }
}
