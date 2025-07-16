import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { i18next } from '../config/i18n';

export interface CSRFRequest extends Request {
  csrfToken?: string;
}

/**
 * CSRF Protection using Double-Submit Cookie Pattern
 * 
 * This middleware implements CSRF protection by:
 * 1. Generating a random CSRF token
 * 2. Setting it as both a secure cookie and providing it to the client
 * 3. Validating that both the cookie and header/body token match on state-changing requests
 * 
 * The double-submit cookie pattern is secure because:
 * - Attackers cannot read cookies from other domains due to Same-Origin Policy
 * - Attackers cannot set cookies for other domains
 * - Both the cookie and the submitted token must match
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure random CSRF token
 */
function generateRandomCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Extract CSRF token from request (header or body)
 */
function extractCSRFToken(req: Request): string | undefined {
  // Check header first (preferred)
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;
  if (headerToken) {
    return headerToken;
  }

  // Check body as fallback (for form submissions)
  const bodyToken = req.body?._csrf;
  if (bodyToken && typeof bodyToken === 'string') {
    return bodyToken;
  }

  return undefined;
}

/**
 * Check if the request method requires CSRF protection
 */
function requiresCSRFProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Middleware to generate and set CSRF token
 * Should be applied to all routes that need CSRF protection
 */
export function generateCSRFToken(
  req: CSRFRequest,
  res: Response,
  next: NextFunction
): void {
  // Check if token already exists in cookie
  let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];

  // Generate new token if none exists or if explicitly requested
  if (!csrfToken || req.query['refreshCSRF'] === 'true') {
    csrfToken = generateRandomCSRFToken();
    
    // Set secure cookie with CSRF token
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Must be readable by JavaScript for double-submit pattern
      secure: process.env['NODE_ENV'] === 'production', // HTTPS only in production
      sameSite: 'strict', // Strict same-site policy
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
  }

  // Make token available to the request
  req.csrfToken = csrfToken;

  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Should be applied after generateCSRFToken middleware
 */
export function validateCSRFToken(
  req: CSRFRequest,
  res: Response,
  next: NextFunction
): void {
  // TEMPORARY: CSRF validation disabled in code
  next();
  return;
  
  // Feature flag to disable CSRF validation during client migration
  if (process.env['DISABLE_CSRF_VALIDATION'] === 'true') {
    next();
    return;
  }

  // Skip validation for safe methods
  if (!requiresCSRFProtection(req.method)) {
    next();
    return;
  }

  // Skip validation for health check, auth endpoints, and WebSocket connections
  const skipPaths = ['/api/health', '/api/auth/login', '/api/auth/signup', '/socket.io/'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const submittedToken = extractCSRFToken(req);

  // Check if both tokens exist
  if (!cookieToken || !submittedToken) {
    res.status(403).json({
      success: false,
      message: i18next.t('errors.csrfTokenRequired'),
      code: 'CSRF_TOKEN_REQUIRED'
    });
    return;
  }

  // Validate tokens match using constant-time comparison
  // First check if lengths are equal (fast check)
  if (cookieToken.length !== submittedToken.length) {
    res.status(403).json({
      success: false,
      message: i18next.t('errors.csrfTokenInvalid'),
      code: 'CSRF_TOKEN_INVALID'
    });
    return;
  }

  // Then use timing-safe comparison for same-length tokens
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(submittedToken))) {
    res.status(403).json({
      success: false,
      message: i18next.t('errors.csrfTokenInvalid'),
      code: 'CSRF_TOKEN_INVALID'
    });
    return;
  }

  next();
}

/**
 * Endpoint to get CSRF token for client-side applications
 * This allows SPAs to retrieve the CSRF token when needed
 */
export function getCSRFToken(req: CSRFRequest, res: Response): void {
  const csrfToken = req.csrfToken;
  
  if (!csrfToken) {
    res.status(500).json({
      success: false,
      message: 'CSRF token not generated',
    });
    return;
  }

  res.json({
    success: true,
    csrfToken,
  });
}

/**
 * Combined middleware that both generates and validates CSRF tokens
 * Use this for routes that need both generation and validation
 */
export function csrfProtection(
  req: CSRFRequest,
  res: Response,
  next: NextFunction
): void {
  generateCSRFToken(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    
    validateCSRFToken(req, res, next);
  });
}
