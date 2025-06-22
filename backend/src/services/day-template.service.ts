import { PrismaClient } from '@prisma/client';
import {
  DayTemplateWithRelations,
  DayTemplateItemWithRelations,
  CreateDayTemplateDto,
  UpdateDayTemplateDto,
  CreateDayTemplateItemDto,
  UpdateDayTemplateItemDto,
  DayTemplateQueryParams,
  ApplyDayTemplateDto,
  CreateDayTemplateSchema,
  UpdateDayTemplateSchema,
  CreateDayTemplateItemSchema,
  UpdateDayTemplateItemSchema,
  TaskAssignmentWithRelations,
} from '../types/task.types';

const prisma = new PrismaClient();

export class DayTemplateService {
  
  // ==================== DAY TEMPLATE CRUD ====================

  /**
   * Create a new day template
   */
  async createDayTemplate(
    data: CreateDayTemplateDto,
    familyId: string
  ): Promise<DayTemplateWithRelations> {
    // Validate input data
    const validatedData = CreateDayTemplateSchema.parse(data);

    // Check if template name already exists in family
    const existingTemplate = await prisma.dayTemplate.findFirst({
      where: {
        familyId: familyId,
        name: validatedData.name,
      },
    });

    if (existingTemplate) {
      throw new Error('A template with this name already exists in this family');
    }

    // Create the day template
    const template = await prisma.dayTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        familyId: familyId,
      },
      include: {
        items: {
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
            dayTemplate: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return template;
  }

  /**
   * Get a day template by ID
   */
  async getDayTemplateById(
    id: string,
    familyId: string
  ): Promise<DayTemplateWithRelations | null> {
    const template = await prisma.dayTemplate.findFirst({
      where: {
        id: id,
        familyId: familyId,
      },
      include: {
        items: {
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
            dayTemplate: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return template;
  }

  /**
   * Get all day templates for a family with filtering and pagination
   */
  async getDayTemplates(
    familyId: string,
    params: DayTemplateQueryParams = {}
  ): Promise<{
    templates: DayTemplateWithRelations[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      isActive,
      search,
      page = 1,
      limit = 50,
    } = params;

    // Build where clause
    const whereClause: any = {
      familyId: familyId,
    };

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.dayTemplate.count({
      where: whereClause,
    });

    // Get templates with pagination
    const templates = await prisma.dayTemplate.findMany({
      where: whereClause,
      include: {
        items: {
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
            dayTemplate: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      templates,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update a day template
   */
  async updateDayTemplate(
    id: string,
    data: UpdateDayTemplateDto,
    familyId: string
  ): Promise<DayTemplateWithRelations> {
    // Validate input data
    const validatedData = UpdateDayTemplateSchema.parse(data);

    // Verify template exists and belongs to the family
    const existingTemplate = await this.getDayTemplateById(id, familyId);
    if (!existingTemplate) {
      throw new Error('Day template not found');
    }

    // Check if new name conflicts with existing templates (if name is being changed)
    if (validatedData.name && validatedData.name !== existingTemplate.name) {
      const nameConflict = await prisma.dayTemplate.findFirst({
        where: {
          familyId: familyId,
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new Error('A template with this name already exists in this family');
      }
    }

    // Prepare update data, filtering out undefined values
    const updateData: any = {};
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }

    // Update the template
    const updatedTemplate = await prisma.dayTemplate.update({
      where: { id: id },
      data: updateData,
      include: {
        items: {
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
            dayTemplate: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedTemplate;
  }

  /**
   * Delete a day template
   */
  async deleteDayTemplate(id: string, familyId: string): Promise<void> {
    // Verify template exists and belongs to the family
    const existingTemplate = await this.getDayTemplateById(id, familyId);
    if (!existingTemplate) {
      throw new Error('Day template not found');
    }

    // Delete the template (cascade will delete template items)
    await prisma.dayTemplate.delete({
      where: { id: id },
    });
  }

  // ==================== DAY TEMPLATE ITEM CRUD ====================

  /**
   * Add a task to a day template
   */
  async addTemplateItem(
    templateId: string,
    data: CreateDayTemplateItemDto,
    familyId: string
  ): Promise<DayTemplateItemWithRelations> {
    // Validate input data
    const validatedData = CreateDayTemplateItemSchema.parse(data);

    // Verify template exists and belongs to the family
    const template = await this.getDayTemplateById(templateId, familyId);
    if (!template) {
      throw new Error('Day template not found');
    }

    // Verify task belongs to the family
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

    // Verify member belongs to the family (if memberId is provided)
    let member = null;
    if (validatedData.memberId) {
      member = await prisma.user.findFirst({
        where: {
          id: validatedData.memberId,
          familyMemberships: {
            some: { familyId: familyId },
          },
        },
      });

      if (!member) {
        throw new Error('Member not found or does not belong to this family');
      }
    }

    // Check if this task is already in the template for this member
    const existingItem = await prisma.dayTemplateItem.findFirst({
      where: {
        dayTemplateId: templateId,
        taskId: validatedData.taskId,
        memberId: validatedData.memberId || null,
      },
    });

    if (existingItem) {
      throw new Error('This task is already assigned to this member in the template');
    }

    // Create the template item
    const templateItem = await prisma.dayTemplateItem.create({
      data: {
        dayTemplateId: templateId,
        memberId: validatedData.memberId || null,
        taskId: validatedData.taskId,
        overrideTime: validatedData.overrideTime || null,
        overrideDuration: validatedData.overrideDuration || null,
        sortOrder: validatedData.sortOrder || 0,
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
        dayTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return templateItem;
  }

  /**
   * Update a template item
   */
  async updateTemplateItem(
    itemId: string,
    data: UpdateDayTemplateItemDto,
    familyId: string
  ): Promise<DayTemplateItemWithRelations> {
    // Validate input data
    const validatedData = UpdateDayTemplateItemSchema.parse(data);

    // Verify template item exists and belongs to the family
    const existingItem = await prisma.dayTemplateItem.findFirst({
      where: {
        id: itemId,
        dayTemplate: {
          familyId: familyId,
        },
      },
    });

    if (!existingItem) {
      throw new Error('Template item not found');
    }

    // Verify member belongs to the family (if memberId is being changed)
    if (validatedData.memberId !== undefined) {
      let member = null;
      if (validatedData.memberId) {
        member = await prisma.user.findFirst({
          where: {
            id: validatedData.memberId,
            familyMemberships: {
              some: { familyId: familyId },
            },
          },
        });

        if (!member) {
          throw new Error('Member not found or does not belong to this family');
        }
      }

      // Check for conflicts if changing member assignment
      if (validatedData.memberId !== existingItem.memberId) {
        const conflictingItem = await prisma.dayTemplateItem.findFirst({
          where: {
            dayTemplateId: existingItem.dayTemplateId,
            taskId: existingItem.taskId,
            memberId: validatedData.memberId || null,
            id: { not: itemId },
          },
        });

        if (conflictingItem) {
          throw new Error('This task is already assigned to this member in the template');
        }
      }
    }

    // Prepare update data, filtering out undefined values
    const updateItemData: any = {};
    if (validatedData.memberId !== undefined) {
      updateItemData.memberId = validatedData.memberId;
    }
    if (validatedData.overrideTime !== undefined) {
      updateItemData.overrideTime = validatedData.overrideTime;
    }
    if (validatedData.overrideDuration !== undefined) {
      updateItemData.overrideDuration = validatedData.overrideDuration;
    }
    if (validatedData.sortOrder !== undefined) {
      updateItemData.sortOrder = validatedData.sortOrder;
    }

    // Update the template item
    const updatedItem = await prisma.dayTemplateItem.update({
      where: { id: itemId },
      data: updateItemData,
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
        dayTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return updatedItem;
  }

  /**
   * Remove a task from a day template
   */
  async removeTemplateItem(itemId: string, familyId: string): Promise<void> {
    // Verify template item exists and belongs to the family
    const existingItem = await prisma.dayTemplateItem.findFirst({
      where: {
        id: itemId,
        dayTemplate: {
          familyId: familyId,
        },
      },
    });

    if (!existingItem) {
      throw new Error('Template item not found');
    }

    // Delete the template item
    await prisma.dayTemplateItem.delete({
      where: { id: itemId },
    });
  }

  // ==================== TEMPLATE APPLICATION ====================

  /**
   * Apply a day template to specific dates, creating task assignments
   */
  async applyTemplate(
    data: ApplyDayTemplateDto,
    familyId: string
  ): Promise<TaskAssignmentWithRelations[]> {
    const { templateId, dates, overrideMemberAssignments = false } = data;

    // Verify template exists and belongs to the family
    const template = await this.getDayTemplateById(templateId, familyId);
    if (!template) {
      throw new Error('Day template not found');
    }

    if (!template.isActive) {
      throw new Error('Cannot apply inactive template');
    }

    if (template.items.length === 0) {
      throw new Error('Template has no items to apply');
    }

    // Validate dates
    const validDates = dates.map(dateStr => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
      }
      // Normalize to UTC midnight
      date.setUTCHours(0, 0, 0, 0);
      return date;
    });

    const createdAssignments: TaskAssignmentWithRelations[] = [];

    // Process each date
    for (const assignedDate of validDates) {
      // Process each template item
      for (const item of template.items) {
        // Check if assignment already exists
        const existingAssignment = await prisma.taskAssignment.findFirst({
          where: {
            memberId: item.memberId,
            taskId: item.taskId,
            assignedDate: assignedDate,
          },
        });

        // Skip if assignment exists and we're not overriding
        if (existingAssignment && !overrideMemberAssignments) {
          continue;
        }

        // Delete existing assignment if overriding
        if (existingAssignment && overrideMemberAssignments) {
          await prisma.taskAssignment.delete({
            where: { id: existingAssignment.id },
          });
        }

        // Create new assignment from template item
        const newAssignment = await prisma.taskAssignment.create({
          data: {
            memberId: item.memberId,
            taskId: item.taskId,
            overrideTime: item.overrideTime,
            overrideDuration: item.overrideDuration,
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

        createdAssignments.push(newAssignment);
      }
    }

    return createdAssignments;
  }

  /**
   * Duplicate a day template
   */
  async duplicateTemplate(
    templateId: string,
    newName: string,
    familyId: string
  ): Promise<DayTemplateWithRelations> {
    // Verify source template exists and belongs to the family
    const sourceTemplate = await this.getDayTemplateById(templateId, familyId);
    if (!sourceTemplate) {
      throw new Error('Source template not found');
    }

    // Check if new name conflicts
    const nameConflict = await prisma.dayTemplate.findFirst({
      where: {
        familyId: familyId,
        name: newName,
      },
    });

    if (nameConflict) {
      throw new Error('A template with this name already exists in this family');
    }

    // Create new template with items in a transaction
    const newTemplate = await prisma.$transaction(async (tx) => {
      // Create the new template
      const template = await tx.dayTemplate.create({
        data: {
          name: newName,
          description: sourceTemplate.description,
          familyId: familyId,
        },
      });

      // Copy all template items
      for (const item of sourceTemplate.items) {
        await tx.dayTemplateItem.create({
          data: {
            dayTemplateId: template.id,
            memberId: item.memberId,
            taskId: item.taskId,
            overrideTime: item.overrideTime,
            overrideDuration: item.overrideDuration,
            sortOrder: item.sortOrder,
          },
        });
      }

      // Return the complete template with items
      return await tx.dayTemplate.findUnique({
        where: { id: template.id },
        include: {
          items: {
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
              dayTemplate: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
          family: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    return newTemplate!;
  }
}

export const dayTemplateService = new DayTemplateService(); 