import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserSchema, LoginSchema } from '../types/user.types';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { i18next } from '../config/i18n';

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

// Logout (mainly for client-side token cleanup, could be extended for token blacklisting)
router.post('/logout', authenticateToken, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  // In a simple JWT implementation, logout is handled client-side by removing the token
  // This endpoint can be used for logging purposes or future token blacklisting
  res.json({
    success: true,
    message: i18next.t('success.logoutSuccessful'),
  });
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

// Refresh token
router.post('/refresh', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: i18next.t('errors.unauthorized'),
      });
      return;
    }

    const result = await UserService.refreshToken(req.user.userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes }; 