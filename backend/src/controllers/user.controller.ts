import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';
import { CreateUserSchema, UpdateUserSchema, ChangePasswordSchema } from '../types/user.types';
import { i18next } from '../config/i18n';

/**
 * Controller for handling user-related HTTP requests
 */
export class UserController extends BaseController {

  /**
   * Create user (admin only - for direct user creation)
   */
  createUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const validatedData = CreateUserSchema.parse(req.body);
      const user = await UserService.createUser(validatedData);
      
      this.sendSuccess(res, user, i18next.t('success.userCreated'), 201);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        this.sendValidationError(res, (error as any).errors);
        return;
      }
      throw error;
    }
  });

  /**
   * Get user by ID (protected)
   */
  getUserById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getParam(req, 'id');
    const requestingUserId = this.getUserId(req);
    
    if (!userId) {
      this.sendError(res, 'User ID is required');
      return;
    }

    // Users can only access their own data unless they're admin
    if (requestingUserId !== userId) {
      this.sendError(res, i18next.t('errors.unauthorized'), 403);
      return;
    }

    const user = await UserService.getUserById(userId);
    
    if (!user) {
      this.sendError(res, i18next.t('errors.userNotFound'), 404);
      return;
    }
    
    this.sendSuccess(res, user);
  });

  /**
   * Update user (protected - users can only update themselves)
   */
  updateUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getParam(req, 'id');
    const requestingUserId = this.getUserId(req);
    
    if (!userId) {
      this.sendError(res, 'User ID is required');
      return;
    }

    // Users can only update their own data
    if (requestingUserId !== userId) {
      this.sendError(res, i18next.t('errors.unauthorized'), 403);
      return;
    }

    try {
      const validatedData = UpdateUserSchema.parse(req.body);
      const user = await UserService.updateUser(userId, validatedData);
      
      this.sendSuccess(res, user, i18next.t('success.userUpdated'));
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        this.sendValidationError(res, (error as any).errors);
        return;
      }
      throw error;
    }
  });

  /**
   * Change password (protected - users can only change their own password)
   */
  changePassword = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getParam(req, 'id');
    const requestingUserId = this.getUserId(req);
    
    if (!userId) {
      this.sendError(res, 'User ID is required');
      return;
    }

    // Users can only change their own password
    if (requestingUserId !== userId) {
      this.sendError(res, i18next.t('errors.unauthorized'), 403);
      return;
    }

    try {
      const validatedData = ChangePasswordSchema.parse(req.body);
      const user = await UserService.changePassword(userId, validatedData);
      
      this.sendSuccess(res, user, i18next.t('success.passwordChanged'));
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        this.sendValidationError(res, (error as any).errors);
        return;
      }
      throw error;
    }
  });

  /**
   * Delete user (protected - users can only delete themselves)
   */
  deleteUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getParam(req, 'id');
    const requestingUserId = this.getUserId(req);
    
    if (!userId) {
      this.sendError(res, 'User ID is required');
      return;
    }

    // Users can only delete their own account
    if (requestingUserId !== userId) {
      this.sendError(res, i18next.t('errors.unauthorized'), 403);
      return;
    }

    await UserService.deleteUser(userId);
    
    this.sendSuccessMessage(res, i18next.t('success.userDeleted'));
  });
}

// Export a singleton instance
export const userController = new UserController();