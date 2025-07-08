import { 
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
  TaskQueryParams
} from '../types/task.types';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { NotFamilyMemberError, NotFamilyAdminError, FamilyNotFoundError } from '../errors/FamilyErrors';
import { TaskNotFoundError } from '../errors/TaskErrors';

export class TaskService {
  
  // Helper method to check if user is a family member
  private static async checkFamilyMembership(userId: string, familyId: string): Promise<{ role: string }> {
    const membership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId,
        },
      },
    });

    if (!membership) {
      throw new NotFamilyMemberError();
    }

    return { role: membership.role };
  }

  // Helper method to check if user is family admin
  private static async checkFamilyAdmin(userId: string, familyId: string): Promise<void> {
    const membership = await this.checkFamilyMembership(userId, familyId);
    
    if (membership.role !== 'ADMIN') {
      throw new NotFamilyAdminError();
    }
  }

  // Convert Prisma Task to TaskResponseDto
  private static taskToResponseDto(task: Task): TaskResponseDto {
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      color: task.color,
      icon: task.icon,
      defaultStartTime: task.defaultStartTime,
      defaultDuration: task.defaultDuration,
      isActive: task.isActive,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      familyId: task.familyId,
    };
  }

  // Create a new task (admin only)
  static async createTask(userId: string, familyId: string, data: CreateTaskDto): Promise<TaskResponseDto> {
    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, familyId);

    // Validate that the family exists
    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      throw new FamilyNotFoundError();
    }

    const task = await prisma.task.create({
      data: {
        name: data.name,
        description: data.description || null,
        color: data.color,
        icon: data.icon,
        defaultStartTime: data.defaultStartTime,
        defaultDuration: data.defaultDuration,
        familyId,
      },
    });

    return this.taskToResponseDto(task);
  }

  // Get all tasks for a family
  static async getFamilyTasks(
    userId: string, 
    familyId: string, 
    params: TaskQueryParams = {}
  ): Promise<TaskResponseDto[]> {
    // Check if user is a member of the family
    await this.checkFamilyMembership(userId, familyId);

    const { isActive = true, search, page = 1, limit = 50 } = params;
    
    // Build where clause
    const where: Prisma.TaskWhereInput = {
      familyId,
      isActive,
    };

    // Add search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    return tasks.map(this.taskToResponseDto);
  }

  // Get a specific task
  static async getTaskById(userId: string, taskId: string): Promise<TaskResponseDto> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        family: true,
      },
    });

    if (!task) {
      throw new TaskNotFoundError();
    }

    // Check if user is a member of the family
    await this.checkFamilyMembership(userId, task.familyId);

    return this.taskToResponseDto(task);
  }

  // Update a task (admin only)
  static async updateTask(
    userId: string, 
    taskId: string, 
    data: UpdateTaskDto
  ): Promise<TaskResponseDto> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      throw new TaskNotFoundError();
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, existingTask.familyId);

    // Build update data
    const updateData: Prisma.TaskUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.defaultStartTime !== undefined) updateData.defaultStartTime = data.defaultStartTime;
    if (data.defaultDuration !== undefined) updateData.defaultDuration = data.defaultDuration;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return this.taskToResponseDto(updatedTask);
  }

  // Soft delete a task (admin only)
  static async deleteTask(userId: string, taskId: string): Promise<void> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      throw new TaskNotFoundError();
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, existingTask.familyId);

    // Soft delete by setting isActive to false
    await prisma.task.update({
      where: { id: taskId },
      data: { isActive: false },
    });
  }

  // Hard delete a task (admin only) - for permanent removal
  static async permanentlyDeleteTask(userId: string, taskId: string): Promise<void> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      throw new TaskNotFoundError();
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, existingTask.familyId);

    // Hard delete from database
    await prisma.task.delete({
      where: { id: taskId },
    });
  }

  // Restore a soft-deleted task (admin only)
  static async restoreTask(userId: string, taskId: string): Promise<TaskResponseDto> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      throw new TaskNotFoundError();
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, existingTask.familyId);

    const restoredTask = await prisma.task.update({
      where: { id: taskId },
      data: { isActive: true },
    });

    return this.taskToResponseDto(restoredTask);
  }

  // Get task statistics for a family
  static async getFamilyTaskStats(userId: string, familyId: string): Promise<{
    totalTasks: number;
    activeTasks: number;
    inactiveTasks: number;
    averageDuration: number;
  }> {
    // Check if user is a member of the family
    await this.checkFamilyMembership(userId, familyId);

    const [totalTasks, activeTasks, inactiveTasks, avgDurationResult] = await Promise.all([
      prisma.task.count({
        where: { familyId },
      }),
      prisma.task.count({
        where: { familyId, isActive: true },
      }),
      prisma.task.count({
        where: { familyId, isActive: false },
      }),
      prisma.task.aggregate({
        where: { familyId, isActive: true },
        _avg: { defaultDuration: true },
      }),
    ]);

    return {
      totalTasks,
      activeTasks,
      inactiveTasks,
      averageDuration: Math.round(avgDurationResult._avg.defaultDuration || 0),
    };
  }

  // Duplicate a task (admin only)
  static async duplicateTask(userId: string, taskId: string, newName?: string): Promise<TaskResponseDto> {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      throw new TaskNotFoundError();
    }

    // Check if user is admin of the family
    await this.checkFamilyAdmin(userId, existingTask.familyId);

    const duplicatedTask = await prisma.task.create({
      data: {
        name: newName || `${existingTask.name} (Copy)`,
        description: existingTask.description,
        color: existingTask.color,
        icon: existingTask.icon,
        defaultStartTime: existingTask.defaultStartTime,
        defaultDuration: existingTask.defaultDuration,
        familyId: existingTask.familyId,
      },
    });

    return this.taskToResponseDto(duplicatedTask);
  }
} 