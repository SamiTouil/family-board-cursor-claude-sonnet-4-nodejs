import { PrismaClient } from '@prisma/client';
import {
  WeekTemplateWithRelations,
  WeekTemplateDayWithRelations,
  CreateWeekTemplateDto,
  UpdateWeekTemplateDto,
  CreateWeekTemplateDayDto,
  UpdateWeekTemplateDayDto,
  WeekTemplateQueryParams,
  ApplyWeekTemplateDto,
  CreateWeekTemplateSchema,
  UpdateWeekTemplateSchema,
  CreateWeekTemplateDaySchema,
  UpdateWeekTemplateDaySchema,
  TaskAssignmentWithRelations,
} from '../types/task.types';

const prisma = new PrismaClient();

export class WeekTemplateService {
  
  // ==================== WEEK TEMPLATE CRUD ====================

  /**
   * Create a new week template
   */
  async createWeekTemplate(
    data: CreateWeekTemplateDto,
    familyId: string
  ): Promise<WeekTemplateWithRelations> {
    // Validate input data
    const validatedData = CreateWeekTemplateSchema.parse(data);

    // Check if template name already exists in family
    const existingTemplate = await prisma.weekTemplate.findFirst({
      where: {
        familyId: familyId,
        name: validatedData.name,
      },
    });

    if (existingTemplate) {
      throw new Error('A week template with this name already exists in this family');
    }

    // Create the week template
    const template = await prisma.weekTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        familyId: familyId,
      },
      include: {
        days: {
          include: {
            dayTemplate: {
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
            },
            weekTemplate: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            dayOfWeek: 'asc',
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
   * Get a week template by ID
   */
  async getWeekTemplateById(
    id: string,
    familyId: string
  ): Promise<WeekTemplateWithRelations | null> {
    const template = await prisma.weekTemplate.findFirst({
      where: {
        id: id,
        familyId: familyId,
      },
      include: {
        days: {
          include: {
            dayTemplate: {
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
            },
            weekTemplate: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            dayOfWeek: 'asc',
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
   * Get all week templates for a family with filtering and pagination
   */
  async getWeekTemplates(
    familyId: string,
    params: WeekTemplateQueryParams = {}
  ): Promise<{
    templates: WeekTemplateWithRelations[];
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
    const total = await prisma.weekTemplate.count({
      where: whereClause,
    });

    // Get templates with pagination
    const templates = await prisma.weekTemplate.findMany({
      where: whereClause,
      include: {
        days: {
          include: {
            dayTemplate: {
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
            },
            weekTemplate: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            dayOfWeek: 'asc',
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
   * Update a week template
   */
  async updateWeekTemplate(
    id: string,
    data: UpdateWeekTemplateDto,
    familyId: string
  ): Promise<WeekTemplateWithRelations> {
    // Validate input data
    const validatedData = UpdateWeekTemplateSchema.parse(data);

    // Verify template exists and belongs to the family
    const existingTemplate = await this.getWeekTemplateById(id, familyId);
    if (!existingTemplate) {
      throw new Error('Week template not found');
    }

    // Check if new name conflicts with existing templates (excluding current one)
    if (validatedData.name && validatedData.name !== existingTemplate.name) {
      const conflictingTemplate = await prisma.weekTemplate.findFirst({
        where: {
          familyId: familyId,
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (conflictingTemplate) {
        throw new Error('A week template with this name already exists in this family');
      }
    }

    // Build update data object with only defined values
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
    const updatedTemplate = await prisma.weekTemplate.update({
      where: { id: id },
      data: updateData,
      include: {
        days: {
          include: {
            dayTemplate: {
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
            },
            weekTemplate: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: {
            dayOfWeek: 'asc',
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
   * Delete a week template
   */
  async deleteWeekTemplate(id: string, familyId: string): Promise<void> {
    // Verify template exists and belongs to the family
    const existingTemplate = await this.getWeekTemplateById(id, familyId);
    if (!existingTemplate) {
      throw new Error('Week template not found');
    }

    // Delete the template (cascade will delete template days)
    await prisma.weekTemplate.delete({
      where: { id: id },
    });
  }

  // ==================== WEEK TEMPLATE DAY CRUD ====================

  /**
   * Add a day template to a week template
   */
  async addTemplateDay(
    weekTemplateId: string,
    data: CreateWeekTemplateDayDto,
    familyId: string
  ): Promise<WeekTemplateDayWithRelations> {
    // Validate input data
    const validatedData = CreateWeekTemplateDaySchema.parse(data);

    // Verify week template exists and belongs to the family
    const weekTemplate = await this.getWeekTemplateById(weekTemplateId, familyId);
    if (!weekTemplate) {
      throw new Error('Week template not found');
    }

    // Verify day template exists and belongs to the same family
    const dayTemplate = await prisma.dayTemplate.findFirst({
      where: {
        id: validatedData.dayTemplateId,
        familyId: familyId,
      },
    });

    if (!dayTemplate) {
      throw new Error('Day template not found or does not belong to this family');
    }

    // Check if this day of week already has a template assigned
    const existingDay = await prisma.weekTemplateDay.findFirst({
      where: {
        weekTemplateId: weekTemplateId,
        dayOfWeek: validatedData.dayOfWeek,
      },
    });

    if (existingDay) {
      throw new Error(`Day ${validatedData.dayOfWeek} already has a template assigned`);
    }

    // Create the week template day
    const weekTemplateDay = await prisma.weekTemplateDay.create({
      data: {
        weekTemplateId: weekTemplateId,
        dayOfWeek: validatedData.dayOfWeek,
        dayTemplateId: validatedData.dayTemplateId,
      },
      include: {
        dayTemplate: {
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
        },
        weekTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return weekTemplateDay;
  }

  /**
   * Update a week template day
   */
  async updateTemplateDay(
    weekTemplateDayId: string,
    data: UpdateWeekTemplateDayDto,
    familyId: string
  ): Promise<WeekTemplateDayWithRelations> {
    // Validate input data
    const validatedData = UpdateWeekTemplateDaySchema.parse(data);

    // Verify week template day exists
    const existingDay = await prisma.weekTemplateDay.findUnique({
      where: { id: weekTemplateDayId },
      include: {
        weekTemplate: true,
      },
    });

    if (!existingDay || existingDay.weekTemplate.familyId !== familyId) {
      throw new Error('Week template day not found');
    }

    // If updating day template, verify it exists and belongs to the same family
    if (validatedData.dayTemplateId) {
      const dayTemplate = await prisma.dayTemplate.findFirst({
        where: {
          id: validatedData.dayTemplateId,
          familyId: familyId,
        },
      });

      if (!dayTemplate) {
        throw new Error('Day template not found or does not belong to this family');
      }
    }

    // Build update data object with only defined values
    const updateData: any = {};
    if (validatedData.dayTemplateId !== undefined) {
      updateData.dayTemplateId = validatedData.dayTemplateId;
    }

    // Update the week template day
    const updatedDay = await prisma.weekTemplateDay.update({
      where: { id: weekTemplateDayId },
      data: updateData,
      include: {
        dayTemplate: {
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
        },
        weekTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return updatedDay;
  }

  /**
   * Remove a day template from a week template
   */
  async removeTemplateDay(
    weekTemplateDayId: string,
    familyId: string
  ): Promise<void> {
    // Verify week template day exists
    const existingDay = await prisma.weekTemplateDay.findUnique({
      where: { id: weekTemplateDayId },
      include: {
        weekTemplate: true,
      },
    });

    if (!existingDay || existingDay.weekTemplate.familyId !== familyId) {
      throw new Error('Week template day not found');
    }

    // Delete the week template day
    await prisma.weekTemplateDay.delete({
      where: { id: weekTemplateDayId },
    });
  }

  /**
   * Get all days for a week template
   */
  async getTemplateDays(
    weekTemplateId: string,
    familyId: string
  ): Promise<WeekTemplateDayWithRelations[]> {
    // Verify week template exists and belongs to the family
    const weekTemplate = await prisma.weekTemplate.findFirst({
      where: {
        id: weekTemplateId,
        familyId: familyId,
      },
    });

    if (!weekTemplate) {
      throw new Error('Week template not found');
    }

    // Get all week template days
    const days = await prisma.weekTemplateDay.findMany({
      where: {
        weekTemplateId: weekTemplateId,
      },
      include: {
        dayTemplate: {
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
        },
        weekTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });

    return days;
  }

  // ==================== WEEK TEMPLATE UTILITY METHODS ====================

  /**
   * Duplicate a week template
   */
  async duplicateTemplate(
    templateId: string,
    newName: string,
    familyId: string
  ): Promise<WeekTemplateWithRelations> {
    // Verify source template exists and belongs to the family
    const sourceTemplate = await this.getWeekTemplateById(templateId, familyId);
    if (!sourceTemplate) {
      throw new Error('Source week template not found');
    }

    // Check if new name conflicts with existing templates
    const conflictingTemplate = await prisma.weekTemplate.findFirst({
      where: {
        familyId: familyId,
        name: newName,
      },
    });

    if (conflictingTemplate) {
      throw new Error('A week template with this name already exists in this family');
    }

    // Create new template with all days in a transaction
    const newTemplate = await prisma.$transaction(async (tx) => {
      // Create the new template
      const template = await tx.weekTemplate.create({
        data: {
          name: newName,
          description: sourceTemplate.description,
          familyId: familyId,
        },
      });

      // Copy all template days
      for (const day of sourceTemplate.days) {
        await tx.weekTemplateDay.create({
          data: {
            weekTemplateId: template.id,
            dayOfWeek: day.dayOfWeek,
            dayTemplateId: day.dayTemplateId,
          },
        });
      }

      // Return the complete template with days
      return await tx.weekTemplate.findUnique({
        where: { id: template.id },
        include: {
          days: {
            include: {
              dayTemplate: {
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
              },
              weekTemplate: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
            orderBy: {
              dayOfWeek: 'asc',
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

  /**
   * Apply a week template to a specific week
   * Creates task assignments for all days in the week based on the template
   */
  async applyWeekTemplate(
    data: ApplyWeekTemplateDto,
    familyId: string
  ): Promise<TaskAssignmentWithRelations[]> {
    const { templateId, startDate, overrideMemberAssignments = false } = data;

    // Verify week template exists and belongs to the family
    const weekTemplate = await this.getWeekTemplateById(templateId, familyId);
    if (!weekTemplate) {
      throw new Error('Week template not found');
    }

    // Parse start date and calculate all dates for the week
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      throw new Error('Invalid start date format');
    }

    // Ensure start date is a Monday (day 1)
    const dayOfWeek = startDateObj.getDay();
    if (dayOfWeek !== 1) {
      throw new Error('Start date must be a Monday');
    }

    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDateObj);
      date.setDate(startDateObj.getDate() + i);
      weekDates.push(date);
    }

    const createdAssignments: TaskAssignmentWithRelations[] = [];

    // Apply each day template to its corresponding date
    for (const weekTemplateDay of weekTemplate.days) {
      // Convert ISO day of week (0=Sunday, 1=Monday, ..., 6=Saturday) to array index (0=Monday, ..., 6=Sunday)
      const dateIndex = weekTemplateDay.dayOfWeek === 0 ? 6 : weekTemplateDay.dayOfWeek - 1;
      const targetDate = weekDates[dateIndex];
      
      if (!targetDate) {
        throw new Error(`Invalid day of week: ${weekTemplateDay.dayOfWeek}`);
      }
      
      // Apply the day template to this specific date
      const dayTemplateService = new (await import('./day-template.service')).DayTemplateService();
      const dateString = targetDate.toISOString().split('T')[0]!; // Convert to YYYY-MM-DD
      const assignments = await dayTemplateService.applyTemplate(
        {
          templateId: weekTemplateDay.dayTemplateId,
          dates: [dateString],
          overrideMemberAssignments,
        },
        familyId
      );

      createdAssignments.push(...assignments);
    }

    return createdAssignments;
  }
}

// Export singleton instance
export const weekTemplateService = new WeekTemplateService(); 