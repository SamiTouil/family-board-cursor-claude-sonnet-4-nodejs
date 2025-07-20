import { Router } from 'express';
import { generateCSRFToken, getCSRFToken } from '../middleware/csrf.middleware';

const router = Router();

/**
 * CSRF Status endpoint
 * GET /api/csrf/status
 *
 * This endpoint allows client applications to check if CSRF protection
 * is currently enabled or disabled on the server.
 */
router.get('/status', (_req, res) => {
  // Check if CSRF validation is disabled via environment variable
  const isEnabled = process.env['DISABLE_CSRF_VALIDATION'] !== 'true';

  res.json({
    enabled: isEnabled,
    message: isEnabled
      ? 'CSRF protection is enabled'
      : 'CSRF protection is disabled'
  });
});

/**
 * CSRF Token endpoint
 * GET /api/csrf/token
 *
 * This endpoint allows client applications to retrieve a CSRF token.
 * The token is automatically generated and set as a cookie, and also
 * returned in the response body for client-side use.
 */
router.get('/token', generateCSRFToken, getCSRFToken);

export { router as csrfRoutes };
