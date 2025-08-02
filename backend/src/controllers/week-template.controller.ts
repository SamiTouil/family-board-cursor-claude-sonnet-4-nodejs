import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { weekTemplateService } from '../services/week-template.service';
import {
  WeekTemplateResponseDto,
  WeekTemplateDayResponseDto,
} from '../types/task.types';
import prisma from '../lib/prisma';
import { AppError } from '../utils/errors';

/**
 * Controller for handling week template-related HTTP requests
 */
export class WeekTemplateController extends BaseController {

  /**
   * Helper method to check if user is a family member
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
   * Helper method to transform template to response DTO
   */
  private transformToResponseDto(template: any): WeekTemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      isActive: template.isActive,
      isDefault: template.isDefault,
      applyRule: template.applyRule,
      priority: template.priority,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      familyId: template.familyId,
      days: template.days.map((day: any): WeekTemplateDayResponseDto => ({
        id: day.id,
        dayOfWeek: day.dayOfWeek,
        dayTemplateId: day.dayTemplateId,
        createdAt: day.createdAt.toISOString(),
        updatedAt: day.updatedAt.toISOString(),
        weekTemplateId: day.weekTemplateId,
        dayTemplate: {
          id: day.dayTemplate.id,
          name: day.dayTemplate.name,
          description: day.dayTemplate.description,
          isActive: day.dayTemplate.isActive,
          createdAt: day.dayTemplate.createdAt.toISOString(),
          updatedAt: day.dayTemplate.updatedAt.toISOString(),
          familyId: day.dayTemplate.familyId,
          items: day.dayTemplate.items.map((item: any) => ({
            id: item.id,
            memberId: item.memberId,
            taskId: item.taskId,
            overrideTime: item.overrideTime,
            overrideDuration: item.overrideDuration,
            sortOrder: item.sortOrder,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            dayTemplateId: item.dayTemplateId,
            member: item.member,
            task: item.task,
          })),
        },
      })),
    };
  }

  /**
   * Create a new week template
   */
  createWeekTemplate = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    const template = await weekTemplateService.createWeekTemplate(req.body, familyId);
    const response = this.transformToResponseDto(template);

    this.sendSuccess(res, response, 'Week template created successfully', 201);
  });

  /**
   * Get all week templates for a family with filtering and pagination
   */
  getWeekTemplates = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    // Check if user is a member of the family
    await this.checkFamilyMembership(userId, familyId);

    const {
      isActive,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const queryParams: any = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    };

    if (isActive === 'true') {
      queryParams.isActive = true;
    } else if (isActive === 'false') {
      queryParams.isActive = false;
    }

    if (search) {
      queryParams.search = search as string;
    }

    const result = await weekTemplateService.getWeekTemplates(familyId, queryParams);
    
    const response = {
      templates: result.templates.map((template: any) => this.transformToResponseDto(template)),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };

    this.sendSuccess(res, response);
  });

  /**
   * Get a specific week template by ID
   */
  getWeekTemplateById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    // Check if user is a member of the family
    await this.checkFamilyMembership(userId, familyId);

    const template = await weekTemplateService.getWeekTemplateById(templateId, familyId);
    
    if (!template) {
      this.sendError(res, 'Week template not found', 404);
      return;
    }

    const response = this.transformToResponseDto(template);
    this.sendSuccess(res, response);
  });

  /**
   * Update a week template
   */
  updateWeekTemplate = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    const template = await weekTemplateService.updateWeekTemplate(templateId, req.body, familyId);
    const response = this.transformToResponseDto(template);

    this.sendSuccess(res, response, 'Week template updated successfully');
  });

  /**
   * Delete a week template
   */
  deleteWeekTemplate = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    await weekTemplateService.deleteWeekTemplate(templateId, familyId);
    
    res.status(204).send();
  });

  /**
   * Add a day template to a week template
   */
  addTemplateDay = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    const templateDay = await weekTemplateService.addTemplateDay(templateId, req.body, familyId);
    
    const response: WeekTemplateDayResponseDto = {
      id: templateDay.id,
      dayOfWeek: templateDay.dayOfWeek,
      dayTemplateId: templateDay.dayTemplateId,
      createdAt: templateDay.createdAt.toISOString(),
      updatedAt: templateDay.updatedAt.toISOString(),
      weekTemplateId: templateDay.weekTemplateId,
      dayTemplate: {
        id: templateDay.dayTemplate.id,
        name: templateDay.dayTemplate.name,
        description: templateDay.dayTemplate.description,
        isActive: templateDay.dayTemplate.isActive,
        createdAt: templateDay.dayTemplate.createdAt.toISOString(),
        updatedAt: templateDay.dayTemplate.updatedAt.toISOString(),
        familyId: templateDay.dayTemplate.familyId,
        items: templateDay.dayTemplate.items.map((item: any) => ({
          id: item.id,
          memberId: item.memberId,
          taskId: item.taskId,
          overrideTime: item.overrideTime,
          overrideDuration: item.overrideDuration,
          sortOrder: item.sortOrder,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          dayTemplateId: item.dayTemplateId,
          member: item.member,
          task: item.task,
        })),
      },
    };

    this.sendSuccess(res, response, 'Week template day created successfully', 201);
  });

  /**
   * Update a week template day
   */
  updateTemplateDay = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const dayId = this.getParam(req, 'dayId');
    
    if (!familyId || !dayId) {
      this.sendError(res, 'Family ID and Day ID are required');
      return;
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    const templateDay = await weekTemplateService.updateTemplateDay(dayId, req.body, familyId);
    
    const response: WeekTemplateDayResponseDto = {
      id: templateDay.id,
      dayOfWeek: templateDay.dayOfWeek,
      dayTemplateId: templateDay.dayTemplateId,
      createdAt: templateDay.createdAt.toISOString(),
      updatedAt: templateDay.updatedAt.toISOString(),
      weekTemplateId: templateDay.weekTemplateId,
      dayTemplate: {
        id: templateDay.dayTemplate.id,
        name: templateDay.dayTemplate.name,
        description: templateDay.dayTemplate.description,
        isActive: templateDay.dayTemplate.isActive,
        createdAt: templateDay.dayTemplate.createdAt.toISOString(),
        updatedAt: templateDay.dayTemplate.updatedAt.toISOString(),
        familyId: templateDay.dayTemplate.familyId,
        items: templateDay.dayTemplate.items.map((item: any) => ({
          id: item.id,
          memberId: item.memberId,
          taskId: item.taskId,
          overrideTime: item.overrideTime,
          overrideDuration: item.overrideDuration,
          sortOrder: item.sortOrder,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          dayTemplateId: item.dayTemplateId,
          member: item.member,
          task: item.task,
        })),
      },
    };

    this.sendSuccess(res, response, 'Week template day updated successfully');
  });

  /**
   * Remove a day template from a week template
   */
  removeTemplateDay = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const dayId = this.getParam(req, 'dayId');
    
    if (!familyId || !dayId) {
      this.sendError(res, 'Family ID and Day ID are required');
      return;
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    await weekTemplateService.removeTemplateDay(dayId, familyId);
    
    res.status(204).send();
  });

  /**
   * Get all days for a week template
   */
  getTemplateDays = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    // Check if user is a member of the family
    await this.checkFamilyMembership(userId, familyId);

    const days = await weekTemplateService.getTemplateDays(templateId, familyId);
    
    const response = days.map((day: any): WeekTemplateDayResponseDto => ({
      id: day.id,
      dayOfWeek: day.dayOfWeek,
      dayTemplateId: day.dayTemplateId,
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
      weekTemplateId: day.weekTemplateId,
      dayTemplate: {
        id: day.dayTemplate.id,
        name: day.dayTemplate.name,
        description: day.dayTemplate.description,
        isActive: day.dayTemplate.isActive,
        createdAt: day.dayTemplate.createdAt.toISOString(),
        updatedAt: day.dayTemplate.updatedAt.toISOString(),
        familyId: day.dayTemplate.familyId,
        items: day.dayTemplate.items.map((item: any) => ({
          id: item.id,
          memberId: item.memberId,
          taskId: item.taskId,
          overrideTime: item.overrideTime,
          overrideDuration: item.overrideDuration,
          sortOrder: item.sortOrder,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          dayTemplateId: item.dayTemplateId,
          member: item.member,
          task: item.task,
        })),
      },
    }));

    this.sendSuccess(res, response);
  });

  /**
   * Duplicate a week template
   */
  duplicateTemplate = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    const { name } = req.body;
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    if (!name || typeof name !== 'string') {
      this.sendError(res, 'Name is required and must be a string');
      return;
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    const template = await weekTemplateService.duplicateTemplate(templateId, name, familyId);
    const response = this.transformToResponseDto(template);

    this.sendSuccess(res, response, 'Week template duplicated successfully', 201);
  });
}

// Export a singleton instance
export const weekTemplateController = new WeekTemplateController();