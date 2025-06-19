import { Router, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserSchema, UpdateUserSchema } from '../types/user.types';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { i18next } from '../config/i18n';

const router = Router();

// Create user (admin only - for direct user creation)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = CreateUserSchema.parse(req.body);
    const user = await UserService.createUser(validatedData);
    
    res.status(201).json({
      success: true,
      message: i18next.t('success.userCreated'),
      data: user,
    });
  } catch (error) {
    next(error);
  }
});


// Get user by ID (protected)
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    // Users can only access their own data unless they're admin
    if (req.user?.userId !== userId) {
      res.status(403).json({
        success: false,
        message: i18next.t('errors.unauthorized'),
      });
      return;
    }

    const user = await UserService.getUserById(userId);
    
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

// Update user (protected - users can only update themselves)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    // Users can only update their own data
    if (req.user?.userId !== userId) {
      res.status(403).json({
        success: false,
        message: i18next.t('errors.unauthorized'),
      });
      return;
    }

    const validatedData = UpdateUserSchema.parse(req.body);
    const user = await UserService.updateUser(userId, validatedData);
    
    res.json({
      success: true,
      message: i18next.t('success.userUpdated'),
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (protected - users can only delete themselves)
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    // Users can only delete their own account
    if (req.user?.userId !== userId) {
      res.status(403).json({
        success: false,
        message: i18next.t('errors.unauthorized'),
      });
      return;
    }

    await UserService.deleteUser(userId);
    
    res.json({
      success: true,
      message: i18next.t('success.userDeleted'),
    });
  } catch (error) {
    next(error);
  }
});

export { router as userRoutes }; 