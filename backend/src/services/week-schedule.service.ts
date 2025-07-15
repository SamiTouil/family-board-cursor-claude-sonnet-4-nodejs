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
import { getWebSocketService } from './websocket.service';

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
    data: ApplyWeekOverrideDto,
    adminUserId?: string
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

    // Handle existing override replacement based on replaceExisting flag
    if (data.replaceExisting) {
      // Check if this is a day-level override (all overrides for the same date)
      const isDayLevelOverride = validatedOverrides.length > 0 && 
        validatedOverrides.every(override => override.assignedDate === validatedOverrides[0].assignedDate);

      if (isDayLevelOverride && validatedOverrides.length > 0) {
        // For day-level overrides with replaceExisting=true, delete all existing overrides for the target date
        const targetDateString = validatedOverrides[0].assignedDate;
        const targetDate = new Date(targetDateString + 'T00:00:00.000Z');
        
        // Delete all existing overrides for this date in one operation
        await this.prisma.taskOverride.deleteMany({
          where: {
            weekOverrideId: weekOverride.id,
            assignedDate: targetDate,
          },
        });
      } else {
        // For week-level overrides with replaceExisting=true, remove all existing task overrides for this week
        await this.prisma.taskOverride.deleteMany({
          where: { weekOverrideId: weekOverride.id },
        });
      }
    } else {
      // For cumulative overrides (replaceExisting=false or undefined), only remove conflicting overrides
      // Remove existing overrides for the same task-date combinations to avoid duplicates
      for (const override of validatedOverrides) {
        const targetDate = new Date(override.assignedDate + 'T00:00:00.000Z');
        
        await this.prisma.taskOverride.deleteMany({
          where: {
            weekOverrideId: weekOverride.id,
            assignedDate: targetDate,
            taskId: override.taskId,
          },
        });
      }
    }

    // Deduplicate overrides: for each task on each date, keep only the last action
    const deduplicatedOverrides = new Map<string, CreateTaskOverrideDto>();
    validatedOverrides.forEach(override => {
      const key = `${override.assignedDate}-${override.taskId}`;
      deduplicatedOverrides.set(key, override);
    });
    const finalOverrides = Array.from(deduplicatedOverrides.values());
    
    // Apply each override
    for (const override of finalOverrides) {
      await this.applyTaskOverride(weekOverride.id, override);
    }

    // Send notifications for task reassignments if adminUserId is provided
    if (adminUserId && finalOverrides.length > 0) {
      await this.sendTaskReassignmentNotifications(familyId, finalOverrides, adminUserId);
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
            // Apply time and duration overrides if provided
            if (override.overrideTime !== null) {
              taskToReassign.overrideTime = override.overrideTime;
            }
            if (override.overrideDuration !== null) {
              taskToReassign.overrideDuration = override.overrideDuration;
            }
          }
          break;
        }
      }
    }

    // Sort tasks by their effective start time
    const sortedTasks = resolvedTasks.sort((a, b) => {
      // Get effective time for task A
      const timeA = a.overrideTime || a.task.defaultStartTime;
      // Get effective time for task B
      const timeB = b.overrideTime || b.task.defaultStartTime;
      
      // Compare times (format is "HH:MM")
      return timeA.localeCompare(timeB);
    });

    return { 
      date, 
      dayOfWeek,
      tasks: sortedTasks 
    };
  }

  private async applyTaskOverride(
    weekOverrideId: string,
    override: CreateTaskOverrideDto
  ): Promise<TaskOverride> {
    const assignedDate = new Date(override.assignedDate + 'T00:00:00.000Z');
    
    // Since we delete all existing overrides for the date before calling this method,
    // we can directly create the new override without checking for duplicates
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

  /**
   * Send notifications for task reassignments
   */
  private async sendTaskReassignmentNotifications(
    familyId: string,
    overrides: CreateTaskOverrideDto[],
    adminUserId: string
  ): Promise<void> {
    console.log('📨 sendTaskReassignmentNotifications called with:', {
      familyId,
      overridesCount: overrides.length,
      adminUserId
    });
    
    const webSocketService = getWebSocketService();
    if (!webSocketService) {
      console.error('❌ WebSocket service not available!');
      return; // WebSocket service not available
    }

    // Get admin user information
    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { firstName: true, lastName: true },
    });

    if (!adminUser) {
      return; // Admin user not found
    }

    const adminName = `${adminUser.firstName} ${adminUser.lastName}`;

    // Process each override and send appropriate notifications
    for (const override of overrides) {
      // Get task information
      const task = await this.prisma.task.findUnique({
        where: { id: override.taskId },
        select: { name: true },
      });

      if (!task) {
        continue; // Skip if task not found
      }

      // Format date for display
      const date = new Date(override.assignedDate + 'T00:00:00.000Z');
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      // Handle different override actions
      console.log(`🔄 Processing override action: ${override.action} for task: ${task.name}`);
      
      switch (override.action) {
        case TaskOverrideAction.REASSIGN:
          if (override.originalMemberId && override.newMemberId) {
            console.log(`📤 Sending REASSIGN notification: ${task.name} from ${override.originalMemberId} to ${override.newMemberId}`);
            await webSocketService.notifyTaskReassigned(familyId, {
              taskId: override.taskId,
              taskName: task.name,
              date: formattedDate,
              originalMemberId: override.originalMemberId,
              newMemberId: override.newMemberId,
              adminUserId,
              adminName,
            });
          }
          break;

        case TaskOverrideAction.ADD:
          if (override.newMemberId) {
            await webSocketService.notifyTaskReassigned(familyId, {
              taskId: override.taskId,
              taskName: task.name,
              date: formattedDate,
              originalMemberId: null, // Task was added, not reassigned
              newMemberId: override.newMemberId,
              adminUserId,
              adminName,
            });
          }
          break;

        case TaskOverrideAction.REMOVE:
          if (override.originalMemberId) {
            await webSocketService.notifyTaskReassigned(familyId, {
              taskId: override.taskId,
              taskName: task.name,
              date: formattedDate,
              originalMemberId: override.originalMemberId,
              newMemberId: null, // Task was removed
              adminUserId,
              adminName,
            });
          }
          break;
      }
    }
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