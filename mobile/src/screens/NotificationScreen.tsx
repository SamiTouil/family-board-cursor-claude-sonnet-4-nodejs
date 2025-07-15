import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationService } from '../services/NotificationService';
import { LoadingSpinner } from '../components/ui';
import type { Notification } from '../types';

interface NotificationScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const config = NotificationService.getNotificationConfig(notification.type);
  const formattedTime = NotificationService.formatTimestamp(notification.timestamp);
  
  // Use task icon if available for task notifications
  const isTaskEvent = notification.type === 'task-assigned' || notification.type === 'task-unassigned';
  const icon = (isTaskEvent && notification.data?.taskIcon) ? notification.data.taskIcon : config.icon;

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.notificationItemUnread,
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>{icon}</Text>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationTime}>{formattedTime}</Text>
          </View>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const NotificationScreen: React.FC<NotificationScreenProps> = ({ visible, onClose }) => {
  const {
    notifications,
    unreadCount,
    isConnected,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllNotificationsAsRead();
    }
  };

  const handleClearAll = () => {
    if (notifications.length > 0) {
      Alert.alert(
        'Clear All Notifications',
        'Are you sure you want to clear all notifications? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear All', style: 'destructive', onPress: clearNotifications },
        ]
      );
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <NotificationItem notification={item} onPress={handleNotificationPress} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔔</Text>
      <Text style={styles.emptyStateTitle}>No notifications</Text>
      <Text style={styles.emptyStateMessage}>
        You'll see family updates, task assignments, and other important notifications here.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={styles.connectionStatus}>
              <View
                style={[
                  styles.connectionDot,
                  isConnected ? styles.connectionDotConnected : styles.connectionDotDisconnected,
                ]}
              />
              <Text style={styles.connectionText}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
          
          {notifications.length > 0 && (
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleMarkAllAsRead}
                  activeOpacity={0.7}
                >
                  <Text style={styles.headerButtonText}>Mark All Read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.headerButton, styles.headerButtonSecondary]}
                onPress={handleClearAll}
                activeOpacity={0.7}
              >
                <Text style={[styles.headerButtonText, styles.headerButtonTextSecondary]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.content}>
          {notifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item.id}
              style={styles.notificationsList}
              contentContainerStyle={styles.notificationsListContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#667eea']}
                  tintColor="#667eea"
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionDotConnected: {
    backgroundColor: '#4ade80',
  },
  connectionDotDisconnected: {
    backgroundColor: '#f87171',
  },
  connectionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerButtonSecondary: {
    backgroundColor: 'transparent',
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButtonTextSecondary: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsListContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  notificationItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationItemUnread: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  notificationMeta: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
    marginTop: 6,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginLeft: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
}); 