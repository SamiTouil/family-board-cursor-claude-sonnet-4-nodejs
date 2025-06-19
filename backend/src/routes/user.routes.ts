import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserSchema, UpdateUserSchema, LoginSchema } from '../types/user.types';
import { i18next } from '../config/i18n';

const router = Router();

// Create user
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = LoginSchema.parse(req.body);
    const result = await UserService.login(validatedData);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
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

// Update user
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
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

// Delete user
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
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