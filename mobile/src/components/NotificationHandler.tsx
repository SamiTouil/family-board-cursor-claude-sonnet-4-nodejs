import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NotificationService } from '../services/NotificationService';
import { useAuth } from '../contexts/AuthContext';
import type { Subscription } from 'expo-modules-core';

export const NotificationHandler = () => {
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuth();
  const responseListenerRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle notification taps
    responseListenerRef.current = NotificationService.addNotificationResponseListener((response) => {
      const { data } = response.notification.request.content;
      
      // Navigate to appropriate screen based on notification data
      if (data?.screen) {
        switch (data.screen) {
          case 'Home':
            // Navigate to the home tab which shows the calendar
            navigation.navigate('Main', {
              screen: 'Home',
            });
            break;
          case 'Tasks':
            navigation.navigate('Main', {
              screen: 'Tasks',
            });
            break;
          case 'TaskDetail':
            if (data.taskId) {
              navigation.navigate('Main', {
                screen: 'Home',
                params: {
                  highlightTaskId: data.taskId,
                },
              });
            }
            break;
          default:
            break;
        }
      }
    });

    // Cleanup listener on unmount
    return () => {
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, [isAuthenticated, navigation]);

  return null;
};