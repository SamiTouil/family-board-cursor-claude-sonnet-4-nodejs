import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AnalyticsService, ShiftAnalyticsParams } from '../services/analytics.service';
import { z } from 'zod';
import { AppError } from '../utils/errors';

/**
 * Controller for handling analytics-related HTTP requests
 */
export class AnalyticsController extends BaseController {
  private analyticsService = new AnalyticsService();

  /**
   * Get shift analytics
   */
  getShiftAnalytics = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const analytics = await this.analyticsService.getShiftAnalytics(params);
    this.sendSuccess(res, analytics);
  });

  /**
   * Get task split analytics (existing functionality)
   */
  getTaskSplitAnalytics = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user || !user.familyId) {
      throw new AppError('User not authenticated or not part of a family', 401);
    }

    const { periodDays = '28', referenceDate } = req.query;

    const analytics = await this.analyticsService.calculateTaskSplit(
      user.familyId,
      parseInt(periodDays as string),
      referenceDate as string | undefined
    );

    this.sendSuccess(res, analytics);
  });

  /**
   * Get historical fairness scores
   */
  getFairnessHistory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user || !user.familyId) {
      throw new AppError('User not authenticated or not part of a family', 401);
    }

    const { weeks = '12' } = req.query;

    const history = await this.analyticsService.getHistoricalFairness(
      user.familyId,
      parseInt(weeks as string)
    );

    this.sendSuccess(res, history);
  });

  /**
   * Get task split analytics for a specific family
   */
  getTaskSplit = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    const getTaskSplitSchema = z.object({
      periodDays: z.coerce.number().min(7).max(365).optional().default(28),
      referenceDate: z.string().optional() // ISO date string (YYYY-MM-DD) for the reference week
    });

    try {
      const query = getTaskSplitSchema.parse(req.query);
      
      // Calculate task split analytics
      const analytics = await this.analyticsService.calculateTaskSplit(
        familyId,
        query.periodDays,
        query.referenceDate
      );

      this.sendSuccess(res, analytics);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.sendValidationError(res, error.errors);
        return;
      }
      throw error;
    }
  });

  /**
   * Get fairness history for a specific family
   */
  getFairnessHistoryForFamily = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    const weeks = parseInt(req.query['weeks'] as string) || 12;

    // Get historical fairness scores
    const history = await this.analyticsService.getHistoricalFairness(
      familyId,
      Math.min(weeks, 52) // Max 1 year
    );

    this.sendSuccess(res, history);
  });
}

// Export a singleton instance
export const analyticsController = new AnalyticsController();