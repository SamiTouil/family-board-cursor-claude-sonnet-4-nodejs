/**
 * CSRF Protection Service for Frontend
 * 
 * Handles CSRF token fetching, caching, and automatic inclusion in requests.
 * Uses double-submit cookie pattern with automatic token management.
 */

import { apiClient } from './api-client';

interface CSRFTokenResponse {
  success: boolean;
  csrfToken: string;
}

class CSRFService {
  private cachedToken: string | null = null;
  private tokenPromise: Promise<string> | null = null;
  private readonly TOKEN_CACHE_DURATION = 23 * 60 * 60 * 1000; // 23 hours (less than 24h server expiry)
  private tokenTimestamp: number = 0;

  /**
   * Get CSRF token with caching and automatic refresh
   */
  async getToken(forceRefresh: boolean = false): Promise<string> {
    // Return cached token if valid and not forcing refresh
    if (!forceRefresh && this.cachedToken && this.isTokenValid()) {
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
      this.tokenTimestamp = Date.now();
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

      return response.data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw new Error('Unable to fetch CSRF token. Please try again.');
    }
  }

  /**
   * Check if cached token is still valid
   */
  private isTokenValid(): boolean {
    if (!this.cachedToken || !this.tokenTimestamp) {
      return false;
    }

    const tokenAge = Date.now() - this.tokenTimestamp;
    return tokenAge < this.TOKEN_CACHE_DURATION;
  }

  /**
   * Clear cached token (useful for logout or token errors)
   */
  clearToken(): void {
    this.cachedToken = null;
    this.tokenTimestamp = 0;
    this.tokenPromise = null;
  }

  /**
   * Refresh token proactively
   */
  async refreshToken(): Promise<string> {
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
