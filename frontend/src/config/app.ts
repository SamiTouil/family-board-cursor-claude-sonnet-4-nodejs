/**
 * APPLICATION CONFIGURATION
 * Uses environment variables with proper fallbacks
 */

// Get environment variables with fallbacks
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Environment info
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';
export const IS_PRODUCTION = ENVIRONMENT === 'production';
export const IS_DEVELOPMENT = ENVIRONMENT === 'development';

// Application info
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Family Board';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Feature flags
export const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
export const ENABLE_PUSH_NOTIFICATIONS = import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true';
