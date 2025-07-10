/**
 * React Native Hook for CSRF Token Management
 * 
 * Provides easy access to CSRF tokens and status in React Native components.
 * Automatically handles token fetching, caching, and error states.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfService } from '../services/csrf';

interface UseCSRFReturn {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isEnabled: boolean;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

/**
 * Hook for managing CSRF tokens in React Native components
 */
export const useCSRF = (): UseCSRFReturn => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Check if CSRF is enabled on the server
   */
  const checkCSRFStatus = useCallback(async () => {
    try {
      const enabled = await csrfService.isCSRFEnabled();
      setIsEnabled(enabled);
      return enabled;
    } catch (err) {
      console.warn('Failed to check CSRF status:', err);
      setIsEnabled(false);
      return false;
    }
  }, []);

  /**
   * Fetch CSRF token
   */
  const fetchToken = useCallback(async (forceRefresh: boolean = false) => {
    if (!isEnabled && !forceRefresh) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const csrfToken = await csrfService.getToken(forceRefresh);
      setToken(csrfToken);
      console.log('✅ CSRF token obtained');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch CSRF token';
      setError(errorMessage);
      console.error('❌ CSRF token fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled]);

  /**
   * Initialize CSRF service
   */
  const initialize = useCallback(async () => {
    if (isInitialized) {
      return;
    }

    console.log('🔒 Initializing CSRF protection...');
    setIsLoading(true);

    try {
      // Initialize the service (load from storage)
      await csrfService.initialize();
      
      // Check if CSRF is enabled
      const enabled = await checkCSRFStatus();
      
      if (enabled) {
        console.log('🛡️ CSRF protection is enabled');
        // Try to get cached token first
        const cachedToken = csrfService.getCachedToken();
        if (cachedToken) {
          setToken(cachedToken);
          console.log('✅ Using cached CSRF token');
        } else {
          // Fetch new token if no cached token
          await fetchToken();
        }
      } else {
        console.log('⚠️ CSRF protection is disabled');
      }
    } catch (err) {
      console.error('Failed to initialize CSRF:', err);
      setError('Failed to initialize CSRF protection');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [isInitialized, checkCSRFStatus, fetchToken]);

  /**
   * Refresh token manually
   */
  const refreshToken = useCallback(async () => {
    console.log('🔄 Refreshing CSRF token...');
    await fetchToken(true);
  }, [fetchToken]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    token,
    isLoading,
    error,
    isEnabled,
    refreshToken,
    clearError,
    initialize,
  };
};

/**
 * Hook for components that need to ensure CSRF token is available
 */
export const useRequiredCSRF = (): string | null => {
  const { token, isLoading, error, isEnabled } = useCSRF();

  useEffect(() => {
    if (isEnabled && !isLoading && !token && error) {
      console.error(`CSRF token required but not available: ${error}`);
    }
  }, [token, isLoading, error, isEnabled]);

  return isEnabled ? token : null;
};

/**
 * Hook for manual CSRF token operations
 */
export const useCSRFOperations = () => {
  const [isOperating, setIsOperating] = useState(false);

  const getToken = useCallback(async (): Promise<string | null> => {
    setIsOperating(true);
    try {
      return await csrfService.getToken();
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      return null;
    } finally {
      setIsOperating(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    setIsOperating(true);
    try {
      return await csrfService.refreshToken();
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      return null;
    } finally {
      setIsOperating(false);
    }
  }, []);

  const clearToken = useCallback(async () => {
    await csrfService.clearToken();
  }, []);

  const initialize = useCallback(async () => {
    setIsOperating(true);
    try {
      await csrfService.initialize();
    } catch (error) {
      console.error('Failed to initialize CSRF:', error);
    } finally {
      setIsOperating(false);
    }
  }, []);

  return {
    getToken,
    refreshToken,
    clearToken,
    initialize,
    isOperating,
  };
};
