import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { WeekScheduleService } from '../services/week-schedule.service';
import {
  WeekScheduleQueryParams,
  ApplyWeekOverrideDto,
  ShiftStatusQueryParams,
} from '../types/task.types';
import prisma from '../lib/prisma';

const router = Router();
const weekScheduleService = new WeekScheduleService();

// Helper method to check family membership
async function checkFamilyMembership(userId: string, familyId: string): Promise<{ role: string }> {
  const membership = await prisma.familyMember.findUnique({
    where: {
      userId_familyId: {
        userId,
        familyId,
      },
    },
  });

  if (!membership) {
    throw new Error('Access denied: You are not a member of this family');
  }

  return { role: membership.role };
}

// Helper method to check if user is family admin
async function checkFamilyAdmin(userId: string, familyId: string): Promise<void> {
  const membership = await checkFamilyMembership(userId, familyId);
  
  if (membership.role !== 'ADMIN') {
    throw new Error('Access denied: Only family admins can perform this action');
  }
}

// ==================== SHIFT STATUS ROUTES ====================

/**
 * GET /api/families/:familyId/shift-status
 * Get the current shift status for the authenticated user
 */
router.get('/:familyId/shift-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    const { weekStartDate } = req.query as Partial<ShiftStatusQueryParams>;

    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }

    // Verify user has access to this family
    const userId = req.user!.userId;
    await checkFamilyMembership(userId, familyId);

    const shiftInfo = await weekScheduleService.getShiftStatus(
      familyId,
      userId,
      weekStartDate ? { weekStartDate } : {}
    );

    if (!shiftInfo) {
      return res.status(200).json({ shiftInfo: null });
    }

    const response = {
      shiftInfo: {
        type: shiftInfo.type,
        startTime: shiftInfo.startTime?.toISOString(),
        endTime: shiftInfo.endTime?.toISOString(),
        timeUntilStart: shiftInfo.timeUntilStart,
        timeRemaining: shiftInfo.timeRemaining,
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    console.log('=== SHIFT STATUS ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);

    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.log('Access denied error');
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        console.log('Not found error');
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Invalid week start date')) {
        console.log('Invalid date error');
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('must be a Monday')) {
        console.log('Invalid start day error');
        return res.status(400).json({ error: error.message });
      }
    }

    console.error('Unexpected error getting shift status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== WEEK SCHEDULE ROUTES ====================

/**
 * GET /api/families/:familyId/week-schedule
 * Get the resolved schedule for a specific week (template + overrides)
 */
router.get('/:familyId/week-schedule', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    const { weekStartDate } = req.query as Partial<WeekScheduleQueryParams>;

    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }

    if (!weekStartDate) {
      return res.status(400).json({ error: 'weekStartDate query parameter is required (YYYY-MM-DD format)' });
    }

    // Verify user has access to this family
    const userId = req.user!.userId;
    await checkFamilyMembership(userId, familyId);

    const weekSchedule = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

    const response = {
      weekStartDate: weekSchedule.weekStartDate.toISOString().split('T')[0], // YYYY-MM-DD format
      familyId: weekSchedule.familyId,
      baseTemplate: weekSchedule.baseTemplate,
      hasOverrides: weekSchedule.hasOverrides,
      days: weekSchedule.days.map(day => ({
        date: day.date.toISOString().split('T')[0], // YYYY-MM-DD format
        dayOfWeek: day.dayOfWeek,
        tasks: day.tasks.map(task => ({
          taskId: task.taskId,
          memberId: task.memberId,
          overrideTime: task.overrideTime,
          overrideDuration: task.overrideDuration,
          source: task.source,
          task: task.task,
          member: task.member,
        })),
      })),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.log('=== WEEK SCHEDULE GET ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.log('Access denied error');
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        console.log('Not found error');
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Invalid week start date')) {
        console.log('Invalid date error');
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('must be a Monday')) {
        console.log('Invalid start day error');
        return res.status(400).json({ error: error.message });
      }
    }

    console.error('Unexpected error getting week schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/families/:familyId/week-schedule/override
 * Apply overrides to a specific week
 */
router.post('/:familyId/week-schedule/override', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    const overrideData: ApplyWeekOverrideDto = req.body;

    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }

    // Verify user has admin access to this family
    const userId = req.user!.userId;
    await checkFamilyAdmin(userId, familyId);

    const weekOverride = await weekScheduleService.applyWeekOverride(familyId, overrideData, userId);

    const response = {
      message: 'Week override applied successfully',
      weekOverride: {
        id: weekOverride.id,
        weekStartDate: weekOverride.weekStartDate.toISOString().split('T')[0], // YYYY-MM-DD format
        weekTemplateId: weekOverride.weekTemplateId,
        familyId: weekOverride.familyId,
        createdAt: weekOverride.createdAt.toISOString(),
        updatedAt: weekOverride.updatedAt.toISOString(),
        taskOverrides: weekOverride.taskOverrides.map(override => ({
          id: override.id,
          assignedDate: override.assignedDate.toISOString().split('T')[0], // YYYY-MM-DD format
          taskId: override.taskId,
          action: override.action,
          originalMemberId: override.originalMemberId,
          newMemberId: override.newMemberId,
          overrideTime: override.overrideTime,
          overrideDuration: override.overrideDuration,
          createdAt: override.createdAt.toISOString(),
          updatedAt: override.updatedAt.toISOString(),
          task: override.task,
          originalMember: override.originalMember,
          newMember: override.newMember,
        })),
      },
    };

    return res.status(201).json(response);
  } catch (error) {
    console.log('=== WEEK OVERRIDE APPLY ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.log('Access denied error');
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        console.log('Not found error');
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Invalid week start date')) {
        console.log('Invalid date error');
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('must be a Monday')) {
        console.log('Invalid start day error');
        return res.status(400).json({ error: error.message });
      }
    }

    console.error('Unexpected error applying week override:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/families/:familyId/week-schedule/override
 * Remove overrides for a specific week (revert to template)
 */
router.delete('/:familyId/week-schedule/override', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    const { weekStartDate } = req.query;

    if (!weekStartDate || typeof weekStartDate !== 'string') {
      return res.status(400).json({ error: 'weekStartDate query parameter is required (YYYY-MM-DD format)' });
    }

    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }

    // Verify user has admin access to this family
    const userId = req.user!.userId;
    await checkFamilyAdmin(userId, familyId);

    await weekScheduleService.removeWeekOverride(familyId, weekStartDate, userId);

    return res.status(200).json({ 
      message: 'Week override removed successfully',
      weekStartDate: weekStartDate,
    });
  } catch (error) {
    console.log('=== WEEK OVERRIDE REMOVE ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.log('Access denied error');
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('Invalid week start date')) {
        console.log('Invalid date error');
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('must be a Monday')) {
        console.log('Invalid start day error');
        return res.status(400).json({ error: error.message });
      }
    }

    console.error('Unexpected error removing week override:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;