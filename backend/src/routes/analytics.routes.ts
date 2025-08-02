import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { analyticsController } from '../controllers/analytics.controller';

const router = Router();

// Apply auth middleware to all analytics routes
router.use(authenticateToken);

// Get shift analytics
router.get('/shifts', analyticsController.getShiftAnalytics);

// Get task split analytics (existing functionality)
router.get('/task-split', analyticsController.getTaskSplitAnalytics);

// Get historical fairness scores
router.get('/fairness-history', analyticsController.getFairnessHistory);

// Family-specific analytics routes (moved from family.routes.ts)
// Get task split analytics for a specific family
router.get('/:familyId/task-split', analyticsController.getTaskSplit);

// Get fairness history for a specific family
router.get('/:familyId/fairness-history', analyticsController.getFairnessHistoryForFamily);

export default router;