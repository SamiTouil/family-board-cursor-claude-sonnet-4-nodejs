import { Router, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskQueryParams
} from '../types/task.types';
import { z } from 'zod';

const router = Router();

// Apply auth middleware to all task routes
router.use(authenticateToken);

// Validation middleware
const validateBody = (schema: z.ZodSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      // Replace body with validated data
      (req as any).body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};

// Validation for query parameters
const validateQuery = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const query = req.query;
    const params: TaskQueryParams = {};
    
    if (query['isActive'] !== undefined) {
      params.isActive = query['isActive'] === 'true';
    }
    
    if (query['search'] && typeof query['search'] === 'string') {
      params.search = query['search'];
    }
    
    if (query['page'] && typeof query['page'] === 'string') {
      const page = parseInt(query['page'], 10);
      if (page > 0) params.page = page;
    }
    
    if (query['limit'] && typeof query['limit'] === 'string') {
      const limit = parseInt(query['limit'], 10);
      if (limit > 0 && limit <= 100) params.limit = limit;
    }
    
    (req as any).queryParams = params;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
    });
  }
};

// Get all tasks for a family
router.get('/family/:familyId', validateQuery, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    const queryParams = (req as any).queryParams as TaskQueryParams;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const tasks = await TaskService.getFamilyTasks(userId, familyId, queryParams);
    
    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch tasks',
    });
  }
});

// Get task statistics for a family
router.get('/family/:familyId/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const stats = await TaskService.getFamilyTaskStats(userId, familyId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch task statistics',
    });
  }
});

// Create a new task for a family (admin only)
router.post('/family/:familyId', validateBody(CreateTaskSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const task = await TaskService.createTask(userId, familyId, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create task',
      });
    }
  }
});

// Get a specific task
router.get('/:taskId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        message: 'Task ID is required',
      });
      return;
    }
    
    const task = await TaskService.getTaskById(userId, taskId);
    
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : 'Task not found',
    });
  }
});

// Update a task (admin only)
router.put('/:taskId', validateBody(UpdateTaskSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        message: 'Task ID is required',
      });
      return;
    }
    
    const task = await TaskService.updateTask(userId, taskId, req.body);
    
    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update task',
      });
    }
  }
});

// Soft delete a task (admin only)
router.delete('/:taskId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        message: 'Task ID is required',
      });
      return;
    }
    
    await TaskService.deleteTask(userId, taskId);
    
    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete task',
      });
    }
  }
});

// Permanently delete a task (admin only)
router.delete('/:taskId/permanent', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        message: 'Task ID is required',
      });
      return;
    }
    
    await TaskService.permanentlyDeleteTask(userId, taskId);
    
    res.json({
      success: true,
      message: 'Task permanently deleted',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to permanently delete task',
      });
    }
  }
});

// Restore a soft-deleted task (admin only)
router.post('/:taskId/restore', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        message: 'Task ID is required',
      });
      return;
    }
    
    const task = await TaskService.restoreTask(userId, taskId);
    
    res.json({
      success: true,
      message: 'Task restored successfully',
      data: task,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to restore task',
      });
    }
  }
});

// Duplicate a task (admin only)
router.post('/:taskId/duplicate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const { name } = req.body; // Optional new name for the duplicated task
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        message: 'Task ID is required',
      });
      return;
    }
    
    const task = await TaskService.duplicateTask(userId, taskId, name);
    
    res.status(201).json({
      success: true,
      message: 'Task duplicated successfully',
      data: task,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to duplicate task',
      });
    }
  }
});

export default router; 