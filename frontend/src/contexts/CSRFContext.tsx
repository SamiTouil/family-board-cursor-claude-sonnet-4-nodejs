/**
 * CSRF Context Provider
 * 
 * Provides global CSRF token management across the application.
 * Automatically initializes tokens and handles refresh cycles.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { csrfService } from '../services/csrf';

interface CSRFContextType {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isEnabled: boolean;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

interface CSRFProviderProps {
  children: ReactNode;
}

/**
 * CSRF Context Provider Component
 */
export const CSRFProvider: React.FC<CSRFProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Check if CSRF protection is enabled on the server
   */
  const checkCSRFStatus = useCallback(async (): Promise<boolean> => {
    try {
      const enabled = await csrfService.isCSRFEnabled();
      setIsEnabled(enabled);
      return enabled;
    } catch (err) {
      // Failed to check CSRF status, assuming disabled
      setIsEnabled(false);
      return false;
    }
  }, []);

  /**
   * Fetch CSRF token from server
   */
  const fetchToken = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    if (!isEnabled && !forceRefresh) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const csrfToken = await csrfService.getToken(forceRefresh);
      setToken(csrfToken);
      // CSRF token obtained successfully
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch CSRF token';
      setError(errorMessage);
      // CSRF token fetch failed
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled]);

  /**
   * Initialize CSRF protection
   */
  const initialize = useCallback(async (): Promise<void> => {
    if (isInitialized) {
      return;
    }

    // Initializing CSRF protection
    
    try {
      const enabled = await checkCSRFStatus();
      
      if (enabled) {
        // CSRF protection is enabled on server
        await fetchToken();
      } else {
        // CSRF protection is disabled on server
      }
    } catch (err) {
      // Failed to initialize CSRF protection
    } finally {
      setIsInitialized(true);
    }
  }, [isInitialized, checkCSRFStatus, fetchToken]);

  /**
   * Refresh token manually
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    // Refreshing CSRF token
    await fetchToken(true);
  }, [fetchToken]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Auto-refresh token periodically (every 22 hours)
   */
  useEffect(() => {
    if (!isEnabled || !token) {
      return;
    }

    const refreshInterval = 22 * 60 * 60 * 1000; // 22 hours
    const intervalId = setInterval(() => {
      // Auto-refreshing CSRF token
      refreshToken();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [isEnabled, token, refreshToken]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  /**
   * Clear token on unmount
   */
  useEffect(() => {
    return () => {
      csrfService.clearToken();
    };
  }, []);

  const contextValue: CSRFContextType = {
    token,
    isLoading,
    error,
    isEnabled,
    refreshToken,
    clearError,
    initialize,
  };

  return (
    <CSRFContext.Provider value={contextValue}>
      {children}
    </CSRFContext.Provider>
  );
};

/**
 * Hook to use CSRF context
 */
export const useCSRFContext = (): CSRFContextType => {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error('useCSRFContext must be used within a CSRFProvider');
  }
  return context;
};

/**
 * Hook to get CSRF token with automatic initialization
 */
export const useCSRFToken = (): string | null => {
  const { token, isEnabled, initialize } = useCSRFContext();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return isEnabled ? token : null;
};
