import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { WeekScheduleService } from '../services/week-schedule.service';
import {
  WeekScheduleQueryParams,
  ApplyWeekOverrideDto,
  ShiftStatusQueryParams,
} from '../types/task.types';
import prisma from '../lib/prisma';
import { AppError } from '../utils/errors';

/**
 * Controller for handling week schedule-related HTTP requests
 */
export class WeekScheduleController extends BaseController {
  private weekScheduleService = new WeekScheduleService();

  /**
   * Helper method to check family membership
   */
  private async checkFamilyMembership(userId: string, familyId: string): Promise<{ role: string }> {
    const membership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId,
        },
      },
    });

    if (!membership) {
      throw AppError.fromErrorKey('FAMILY_MEMBER_REQUIRED');
    }

    return { role: membership.role };
  }

  /**
   * Helper method to check if user is family admin
   */
  private async checkFamilyAdmin(userId: string, familyId: string): Promise<void> {
    const membership = await this.checkFamilyMembership(userId, familyId);
    
    if (membership.role !== 'ADMIN') {
      throw AppError.fromErrorKey('ADMIN_REQUIRED');
    }
  }

  /**
   * Get the current shift status for the authenticated user
   */
  getShiftStatus = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const { weekStartDate } = req.query as Partial<ShiftStatusQueryParams>;

    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    // Verify user has access to this family
    const userId = this.getUserId(req);
    await this.checkFamilyMembership(userId, familyId);

    const shiftInfo = await this.weekScheduleService.getShiftStatus(
      familyId,
      userId,
      weekStartDate ? { weekStartDate } : {}
    );

    if (!shiftInfo) {
      this.sendSuccess(res, { shiftInfo: null });
      return;
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

    this.sendSuccess(res, response);
  });

  /**
   * Get the resolved schedule for a specific week (template + overrides)
   */
  getWeekSchedule = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const { weekStartDate } = req.query as Partial<WeekScheduleQueryParams>;

    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    if (!weekStartDate) {
      this.sendError(res, 'weekStartDate query parameter is required (YYYY-MM-DD format)');
      return;
    }

    // Verify user has access to this family
    const userId = this.getUserId(req);
    await this.checkFamilyMembership(userId, familyId);

    const weekSchedule = await this.weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

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

    this.sendSuccess(res, response);
  });

  /**
   * Apply overrides to a specific week
   */
  applyWeekOverride = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const overrideData: ApplyWeekOverrideDto = req.body;

    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    // Verify user has admin access to this family
    const userId = this.getUserId(req);
    await this.checkFamilyAdmin(userId, familyId);

    const weekOverride = await this.weekScheduleService.applyWeekOverride(familyId, overrideData, userId);

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

    this.sendSuccess(res, response, 'Week override applied successfully', 201);
  });

  /**
   * Remove overrides for a specific week (revert to template)
   */
  removeWeekOverride = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const { weekStartDate } = req.query;

    if (!weekStartDate || typeof weekStartDate !== 'string') {
      this.sendError(res, 'weekStartDate query parameter is required (YYYY-MM-DD format)');
      return;
    }

    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    // Verify user has admin access to this family
    const userId = this.getUserId(req);
    await this.checkFamilyAdmin(userId, familyId);

    await this.weekScheduleService.removeWeekOverride(familyId, weekStartDate, userId);

    this.sendSuccess(res, { 
      message: 'Week override removed successfully',
      weekStartDate: weekStartDate,
    });
  });
}

// Export a singleton instance
export const weekScheduleController = new WeekScheduleController();