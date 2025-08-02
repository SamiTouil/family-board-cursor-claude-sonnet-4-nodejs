import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Signup
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Logout (mainly for client-side token cleanup, could be extended for token blacklisting)
router.post('/logout', authenticateToken, authController.logout);

// Get current user
router.get('/me', authenticateToken, authController.getCurrentUser);

// Refresh token
router.post('/refresh', authenticateToken, authController.refreshToken);

export { router as authRoutes }; 