import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { weekScheduleController } from '../controllers/week-schedule.controller';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ==================== SHIFT STATUS ROUTES ====================

/**
 * GET /api/families/:familyId/shift-status
 * Get the current shift status for the authenticated user
 */
router.get('/:familyId/shift-status', weekScheduleController.getShiftStatus);

// ==================== WEEK SCHEDULE ROUTES ====================

/**
 * GET /api/families/:familyId/week-schedule
 * Get the resolved schedule for a specific week (template + overrides)
 */
router.get('/:familyId/week-schedule', weekScheduleController.getWeekSchedule);

/**
 * POST /api/families/:familyId/week-schedule/override
 * Apply overrides to a specific week
 */
router.post('/:familyId/week-schedule/override', weekScheduleController.applyWeekOverride);

/**
 * DELETE /api/families/:familyId/week-schedule/override
 * Remove overrides for a specific week (revert to template)
 */
router.delete('/:familyId/week-schedule/override', weekScheduleController.removeWeekOverride);

export default router;