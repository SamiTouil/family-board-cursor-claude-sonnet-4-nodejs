import { getJwtSecret, JWT_CONFIG } from '../../config/jwt.config';

describe('JWT Configuration', () => {
  const originalEnv = process.env['JWT_SECRET'];

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env['JWT_SECRET'] = originalEnv;
    } else {
      delete process.env['JWT_SECRET'];
    }
  });

  describe('getJwtSecret', () => {
    it('should return JWT secret when properly configured', () => {
      process.env['JWT_SECRET'] = 'a-very-strong-jwt-secret-that-is-at-least-32-characters-long';
      
      const secret = getJwtSecret();
      
      expect(secret).toBe('a-very-strong-jwt-secret-that-is-at-least-32-characters-long');
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env['JWT_SECRET'];
      
      expect(() => getJwtSecret()).toThrow(
        'JWT_SECRET environment variable is required. ' +
        'Please set a strong, random JWT secret in your environment variables.'
      );
    });

    it('should throw error when JWT_SECRET is too short', () => {
      process.env['JWT_SECRET'] = 'short-secret';
      
      expect(() => getJwtSecret()).toThrow(
        'JWT_SECRET must be at least 32 characters long for security. ' +
        'Please use a strong, random secret.'
      );
    });

    it('should throw error for weak/common secrets', () => {
      // Test the long weak secrets that would pass length check
      const longWeakSecrets = [
        'your-super-secret-jwt-key-change-this-in-production',
      ];

      longWeakSecrets.forEach(weakSecret => {
        process.env['JWT_SECRET'] = weakSecret;

        expect(() => getJwtSecret()).toThrow(
          'JWT_SECRET appears to be a weak or default secret. ' +
          'Please use a strong, random secret for security.'
        );
      });
    });

    it('should throw error for short weak secrets', () => {
      const shortWeakSecrets = [
        'secret',
        'jwt-secret',
        'your-secret-key',
        'fallback-secret',
        'test-secret',
        'development-secret',
        '123456',
        'password',
      ];

      shortWeakSecrets.forEach(weakSecret => {
        process.env['JWT_SECRET'] = weakSecret;

        expect(() => getJwtSecret()).toThrow(
          'JWT_SECRET must be at least 32 characters long for security. ' +
          'Please use a strong, random secret.'
        );
      });
    });

    it('should accept strong secrets that are case-sensitive', () => {
      process.env['JWT_SECRET'] = 'SECRET-is-different-from-secret-and-this-is-32-chars-long';
      
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
