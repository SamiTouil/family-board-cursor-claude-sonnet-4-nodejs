import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationService } from '../../services/NotificationService';
import { UserAvatar } from './UserAvatar';

interface UserMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  visible,
  onClose,
  onOpenSettings,
  onOpenNotifications,
}) => {
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
  } = useNotifications();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              onClose();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    onClose();
    onOpenSettings();
  };

  const handleNotificationPress = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleViewAllNotifications = () => {
    onClose();
    if (onOpenNotifications) {
      onOpenNotifications();
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllNotificationsAsRead();
    }
  };

  const handleClearAllNotifications = () => {
    if (notifications.length > 0) {
      Alert.alert(
        'Clear All Notifications',
        'Are you sure you want to clear all notifications?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear All', style: 'destructive', onPress: clearNotifications },
        ]
      );
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info Section */}
          <View style={styles.userInfoSection}>
            <UserAvatar
              firstName={user.firstName}
              lastName={user.lastName}
              avatarUrl={user.avatarUrl}
              size="large"
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <View style={styles.notificationActions}>
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Notification Actions */}
            {notifications.length > 0 && (
              <View style={styles.notificationActionsRow}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.notificationActionButton}
                    onPress={handleMarkAllAsRead}
                  >
                    <Text style={styles.notificationActionButtonText}>Mark All Read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.notificationActionButton, styles.notificationActionButtonSecondary]}
                  onPress={handleClearAllNotifications}
                >
                  <Text style={[styles.notificationActionButtonText, styles.notificationActionButtonTextSecondary]}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.notificationsList}>
              {notifications.length === 0 ? (
                <View style={styles.noNotifications}>
                  <Text style={styles.noNotificationsIcon}>🔔</Text>
                  <Text style={styles.noNotificationsText}>No notifications</Text>
                </View>
              ) : (
                <>
                  {notifications.slice(0, 5).map((notification) => {
                    const config = NotificationService.getNotificationConfig(notification.type);
                    const formattedTime = NotificationService.formatTimestamp(notification.timestamp);
                    
                    return (
                      <TouchableOpacity
                        key={notification.id}
                        style={[
                          styles.notificationItem,
                          !notification.read && styles.notificationItemUnread,
                        ]}
                        onPress={() => handleNotificationPress(notification.id)}
                      >
                        <Text style={styles.notificationIcon}>
                          {config.icon}
                        </Text>
                        <View style={styles.notificationContent}>
                          <Text style={styles.notificationMessage}>
                            {notification.message}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {formattedTime}
                          </Text>
                        </View>
                        {!notification.read && (
                          <View style={styles.unreadDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {notifications.length > 5 && (
                    <TouchableOpacity
                      style={styles.viewAllNotifications}
                      onPress={handleViewAllNotifications}
                    >
                      <Text style={styles.viewAllNotificationsText}>
                        View all {notifications.length} notifications
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            {onOpenNotifications && (
              <TouchableOpacity style={styles.actionItem} onPress={handleViewAllNotifications}>
                <View style={styles.actionIcon}>
                  <Text style={styles.actionIconText}>🔔</Text>
                </View>
                <Text style={styles.actionText}>All Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
                <Text style={styles.actionChevron}>›</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.actionItem} onPress={handleSettings}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>⚙️</Text>
              </View>
              <Text style={styles.actionText}>Settings</Text>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>🚪</Text>
              </View>
              <Text style={[styles.actionText, styles.actionTextLogout]}>
                Sign Out
              </Text>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  notificationBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationsList: {
    paddingHorizontal: 20,
  },
  noNotifications: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noNotificationsIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  noNotificationsText: {
    fontSize: 16,
    color: '#6b7280',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  notificationItemUnread: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
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
    marginTop: 8,
    marginLeft: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconText: {
    fontSize: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  actionTextLogout: {
    color: '#dc2626',
  },
  actionChevron: {
    fontSize: 18,
    color: '#9ca3af',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  notificationActionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
  },
  notificationActionButtonSecondary: {
    backgroundColor: '#fef2f2',
  },
  notificationActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  notificationActionButtonTextSecondary: {
    color: '#dc2626',
  },
  viewAllNotifications: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  viewAllNotificationsText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  actionBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    marginLeft: 8,
  },
  actionBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
}); 