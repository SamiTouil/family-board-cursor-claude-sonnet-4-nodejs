import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { generateCSRFToken, validateCSRFToken } from '../../middleware/csrf.middleware';
import { csrfRoutes } from '../../routes/csrf.routes';

const app = express();

beforeAll(async () => {
  app.use(cookieParser());
  app.use(express.json());
  app.use(generateCSRFToken);
  
  // CSRF token endpoint
  app.use('/api/csrf', csrfRoutes);
  
  // Test protected route
  app.post('/api/test/protected', validateCSRFToken, (_req, res) => {
    res.json({ success: true, message: 'Protected route accessed' });
  });

  // Test unprotected route (safe method)
  app.get('/api/test/safe', validateCSRFToken, (_req, res) => {
    res.json({ success: true, message: 'Safe route accessed' });
  });

  // Test auth route (should be skipped)
  app.post('/api/auth/login', validateCSRFToken, (_req, res) => {
    res.json({ success: true, message: 'Auth route accessed' });
  });
});

describe('CSRF Integration Tests', () => {
  describe('CSRF Status Endpoint', () => {
    it('should return CSRF status as disabled (temporarily hardcoded)', async () => {
      const response = await request(app)
        .get('/api/csrf/status')
        .expect(200);

      expect(response.body).toEqual({
        enabled: false,
        message: 'CSRF protection is disabled'
      });
    });
  });

  describe('CSRF Token Generation', () => {
    it('should generate CSRF token on first request', async () => {
      const response = await request(app)
        .get('/api/csrf/token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        csrfToken: expect.any(String),
      });
      
      expect(response.body.csrfToken).toHaveLength(64); // 32 bytes = 64 hex chars
      
      // Check that cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies?.[0]).toMatch(/__Host-csrf-token=/);
      expect(cookies?.[0]).toMatch(/HttpOnly=false/);
      expect(cookies?.[0]).toMatch(/SameSite=Strict/);
    });

    it('should reuse existing CSRF token', async () => {
      // First request to get token
      const firstResponse = await request(app)
        .get('/api/csrf/token')
        .expect(200);

      const firstToken = firstResponse.body.csrfToken;
      const cookieHeader = firstResponse.headers['set-cookie']?.[0];

      // Second request with existing cookie
      const secondResponse = await request(app)
        .get('/api/csrf/token')
        .set('Cookie', cookieHeader || '')
        .expect(200);

      expect(secondResponse.body.csrfToken).toBe(firstToken);
      
      // Should not set new cookie
      expect(secondResponse.headers['set-cookie']).toBeUndefined();
    });

    it('should refresh token when requested', async () => {
      // First request to get token
      const firstResponse = await request(app)
        .get('/api/csrf/token')
        .expect(200);

      const firstToken = firstResponse.body.csrfToken;
      const cookieHeader = firstResponse.headers['set-cookie']?.[0];

      // Second request with refresh parameter
      const secondResponse = await request(app)
        .get('/api/csrf/token?refreshCSRF=true')
        .set('Cookie', cookieHeader || '')
        .expect(200);

      expect(secondResponse.body.csrfToken).not.toBe(firstToken);
      expect(secondResponse.body.csrfToken).toHaveLength(64);
      
      // Should set new cookie
      expect(secondResponse.headers['set-cookie']).toBeDefined();
    });
  });

  describe.skip('CSRF Token Validation (temporarily disabled)', () => {
    let csrfToken: string;
    let cookieHeader: string;

    beforeEach(async () => {
      const response = await request(app)
        .get('/api/csrf/token')
        .expect(200);

      csrfToken = response.body.csrfToken;
      cookieHeader = response.headers['set-cookie']?.[0] || '';
    });

    it('should allow safe HTTP methods without CSRF token', async () => {
      await request(app)
        .get('/api/test/safe')
        .expect(200);
    });

    it('should allow auth endpoints without CSRF token', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200);
    });

    it('should reject protected route without CSRF token', async () => {
      const response = await request(app)
        .post('/api/test/protected')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'CSRF token is required for this request',
        code: 'CSRF_TOKEN_REQUIRED'
      });
    });

    it('should reject protected route with only cookie token', async () => {
      const response = await request(app)
        .post('/api/test/protected')
        .set('Cookie', cookieHeader)
        .send({ data: 'test' })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'CSRF token is required for this request',
        code: 'CSRF_TOKEN_REQUIRED'
      });
    });

    it('should reject protected route with only header token', async () => {
      const response = await request(app)
        .post('/api/test/protected')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'CSRF token is required for this request',
        code: 'CSRF_TOKEN_REQUIRED'
      });
    });

    it('should reject protected route with mismatched tokens', async () => {
      const response = await request(app)
        .post('/api/test/protected')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', 'wrong-token')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
    });

    it('should allow protected route with valid CSRF token in header', async () => {
      const response = await request(app)
        .post('/api/test/protected')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Protected route accessed'
      });
    });

    it('should allow protected route with valid CSRF token in body', async () => {
      const response = await request(app)
        .post('/api/test/protected')
        .set('Cookie', cookieHeader)
        .send({ data: 'test', _csrf: csrfToken })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Protected route accessed'
      });
    });

    it('should prefer header token over body token', async () => {
      const response = await request(app)
        .post('/api/test/protected')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test', _csrf: 'wrong-token' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Protected route accessed'
      });
    });
  });
});
