import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { FamilyScreen } from '../screens/FamilyScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { RoutinesScreen } from '../screens/RoutinesScreen';
import { HomeIcon, FamilyIcon, TasksIcon, RoutinesIcon } from '../components/ui/icons';
import { UserAvatar, UserMenu, UserProfile } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();

// Placeholder component for user avatar tab (not actually used)
const UserTabScreen: React.FC = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>User Menu</Text>
    </View>
  );
};

export const BottomTabNavigator: React.FC = () => {
  const { user } = useAuth();
  const [isUserMenuVisible, setIsUserMenuVisible] = useState(false);
  const [isUserProfileVisible, setIsUserProfileVisible] = useState(false);

  const handleUserMenuOpen = () => {
    setIsUserMenuVisible(true);
  };

  const handleUserMenuClose = () => {
    setIsUserMenuVisible(false);
  };

  const handleUserProfileOpen = () => {
    setIsUserProfileVisible(true);
  };

  const handleUserProfileClose = () => {
    setIsUserProfileVisible(false);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#000000', // Active color - black (matching web app)
          tabBarInactiveTintColor: '#999999', // Inactive color - gray (matching web app)
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: ({ focused, color, size }) => {
            let IconComponent;
            
            switch (route.name) {
              case 'Home':
                IconComponent = HomeIcon;
                break;
              case 'Family':
                IconComponent = FamilyIcon;
                break;
              case 'Tasks':
                IconComponent = TasksIcon;
                break;
              case 'Routines':
                IconComponent = RoutinesIcon;
                break;
              case 'User':
                // Return user avatar for the user tab
                return (
                  <View style={styles.tabIconContainer}>
                    {user && (
                      <UserAvatar
                        firstName={user.firstName}
                        lastName={user.lastName}
                        avatarUrl={user.avatarUrl}
                        size="small"
                      />
                    )}
                  </View>
                );
              default:
                IconComponent = HomeIcon;
            }
            
            return (
              <View style={styles.tabIconContainer}>
                <IconComponent size={size} color={color} />
              </View>
            );
          },
        })}
        screenListeners={({ route, navigation }) => ({
          tabPress: (e) => {
            if (route.name === 'User') {
              // Prevent default navigation behavior for user tab
              e.preventDefault();
              handleUserMenuOpen();
            }
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen 
          name="Family" 
          component={FamilyScreen}
          options={{
            tabBarLabel: 'Family',
          }}
        />
        <Tab.Screen 
          name="Tasks" 
          component={TasksScreen}
          options={{
            tabBarLabel: 'Tasks',
          }}
        />
        <Tab.Screen 
          name="Routines" 
          component={RoutinesScreen}
          options={{
            tabBarLabel: 'Routines',
          }}
        />
        <Tab.Screen 
          name="User" 
          component={UserTabScreen}
          options={{
            tabBarLabel: 'Account',
          }}
        />
      </Tab.Navigator>

      {/* User Menu Modal */}
      <UserMenu
        visible={isUserMenuVisible}
        onClose={handleUserMenuClose}
        onOpenSettings={handleUserProfileOpen}
      />

      {/* User Profile Modal */}
      <UserProfile
        visible={isUserProfileVisible}
        onClose={handleUserProfileClose}
      />
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
    paddingBottom: 8,
    height: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
}); 