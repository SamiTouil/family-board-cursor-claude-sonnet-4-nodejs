import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api';
import type { User, SignupData, LoginData } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from AsyncStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const storedUser = await AsyncStorage.getItem('authUser');

        if (token && storedUser) {
          try {
            setUser(JSON.parse(storedUser));
            // Verify token is still valid by fetching current user
            const response = await authApi.getMe();
            if (response.data.success) {
              setUser(response.data.data);
              await AsyncStorage.setItem('authUser', JSON.stringify(response.data.data));
            }
          } catch (error) {
            // Token validation failed - clear invalid auth data
            await AsyncStorage.multiRemove(['authToken', 'authUser']);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginData): Promise<void> => {
    try {
      console.log('Attempting login with:', { email: data.email });
      const response = await authApi.login(data);
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        console.log('Login successful, user:', userData);
        setUser(userData);
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('authUser', JSON.stringify(userData));
      } else {
        console.log('Login failed:', response.data.message);
        throw new Error(response.data.message || 'Invalid credentials');
      }
    } catch (error: any) {
      console.log('Login error:', error);
      console.log('Error response:', error.response?.data);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error(error.response?.data?.message || 'An unexpected error occurred');
      }
    }
  };

  const signup = async (data: SignupData): Promise<void> => {
    try {
      const response = await authApi.signup(data);
      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        setUser(userData);
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('authUser', JSON.stringify(userData));
      } else {
        throw new Error(response.data.message || 'An unexpected error occurred');
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 409) {
        throw new Error('An account with this email already exists');
      } else if (error.response?.status === 400) {
        // Handle validation errors
        const message = error.response?.data?.message;
        if (message?.includes('email')) {
          throw new Error('Please enter a valid email address');
        } else if (message?.includes('password')) {
          throw new Error('Password must be at least 6 characters long');
        } else {
          throw new Error(message || 'Please check your information and try again');
        }
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error(error.response?.data?.message || 'An unexpected error occurred');
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Error during logout API call:', error);
    } finally {
      setUser(null);
      await AsyncStorage.multiRemove(['authToken', 'authUser']);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await authApi.getMe();
      if (response.data.success) {
        setUser(response.data.data);
        await AsyncStorage.setItem('authUser', JSON.stringify(response.data.data));
      }
    } catch (error) {
      // If refresh fails, logout the user
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 