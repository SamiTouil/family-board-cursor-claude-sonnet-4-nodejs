import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { UserService } from '../../services/user.service';
import { TokenBlacklistService } from '../../services/token-blacklist.service';

// Mock dependencies
jest.mock('../../services/user.service');
jest.mock('../../services/token-blacklist.service');

// Mock response object
const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const mockNext = jest.fn() as NextFunction;

describe('Auth Middleware - Unit Tests', () => {
  const mockUserId = 'test-user-id';
  const mockEmail = 'test@example.com';
  let validToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a valid token
    validToken = jwt.sign(
      { userId: mockUserId, email: mockEmail },
      process.env['JWT_SECRET']!,
      { expiresIn: '1h' }
    );

    // Default mocks
    (TokenBlacklistService.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
    (UserService.getUserById as jest.Mock).mockResolvedValue({
      id: mockUserId,
      email: mockEmail,
      firstName: 'Test',
      lastName: 'User',
    });
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

      expect(TokenBlacklistService.isTokenBlacklisted).toHaveBeenCalledWith(validToken);
      expect(UserService.getUserById).toHaveBeenCalledWith(mockUserId);
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(mockUserId);
      expect(req.user?.email).toBe(mockEmail);
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

    it('should return 401 when token is blacklisted', async () => {
      (TokenBlacklistService.isTokenBlacklisted as jest.Mock).mockResolvedValue(true);

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
        message: 'errors.tokenRevoked',
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
        { userId: mockUserId, email: mockEmail },
        process.env['JWT_SECRET']!,
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
      (UserService.getUserById as jest.Mock).mockResolvedValue(null);

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
  });

  describe('optionalAuth', () => {
    it('should set user in request when valid token provided', async () => {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await optionalAuth(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(mockUserId);
      expect(req.user?.email).toBe(mockEmail);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without setting user when no token provided', async () => {
      const req = {
        headers: {},
      } as AuthenticatedRequest;
      const res = mockResponse();

      await optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without setting user when token is blacklisted', async () => {
      (TokenBlacklistService.isTokenBlacklisted as jest.Mock).mockResolvedValue(true);

      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without setting user when token is invalid', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as AuthenticatedRequest;
      const res = mockResponse();

      await optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});