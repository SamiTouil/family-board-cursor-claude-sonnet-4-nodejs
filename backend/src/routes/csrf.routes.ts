import { Router } from 'express';
import { generateCSRFToken, getCSRFToken } from '../middleware/csrf.middleware';

const router = Router();

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
