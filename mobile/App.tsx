import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { FamilyProvider, useFamily } from './src/contexts/FamilyContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { CSRFProvider } from './src/contexts/CSRFContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignupScreen } from './src/screens/auth/SignupScreen';
import { FamilyOnboardingScreen } from './src/screens/family/FamilyOnboardingScreen';
import { LoadingSpinner } from './src/components/ui';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { NotificationHandler } from './src/components/NotificationHandler';
import { WebSocketDebug } from './src/components/debug/WebSocketDebug';
import Constants from 'expo-constants';
import type { AuthStackParamList, RootStackParamList } from './src/types';

const AuthStack = createStackNavigator<AuthStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

// Auth Stack Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
};

// Main App Screen with Bottom Tab Navigation
const MainAppScreen = () => {
  return <BottomTabNavigator />;
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, loading: familyLoading } = useFamily();

  // Show loading while checking auth and family status
  if (authLoading || (isAuthenticated && familyLoading)) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <LoadingSpinner />
      </LinearGradient>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        // User is not authenticated - show auth flow
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : !hasCompletedOnboarding ? (
        // User is authenticated but hasn't completed family onboarding
        <RootStack.Screen name="FamilyOnboarding" component={FamilyOnboardingScreen} />
      ) : (
        // User is authenticated and has completed onboarding - show main app
        <>
          <RootStack.Screen name="Main" component={MainAppScreen} />
          {/* Add debug screen for production troubleshooting */}
          {Constants.expoConfig?.extra?.environment === 'production' && (
            <RootStack.Screen
              name="Debug"
              component={WebSocketDebug}
              options={{ title: 'WebSocket Debug' }}
            />
          )}
        </>
      )}
    </RootStack.Navigator>
  );
};

// Main App Component
export default function App() {
  return (
    <NavigationContainer>
      <CSRFProvider>
        <AuthProvider>
          <NotificationProvider>
            <FamilyProvider>
              <StatusBar style="light" />
              <NotificationHandler />
              <AppNavigator />
            </FamilyProvider>
          </NotificationProvider>
        </AuthProvider>
      </CSRFProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
