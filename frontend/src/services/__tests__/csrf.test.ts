/**
 * CSRF Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { csrfService } from '../csrf';
import { apiClient } from '../api-client';

// Mock the API client
vi.mock('../api-client');
const mockedApiClient = vi.mocked(apiClient);

describe('CSRF Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    csrfService.clearToken();
  });

  describe('getToken', () => {
    it('should fetch token from server', async () => {
      const mockToken = 'test-csrf-token-123';
      mockedApiClient.get.mockResolvedValueOnce({
        data: { success: true, csrfToken: mockToken },
      });

      const token = await csrfService.getToken();

      expect(token).toBe(mockToken);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/csrf/token');
    });

    it('should cache token and reuse it', async () => {
      const mockToken = 'test-csrf-token-123';
      mockedApiClient.get.mockResolvedValueOnce({
        data: { success: true, csrfToken: mockToken },
      });

      // First call
      const token1 = await csrfService.getToken();
      // Second call
      const token2 = await csrfService.getToken();

      expect(token1).toBe(mockToken);
      expect(token2).toBe(mockToken);
      expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should force refresh when requested', async () => {
      const mockToken1 = 'test-csrf-token-123';
      const mockToken2 = 'test-csrf-token-456';
      
      mockedApiClient.get
        .mockResolvedValueOnce({
          data: { success: true, csrfToken: mockToken1 },
        })
        .mockResolvedValueOnce({
          data: { success: true, csrfToken: mockToken2 },
        });

      // First call
      const token1 = await csrfService.getToken();
      // Force refresh
      const token2 = await csrfService.getToken(true);

      expect(token1).toBe(mockToken1);
      expect(token2).toBe(mockToken2);
      expect(mockedApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/csrf/token');
      expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/csrf/token?refreshCSRF=true');
    });

    it('should handle fetch errors', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(csrfService.getToken()).rejects.toThrow('Unable to fetch CSRF token');
    });

    it('should handle invalid response', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: { success: false },
      });

      await expect(csrfService.getToken()).rejects.toThrow('Unable to fetch CSRF token');
    });
  });

  describe('isCSRFEnabled', () => {
    it('should return true when CSRF is enabled', async () => {
      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { code: 'CSRF_TOKEN_REQUIRED' },
        },
      });

      const isEnabled = await csrfService.isCSRFEnabled();

      expect(isEnabled).toBe(true);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/test-csrf-check', {});
    });

    it('should return false when CSRF is disabled', async () => {
      mockedApiClient.post.mockResolvedValueOnce({ data: {} });

      const isEnabled = await csrfService.isCSRFEnabled();

      expect(isEnabled).toBe(false);
    });

    it('should return false on other errors', async () => {
      mockedApiClient.post.mockRejectedValueOnce({
        response: { status: 500 },
      });

      const isEnabled = await csrfService.isCSRFEnabled();

      expect(isEnabled).toBe(false);
    });
  });

  describe('clearToken', () => {
    it('should clear cached token', async () => {
      const mockToken = 'test-csrf-token-123';
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, csrfToken: mockToken },
      });

      // Get token
      await csrfService.getToken();
      
      // Clear token
      csrfService.clearToken();
      
      // Get token again - should fetch from server
      await csrfService.getToken();

      expect(mockedApiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshToken', () => {
    it('should force refresh token', async () => {
      const mockToken1 = 'test-csrf-token-123';
      const mockToken2 = 'test-csrf-token-456';
      
      mockedApiClient.get
        .mockResolvedValueOnce({
          data: { success: true, csrfToken: mockToken1 },
        })
        .mockResolvedValueOnce({
          data: { success: true, csrfToken: mockToken2 },
        });

      // Get initial token
      const token1 = await csrfService.getToken();
      
      // Refresh token
      const token2 = await csrfService.refreshToken();

      expect(token1).toBe(mockToken1);
      expect(token2).toBe(mockToken2);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/csrf/token?refreshCSRF=true');
    });
  });
});
