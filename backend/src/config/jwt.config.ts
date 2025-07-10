/**
 * JWT Configuration
 * 
 * This module provides secure JWT configuration without fallback secrets.
 * The application will fail to start if JWT_SECRET is not properly configured.
 */

/**
 * Get the JWT secret from environment variables.
 * Throws an error if JWT_SECRET is not set or is too weak.
 * 
 * @returns The JWT secret string
 * @throws Error if JWT_SECRET is not configured or is too weak
 */
export function getJwtSecret(): string {
  const jwtSecret = process.env['JWT_SECRET'];
  
  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Please set a strong, random JWT secret in your environment variables.'
    );
  }
  
  // Validate minimum security requirements
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. ' +
      'Please use a strong, random secret.'
    );
  }
  
  // Check for common weak secrets
  const weakSecrets = [
    'secret',
    'jwt-secret',
    'your-secret-key',
    'your-super-secret-jwt-key',
    'your-super-secret-jwt-key-change-this-in-production',
    'fallback-secret',
    'test-secret',
    'development-secret',
    '123456',
    'password',
  ];
  
  if (weakSecrets.includes(jwtSecret.toLowerCase())) {
    throw new Error(
      'JWT_SECRET appears to be a weak or default secret. ' +
      'Please use a strong, random secret for security.'
    );
  }
  
  return jwtSecret;
}

/**
 * JWT configuration constants
 */
export const JWT_CONFIG = {
  EXPIRES_IN: '7d',
  ALGORITHM: 'HS256' as const,
} as const;
