import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService, ShiftAnalyticsParams } from '../services/analytics.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { AppError } from '../utils/errors';

const router = Router();
const prisma = new PrismaClient();
const analyticsService = new AnalyticsService(prisma);

// Get shift analytics
router.get('/shifts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.familyId) {
      throw new AppError('User not authenticated or not part of a family', 401);
    }

    const {
      timeframe = '3months',
      startDate,
      endDate,
      memberIds,
      showVirtual = 'true'
    } = req.query;

    const params: ShiftAnalyticsParams = {
      familyId: user.familyId,
      timeframe: timeframe as '3months' | '6months' | '1year' | 'custom',
      ...(startDate && { startDate: startDate as string }),
      ...(endDate && { endDate: endDate as string }),
      ...(memberIds && { memberIds: (memberIds as string).split(',') }),
      showVirtual: showVirtual === 'true'
    };

    const analytics = await analyticsService.getShiftAnalytics(params);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching shift analytics:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
  }
});

// Get task split analytics (existing functionality)
router.get('/task-split', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.familyId) {
      throw new AppError('User not authenticated or not part of a family', 401);
    }

    const { periodDays = '28', referenceDate } = req.query;

    const analytics = await analyticsService.calculateTaskSplit(
      user.familyId,
      parseInt(periodDays as string),
      referenceDate as string | undefined
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error calculating task split:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to calculate task split' });
    }
  }
});

// Get historical fairness scores
router.get('/fairness-history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.familyId) {
      throw new AppError('User not authenticated or not part of a family', 401);
    }

    const { weeks = '12' } = req.query;

    const history = await analyticsService.getHistoricalFairness(
      user.familyId,
      parseInt(weeks as string)
    );

    res.json(history);
  } catch (error) {
    console.error('Error fetching fairness history:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch fairness history' });
    }
  }
});

export default router;