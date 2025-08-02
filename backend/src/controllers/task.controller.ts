import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { TaskService } from '../services/task.service';
import { TaskQueryParams } from '../types/task.types';

/**
 * Controller for handling task-related HTTP requests
 */
export class TaskController extends BaseController {

  /**
   * Process and validate query parameters for task queries
   */
  private processTaskQueryParams(req: AuthenticatedRequest): TaskQueryParams {
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
    
    return params;
  }

  /**
   * Get all tasks for a family
   */
  getFamilyTasks = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const queryParams = this.processTaskQueryParams(req);
    const tasks = await TaskService.getFamilyTasks(userId, familyId, queryParams);
    
    this.sendSuccess(res, tasks);
  });

  /**
   * Get task statistics for a family
   */
  getFamilyTaskStats = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const stats = await TaskService.getFamilyTaskStats(userId, familyId);
    
    this.sendSuccess(res, stats);
  });

  /**
   * Create a new task for a family (admin only)
   */
  createTask = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const task = await TaskService.createTask(userId, familyId, req.body);
    
    this.sendSuccess(res, task, 'Task created successfully', 201);
  });

  /**
   * Get a specific task
   */
  getTaskById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const taskId = this.getParam(req, 'taskId');
    
    if (!taskId) {
      this.sendError(res, 'Task ID is required');
      return;
    }
    
    const task = await TaskService.getTaskById(userId, taskId);
    
    if (!task) {
      this.sendError(res, 'Task not found', 404);
      return;
    }
    
    this.sendSuccess(res, task);
  });

  /**
   * Update a task (admin only)
   */
  updateTask = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const taskId = this.getParam(req, 'taskId');
    
    if (!taskId) {
      this.sendError(res, 'Task ID is required');
      return;
    }
    
    const task = await TaskService.updateTask(userId, taskId, req.body);
    
    this.sendSuccess(res, task, 'Task updated successfully');
  });

  /**
   * Soft delete a task (admin only)
   */
  deleteTask = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const taskId = this.getParam(req, 'taskId');
    
    if (!taskId) {
      this.sendError(res, 'Task ID is required');
      return;
    }
    
    await TaskService.deleteTask(userId, taskId);
    
    this.sendSuccessMessage(res, 'Task deleted successfully');
  });

  /**
   * Permanently delete a task (admin only)
   */
  permanentlyDeleteTask = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const taskId = this.getParam(req, 'taskId');
    
    if (!taskId) {
      this.sendError(res, 'Task ID is required');
      return;
    }
    
    await TaskService.permanentlyDeleteTask(userId, taskId);
    
    this.sendSuccessMessage(res, 'Task permanently deleted');
  });

  /**
   * Restore a soft-deleted task (admin only)
   */
  restoreTask = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const taskId = this.getParam(req, 'taskId');
    
    if (!taskId) {
      this.sendError(res, 'Task ID is required');
      return;
    }
    
    const task = await TaskService.restoreTask(userId, taskId);
    
    this.sendSuccess(res, task, 'Task restored successfully');
  });

  /**
   * Duplicate a task (admin only)
   */
  duplicateTask = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const taskId = this.getParam(req, 'taskId');
    
    if (!taskId) {
      this.sendError(res, 'Task ID is required');
      return;
    }
    
    const { name } = req.body; // Optional new name for the duplicated task
    const task = await TaskService.duplicateTask(userId, taskId, name);
    
    this.sendSuccess(res, task, 'Task duplicated successfully', 201);
  });
}

// Export a singleton instance
export const taskController = new TaskController();