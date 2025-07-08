import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface CSRFRequest extends Request {
  csrfToken?: string;
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfProtection(
  req: CSRFRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF for GET requests and OPTIONS
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF for public auth endpoints
  const publicEndpoints = ['/api/auth/login', '/api/auth/signup', '/api/auth/refresh'];
  if (publicEndpoints.includes(req.path)) {
    return next();
  }

  // Get CSRF token from header
  const headerToken = req.headers['x-csrf-token'] as string;
  
  // Get CSRF token from cookie
  const cookieToken = req.cookies?.['csrf-token'];

  // Validate tokens
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
    });
    return;
  }

  next();
}

export function setCSRFCookie(res: Response): void {
  const token = generateCSRFToken();
  
  res.cookie('csrf-token', token, {
    httpOnly: false, // Must be accessible by JavaScript
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}