import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { weekTemplateController } from '../controllers/week-template.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// ==================== WEEK TEMPLATE CRUD ====================

/**
 * POST /api/families/:familyId/week-templates
 * Create a new week template
 */
router.post('/:familyId/week-templates', weekTemplateController.createWeekTemplate);

/**
 * GET /api/families/:familyId/week-templates
 * Get all week templates for a family with filtering and pagination
 */
router.get('/:familyId/week-templates', weekTemplateController.getWeekTemplates);

/**
 * GET /api/families/:familyId/week-templates/:templateId
 * Get a specific week template by ID
 */
router.get('/:familyId/week-templates/:templateId', weekTemplateController.getWeekTemplateById);

/**
 * PUT /api/families/:familyId/week-templates/:templateId
 * Update a week template
 */
router.put('/:familyId/week-templates/:templateId', weekTemplateController.updateWeekTemplate);

/**
 * DELETE /api/families/:familyId/week-templates/:templateId
 * Delete a week template
 */
router.delete('/:familyId/week-templates/:templateId', weekTemplateController.deleteWeekTemplate);

// ==================== WEEK TEMPLATE DAY CRUD ====================

/**
 * POST /api/families/:familyId/week-templates/:templateId/days
 * Add a day template to a week template
 */
router.post('/:familyId/week-templates/:templateId/days', weekTemplateController.addTemplateDay);

/**
 * PUT /api/families/:familyId/week-templates/:templateId/days/:dayId
 * Update a week template day
 */
router.put('/:familyId/week-templates/:templateId/days/:dayId', weekTemplateController.updateTemplateDay);

/**
 * DELETE /api/families/:familyId/week-templates/:templateId/days/:dayId
 * Remove a day template from a week template
 */
router.delete('/:familyId/week-templates/:templateId/days/:dayId', weekTemplateController.removeTemplateDay);

/**
 * GET /api/families/:familyId/week-templates/:templateId/days
 * Get all days for a week template
 */
router.get('/:familyId/week-templates/:templateId/days', weekTemplateController.getTemplateDays);

// ==================== WEEK TEMPLATE UTILITY ROUTES ====================

/**
 * POST /api/families/:familyId/week-templates/:templateId/duplicate
 * Duplicate a week template
 */
router.post('/:familyId/week-templates/:templateId/duplicate', weekTemplateController.duplicateTemplate);

export default router;