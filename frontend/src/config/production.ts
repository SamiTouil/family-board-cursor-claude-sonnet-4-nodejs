/**
 * Production Configuration
 * This file contains hardcoded production URLs to ensure they work correctly
 */

export const PRODUCTION_CONFIG = {
  API_URL: 'https://mabt.eu',
  SOCKET_URL: 'https://mabt.eu',
  IS_PRODUCTION: true,
};

// Export individual values for easier importing
export const API_BASE_URL = PRODUCTION_CONFIG.API_URL;
export const SOCKET_BASE_URL = PRODUCTION_CONFIG.SOCKET_URL;
