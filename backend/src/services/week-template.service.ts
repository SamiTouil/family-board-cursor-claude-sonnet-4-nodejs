import {
  WeekTemplateWithRelations,
  WeekTemplateDayWithRelations,
  CreateWeekTemplateDto,
  UpdateWeekTemplateDto,
  CreateWeekTemplateDayDto,
  UpdateWeekTemplateDayDto,
  WeekTemplateQueryParams,

  CreateWeekTemplateSchema,
  UpdateWeekTemplateSchema,
  CreateWeekTemplateDaySchema,
  UpdateWeekTemplateDaySchema,

} from '../types/task.types';
import prisma from '../lib/prisma';
import { AppError } from '../utils/errors';

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
      throw AppError.fromErrorKey('WEEK_TEMPLATE_NAME_EXISTS');
    }

    // If setting as default, clear any existing default template
    if (validatedData.isDefault) {
      await prisma.weekTemplate.updateMany({
        where: {
          familyId: familyId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create the week template
    const template = await prisma.weekTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        isDefault: validatedData.isDefault || false,
        applyRule: validatedData.applyRule || null,
        priority: validatedData.priority || 0,
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
      throw AppError.fromErrorKey('WEEK_TEMPLATE_NOT_FOUND');
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
        throw AppError.fromErrorKey('WEEK_TEMPLATE_NAME_EXISTS');
      }
    }

    // If setting as default, clear any existing default template
    if (validatedData.isDefault === true) {
      await prisma.weekTemplate.updateMany({
        where: {
          familyId: familyId,
          isDefault: true,
          id: { not: id }, // Don't update the current template
        },
        data: {
          isDefault: false,
        },
      });
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
    if (validatedData.isDefault !== undefined) {
      updateData.isDefault = validatedData.isDefault;
    }
    if (validatedData.applyRule !== undefined) {
      updateData.applyRule = validatedData.applyRule;
    }
    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority;
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
      throw AppError.fromErrorKey('WEEK_TEMPLATE_NOT_FOUND');
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
      throw AppError.fromErrorKey('WEEK_TEMPLATE_NOT_FOUND');
    }

    // Verify day template exists and belongs to the same family
    const dayTemplate = await prisma.dayTemplate.findFirst({
      where: {
        id: validatedData.dayTemplateId,
        familyId: familyId,
      },
    });

    if (!dayTemplate) {
      throw AppError.fromErrorKey('DAY_TEMPLATE_NOT_FOUND', 'Day template not found or does not belong to this family');
    }

    // Check if this day of week already has a template assigned
    const existingDay = await prisma.weekTemplateDay.findFirst({
      where: {
        weekTemplateId: weekTemplateId,
        dayOfWeek: validatedData.dayOfWeek,
      },
    });

    if (existingDay) {
      throw AppError.fromErrorKey('DAY_TEMPLATE_ASSIGNED', `Day ${validatedData.dayOfWeek} already has a template assigned`);
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
      throw AppError.fromErrorKey('WEEK_TEMPLATE_DAY_NOT_FOUND');
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
        throw AppError.fromErrorKey('DAY_TEMPLATE_NOT_FOUND', 'Day template not found or does not belong to this family');
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
      throw AppError.fromErrorKey('WEEK_TEMPLATE_DAY_NOT_FOUND');
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
      throw AppError.fromErrorKey('WEEK_TEMPLATE_NOT_FOUND');
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
      throw AppError.fromErrorKey('WEEK_TEMPLATE_NOT_FOUND', 'Source week template not found');
    }

    // Check if new name conflicts with existing templates
    const conflictingTemplate = await prisma.weekTemplate.findFirst({
      where: {
        familyId: familyId,
        name: newName,
      },
    });

    if (conflictingTemplate) {
      throw AppError.fromErrorKey('WEEK_TEMPLATE_NAME_EXISTS');
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
   * Get week template preview - shows what tasks would be scheduled for the week
   * Note: Actual application now happens via WeekSchedule system
   */
  async getWeekTemplatePreview(
    templateId: string,
    familyId: string
  ): Promise<WeekTemplateWithRelations> {
    // Verify week template exists and belongs to the family
    const weekTemplate = await this.getWeekTemplateById(templateId, familyId);
    if (!weekTemplate) {
      throw AppError.fromErrorKey('WEEK_TEMPLATE_NOT_FOUND');
    }

    return weekTemplate;
  }
}

// Export singleton instance
export const weekTemplateService = new WeekTemplateService(); 