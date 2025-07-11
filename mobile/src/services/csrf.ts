/**
 * CSRF Protection Service for React Native
 * 
 * Handles CSRF token fetching, caching, and automatic inclusion in requests.
 * Uses AsyncStorage for token persistence across app sessions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './api-client';

interface CSRFTokenResponse {
  success: boolean;
  csrfToken: string;
}

class CSRFService {
  private cachedToken: string | null = null;
  private tokenPromise: Promise<string> | null = null;
  private readonly TOKEN_STORAGE_KEY = 'csrf_token';
  private readonly TOKEN_TIMESTAMP_KEY = 'csrf_token_timestamp';
  private readonly TOKEN_CACHE_DURATION = 23 * 60 * 60 * 1000; // 23 hours

  /**
   * Initialize CSRF service - load cached token from storage
   */
  async initialize(): Promise<void> {
    try {
      const [storedToken, timestampStr] = await AsyncStorage.multiGet([
        this.TOKEN_STORAGE_KEY,
        this.TOKEN_TIMESTAMP_KEY,
      ]);

      const token = storedToken[1];
      const timestamp = timestampStr[1] ? parseInt(timestampStr[1], 10) : 0;

      if (token && timestamp && this.isTokenValid(timestamp)) {
        this.cachedToken = token;
        console.log('✅ CSRF token loaded from storage');
      } else {
        // Clear invalid token
        await this.clearStoredToken();
        console.log('🗑️ Cleared invalid CSRF token from storage');
      }
    } catch (error) {
      console.error('Failed to initialize CSRF service:', error);
    }
  }

  /**
   * Get CSRF token with caching and automatic refresh
   */
  async getToken(forceRefresh: boolean = false): Promise<string> {
    // Return cached token if valid and not forcing refresh
    if (!forceRefresh && this.cachedToken && await this.isCachedTokenValid()) {
      return this.cachedToken;
    }

    // If there's already a token request in progress, wait for it
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Fetch new token
    this.tokenPromise = this.fetchToken(forceRefresh);
    
    try {
      const token = await this.tokenPromise;
      this.cachedToken = token;
      await this.storeToken(token);
      return token;
    } finally {
      this.tokenPromise = null;
    }
  }

  /**
   * Fetch CSRF token from server
   */
  private async fetchToken(forceRefresh: boolean = false): Promise<string> {
    try {
      const url = forceRefresh ? '/csrf/token?refreshCSRF=true' : '/csrf/token';
      const response = await apiClient.get<CSRFTokenResponse>(url);
      
      if (!response.data.success || !response.data.csrfToken) {
        throw new Error('Invalid CSRF token response');
      }

      console.log('✅ CSRF token fetched from server');
      return response.data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw new Error('Unable to fetch CSRF token. Please try again.');
    }
  }

  /**
   * Store token in AsyncStorage
   */
  private async storeToken(token: string): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      await AsyncStorage.multiSet([
        [this.TOKEN_STORAGE_KEY, token],
        [this.TOKEN_TIMESTAMP_KEY, timestamp],
      ]);
    } catch (error) {
      console.error('Failed to store CSRF token:', error);
    }
  }

  /**
   * Check if cached token is still valid
   */
  private async isCachedTokenValid(): Promise<boolean> {
    if (!this.cachedToken) {
      return false;
    }

    try {
      const timestampStr = await AsyncStorage.getItem(this.TOKEN_TIMESTAMP_KEY);
      if (!timestampStr) {
        return false;
      }

      const timestamp = parseInt(timestampStr, 10);
      return this.isTokenValid(timestamp);
    } catch (error) {
      console.error('Failed to check token validity:', error);
      return false;
    }
  }

  /**
   * Check if timestamp is within valid range
   */
  private isTokenValid(timestamp: number): boolean {
    const tokenAge = Date.now() - timestamp;
    return tokenAge < this.TOKEN_CACHE_DURATION;
  }

  /**
   * Clear cached token and storage
   */
  async clearToken(): Promise<void> {
    this.cachedToken = null;
    this.tokenPromise = null;
    await this.clearStoredToken();
  }

  /**
   * Clear token from AsyncStorage
   */
  private async clearStoredToken(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.TOKEN_STORAGE_KEY,
        this.TOKEN_TIMESTAMP_KEY,
      ]);
    } catch (error) {
      console.error('Failed to clear stored CSRF token:', error);
    }
  }

  /**
   * Refresh token proactively
   */
  async refreshToken(): Promise<string> {
    console.log('🔄 Refreshing CSRF token...');
    return this.getToken(true);
  }

  /**
   * Check if CSRF protection is enabled on the server
   */
  async isCSRFEnabled(): Promise<boolean> {
    try {
      // Try to make a test request without CSRF token
      await apiClient.post('/test-csrf-check', {});
      return false; // If it succeeds, CSRF is disabled
    } catch (error: any) {
      if (error.response?.status === 403 && 
          error.response?.data?.code === 'CSRF_TOKEN_REQUIRED') {
        return true; // CSRF is enabled
      }
      return false; // Other error, assume CSRF is disabled
    }
  }

  /**
   * Get current cached token without fetching
   */
  getCachedToken(): string | null {
    return this.cachedToken;
  }
}

// Export singleton instance
export const csrfService = new CSRFService();

/**
 * Utility function to get CSRF token for manual use
 */
export const getCSRFToken = () => csrfService.getToken();

/**
 * Utility function to refresh CSRF token
 */
export const refreshCSRFToken = () => csrfService.refreshToken();

/**
 * Utility function to clear CSRF token cache
 */
export const clearCSRFToken = () => csrfService.clearToken();

/**
 * Initialize CSRF service (call this in your app startup)
 */
export const initializeCSRF = () => csrfService.initialize();
