import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  DuplicateTaskSchema
} from '../types/task.types';
import { taskController } from '../controllers/task.controller';

const router = Router();

// Apply auth middleware to all task routes
router.use(authenticateToken);



// Get all tasks for a family
router.get('/family/:familyId', taskController.getFamilyTasks);

// Get task statistics for a family
router.get('/family/:familyId/stats', taskController.getFamilyTaskStats);

// Create a new task for a family (admin only)
router.post('/family/:familyId', validateBody(CreateTaskSchema), taskController.createTask);

// Get a specific task
router.get('/:taskId', taskController.getTaskById);

// Update a task (admin only)
router.put('/:taskId', validateBody(UpdateTaskSchema), taskController.updateTask);

// Soft delete a task (admin only)
router.delete('/:taskId', taskController.deleteTask);

// Permanently delete a task (admin only)
router.delete('/:taskId/permanent', taskController.permanentlyDeleteTask);

// Restore a soft-deleted task (admin only)
router.post('/:taskId/restore', taskController.restoreTask);

// Duplicate a task (admin only)
router.post('/:taskId/duplicate', validateBody(DuplicateTaskSchema), taskController.duplicateTask);

export default router; 