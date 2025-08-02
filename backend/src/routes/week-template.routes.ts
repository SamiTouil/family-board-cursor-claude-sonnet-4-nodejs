import { Router, Response } from 'express';
import { z } from 'zod';
import { weekTemplateService } from '../services/week-template.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  WeekTemplateResponseDto,
  WeekTemplateDayResponseDto,
} from '../types/task.types';
import prisma from '../lib/prisma';
import { AppError } from '../utils/errors';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Helper method to check if user is a family member
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
    throw AppError.fromErrorKey('FAMILY_MEMBER_REQUIRED');
  }

  return { role: membership.role };
}

// Helper method to check if user is family admin
async function checkFamilyAdmin(userId: string, familyId: string): Promise<void> {
  const membership = await checkFamilyMembership(userId, familyId);
  
  if (membership.role !== 'ADMIN') {
    throw AppError.fromErrorKey('ADMIN_REQUIRED');
  }
}

// ==================== WEEK TEMPLATE CRUD ====================

/**
 * POST /api/families/:familyId/week-templates
 * Create a new week template
 */
router.post('/:familyId/week-templates', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE CREATE REQUEST ===');
  console.log('URL params:', req.params);
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  
  try {
    const { familyId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted userId:', userId);
    
    if (!familyId) {
      console.log('ERROR: Missing familyId');
      return res.status(400).json({ error: 'Family ID is required' });
    }

    console.log('Checking family admin permissions...');
    // Check if user is admin of the family
    await checkFamilyAdmin(userId, familyId);
    console.log('Admin check passed!');

    console.log('Creating week template with service...');
    const template = await weekTemplateService.createWeekTemplate(req.body, familyId);
    console.log('Week template created successfully:', template.id);
    
    const response: WeekTemplateResponseDto = {
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
      days: template.days.map((day): WeekTemplateDayResponseDto => ({
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
          items: day.dayTemplate.items.map((item) => ({
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

    return res.status(201).json(response);
  } catch (error) {
    console.log('=== WEEK TEMPLATE CREATE ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    console.log('Full error:', error);
    
    if (error instanceof z.ZodError) {
      console.log('Zod validation error:', error.errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.log('Access denied error');
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('already exists')) {
        console.log('Duplicate name error');
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Unexpected error creating week template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/week-templates
 * Get all week templates for a family with filtering and pagination
 */
router.get('/:familyId/week-templates', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE GET REQUEST ===');
  console.log('URL params:', req.params);
  console.log('Query params:', req.query);
  console.log('User from token:', req.user);
  
  try {
    const { familyId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted userId:', userId);
    
    if (!familyId) {
      console.log('ERROR: Missing familyId');
      return res.status(400).json({ error: 'Family ID is required' });
    }

    console.log('Checking family membership...');
    // Check if user is a member of the family
    await checkFamilyMembership(userId, familyId);
    console.log('Family membership check passed!');

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

    console.log('Calling weekTemplateService.getWeekTemplates with params:', queryParams);
    const result = await weekTemplateService.getWeekTemplates(familyId, queryParams);
    console.log('Service call successful, got result:', { 
      templatesCount: result.templates.length,
      total: result.total,
      page: result.page,
      limit: result.limit
    });
    
    const response = {
      templates: result.templates.map((template): WeekTemplateResponseDto => ({
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
        days: template.days.map((day): WeekTemplateDayResponseDto => ({
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
            items: day.dayTemplate.items.map((item) => ({
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
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.log('=== WEEK TEMPLATE GET ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    console.error('Unexpected error fetching week templates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/week-templates/:templateId
 * Get a specific week template by ID
 */
router.get('/:familyId/week-templates/:templateId', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE GET BY ID REQUEST ===');
  console.log('URL params:', req.params);
  console.log('User from token:', req.user);
  
  try {
    const { familyId, templateId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted templateId:', templateId);
    console.log('Extracted userId:', userId);
    
    if (!familyId || !templateId) {
      console.log('ERROR: Missing familyId or templateId');
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    console.log('Checking family membership...');
    // Check if user is a member of the family
    await checkFamilyMembership(userId, familyId);
    console.log('Family membership check passed!');

    console.log('Calling weekTemplateService.getWeekTemplateById...');
    const template = await weekTemplateService.getWeekTemplateById(templateId, familyId);
    
    if (!template) {
      console.log('Week template not found');
      return res.status(404).json({ error: 'Week template not found' });
    }

    console.log('Week template found successfully:', template.id);
    
    const response: WeekTemplateResponseDto = {
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
      days: template.days.map((day): WeekTemplateDayResponseDto => ({
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
          items: day.dayTemplate.items.map((item) => ({
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

    return res.json(response);
  } catch (error) {
    console.log('=== WEEK TEMPLATE GET BY ID ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    console.error('Unexpected error fetching week template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/families/:familyId/week-templates/:templateId
 * Update a week template
 */
router.put('/:familyId/week-templates/:templateId', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE UPDATE REQUEST ===');
  console.log('URL params:', req.params);
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  
  try {
    const { familyId, templateId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted templateId:', templateId);
    console.log('Extracted userId:', userId);
    
    if (!familyId || !templateId) {
      console.log('ERROR: Missing familyId or templateId');
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    console.log('Checking family admin permissions...');
    // Check if user is admin of the family
    await checkFamilyAdmin(userId, familyId);
    console.log('Admin check passed!');

    console.log('Updating week template with service...');
    const template = await weekTemplateService.updateWeekTemplate(templateId, req.body, familyId);
    console.log('Week template updated successfully:', template.id);
    
    const response: WeekTemplateResponseDto = {
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
      days: template.days.map((day): WeekTemplateDayResponseDto => ({
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
          items: day.dayTemplate.items.map((item) => ({
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

    return res.json(response);
  } catch (error) {
    console.log('=== WEEK TEMPLATE UPDATE ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof z.ZodError) {
      console.log('Zod validation error:', error.errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.log('Access denied error');
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        console.log('Not found error');
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('already exists')) {
        console.log('Duplicate name error');
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Unexpected error updating week template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/families/:familyId/week-templates/:templateId
 * Delete a week template
 */
router.delete('/:familyId/week-templates/:templateId', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE DELETE REQUEST ===');
  console.log('URL params:', req.params);
  console.log('User from token:', req.user);
  
  try {
    const { familyId, templateId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted templateId:', templateId);
    console.log('Extracted userId:', userId);
    
    if (!familyId || !templateId) {
      console.log('ERROR: Missing familyId or templateId');
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    console.log('Checking family admin permissions...');
    // Check if user is admin of the family
    await checkFamilyAdmin(userId, familyId);
    console.log('Admin check passed!');

    console.log('Deleting week template with service...');
    await weekTemplateService.deleteWeekTemplate(templateId, familyId);
    console.log('Week template deleted successfully:', templateId);
    
    return res.status(204).send();
  } catch (error) {
    console.log('=== WEEK TEMPLATE DELETE ERROR ===');
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
    }

    console.error('Unexpected error deleting week template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== WEEK TEMPLATE DAY CRUD ====================

/**
 * POST /api/families/:familyId/week-templates/:templateId/days
 * Add a day template to a week template
 */
router.post('/:familyId/week-templates/:templateId/days', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE DAY CREATE REQUEST ===');
  console.log('URL params:', req.params);
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  
  try {
    const { familyId, templateId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted templateId:', templateId);
    console.log('Extracted userId:', userId);
    
    if (!familyId || !templateId) {
      console.log('ERROR: Missing familyId or templateId');
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    console.log('Checking family admin permissions...');
    // Check if user is admin of the family
    await checkFamilyAdmin(userId, familyId);
    console.log('Admin check passed!');

    console.log('Adding day template to week template with service...');
    const templateDay = await weekTemplateService.addTemplateDay(templateId, req.body, familyId);
    console.log('Week template day created successfully:', templateDay.id);
    
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
        items: templateDay.dayTemplate.items.map((item) => ({
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

    return res.status(201).json(response);
  } catch (error) {
    console.log('=== WEEK TEMPLATE DAY CREATE ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof z.ZodError) {
      console.log('Zod validation error:', error.errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.log('Access denied error');
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        console.log('Not found error');
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('already has a template')) {
        console.log('Day already assigned error');
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Unexpected error adding day template to week template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/families/:familyId/week-templates/:templateId/days/:dayId
 * Update a week template day
 */
router.put('/:familyId/week-templates/:templateId/days/:dayId', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE DAY UPDATE REQUEST ===');
  console.log('URL params:', req.params);
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  
  try {
    const { familyId, dayId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted dayId:', dayId);
    console.log('Extracted userId:', userId);
    
    if (!familyId || !dayId) {
      console.log('ERROR: Missing familyId or dayId');
      return res.status(400).json({ error: 'Family ID and Day ID are required' });
    }

    console.log('Checking family admin permissions...');
    // Check if user is admin of the family
    await checkFamilyAdmin(userId, familyId);
    console.log('Admin check passed!');

    console.log('Updating week template day with service...');
    const templateDay = await weekTemplateService.updateTemplateDay(dayId, req.body, familyId);
    console.log('Week template day updated successfully:', templateDay.id);
    
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
        items: templateDay.dayTemplate.items.map((item) => ({
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

    return res.json(response);
  } catch (error) {
    console.log('=== WEEK TEMPLATE DAY UPDATE ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof z.ZodError) {
      console.log('Zod validation error:', error.errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.log('Access denied error');
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        console.log('Not found error');
        return res.status(404).json({ error: error.message });
      }
    }

    console.error('Unexpected error updating week template day:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/families/:familyId/week-templates/:templateId/days/:dayId
 * Remove a day template from a week template
 */
router.delete('/:familyId/week-templates/:templateId/days/:dayId', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE DAY DELETE REQUEST ===');
  console.log('URL params:', req.params);
  console.log('User from token:', req.user);
  
  try {
    const { familyId, dayId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted dayId:', dayId);
    console.log('Extracted userId:', userId);
    
    if (!familyId || !dayId) {
      console.log('ERROR: Missing familyId or dayId');
      return res.status(400).json({ error: 'Family ID and Day ID are required' });
    }

    console.log('Checking family admin permissions...');
    // Check if user is admin of the family
    await checkFamilyAdmin(userId, familyId);
    console.log('Admin check passed!');

    console.log('Removing day template from week template with service...');
    await weekTemplateService.removeTemplateDay(dayId, familyId);
    console.log('Week template day removed successfully:', dayId);
    
    return res.status(204).send();
  } catch (error) {
    console.log('=== WEEK TEMPLATE DAY DELETE ERROR ===');
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
    }

    console.error('Unexpected error removing week template day:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/week-templates/:templateId/days
 * Get all days for a week template
 */
router.get('/:familyId/week-templates/:templateId/days', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE DAYS GET REQUEST ===');
  console.log('URL params:', req.params);
  console.log('User from token:', req.user);
  
  try {
    const { familyId, templateId } = req.params;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted templateId:', templateId);
    console.log('Extracted userId:', userId);
    
    if (!familyId || !templateId) {
      console.log('ERROR: Missing familyId or templateId');
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    console.log('Checking family membership...');
    // Check if user is a member of the family
    await checkFamilyMembership(userId, familyId);
    console.log('Family membership check passed!');

    console.log('Calling weekTemplateService.getTemplateDays...');
    const days = await weekTemplateService.getTemplateDays(templateId, familyId);
    console.log('Template days fetched successfully, count:', days.length);
    
    const response = days.map((day): WeekTemplateDayResponseDto => ({
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
        items: day.dayTemplate.items.map((item) => ({
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

    return res.json(response);
  } catch (error) {
    console.log('=== WEEK TEMPLATE DAYS GET ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
    }

    console.error('Unexpected error fetching week template days:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== WEEK TEMPLATE UTILITY ROUTES ====================

/**
 * POST /api/families/:familyId/week-templates/:templateId/duplicate
 * Duplicate a week template
 */
router.post('/:familyId/week-templates/:templateId/duplicate', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== WEEK TEMPLATE DUPLICATE REQUEST ===');
  console.log('URL params:', req.params);
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  
  try {
    const { familyId, templateId } = req.params;
    const { name } = req.body;
    const userId = req.user!.userId;
    
    console.log('Extracted familyId:', familyId);
    console.log('Extracted templateId:', templateId);
    console.log('Extracted new name:', name);
    console.log('Extracted userId:', userId);
    
    if (!familyId || !templateId) {
      console.log('ERROR: Missing familyId or templateId');
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    if (!name || typeof name !== 'string') {
      console.log('ERROR: Missing or invalid name');
      return res.status(400).json({ error: 'Name is required and must be a string' });
    }

    console.log('Checking family admin permissions...');
    // Check if user is admin of the family
    await checkFamilyAdmin(userId, familyId);
    console.log('Admin check passed!');

    console.log('Duplicating week template with service...');
    const template = await weekTemplateService.duplicateTemplate(templateId, name, familyId);
    console.log('Week template duplicated successfully:', template.id);
    
    const response: WeekTemplateResponseDto = {
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
      days: template.days.map((day): WeekTemplateDayResponseDto => ({
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
          items: day.dayTemplate.items.map((item) => ({
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

    return res.status(201).json(response);
  } catch (error) {
    console.log('=== WEEK TEMPLATE DUPLICATE ERROR ===');
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
      if (error.message.includes('already exists')) {
        console.log('Duplicate name error');
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Unexpected error duplicating week template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Note: Week template application is now handled by the WeekScheduleService
// Templates are applied when creating week schedules, not directly through this endpoint

export default router; 