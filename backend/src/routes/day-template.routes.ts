import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { dayTemplateController } from '../controllers/day-template.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// ==================== DAY TEMPLATE CRUD ====================

/**
 * POST /api/families/:familyId/day-templates
 * Create a new day template
 */
router.post('/:familyId/day-templates', dayTemplateController.createDayTemplate);

/**
 * GET /api/families/:familyId/day-templates
 * Get all day templates for a family with filtering and pagination
 */
router.get('/:familyId/day-templates', dayTemplateController.getDayTemplates);

/**
 * GET /api/families/:familyId/day-templates/:id
 * Get a specific day template by ID
 */
router.get('/:familyId/day-templates/:id', dayTemplateController.getDayTemplateById);

/**
 * PUT /api/families/:familyId/day-templates/:id
 * Update a day template
 */
router.put('/:familyId/day-templates/:id', dayTemplateController.updateDayTemplate);

/**
 * DELETE /api/families/:familyId/day-templates/:id
 * Delete a day template
 */
router.delete('/:familyId/day-templates/:id', dayTemplateController.deleteDayTemplate);

// ==================== DAY TEMPLATE ITEM CRUD ====================

/**
 * GET /api/families/:familyId/day-templates/:templateId/items
 * Get all items for a day template
 */
router.get('/:familyId/day-templates/:templateId/items', dayTemplateController.getTemplateItems);

/**
 * POST /api/families/:familyId/day-templates/:templateId/items
 * Add a task to a day template
 */
router.post('/:familyId/day-templates/:templateId/items', dayTemplateController.addTemplateItem);

/**
 * PUT /api/families/:familyId/day-templates/:templateId/items/:itemId
 * Update a template item
 */
router.put('/:familyId/day-templates/:templateId/items/:itemId', dayTemplateController.updateTemplateItem);

/**
 * DELETE /api/families/:familyId/day-templates/:templateId/items/:itemId
 * Remove a task from a day template
 */
router.delete('/:familyId/day-templates/:templateId/items/:itemId', dayTemplateController.removeTemplateItem);

// ==================== TEMPLATE UTILITIES ====================

/**
 * POST /api/families/:familyId/day-templates/:templateId/duplicate
 * Duplicate a day template
 */
router.post('/:familyId/day-templates/:templateId/duplicate', dayTemplateController.duplicateTemplate);

export default router;