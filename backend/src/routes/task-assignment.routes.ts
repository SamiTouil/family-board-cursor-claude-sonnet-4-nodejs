import { Router, Response } from 'express';
import { z } from 'zod';
import { taskAssignmentService } from '../services/task-assignment.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  TaskAssignmentResponseDto,
} from '../types/task.types';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/families/:familyId/task-assignments
 * Create a new task assignment
 */
router.post('/:familyId/task-assignments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }
    const assignment = await taskAssignmentService.createTaskAssignment(req.body, familyId);
    
    const response: TaskAssignmentResponseDto = {
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
      
      if (error.message.includes('Unique constraint')) {
        return res.status(409).json({ 
          error: 'Task assignment already exists for this member, task, and date' 
        });
      }
    }

    console.error('Error creating task assignment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/task-assignments
 * Get all task assignments for a family with filtering and pagination
 */
router.get('/:familyId/task-assignments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }
    const {
      memberId,
      taskId,
      assignedDate,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const queryParams = {
      memberId: memberId as string | undefined,
      taskId: taskId as string | undefined,
      assignedDate: assignedDate as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    };

    const result = await taskAssignmentService.getTaskAssignments(familyId, queryParams);
    
    const response = {
      assignments: result.assignments.map((assignment): TaskAssignmentResponseDto => ({
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
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching task assignments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/task-assignments/:id
 * Get a specific task assignment by ID
 */
router.get('/:familyId/task-assignments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, id } = req.params;
    if (!familyId || !id) {
      return res.status(400).json({ error: 'Family ID and Assignment ID are required' });
    }
    const assignment = await taskAssignmentService.getTaskAssignmentById(id, familyId);

    if (!assignment) {
      return res.status(404).json({ error: 'Task assignment not found' });
    }

    const response: TaskAssignmentResponseDto = {
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
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching task assignment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/families/:familyId/task-assignments/:id
 * Update a task assignment
 */
router.put('/:familyId/task-assignments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, id } = req.params;
    if (!familyId || !id) {
      return res.status(400).json({ error: 'Family ID and Assignment ID are required' });
    }
    const assignment = await taskAssignmentService.updateTaskAssignment(id, req.body, familyId);

    const response: TaskAssignmentResponseDto = {
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
      
      if (error.message.includes('Unique constraint')) {
        return res.status(409).json({ 
          error: 'Task assignment already exists for this member, task, and date' 
        });
      }
    }

    console.error('Error updating task assignment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/families/:familyId/task-assignments/:id
 * Delete a task assignment
 */
router.delete('/:familyId/task-assignments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, id } = req.params;
    if (!familyId || !id) {
      return res.status(400).json({ error: 'Family ID and Assignment ID are required' });
    }
    await taskAssignmentService.deleteTaskAssignment(id, familyId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    console.error('Error deleting task assignment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/members/:memberId/assignments
 * Get task assignments for a specific member on a specific date
 */
router.get('/:familyId/members/:memberId/assignments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, memberId } = req.params;
    if (!familyId || !memberId) {
      return res.status(400).json({ error: 'Family ID and Member ID are required' });
    }
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const assignments = await taskAssignmentService.getMemberAssignmentsForDate(
      memberId,
      date as string,
      familyId
    );

    const response = assignments.map((assignment): TaskAssignmentResponseDto => ({
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
    }));

    return res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    console.error('Error fetching member assignments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/families/:familyId/tasks/:taskId/assignments
 * Get all assignments for a specific task
 */
router.get('/:familyId/tasks/:taskId/assignments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId, taskId } = req.params;
    if (!familyId || !taskId) {
      return res.status(400).json({ error: 'Family ID and Task ID are required' });
    }
    const { startDate, endDate } = req.query;

    const assignments = await taskAssignmentService.getTaskAssignmentsForTask(
      taskId,
      familyId,
      {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      }
    );

    const response = assignments.map((assignment): TaskAssignmentResponseDto => ({
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
    }));

    return res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    console.error('Error fetching task assignments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/families/:familyId/task-assignments/bulk
 * Bulk create task assignments
 */
router.post('/:familyId/task-assignments/bulk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { familyId } = req.params;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID is required' });
    }
    const { assignments } = req.body;

    if (!Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Assignments must be an array' });
    }

    const createdAssignments = await taskAssignmentService.bulkCreateTaskAssignments(
      assignments,
      familyId
    );

    const response = createdAssignments.map((assignment): TaskAssignmentResponseDto => ({
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
    }));

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
      
      if (error.message.includes('Unique constraint')) {
        return res.status(409).json({ 
          error: 'One or more task assignments already exist' 
        });
      }
    }

    console.error('Error bulk creating task assignments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 