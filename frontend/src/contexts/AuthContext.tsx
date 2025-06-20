import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, authApi, SignupData, LoginData } from '../services/api';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Verify token is still valid by fetching current user
          const response = await authApi.getMe();
          if (response.data.success) {
            setUser(response.data.data);
            localStorage.setItem('authUser', JSON.stringify(response.data.data));
          }
        } catch (error) {
          // Token validation failed - clear invalid auth data
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginData): Promise<void> => {
    try {
      const response = await authApi.login(data);
      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        setUser(userData);
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(userData));
      } else {
        throw new Error(response.data.message || t('auth.invalidCredentials'));
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error(t('auth.invalidCredentials'));
      } else if (error.response?.status === 429) {
        throw new Error(t('auth.tooManyAttempts'));
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error(t('auth.networkError'));
      } else {
        throw new Error(error.response?.data?.message || t('auth.unexpectedError'));
      }
    }
  };

  const signup = async (data: SignupData): Promise<void> => {
    try {
      const response = await authApi.signup(data);
      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        setUser(userData);
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(userData));
      } else {
        throw new Error(response.data.message || t('auth.unexpectedError'));
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 409) {
        throw new Error(t('auth.emailExists'));
      } else if (error.response?.status === 400) {
        // Handle validation errors
        const message = error.response?.data?.message;
        if (message?.includes('email')) {
          throw new Error(t('auth.emailInvalid'));
        } else if (message?.includes('password')) {
          throw new Error(t('auth.passwordTooShort'));
        } else {
          throw new Error(message || t('auth.unexpectedError'));
        }
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error(t('auth.networkError'));
      } else {
        throw new Error(error.response?.data?.message || t('auth.unexpectedError'));
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await authApi.getMe();
      if (response.data.success) {
        setUser(response.data.data);
        localStorage.setItem('authUser', JSON.stringify(response.data.data));
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