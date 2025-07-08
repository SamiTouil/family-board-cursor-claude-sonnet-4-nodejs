import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserSchema, LoginSchema } from '../types/user.types';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { i18next } from '../config/i18n';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../middleware/auth.middleware';

const router = Router();

// Signup
router.post('/signup', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = CreateUserSchema.parse(req.body);
    const result = await UserService.signup(validatedData);
    
    res.status(201).json({
      success: true,
      message: i18next.t('success.signupSuccessful'),
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = LoginSchema.parse(req.body);
    const result = await UserService.login(validatedData);
    
    res.json({
      success: true,
      message: i18next.t('success.loginSuccessful'),
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Logout with token blacklisting
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Blacklist the token
      await TokenBlacklistService.blacklistToken(token);
    }
    
    res.json({
      success: true,
      message: i18next.t('success.logoutSuccessful'),
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({
      success: true,
      message: i18next.t('success.logoutSuccessful'),
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: i18next.t('errors.unauthorized'),
      });
      return;
    }

    const user = await UserService.getUserById(req.user.userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: i18next.t('errors.userNotFound'),
      });
      return;
    }
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token - using refresh token instead of access token
router.post('/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: i18next.t('errors.tokenRequired'),
      });
      return;
    }
    
    // Verify refresh token
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(refreshToken, jwtSecret) as JWTPayload;
      
      // Check if it's a refresh token
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
    } catch (error) {
      res.status(401).json({
        success: false,
        message: i18next.t('errors.invalidToken'),
      });
      return;
    }

    const result = await UserService.refreshToken(decoded.userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes }; 