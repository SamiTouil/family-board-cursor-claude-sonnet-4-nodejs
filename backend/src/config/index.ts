import { z } from 'zod';

/**
 * Configuration schema with validation
 * This module provides a centralized, type-safe way to access environment variables
 * All environment variables are validated on startup to catch configuration errors early
 */

// Environment schema with validation rules
const configSchema = z.object({
  // Core Application Settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(65535)),

  // Database Configuration
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DATABASE_URL_HOST: z.string().url('DATABASE_URL_HOST must be a valid URL').optional(),

  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  BCRYPT_ROUNDS: z.string().default('10').transform(val => parseInt(val, 10)).pipe(z.number().int().min(4).max(15)),
  DISABLE_CSRF_VALIDATION: z.string().default('false').transform(val => val === 'true'),

  // CORS Configuration
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL').default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().optional().transform(val => 
    val ? val.split(',').map(origin => origin.trim()) : []
  ),

  // API Configuration
  API_RATE_LIMIT_WINDOW: z.string().default('15').transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)),
  API_RATE_LIMIT_MAX: z.string().default('100').transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)),

  // Localization Configuration
  DEFAULT_LANGUAGE: z.string().default('en'),
  SUPPORTED_LANGUAGES: z.string().default('en,fr').transform(val => val.split(',')),

  // Optional Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined).pipe(z.number().int().min(1).max(65535).optional()),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Optional External Services
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),
});

// TypeScript type for the configuration
export type Config = z.infer<typeof configSchema>;

/**
 * Validates and parses environment variables
 * @param env - Environment variables object (defaults to process.env)
 * @returns Parsed and validated configuration
 * @throws Error if validation fails
 */
function validateConfig(env: Record<string, string | undefined> = process.env): Config {
  try {
    return configSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      
      throw new Error(
        `Configuration validation failed:\n${errorMessages.join('\n')}\n\n` +
        'Please check your environment variables and ensure all required values are set.'
      );
    }
    throw error;
  }
}

/**
 * Lazy-loaded configuration object
 * This is the single source of truth for all environment variables
 * Configuration is only validated when first accessed
 */
let _config: Config | null = null;

function getConfig(): Config {
  if (_config === null) {
    _config = validateConfig();
  }
  return _config;
}

/**
 * Reset the configuration cache - useful for testing
 * @internal This function should only be used in tests
 */
export function resetConfig(): void {
  _config = null;
}

export const config = new Proxy({} as Config, {
  get(_target, prop) {
    return getConfig()[prop as keyof Config];
  }
});

/**
 * Helper functions for specific configuration groups
 */

export const database = {
  get url() { return getConfig().DATABASE_URL; },
  get hostUrl() { return getConfig().DATABASE_URL_HOST; },
} as const;

export const security = {
  get jwtSecret() { return getConfig().JWT_SECRET; },
  get bcryptRounds() { return getConfig().BCRYPT_ROUNDS; },
  get disableCsrfValidation() { return getConfig().DISABLE_CSRF_VALIDATION; },
} as const;

export const cors = {
  get frontendUrl() { return getConfig().FRONTEND_URL; },
  get allowedOrigins() { 
    const cfg = getConfig();
    return [cfg.FRONTEND_URL, ...cfg.ALLOWED_ORIGINS];
  },
} as const;

export const api = {
  get rateLimitWindow() { return getConfig().API_RATE_LIMIT_WINDOW; },
  get rateLimitMax() { return getConfig().API_RATE_LIMIT_MAX; },
} as const;

export const localization = {
  get defaultLanguage() { return getConfig().DEFAULT_LANGUAGE; },
  get supportedLanguages() { return getConfig().SUPPORTED_LANGUAGES; },
} as const;

export const email = {
  get host() { return getConfig().SMTP_HOST; },
  get port() { return getConfig().SMTP_PORT; },
  get user() { return getConfig().SMTP_USER; },
  get pass() { return getConfig().SMTP_PASS; },
  get isConfigured() { 
    const cfg = getConfig();
    return !!(cfg.SMTP_HOST && cfg.SMTP_PORT && cfg.SMTP_USER && cfg.SMTP_PASS);
  },
} as const;

export const external = {
  get sentryDsn() { return getConfig().SENTRY_DSN; },
  get redisUrl() { return getConfig().REDIS_URL; },
} as const;

export const app = {
  get nodeEnv() { return getConfig().NODE_ENV; },
  get port() { return getConfig().PORT; },
  get isDevelopment() { return getConfig().NODE_ENV === 'development'; },
  get isProduction() { return getConfig().NODE_ENV === 'production'; },
  get isTest() { return getConfig().NODE_ENV === 'test'; },
} as const;

// Default export for convenience
export default config;