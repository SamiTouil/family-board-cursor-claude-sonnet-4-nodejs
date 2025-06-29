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

export class WeekScheduleService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }
  
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
    const weekOverride = await this.prisma.weekOverride.findUnique({
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

    // 2. Get base template (either from override or rule-based selection)
    const baseTemplate = weekOverride?.weekTemplate || 
                        await this.getApplicableWeekTemplate(familyId, weekStartDateObj);

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

    // Check if this is a day-level override (all overrides for same date)
    const isDayLevelOverride = this.isDayLevelOverride(validatedOverrides);

    // Create or update week override record
    const weekOverride = await this.prisma.weekOverride.upsert({
      where: { 
        familyId_weekStartDate: { 
          familyId, 
          weekStartDate: weekStartDateObj 
        } 
      },
      create: {
        familyId,
        weekStartDate: weekStartDateObj,
        weekTemplateId: data.weekTemplateId || await this.getApplicableWeekTemplateId(familyId, weekStartDateObj),
      },
      update: {
        weekTemplateId: data.weekTemplateId !== undefined ? data.weekTemplateId : undefined,
      },
    });

    if (isDayLevelOverride && validatedOverrides.length > 0) {
      // For day-level overrides, only delete conflicting overrides
      const targetDateString = validatedOverrides[0].assignedDate;
      const targetDate = new Date(targetDateString + 'T00:00:00.000Z');
      
      // Delete only the specific overrides that we're about to replace
      // This prevents duplicates while preserving other overrides
      for (const override of validatedOverrides) {
        await this.prisma.taskOverride.deleteMany({
          where: {
            weekOverrideId: weekOverride.id,
            assignedDate: targetDate,
            taskId: override.taskId,
            action: override.action,
          },
        });
      }
    } else {
      // For week-level overrides, remove all existing task overrides for this week
      await this.prisma.taskOverride.deleteMany({
        where: {
          weekOverrideId: weekOverride.id,
        },
      });
    }

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

    await this.prisma.weekOverride.deleteMany({
      where: {
        familyId,
        weekStartDate: weekStartDateObj,
      },
    });
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Check if all overrides are for the same day (day-level override)
   */
  private isDayLevelOverride(overrides: CreateTaskOverrideDto[]): boolean {
    if (overrides.length === 0) return false;
    
    const firstDate = overrides[0].assignedDate;
    return overrides.every(override => override.assignedDate === firstDate);
  }

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

  /**
   * Get the applicable week template for a specific week based on rules
   */
  private async getApplicableWeekTemplate(familyId: string, weekStartDate: Date): Promise<WeekTemplateWithRelations | null> {
    // Get all active week templates for the family
    const templates = await this.prisma.weekTemplate.findMany({
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
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { createdAt: 'asc' }, // Older templates first for tie-breaking
      ],
    });

    if (templates.length === 0) {
      return null;
    }

    // Calculate ISO week number for rule matching
    const weekNumber = this.getISOWeekNumber(weekStartDate);
    
    // Find applicable templates based on rules
    const applicableTemplates = templates.filter(template => {
      // Check if default template
      if (template.isDefault) {
        return true;
      }
      
      // Check rule-based matching
      if (template.applyRule === 'EVEN_WEEKS' && weekNumber % 2 === 0) {
        return true;
      }
      
      if (template.applyRule === 'ODD_WEEKS' && weekNumber % 2 === 1) {
        return true;
      }
      
      return false;
    });

    // Return the highest priority applicable template, or fallback to any default
    if (applicableTemplates.length > 0) {
      return applicableTemplates[0] as WeekTemplateWithRelations;
    }

    // If no rule-based matches, return the first default template
    const defaultTemplate = templates.find(t => t.isDefault);
    if (defaultTemplate) {
      return defaultTemplate as WeekTemplateWithRelations;
    }

    // Last resort: return the first available template
    return templates[0] as WeekTemplateWithRelations;
  }

  private async getApplicableWeekTemplateId(familyId: string, weekStartDate: Date): Promise<string | null> {
    const template = await this.getApplicableWeekTemplate(familyId, weekStartDate);
    return template?.id || null;
  }

  /**
   * Calculate ISO week number for a given date
   * ISO week 1 is the first week with at least 4 days in the new year
   */
  private getISOWeekNumber(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7; // Make Monday = 0
    target.setDate(target.getDate() - dayNumber + 3); // Thursday of the same week
    const firstThursday = target.valueOf();
    target.setMonth(0, 1); // January 1st
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
  }

  private async resolveDaySchedule(
    baseTemplate: WeekTemplateWithRelations | null,
    date: Date,
    overrides: TaskOverrideWithRelations[]
  ): Promise<ResolvedDaySchedule> {
    const dayOfWeek = date.getDay();
    
    // Get base day template for this day of week
    const baseDayTemplate = baseTemplate?.days.find(d => d.dayOfWeek === dayOfWeek);
    
    // Get overrides for this date
    const dateOverrides = overrides.filter(o => {
      const overrideDate = new Date(o.assignedDate);
      return overrideDate.toDateString() === date.toDateString();
    });

    let resolvedTasks: ResolvedTask[] = [];

    // Start with template items (if any)
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

    // Apply all overrides for this date
    for (const override of dateOverrides) {
      switch (override.action) {
        case TaskOverrideAction.ADD:
          // Add new task to the existing tasks
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
          
        case TaskOverrideAction.REASSIGN: {
          const taskToReassign = resolvedTasks.find(t => t.taskId === override.taskId);
          if (taskToReassign) {
            taskToReassign.memberId = override.newMemberId;
            taskToReassign.member = override.newMember || null;
            taskToReassign.source = 'override';
          }
          break;
        }
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
    const assignedDate = new Date(override.assignedDate + 'T00:00:00.000Z');
    
    // Check if this exact override already exists (same task, same action, same date)
    const existing = await this.prisma.taskOverride.findFirst({
      where: {
        weekOverrideId,
        assignedDate,
        taskId: override.taskId,
        action: override.action,
      },
    });
    
    if (existing) {
      // Update the existing override with new data
      return await this.prisma.taskOverride.update({
        where: { id: existing.id },
        data: {
          originalMemberId: override.originalMemberId,
          newMemberId: override.newMemberId,
          overrideTime: override.overrideTime,
          overrideDuration: override.overrideDuration,
        },
      });
    }
    
    return await this.prisma.taskOverride.create({
      data: {
        weekOverrideId,
        assignedDate,
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
    const weekOverride = await this.prisma.weekOverride.findFirst({
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