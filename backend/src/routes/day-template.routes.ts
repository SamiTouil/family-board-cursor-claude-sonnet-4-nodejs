import { Router, Response } from 'express';
import { z } from 'zod';
import { dayTemplateService } from '../services/day-template.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  DayTemplateResponseDto,
  DayTemplateItemResponseDto,
  ApplyDayTemplateDto,
} from '../types/task.types';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// ==================== DAY TEMPLATE CRUD ====================

/**
 * POST /api/families/:familyId/day-templates
 * Create a new day template
 */
router.post('/:familyId/day-templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }

    const template = await dayTemplateService.createDayTemplate(req.body, familyId);
    
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
    }

    console.error('Error creating day template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/day-templates
 * Get all day templates for a family with filtering and pagination
 */
router.get('/:familyId/day-templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }

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

    return res.json(response);
  } catch (error) {
    console.error('Error fetching day templates:', error);
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

// ==================== TEMPLATE APPLICATION ====================

/**
 * POST /api/families/:familyId/day-templates/:templateId/apply
 * Apply a day template to specific dates, creating task assignments
 */
router.post('/:familyId/day-templates/:templateId/apply', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, templateId } = req.params;
    if (!familyId || !templateId) {
      return res.status(400).json({ error: 'Family ID and Template ID are required' });
    }

    // Validate request body
    const applySchema = z.object({
      dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')),
      overrideMemberAssignments: z.boolean().optional().default(false),
    });

    const validatedData = applySchema.parse(req.body);

    const applyData: ApplyDayTemplateDto = {
      templateId: templateId,
      dates: validatedData.dates,
      overrideMemberAssignments: validatedData.overrideMemberAssignments,
    };

    const assignments = await dayTemplateService.applyTemplate(applyData, familyId);
    
    const response = {
      message: `Successfully applied template to ${validatedData.dates.length} date(s)`,
      createdAssignments: assignments.length,
      assignments: assignments.map(assignment => ({
        id: assignment.id,
        memberId: assignment.memberId,
        taskId: assignment.taskId,
        overrideTime: assignment.overrideTime,
        overrideDuration: assignment.overrideDuration,
        assignedDate: assignment.assignedDate.toISOString(),
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
        member: assignment.member,
        task: assignment.task,
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
      
      if (error.message.includes('inactive') || error.message.includes('no items')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('Invalid date')) {
        return res.status(400).json({ error: error.message });
      }
    }

    console.error('Error applying day template:', error);
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