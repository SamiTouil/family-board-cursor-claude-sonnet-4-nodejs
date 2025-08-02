import { security } from './index';

/**
 * JWT Configuration
 * 
 * This module provides secure JWT configuration.
 * Uses the centralized configuration system for JWT secrets.
 */

/**
 * Get the JWT secret from the centralized configuration.
 * The secret is already validated by the config module.
 * 
 * @returns The JWT secret string
 */
export function getJwtSecret(): string {
  return security.jwtSecret;
}

/**
 * JWT configuration constants
 */
export const JWT_CONFIG = {
  EXPIRES_IN: '7d',
  ALGORITHM: 'HS256' as const,
} as const;
