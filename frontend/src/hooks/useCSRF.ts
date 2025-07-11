/**
 * React Hook for CSRF Token Management
 * 
 * Provides easy access to CSRF tokens and status in React components.
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
}

/**
 * Hook for managing CSRF tokens in React components
 */
export const useCSRF = (): UseCSRFReturn => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  /**
   * Fetch CSRF token
   */
  const fetchToken = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const csrfToken = await csrfService.getToken(forceRefresh);
      setToken(csrfToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch CSRF token';
      setError(errorMessage);
      // CSRF token fetch error
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if CSRF is enabled on the server
   */
  const checkCSRFStatus = useCallback(async () => {
    try {
      const enabled = await csrfService.isCSRFEnabled();
      setIsEnabled(enabled);
    } catch (err) {
      // Failed to check CSRF status
      setIsEnabled(false);
    }
  }, []);

  /**
   * Refresh token manually
   */
  const refreshToken = useCallback(async () => {
    await fetchToken(true);
  }, [fetchToken]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initialize CSRF token on mount
   */
  useEffect(() => {
    const initialize = async () => {
      await checkCSRFStatus();
      if (isEnabled) {
        await fetchToken();
      }
    };

    initialize();
  }, [fetchToken, checkCSRFStatus, isEnabled]);

  return {
    token,
    isLoading,
    error,
    isEnabled,
    refreshToken,
    clearError,
  };
};

/**
 * Hook for components that need to ensure CSRF token is available
 * Throws error if CSRF is enabled but token is not available
 */
export const useRequiredCSRF = (): string | null => {
  const { token, isLoading, error, isEnabled } = useCSRF();

  useEffect(() => {
    if (isEnabled && !isLoading && !token && error) {
      throw new Error(`CSRF token required but not available: ${error}`);
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
      // Failed to get CSRF token
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
      // Failed to refresh CSRF token
      return null;
    } finally {
      setIsOperating(false);
    }
  }, []);

  const clearToken = useCallback(() => {
    csrfService.clearToken();
  }, []);

  return {
    getToken,
    refreshToken,
    clearToken,
    isOperating,
  };
};
