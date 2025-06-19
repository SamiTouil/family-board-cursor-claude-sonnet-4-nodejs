import request from 'supertest';
import express from 'express';
import { authRoutes } from '../routes/auth.routes';
import { errorHandler } from '../middleware/error.middleware';
import { getMockUser } from './setup';

const app = express();

beforeAll(async () => {
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
});

describe('Auth Routes', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user and return user with token', async () => {
      const mockUser = getMockUser();
      const response = await request(app)
        .post('/api/auth/signup')
        .send(mockUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('success.signupSuccessful');
      expect(response.body.data.user).toMatchObject({
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
      });
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'John',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate email', async () => {
      const mockUser = getMockUser();
      await request(app)
        .post('/api/auth/signup')
        .send(mockUser)
        .expect(201);

      const response = await request(app)
        .post('/api/auth/signup')
        .send(mockUser)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = getMockUser();
      await request(app)
        .post('/api/auth/signup')
        .send(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: mockUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('success.loginSuccessful');
      expect(response.body.data.user.email).toBe(mockUser.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const mockUser = getMockUser();
      await request(app)
        .post('/api/auth/signup')
        .send(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          // Missing password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const mockUser = getMockUser();
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(mockUser);
      
      authToken = signupResponse.body.data.token;
      userId = signupResponse.body.data.user.id;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('errors.tokenRequired');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('errors.invalidToken');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const mockUser = getMockUser();
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(mockUser);
      
      authToken = signupResponse.body.data.token;
      userId = signupResponse.body.data.user.id;
    });

    it('should refresh token with valid token', async () => {
      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(userId);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(authToken);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('errors.tokenRequired');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const mockUser = getMockUser();
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(mockUser);
      
      authToken = signupResponse.body.data.token;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('success.logoutSuccessful');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('errors.tokenRequired');
    });
  });
}); 