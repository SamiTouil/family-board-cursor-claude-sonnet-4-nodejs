/**
 * CSRF Protection Service for Frontend
 *
 * Handles CSRF token fetching, caching, and automatic inclusion in requests.
 * Uses double-submit cookie pattern with automatic token management.
 */

import axios from 'axios';

// Create a separate axios instance for CSRF operations to avoid circular dependency
const csrfClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for CSRF protection
});

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
      const response = await csrfClient.get<CSRFTokenResponse>(url);

      if (!response.data.success || !response.data.csrfToken) {
        throw new Error('Invalid CSRF token response');
      }

      return response.data.csrfToken;
    } catch (error) {
      // Failed to fetch CSRF token
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
      // Check CSRF status endpoint instead of making a test request
      const response = await csrfClient.get('/csrf/status');
      return response.data.enabled === true;
    } catch (error: any) {
      // If we can't check status, assume CSRF is disabled
      return false;
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
