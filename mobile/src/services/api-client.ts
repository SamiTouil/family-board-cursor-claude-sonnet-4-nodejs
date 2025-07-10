import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { csrfService } from './csrf';

// Get API URL from app config based on environment
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.24:3001/api';

console.log('🌐 API Environment:', Constants.expoConfig?.extra?.environment);
console.log('🔗 API URL:', API_BASE_URL);

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and CSRF token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Add auth token
      const token = await AsyncStorage.getItem('authToken');
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
    } catch (error) {
      console.error('Error in request interceptor:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and CSRF errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Clear invalid auth token
      try {
        await AsyncStorage.multiRemove(['authToken', 'authUser']);
        await csrfService.clearToken(); // Clear CSRF token cache
      } catch (storageError) {
        console.error('Error clearing auth data:', storageError);
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

export default apiClient; 