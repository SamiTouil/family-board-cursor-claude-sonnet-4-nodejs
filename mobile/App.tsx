import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { FamilyProvider, useFamily } from './src/contexts/FamilyContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignupScreen } from './src/screens/auth/SignupScreen';
import { FamilyOnboardingScreen } from './src/screens/family/FamilyOnboardingScreen';
import { LoadingSpinner } from './src/components/ui';
import { WeeklyScheduleScreen } from './src/screens/WeeklyScheduleScreen';
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

// Main Home Screen
const HomeScreen = () => {
  return <WeeklyScheduleScreen />;
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, loading: familyLoading } = useFamily();

  // Show loading while checking auth and family status
  if (authLoading || (isAuthenticated && familyLoading)) {
    return <LoadingSpinner />;
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
        <RootStack.Screen name="Main" component={HomeScreen} />
      )}
    </RootStack.Navigator>
  );
};

// Main App Component
export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <FamilyProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </FamilyProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}
