import axios from 'axios';
import { csrfService } from './csrf';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for CSRF protection
});

// Request interceptor to add auth token and CSRF token
apiClient.interceptors.request.use(async (config) => {
  // Add auth token
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token for state-changing requests
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    // Skip CSRF token for auth endpoints (login, signup)
    const isAuthEndpoint = config.url?.includes('/auth/login') ||
                          config.url?.includes('/auth/signup') ||
                          config.url?.includes('/csrf/token');

    if (!isAuthEndpoint) {
      try {
        const csrfToken = await csrfService.getToken();
        config.headers['X-CSRF-Token'] = csrfToken;
      } catch (error) {
        console.warn('Failed to get CSRF token:', error);
        // Continue with request - server might have CSRF disabled
      }
    }
  }

  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Only clear auth data and redirect if this is NOT a login attempt
      if (!error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        csrfService.clearToken(); // Clear CSRF token cache
        // Redirect to login will be handled by auth context
        window.location.href = '/';
      }
    } else if (error.response?.status === 403 &&
               error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      // CSRF token is invalid, try to refresh and retry
      console.warn('CSRF token invalid, attempting to refresh...');

      try {
        await csrfService.refreshToken();

        // Retry the original request with new token
        const originalRequest = error.config;
        if (originalRequest && !originalRequest._csrfRetry) {
          originalRequest._csrfRetry = true;
          const newToken = await csrfService.getToken();
          originalRequest.headers['X-CSRF-Token'] = newToken;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('Failed to refresh CSRF token:', refreshError);
      }
    }
    return Promise.reject(error);
  }
);