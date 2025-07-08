import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

export class TokenBlacklistService {
  private static redis: Redis | null = null;
  private static isRedisAvailable = false;

  static initialize(): void {
    try {
      const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected for token blacklisting');
        this.isRedisAvailable = true;
      });

      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
        this.isRedisAvailable = false;
      });
    } catch (error) {
      console.warn('Token blacklisting service not available - Redis connection failed');
      this.isRedisAvailable = false;
    }
  }

  static async blacklistToken(token: string): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      console.warn('Token blacklisting skipped - Redis not available');
      return;
    }

    try {
      // Decode token to get expiration
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return;
      }

      // Calculate TTL (time until token expires)
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl > 0) {
        // Store token in blacklist with expiration
        await this.redis.setex(`blacklist:${token}`, ttl, '1');
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.isRedisAvailable || !this.redis) {
      // If Redis is not available, tokens cannot be blacklisted
      return false;
    }

    try {
      const result = await this.redis.get(`blacklist:${token}`);
      return result === '1';
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}