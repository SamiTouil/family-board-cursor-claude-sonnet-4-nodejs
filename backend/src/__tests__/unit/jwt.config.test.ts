import { getJwtSecret, JWT_CONFIG } from '../../config/jwt.config';
import { resetConfig } from '../../config';

describe('JWT Configuration', () => {
  const originalEnv = process.env['JWT_SECRET'];
  const originalDbUrl = process.env['DATABASE_URL'];

  beforeEach(() => {
    // Ensure we have a valid DATABASE_URL for config validation
    process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
  });

  afterEach(() => {
    // Reset the config cache and restore original environment
    resetConfig();
    if (originalEnv) {
      process.env['JWT_SECRET'] = originalEnv;
    } else {
      delete process.env['JWT_SECRET'];
    }
    if (originalDbUrl) {
      process.env['DATABASE_URL'] = originalDbUrl;
    }
  });

  describe('getJwtSecret', () => {
    it('should return JWT secret when properly configured', () => {
      process.env['JWT_SECRET'] = 'a-very-strong-jwt-secret-that-is-at-least-32-characters-long';
      resetConfig(); // Reset config to pick up the new JWT_SECRET
      
      const secret = getJwtSecret();
      
      expect(secret).toBe('a-very-strong-jwt-secret-that-is-at-least-32-characters-long');
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env['JWT_SECRET'];
      resetConfig(); // Reset config to pick up the deleted JWT_SECRET
      
      expect(() => getJwtSecret()).toThrow(
        'Configuration validation failed'
      );
    });

    it('should throw error when JWT_SECRET is too short', () => {
      process.env['JWT_SECRET'] = 'short-secret';
      resetConfig(); // Reset config to pick up the new JWT_SECRET
      
      expect(() => getJwtSecret()).toThrow(
        'Configuration validation failed'
      );
    });

    it('should accept strong secrets that are case-sensitive', () => {
      process.env['JWT_SECRET'] = 'SECRET-is-different-from-secret-and-this-is-32-chars-long';
      resetConfig(); // Reset config to pick up the new JWT_SECRET
      
      expect(() => getJwtSecret()).not.toThrow();
    });
  });

  describe('JWT_CONFIG', () => {
    it('should have correct configuration constants', () => {
      expect(JWT_CONFIG.EXPIRES_IN).toBe('7d');
      expect(JWT_CONFIG.ALGORITHM).toBe('HS256');
    });
  });
});
