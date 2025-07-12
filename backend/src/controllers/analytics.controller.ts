import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AnalyticsService } from '../services/analytics.service';
import { z } from 'zod';

const analyticsService = new AnalyticsService(prisma);

const getTaskSplitSchema = z.object({
  periodDays: z.coerce.number().min(7).max(365).optional().default(28)
});

export const analyticsController = {
  /**
   * Get task split analytics for a family
   * GET /families/:familyId/analytics/task-split
   */
  async getTaskSplit(req: Request, res: Response) {
    try {
      const { familyId } = req.params;
      const userId = (req as any).user.id;

      // Validate query parameters
      const query = getTaskSplitSchema.parse(req.query);

      // Check if user belongs to the family
      const member = await prisma.familyMember.findFirst({
        where: {
          familyId: familyId!,
          userId
        }
      });

      if (!member) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this family'
        });
      }

      // Calculate task split analytics
      const analytics = await analyticsService.calculateTaskSplit(
        familyId!,
        query.periodDays
      );

      return res.json({
        data: analytics
      });
    } catch (error) {
      console.error('Error getting task split analytics:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          errors: error.errors
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to calculate task split analytics'
      });
    }
  },

  /**
   * Get historical fairness scores
   * GET /families/:familyId/analytics/fairness-history
   */
  async getFairnessHistory(req: Request, res: Response) {
    try {
      const { familyId } = req.params;
      const userId = (req as any).user.id;
      const weeks = parseInt(req.query['weeks'] as string) || 12;

      // Check if user belongs to the family
      const member = await prisma.familyMember.findFirst({
        where: {
          familyId: familyId!,
          userId
        }
      });

      if (!member) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this family'
        });
      }

      // Get historical fairness scores
      const history = await analyticsService.getHistoricalFairness(
        familyId!,
        Math.min(weeks, 52) // Max 1 year
      );

      return res.json({
        data: history
      });
    } catch (error) {
      console.error('Error getting fairness history:', error);
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get fairness history'
      });
    }
  }
};