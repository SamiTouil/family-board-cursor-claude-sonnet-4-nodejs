import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';
import { CreateUserSchema, LoginSchema } from '../types/user.types';
import { i18next } from '../config/i18n';

/**
 * Controller for handling authentication-related HTTP requests
 */
export class AuthController extends BaseController {

  /**
   * User signup
   */
  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = CreateUserSchema.parse(req.body);
      const result = await UserService.signup(validatedData);
      
      this.sendSuccess(res, result, i18next.t('success.signupSuccessful'), 201);
    } catch (error) {
      console.error('Signup error:', error);
      
      if (error instanceof Error && error.name === 'ZodError') {
        this.sendValidationError(res, (error as any).errors);
        return;
      }
      
      if (error instanceof Error) {
        this.sendError(res, error.message, 400);
      } else {
        this.sendError(res, 'An unexpected error occurred', 500);
      }
    }
  };

  /**
   * User login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = LoginSchema.parse(req.body);
      const result = await UserService.login(validatedData);
      
      this.sendSuccess(res, result, i18next.t('success.loginSuccessful'));
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error && error.name === 'ZodError') {
        this.sendValidationError(res, (error as any).errors);
        return;
      }
      
      if (error instanceof Error) {
        this.sendError(res, error.message, 400);
      } else {
        this.sendError(res, 'An unexpected error occurred', 500);
      }
    }
  };

  /**
   * User logout (mainly for client-side token cleanup)
   */
  logout = this.asyncHandler(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    // In a simple JWT implementation, logout is handled client-side by removing the token
    // This endpoint can be used for logging purposes or future token blacklisting
    this.sendSuccessMessage(res, i18next.t('success.logoutSuccessful'));
  });

  /**
   * Get current user
   */
  getCurrentUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      this.sendError(res, i18next.t('errors.unauthorized'), 401);
      return;
    }

    const user = await UserService.getUserById(req.user.userId);
    
    if (!user) {
      this.sendError(res, i18next.t('errors.userNotFound'), 404);
      return;
    }
    
    this.sendSuccess(res, user);
  });

  /**
   * Refresh token
   */
  refreshToken = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      this.sendError(res, i18next.t('errors.unauthorized'), 401);
      return;
    }

    const result = await UserService.refreshToken(req.user.userId);
    
    this.sendSuccess(res, result);
  });
}

// Export a singleton instance
export const authController = new AuthController();