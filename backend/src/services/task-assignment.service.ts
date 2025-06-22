import { PrismaClient } from '@prisma/client';
import {
  TaskAssignmentWithRelations,
  CreateTaskAssignmentDto,
  UpdateTaskAssignmentDto,
  TaskAssignmentQueryParams,
  CreateTaskAssignmentSchema,
  UpdateTaskAssignmentSchema,
} from '../types/task.types';

const prisma = new PrismaClient();

export class TaskAssignmentService {
  /**
   * Create a new task assignment
   * Ensures timezone-safe date handling by converting to UTC
   */
  async createTaskAssignment(
    data: CreateTaskAssignmentDto,
    familyId: string
  ): Promise<TaskAssignmentWithRelations> {
    // Validate input data
    const validatedData = CreateTaskAssignmentSchema.parse(data);

    // Verify that the member belongs to the family (if memberId is provided)
    let member = null;
    if (validatedData.memberId) {
      member = await prisma.user.findFirst({
        where: {
          id: validatedData.memberId,
          familyMemberships: {
            some: {
              familyId: familyId,
            },
          },
        },
      });

      if (!member) {
        throw new Error('Member not found or does not belong to this family');
      }
    }

    // Verify that the task belongs to the family
    const task = await prisma.task.findFirst({
      where: {
        id: validatedData.taskId,
        familyId: familyId,
        isActive: true,
      },
    });

    if (!task) {
      throw new Error('Task not found or does not belong to this family');
    }

    // Convert assignedDate to UTC Date object for consistent storage
    const assignedDate = new Date(validatedData.assignedDate);
    // Ensure we store only the date part (set time to 00:00:00 UTC)
    assignedDate.setUTCHours(0, 0, 0, 0);

    // Create the task assignment
    const assignment = await prisma.taskAssignment.create({
      data: {
        memberId: validatedData.memberId || null,
        taskId: validatedData.taskId,
        overrideTime: validatedData.overrideTime || null,
        overrideDuration: validatedData.overrideDuration || null,
        assignedDate: assignedDate,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isVirtual: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            defaultStartTime: true,
            defaultDuration: true,
            familyId: true,
          },
        },
      },
    });

    return assignment;
  }

  /**
   * Get task assignment by ID
   */
  async getTaskAssignmentById(
    id: string,
    familyId: string
  ): Promise<TaskAssignmentWithRelations | null> {
    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        id: id,
        task: {
          familyId: familyId,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isVirtual: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            defaultStartTime: true,
            defaultDuration: true,
            familyId: true,
          },
        },
      },
    });

    return assignment;
  }

  /**
   * Get all task assignments for a family with filtering and pagination
   */
  async getTaskAssignments(
    familyId: string,
    params: TaskAssignmentQueryParams = {}
  ): Promise<{
    assignments: TaskAssignmentWithRelations[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      memberId,
      taskId,
      assignedDate,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = params;

    // Build where clause with timezone-safe date filtering
    const whereClause: any = {
      task: {
        familyId: familyId,
        isActive: true,
      },
    };

    if (memberId) {
      whereClause.memberId = memberId;
    }

    if (taskId) {
      whereClause.taskId = taskId;
    }

    // Handle date filtering with timezone safety
    if (assignedDate) {
      const date = new Date(assignedDate);
      date.setUTCHours(0, 0, 0, 0);
      whereClause.assignedDate = date;
    } else if (startDate || endDate) {
      whereClause.assignedDate = {};
      
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        whereClause.assignedDate.gte = start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        whereClause.assignedDate.lte = end;
      }
    }

    // Get total count for pagination
    const total = await prisma.taskAssignment.count({
      where: whereClause,
    });

    // Get assignments with pagination
    const assignments = await prisma.taskAssignment.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isVirtual: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            defaultStartTime: true,
            defaultDuration: true,
            familyId: true,
          },
        },
      },
      orderBy: [
        { assignedDate: 'asc' },
        { task: { name: 'asc' } },
        { member: { firstName: 'asc' } },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      assignments,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update a task assignment
   */
  async updateTaskAssignment(
    id: string,
    data: UpdateTaskAssignmentDto,
    familyId: string
  ): Promise<TaskAssignmentWithRelations> {
    // Validate input data
    const validatedData = UpdateTaskAssignmentSchema.parse(data);

    // Verify assignment exists and belongs to the family
    const existingAssignment = await this.getTaskAssignmentById(id, familyId);
    if (!existingAssignment) {
      throw new Error('Task assignment not found');
    }

    // Prepare update data with timezone-safe date handling
    const updateData: any = {};
    
    if (validatedData.overrideTime !== undefined) {
      updateData.overrideTime = validatedData.overrideTime;
    }
    
    if (validatedData.overrideDuration !== undefined) {
      updateData.overrideDuration = validatedData.overrideDuration;
    }
    
    if (validatedData.assignedDate) {
      const assignedDate = new Date(validatedData.assignedDate);
      assignedDate.setUTCHours(0, 0, 0, 0);
      updateData.assignedDate = assignedDate;
    }

    // Update the assignment
    const updatedAssignment = await prisma.taskAssignment.update({
      where: { id: id },
      data: updateData,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isVirtual: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            defaultStartTime: true,
            defaultDuration: true,
            familyId: true,
          },
        },
      },
    });

    return updatedAssignment;
  }

  /**
   * Delete a task assignment
   */
  async deleteTaskAssignment(id: string, familyId: string): Promise<void> {
    // Verify assignment exists and belongs to the family
    const existingAssignment = await this.getTaskAssignmentById(id, familyId);
    if (!existingAssignment) {
      throw new Error('Task assignment not found');
    }

    await prisma.taskAssignment.delete({
      where: { id: id },
    });
  }

  /**
   * Get task assignments for a specific member on a specific date
   */
  async getMemberAssignmentsForDate(
    memberId: string,
    date: string,
    familyId: string
  ): Promise<TaskAssignmentWithRelations[]> {
    // Verify member belongs to the family
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        familyMemberships: {
          some: {
            familyId: familyId,
          },
        },
      },
    });

    if (!member) {
      throw new Error('Member not found or does not belong to this family');
    }

    // Convert date to UTC for consistent querying
    const assignedDate = new Date(date);
    assignedDate.setUTCHours(0, 0, 0, 0);

    const assignments = await prisma.taskAssignment.findMany({
      where: {
        memberId: memberId,
        assignedDate: assignedDate,
        task: {
          familyId: familyId,
          isActive: true,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isVirtual: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            defaultStartTime: true,
            defaultDuration: true,
            familyId: true,
          },
        },
      },
      orderBy: [
        { task: { name: 'asc' } },
      ],
    });

    return assignments;
  }

  /**
   * Get all assignments for a specific task
   */
  async getTaskAssignmentsForTask(
    taskId: string,
    familyId: string,
    params: { startDate?: string | undefined; endDate?: string | undefined } = {}
  ): Promise<TaskAssignmentWithRelations[]> {
    // Verify task belongs to the family
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        familyId: familyId,
        isActive: true,
      },
    });

    if (!task) {
      throw new Error('Task not found or does not belong to this family');
    }

    // Build date filter
    const dateFilter: any = {};
    if (params.startDate) {
      const start = new Date(params.startDate);
      start.setUTCHours(0, 0, 0, 0);
      dateFilter.gte = start;
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const assignments = await prisma.taskAssignment.findMany({
      where: {
        taskId: taskId,
        ...(Object.keys(dateFilter).length > 0 && { assignedDate: dateFilter }),
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isVirtual: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            defaultStartTime: true,
            defaultDuration: true,
            familyId: true,
          },
        },
      },
      orderBy: [
        { assignedDate: 'asc' },
        { member: { firstName: 'asc' } },
      ],
    });

    return assignments;
  }

  /**
   * Bulk create task assignments
   */
  async bulkCreateTaskAssignments(
    assignments: CreateTaskAssignmentDto[],
    familyId: string
  ): Promise<TaskAssignmentWithRelations[]> {
    const createdAssignments: TaskAssignmentWithRelations[] = [];

    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const assignmentData of assignments) {
        const validatedData = CreateTaskAssignmentSchema.parse(assignmentData);

        // Verify task belongs to family
        const task = await tx.task.findFirst({
          where: {
            id: validatedData.taskId,
            familyId: familyId,
            isActive: true,
          },
        });

        // Verify member belongs to family (if memberId is provided)
        let member = null;
        if (validatedData.memberId) {
          member = await tx.user.findFirst({
            where: {
              id: validatedData.memberId,
              familyMemberships: {
                some: { familyId: familyId },
              },
            },
          });

          if (!member) {
            throw new Error(`Member ${validatedData.memberId} not found or does not belong to this family`);
          }
        }

        if (!task) {
          throw new Error(`Task ${validatedData.taskId} not found or does not belong to this family`);
        }

        // Convert assignedDate to UTC
        const assignedDate = new Date(validatedData.assignedDate);
        assignedDate.setUTCHours(0, 0, 0, 0);

        const assignment = await tx.taskAssignment.create({
          data: {
            memberId: validatedData.memberId || null,
            taskId: validatedData.taskId,
            overrideTime: validatedData.overrideTime || null,
            overrideDuration: validatedData.overrideDuration || null,
            assignedDate: assignedDate,
          },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                isVirtual: true,
              },
            },
            task: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
                icon: true,
                defaultStartTime: true,
                defaultDuration: true,
                familyId: true,
              },
            },
          },
        });

        createdAssignments.push(assignment);
      }
    });

    return createdAssignments;
  }
}

export const taskAssignmentService = new TaskAssignmentService(); 