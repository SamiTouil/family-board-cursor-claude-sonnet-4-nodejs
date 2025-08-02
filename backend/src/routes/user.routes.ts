import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { userController } from '../controllers/user.controller';

const router = Router();

// Create user (admin only - for direct user creation)
router.post('/', authenticateToken, userController.createUser);

// Get user by ID (protected)
router.get('/:id', authenticateToken, userController.getUserById);

// Update user (protected - users can only update themselves)
router.put('/:id', authenticateToken, userController.updateUser);

// Change password (protected - users can only change their own password)
router.put('/:id/password', authenticateToken, userController.changePassword);

// Delete user (protected - users can only delete themselves)
router.delete('/:id', authenticateToken, userController.deleteUser);

export { router as userRoutes }; 