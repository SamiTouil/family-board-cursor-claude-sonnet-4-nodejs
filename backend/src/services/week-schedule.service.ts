// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import {
  WeekOverrideWithRelations,
  TaskOverrideWithRelations,
  ResolvedWeekSchedule,
  ResolvedDaySchedule,
  ResolvedTask,
  WeekScheduleQueryParams,
  ApplyWeekOverrideDto,
  CreateTaskOverrideDto,
  CreateWeekOverrideSchema,
  CreateTaskOverrideSchema,
  WeekTemplateWithRelations,
  TaskOverride,
  TaskOverrideAction,
} from '../types/task.types';

const prisma = new PrismaClient();

export class WeekScheduleService {
  
  // ==================== WEEK SCHEDULE RESOLUTION ====================

  /**
   * Get the resolved schedule for a specific week
   * Combines week template with any overrides
   */
  async getWeekSchedule(
    familyId: string,
    params: WeekScheduleQueryParams
  ): Promise<ResolvedWeekSchedule> {
    const { weekStartDate } = params;
    
    // Validate and parse the week start date
    const weekStartDateObj = this.parseAndValidateWeekStartDate(weekStartDate);
    
    // 1. Find week override record
    const weekOverride = await prisma.weekOverride.findUnique({
      where: { 
        familyId_weekStartDate: { 
          familyId, 
          weekStartDate: weekStartDateObj 
        } 
      },
      include: {
        weekTemplate: {
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
                      },
                      orderBy: {
                        sortOrder: 'asc',
                      },
                    },
                  },
                },
              },
              orderBy: {
                dayOfWeek: 'asc',
              },
            },
          },
        },
        taskOverrides: {
          include: {
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
            originalMember: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                isVirtual: true,
              },
            },
            newMember: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                isVirtual: true,
              },
            },
          },
        },
      },
    });

    // 2. Get base template (either from override or family's default)
    const baseTemplate = weekOverride?.weekTemplate || 
                        await this.getFamilyDefaultWeekTemplate(familyId);

    // 3. Resolve each day by merging template + overrides
    const resolvedDays: ResolvedDaySchedule[] = [];
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(weekStartDateObj);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      
      const daySchedule = await this.resolveDaySchedule(
        baseTemplate,
        currentDate,
        weekOverride?.taskOverrides || []
      );
      
      resolvedDays.push(daySchedule);
    }

    return {
      weekStartDate: weekStartDateObj,
      familyId,
      baseTemplate: baseTemplate ? {
        id: baseTemplate.id,
        name: baseTemplate.name,
        description: baseTemplate.description,
      } : null,
      hasOverrides: !!weekOverride,
      days: resolvedDays,
    };
  }

  /**
   * Apply an override to a specific week
   */
  async applyWeekOverride(
    familyId: string,
    data: ApplyWeekOverrideDto
  ): Promise<WeekOverrideWithRelations> {
    // Validate input data
    CreateWeekOverrideSchema.parse({
      weekStartDate: data.weekStartDate,
      weekTemplateId: data.weekTemplateId,
    });

    const weekStartDateObj = this.parseAndValidateWeekStartDate(data.weekStartDate);

    // Validate task overrides
    const validatedOverrides = data.taskOverrides.map(override => 
      CreateTaskOverrideSchema.parse(override)
    );

    // Create or update week override record
    const weekOverride = await prisma.weekOverride.upsert({
      where: { 
        familyId_weekStartDate: { 
          familyId, 
          weekStartDate: weekStartDateObj 
        } 
      },
      create: {
        familyId,
        weekStartDate: weekStartDateObj,
        weekTemplateId: data.weekTemplateId || await this.getFamilyDefaultWeekTemplateId(familyId),
      },
      update: {
        weekTemplateId: data.weekTemplateId !== undefined ? data.weekTemplateId : undefined,
      },
    });

    // Remove existing task overrides for this week
    await prisma.taskOverride.deleteMany({
      where: {
        weekOverrideId: weekOverride.id,
      },
    });

    // Apply each override
    for (const override of validatedOverrides) {
      await this.applyTaskOverride(weekOverride.id, override);
    }

    // Return the updated week override with relations
    return await this.getWeekOverrideById(weekOverride.id, familyId);
  }

  /**
   * Remove overrides for a specific week (revert to template)
   */
  async removeWeekOverride(
    familyId: string,
    weekStartDate: string
  ): Promise<void> {
    const weekStartDateObj = this.parseAndValidateWeekStartDate(weekStartDate);

    await prisma.weekOverride.deleteMany({
      where: {
        familyId,
        weekStartDate: weekStartDateObj,
      },
    });
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private parseAndValidateWeekStartDate(weekStartDate: string): Date {
    const date = new Date(weekStartDate + 'T00:00:00.000Z');
    if (isNaN(date.getTime())) {
      throw new Error('Invalid week start date format. Expected YYYY-MM-DD.');
    }

    // Ensure it's a Monday (day 1 in getDay() where Sunday = 0)
    if (date.getDay() !== 1) {
      throw new Error('Week start date must be a Monday.');
    }

    return date;
  }

  private async getFamilyDefaultWeekTemplate(familyId: string): Promise<WeekTemplateWithRelations | null> {
    // Get the first active week template for the family
    // In the future, you might want to add a "isDefault" flag to WeekTemplate
    const result = await prisma.weekTemplate.findFirst({
      where: {
        familyId,
        isActive: true,
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
                  },
                  orderBy: {
                    sortOrder: 'asc',
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
      orderBy: {
        createdAt: 'asc', // Get the oldest (presumably default) template
      },
    });

    return result as WeekTemplateWithRelations | null;
  }

  private async getFamilyDefaultWeekTemplateId(familyId: string): Promise<string | null> {
    const template = await this.getFamilyDefaultWeekTemplate(familyId);
    return template?.id || null;
  }

  private async resolveDaySchedule(
    baseTemplate: WeekTemplateWithRelations | null,
    date: Date,
    overrides: TaskOverrideWithRelations[]
  ): Promise<ResolvedDaySchedule> {
    const dayOfWeek = date.getDay();
    
    // Get base day template for this day of week
    const baseDayTemplate = baseTemplate?.days.find(d => d.dayOfWeek === dayOfWeek);
    
    // Start with template items
    let resolvedTasks: ResolvedTask[] = [];
    
    if (baseDayTemplate?.dayTemplate.items) {
      resolvedTasks = baseDayTemplate.dayTemplate.items.map(item => ({
        taskId: item.taskId,
        memberId: item.memberId,
        overrideTime: item.overrideTime,
        overrideDuration: item.overrideDuration,
        source: 'template' as const,
        task: item.task,
        member: item.member,
      }));
    }

    // Apply overrides for this date
    const dateOverrides = overrides.filter(o => {
      const overrideDate = new Date(o.assignedDate);
      return overrideDate.toDateString() === date.toDateString();
    });

    for (const override of dateOverrides) {
      switch (override.action) {
        case 'ADD':
          resolvedTasks.push({
            taskId: override.taskId,
            memberId: override.newMemberId,
            overrideTime: override.overrideTime,
            overrideDuration: override.overrideDuration,
            source: 'override',
            task: override.task,
            member: override.newMember || null,
          });
          break;
          
        case TaskOverrideAction.REMOVE:
          resolvedTasks = resolvedTasks.filter(t => t.taskId !== override.taskId);
          break;
          
        case TaskOverrideAction.REASSIGN:
          const taskToReassign = resolvedTasks.find(t => t.taskId === override.taskId);
          if (taskToReassign) {
            taskToReassign.memberId = override.newMemberId;
            taskToReassign.member = override.newMember || null;
            taskToReassign.source = 'override';
          }
          break;
          
        case TaskOverrideAction.MODIFY_TIME:
          const taskToModify = resolvedTasks.find(t => t.taskId === override.taskId);
          if (taskToModify) {
            taskToModify.overrideTime = override.overrideTime;
            taskToModify.overrideDuration = override.overrideDuration;
            taskToModify.source = 'override';
          }
          break;
      }
    }

    return { 
      date, 
      dayOfWeek,
      tasks: resolvedTasks 
    };
  }

  private async applyTaskOverride(
    weekOverrideId: string,
    override: CreateTaskOverrideDto
  ): Promise<TaskOverride> {
    return await prisma.taskOverride.create({
      data: {
        weekOverrideId,
        assignedDate: new Date(override.assignedDate + 'T00:00:00.000Z'),
        taskId: override.taskId,
        action: override.action,
        originalMemberId: override.originalMemberId,
        newMemberId: override.newMemberId,
        overrideTime: override.overrideTime,
        overrideDuration: override.overrideDuration,
      },
    });
  }

  private async getWeekOverrideById(
    id: string,
    familyId: string
  ): Promise<WeekOverrideWithRelations> {
    const weekOverride = await prisma.weekOverride.findFirst({
      where: {
        id,
        familyId,
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
        weekTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        taskOverrides: {
          include: {
            weekOverride: {
              select: {
                id: true,
                weekStartDate: true,
                weekTemplateId: true,
                familyId: true,
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
            originalMember: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                isVirtual: true,
              },
            },
            newMember: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                isVirtual: true,
              },
            },
          },
        },
      },
    });

    if (!weekOverride) {
      throw new Error('Week override not found');
    }

    return weekOverride;
  }
} 