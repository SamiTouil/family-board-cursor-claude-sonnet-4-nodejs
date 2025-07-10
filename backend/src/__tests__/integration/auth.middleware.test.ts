import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../config/jwt.config';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { UserService } from '../../services/user.service';
import { getMockUser } from '../integration-setup';

// Mock response object
const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const mockNext = jest.fn() as NextFunction;

describe('Auth Middleware', () => {
  let validToken: string;
  let userId: string;
  let currentUserEmail: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create a user and get a valid token
    const mockUser = getMockUser();
    const result = await UserService.signup(mockUser);
    validToken = result.token;
    userId = result.user.id;
    currentUserEmail = result.user.email!; // Non-null assertion since we just created a regular user
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token and set user in request', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(userId);
      expect(req.user?.email).toBe(currentUserEmail);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      const req = {
        headers: {},
      } as AuthenticatedRequest;
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'errors.tokenRequired',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'errors.invalidToken',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { userId, email: currentUserEmail },
        getJwtSecret(),
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'errors.tokenExpired',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user no longer exists', async () => {
      // Delete the user after creating the token
      await UserService.deleteUser(userId);

      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'errors.userNotFound',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', async () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat',
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'errors.tokenRequired',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user in request when valid token provided', () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(userId);
      expect(req.user?.email).toBe(currentUserEmail);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without setting user when no token provided', () => {
      const req = {
        headers: {},
      } as AuthenticatedRequest;
      const res = mockResponse();

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without setting user when invalid token provided', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without setting user when expired token provided', () => {
      const expiredToken = jwt.sign(
        { userId, email: currentUserEmail },
        getJwtSecret(),
        { expiresIn: '-1h' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
}); 