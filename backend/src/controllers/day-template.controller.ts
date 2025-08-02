import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dayTemplateService } from '../services/day-template.service';
import {
  DayTemplateResponseDto,
  DayTemplateItemResponseDto,
} from '../types/task.types';
import prisma from '../lib/prisma';
import { AppError } from '../utils/errors';
import { z } from 'zod';

/**
 * Controller for handling day template-related HTTP requests
 */
export class DayTemplateController extends BaseController {

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
  private transformToResponseDto(template: any): DayTemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      familyId: template.familyId,
      items: template.items.map((item: any): DayTemplateItemResponseDto => ({
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
    };
  }

  /**
   * Helper method to transform template item to response DTO
   */
  private transformItemToResponseDto(item: any): DayTemplateItemResponseDto {
    return {
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
    };
  }

  /**
   * Create a new day template
   */
  createDayTemplate = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    const template = await dayTemplateService.createDayTemplate(req.body, familyId);
    const response = this.transformToResponseDto(template);

    this.sendSuccess(res, response, 'Day template created successfully', 201);
  });

  /**
   * Get all day templates for a family with filtering and pagination
   */
  getDayTemplates = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const result = await dayTemplateService.getDayTemplates(familyId, queryParams);
    
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
   * Get a specific day template by ID
   */
  getDayTemplateById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const id = this.getParam(req, 'id');
    
    if (!familyId || !id) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    const template = await dayTemplateService.getDayTemplateById(id, familyId);

    if (!template) {
      this.sendError(res, 'Day template not found', 404);
      return;
    }

    const response = this.transformToResponseDto(template);
    this.sendSuccess(res, response);
  });

  /**
   * Update a day template
   */
  updateDayTemplate = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const id = this.getParam(req, 'id');
    
    if (!familyId || !id) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    const template = await dayTemplateService.updateDayTemplate(id, req.body, familyId);
    const response = this.transformToResponseDto(template);

    this.sendSuccess(res, response, 'Day template updated successfully');
  });

  /**
   * Delete a day template
   */
  deleteDayTemplate = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const id = this.getParam(req, 'id');
    
    if (!familyId || !id) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    await dayTemplateService.deleteDayTemplate(id, familyId);

    res.status(204).send();
  });

  /**
   * Get all items for a day template
   */
  getTemplateItems = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    const userId = this.getUserId(req);
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    // Check if user is a member of the family
    await this.checkFamilyMembership(userId, familyId);

    const templateItems = await dayTemplateService.getTemplateItems(templateId, familyId);
    
    const response = templateItems.map((item: any) => this.transformItemToResponseDto(item));

    this.sendSuccess(res, { items: response });
  });

  /**
   * Add a task to a day template
   */
  addTemplateItem = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    const templateItem = await dayTemplateService.addTemplateItem(templateId, req.body, familyId);
    const response = this.transformItemToResponseDto(templateItem);

    this.sendSuccess(res, response, 'Template item added successfully', 201);
  });

  /**
   * Update a template item
   */
  updateTemplateItem = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const itemId = this.getParam(req, 'itemId');
    
    if (!familyId || !itemId) {
      this.sendError(res, 'Family ID and Item ID are required');
      return;
    }

    const templateItem = await dayTemplateService.updateTemplateItem(itemId, req.body, familyId);
    const response = this.transformItemToResponseDto(templateItem);

    this.sendSuccess(res, response, 'Template item updated successfully');
  });

  /**
   * Remove a task from a day template
   */
  removeTemplateItem = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const itemId = this.getParam(req, 'itemId');
    
    if (!familyId || !itemId) {
      this.sendError(res, 'Family ID and Item ID are required');
      return;
    }

    await dayTemplateService.removeTemplateItem(itemId, familyId);

    res.status(204).send();
  });

  /**
   * Duplicate a day template
   */
  duplicateTemplate = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const familyId = this.getParam(req, 'familyId');
    const templateId = this.getParam(req, 'templateId');
    
    if (!familyId || !templateId) {
      this.sendError(res, 'Family ID and Template ID are required');
      return;
    }

    // Validate request body
    const duplicateSchema = z.object({
      name: z.string().min(1, 'Template name is required').max(100, 'Template name is too long'),
    });

    try {
      const validatedData = duplicateSchema.parse(req.body);
      
      const newTemplate = await dayTemplateService.duplicateTemplate(templateId, validatedData.name, familyId);
      const response = this.transformToResponseDto(newTemplate);

      this.sendSuccess(res, response, 'Day template duplicated successfully', 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.sendValidationError(res, error.errors);
        return;
      }
      throw error;
    }
  });
}

// Export a singleton instance
export const dayTemplateController = new DayTemplateController();