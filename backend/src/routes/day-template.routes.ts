import { Router, Response } from 'express';
import { z } from 'zod';
import { dayTemplateService } from '../services/day-template.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  DayTemplateResponseDto,
  DayTemplateItemResponseDto,

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

// ==================== DAY TEMPLATE CRUD ====================

/**
 * POST /api/families/:familyId/day-templates
 * Create a new day template
 */
router.post('/:familyId/day-templates', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== DAY TEMPLATE CREATE REQUEST ===');
  console.log('URL params:', req.params);
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  console.log('Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  
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

    console.log('Creating template with service...');
    const template = await dayTemplateService.createDayTemplate(req.body, familyId);
    console.log('Template created successfully:', template.id);
    
    const response: DayTemplateResponseDto = {
      id: template.id,
      name: template.name,
      description: template.description,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      familyId: template.familyId,
      items: template.items.map((item): DayTemplateItemResponseDto => ({
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

    return res.status(201).json(response);
  } catch (error) {
    console.log('=== DAY TEMPLATE CREATE ERROR ===');
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

    console.error('Unexpected error creating day template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/day-templates
 * Get all day templates for a family with filtering and pagination
 */
router.get('/:familyId/day-templates', async (req: AuthenticatedRequest, res: Response) => {
  console.log('=== DAY TEMPLATE GET REQUEST ===');
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

    console.log('Calling dayTemplateService.getDayTemplates with params:', queryParams);
    const result = await dayTemplateService.getDayTemplates(familyId, queryParams);
    console.log('Service call successful, got result:', { 
      templatesCount: result.templates.length,
      total: result.total,
      page: result.page,
      limit: result.limit
    });
    
    const response = {
      templates: result.templates.map((template): DayTemplateResponseDto => ({
        id: template.id,
        name: template.name,
        description: template.description,
        isActive: template.isActive,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        familyId: template.familyId,
        items: template.items.map((item): DayTemplateItemResponseDto => ({
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
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };

    console.log('Sending response with', response.templates.length, 'templates');
    return res.json(response);
  } catch (error) {
    console.log('=== DAY TEMPLATE GET ERROR ===');
    console.log('Error type:', error?.constructor?.name);
    console.log('Error message:', (error as any)?.message);
    console.log('Full error:', error);
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      console.log('Access denied error');
      return res.status(403).json({ error: error.message });
    }
    console.error('Unexpected error fetching day templates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/day-templates/:id
 * Get a specific day template by ID
 */
router.get('/:familyId/day-templates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, id } = req.params;
    if (!familyId || !id) {
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    const template = await dayTemplateService.getDayTemplateById(id, familyId);

    if (!template) {
      return res.status(404).json({ error: 'Day template not found' });
    }

    const response: DayTemplateResponseDto = {
      id: template.id,
      name: template.name,
      description: template.description,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      familyId: template.familyId,
      items: template.items.map((item): DayTemplateItemResponseDto => ({
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

    return res.json(response);
  } catch (error) {
    console.error('Error fetching day template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/families/:familyId/day-templates/:id
 * Update a day template
 */
router.put('/:familyId/day-templates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, id } = req.params;
    if (!familyId || !id) {
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    const template = await dayTemplateService.updateDayTemplate(id, req.body, familyId);

    const response: DayTemplateResponseDto = {
      id: template.id,
      name: template.name,
      description: template.description,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      familyId: template.familyId,
      items: template.items.map((item): DayTemplateItemResponseDto => ({
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

    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Error updating day template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/families/:familyId/day-templates/:id
 * Delete a day template
 */
router.delete('/:familyId/day-templates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, id } = req.params;
    if (!familyId || !id) {
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    await dayTemplateService.deleteDayTemplate(id, familyId);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
    }

    console.error('Error deleting day template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DAY TEMPLATE ITEM CRUD ====================

/**
 * GET /api/families/:familyId/day-templates/:templateId/items
 * Get all items for a day template
 */
router.get('/:familyId/day-templates/:templateId/items', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, templateId } = req.params;
    const userId = req.user!.userId;
    
    if (!familyId || !templateId) {
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    // Check if user is a member of the family
    await checkFamilyMembership(userId, familyId);

    const templateItems = await dayTemplateService.getTemplateItems(templateId, familyId);
    
    const response = templateItems.map((item): DayTemplateItemResponseDto => ({
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
    }));

    return res.json({ items: response });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
    }

    console.error('Error getting template items:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/families/:familyId/day-templates/:templateId/items
 * Add a task to a day template
 */
router.post('/:familyId/day-templates/:templateId/items', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, templateId } = req.params;
    if (!familyId || !templateId) {
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    const templateItem = await dayTemplateService.addTemplateItem(templateId, req.body, familyId);
    
    const response: DayTemplateItemResponseDto = {
      id: templateItem.id,
      memberId: templateItem.memberId,
      taskId: templateItem.taskId,
      overrideTime: templateItem.overrideTime,
      overrideDuration: templateItem.overrideDuration,
      sortOrder: templateItem.sortOrder,
      createdAt: templateItem.createdAt.toISOString(),
      updatedAt: templateItem.updatedAt.toISOString(),
      dayTemplateId: templateItem.dayTemplateId,
      member: templateItem.member,
      task: templateItem.task,
    };

    return res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('does not belong')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already assigned')) {
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Error adding template item:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/families/:familyId/day-templates/:templateId/items/:itemId
 * Update a template item
 */
router.put('/:familyId/day-templates/:templateId/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, itemId } = req.params;
    if (!familyId || !itemId) {
      return res.status(400).json({ error: 'Family ID and Item ID are required' });
    }

    const templateItem = await dayTemplateService.updateTemplateItem(itemId, req.body, familyId);

    const response: DayTemplateItemResponseDto = {
      id: templateItem.id,
      memberId: templateItem.memberId,
      taskId: templateItem.taskId,
      overrideTime: templateItem.overrideTime,
      overrideDuration: templateItem.overrideDuration,
      sortOrder: templateItem.sortOrder,
      createdAt: templateItem.createdAt.toISOString(),
      updatedAt: templateItem.updatedAt.toISOString(),
      dayTemplateId: templateItem.dayTemplateId,
      member: templateItem.member,
      task: templateItem.task,
    };

    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('does not belong')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already assigned')) {
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Error updating template item:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/families/:familyId/day-templates/:templateId/items/:itemId
 * Remove a task from a day template
 */
router.delete('/:familyId/day-templates/:templateId/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, itemId } = req.params;
    if (!familyId || !itemId) {
      return res.status(400).json({ error: 'Family ID and Item ID are required' });
    }

    await dayTemplateService.removeTemplateItem(itemId, familyId);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
    }

    console.error('Error removing template item:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TEMPLATE UTILITIES ====================

/**
 * POST /api/families/:familyId/day-templates/:templateId/duplicate
 * Duplicate a day template
 */
router.post('/:familyId/day-templates/:templateId/duplicate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, templateId } = req.params;
    if (!familyId || !templateId) {
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    // Validate request body
    const duplicateSchema = z.object({
      name: z.string().min(1, 'Template name is required').max(100, 'Template name is too long'),
    });

    const validatedData = duplicateSchema.parse(req.body);

    const newTemplate = await dayTemplateService.duplicateTemplate(templateId, validatedData.name, familyId);
    
    const response: DayTemplateResponseDto = {
      id: newTemplate.id,
      name: newTemplate.name,
      description: newTemplate.description,
      isActive: newTemplate.isActive,
      createdAt: newTemplate.createdAt.toISOString(),
      updatedAt: newTemplate.updatedAt.toISOString(),
      familyId: newTemplate.familyId,
      items: newTemplate.items.map((item): DayTemplateItemResponseDto => ({
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

    return res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Error duplicating day template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 