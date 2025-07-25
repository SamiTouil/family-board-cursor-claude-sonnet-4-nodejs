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
  ShiftInfo,
  ShiftStatusQueryParams,
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
    let removedOverrides: TaskOverride[] = [];
    
    if (data.replaceExisting) {
      // Check if this is a day-level override (all overrides for the same date)
      const isDayLevelOverride = validatedOverrides.length > 0 && 
        validatedOverrides.every(override => override.assignedDate === validatedOverrides[0].assignedDate);

      if (isDayLevelOverride && validatedOverrides.length > 0) {
        // For day-level overrides with replaceExisting=true, get existing overrides before deleting
        const targetDateString = validatedOverrides[0].assignedDate;
        const targetDate = new Date(targetDateString + 'T00:00:00.000Z');
        
        // Get existing overrides that will be removed
        removedOverrides = await this.prisma.taskOverride.findMany({
          where: {
            weekOverrideId: weekOverride.id,
            assignedDate: targetDate,
            action: { in: ['ADD', 'REASSIGN'] },
            newMemberId: { not: null },
          },
          include: {
            task: true,
          },
        });
        
        // Delete all existing overrides for this date in one operation
        await this.prisma.taskOverride.deleteMany({
          where: {
            weekOverrideId: weekOverride.id,
            assignedDate: targetDate,
          },
        });
      } else {
        // For week-level overrides with replaceExisting=true, get existing overrides before deleting
        removedOverrides = await this.prisma.taskOverride.findMany({
          where: {
            weekOverrideId: weekOverride.id,
            action: { in: ['ADD', 'REASSIGN'] },
            newMemberId: { not: null },
          },
          include: {
            task: true,
          },
        });
        
        // Remove all existing task overrides for this week
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

    // Send notifications for removed tasks first (if any)
    if (adminUserId && removedOverrides.length > 0) {
      await this.sendTaskRemovalNotifications(familyId, removedOverrides, adminUserId, weekStartDateObj);
    }

    // Send notifications for task reassignments if adminUserId is provided
    if (adminUserId && finalOverrides.length > 0) {
      await this.sendTaskReassignmentNotifications(familyId, finalOverrides, adminUserId);
    }

    // Emit general WebSocket event for schedule update
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      console.log('📅 Emitting week-schedule-updated event for family:', familyId);
      console.log('📅 Event data:', {
        type: 'week-schedule-updated',
        familyId,
        weekStartDate: data.weekStartDate,
        isTemplateChange: !!data.weekTemplateId,
        hasOverrides: finalOverrides.length > 0,
      });
      webSocketService.sendToFamily(familyId, 'week-schedule-updated', {
        type: 'week-schedule-updated',
        familyId,
        weekStartDate: data.weekStartDate,
        date: data.weekStartDate, // Add date field for consistency
        message: `Week schedule has been updated`,
        isTemplateChange: !!data.weekTemplateId,
        hasOverrides: finalOverrides.length > 0,
      });
    } else {
      console.error('❌ WebSocket service not available for week-schedule-updated event!');
    }

    // Return the updated week override with relations
    return await this.getWeekOverrideById(weekOverride.id, familyId);
  }

  /**
   * Remove overrides for a specific week (revert to template)
   */
  async removeWeekOverride(
    familyId: string,
    weekStartDate: string,
    adminUserId?: string
  ): Promise<void> {
    const weekStartDateObj = this.parseAndValidateWeekStartDate(weekStartDate);

    // First, get all task overrides that will be removed to send notifications
    const overridesToRemove = await this.prisma.taskOverride.findMany({
      where: {
        weekOverride: {
          familyId,
          weekStartDate: weekStartDateObj,
        },
      },
      include: {
        task: true,
        weekOverride: true,
      },
    });

    // Group overrides by action to send appropriate notifications
    const removedAssignments: TaskOverride[] = [];
    
    for (const override of overridesToRemove) {
      if (override.action === 'ADD' && override.newMemberId) {
        removedAssignments.push(override);
      } else if (override.action === 'REASSIGN' && override.newMemberId) {
        removedAssignments.push(override);
      }
    }

    // Delete the overrides
    await this.prisma.weekOverride.deleteMany({
      where: {
        familyId,
        weekStartDate: weekStartDateObj,
      },
    });

    // Send notifications for removed task assignments
    if (adminUserId && removedAssignments.length > 0) {
      await this.sendTaskRemovalNotifications(familyId, removedAssignments, adminUserId, weekStartDateObj);
    }

    // Emit WebSocket event for schedule update
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.sendToFamily(familyId, 'week-schedule-reverted', {
        type: 'week-schedule-reverted',
        familyId,
        weekStartDate,
        message: 'Week schedule has been reverted to template',
      });
    }
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
   * Send notifications for removed task assignments (when reverting week)
   */
  private async sendTaskRemovalNotifications(
    familyId: string,
    removedOverrides: TaskOverride[],
    adminUserId: string,
    weekStartDate: Date
  ): Promise<void> {
    console.log('📨 sendTaskRemovalNotifications called with:', {
      familyId,
      removedCount: removedOverrides.length,
      adminUserId
    });
    
    const webSocketService = getWebSocketService();
    if (!webSocketService) {
      console.error('❌ WebSocket service not available!');
      return;
    }

    // Get admin user information
    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { firstName: true, lastName: true },
    });

    if (!adminUser) {
      return;
    }

    const adminName = `${adminUser.firstName} ${adminUser.lastName}`;

    // Process each removed override
    for (const override of removedOverrides) {
      const date = new Date(override.assignedDate);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      // Notify the user who lost the task
      if (override.newMemberId && override.task) {
        console.log(`📤 Sending task removal notification for: ${override.task.name} to ${override.newMemberId}`);
        await webSocketService.notifyTaskReassigned(familyId, {
          taskId: override.taskId,
          taskName: override.task.name,
          taskIcon: override.task.icon,
          date: formattedDate,
          originalMemberId: override.newMemberId, // They had it
          newMemberId: null, // Now no one has it
          adminUserId,
          adminName,
        });
      }
    }
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
      // Get task information including icon
      const task = await this.prisma.task.findUnique({
        where: { id: override.taskId },
        select: { name: true, icon: true },
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
              taskIcon: task.icon,
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
              taskIcon: task.icon,
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
              taskIcon: task.icon,
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

  // ==================== SHIFT STATUS ====================

  /**
   * Get the current shift status for a user
   * Uses the same logic as the frontend ShiftIndicator
   */
  async getShiftStatus(
    familyId: string,
    userId: string,
    params: ShiftStatusQueryParams = {}
  ): Promise<ShiftInfo | null> {
    // Get the week start date (default to current week)
    const weekStartDate = params.weekStartDate || this.getCurrentWeekStart();

    // Get the week schedule
    const weekSchedule = await this.getWeekSchedule(familyId, { weekStartDate });

    return this.calculateShiftInfo(weekSchedule, familyId, userId);
  }

  /**
   * Calculate shift information for a user based on the week schedule
   * This implements the same logic as the frontend ShiftIndicator
   */
  private async calculateShiftInfo(weekSchedule: ResolvedWeekSchedule, familyId: string, userId: string): Promise<ShiftInfo | null> {
    const now = new Date();

    // Get all tasks for the entire week, sorted by date and time
    const allWeekTasks: Array<{ task: ResolvedTask; startTime: Date }> = [];

    weekSchedule.days.forEach(day => {
      day.tasks.forEach(task => {
        const startTime = task.overrideTime || task.task.defaultStartTime;
        const [hours, minutes] = startTime.split(':').map(Number);

        // Parse the day date and set the task time
        const dayDate = new Date(day.date.toISOString().split('T')[0] + 'T00:00:00');
        const taskStart = new Date(dayDate);
        taskStart.setHours(hours || 0, minutes || 0, 0, 0);

        allWeekTasks.push({
          task,
          startTime: taskStart
        });
      });
    });

    // Sort all tasks by start time (across all days)
    allWeekTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Find the most recent task (closest in the past)
    const pastTasks = allWeekTasks.filter(({ startTime }) => startTime <= now);

    if (pastTasks.length === 0) {
      // No tasks have started yet, find next task for current user
      const nextUserTask = allWeekTasks.find(({ task }) => task.memberId === userId);
      if (nextUserTask) {
        const timeUntilStart = this.formatTimeRemaining(nextUserTask.startTime.getTime() - now.getTime());
        return {
          type: 'next',
          startTime: nextUserTask.startTime,
          timeUntilStart
        };
      }
      return null;
    }

    // Get the most recent task that has started
    const mostRecentTask = pastTasks[pastTasks.length - 1];

    // Check if the most recent task is assigned to the current user
    if (mostRecentTask.task.memberId === userId) {
      // User is currently in shift - find when their shift ends (first task assigned to someone else)
      const shiftEndTask = allWeekTasks.find(({ startTime, task }) =>
        startTime > mostRecentTask.startTime && task.memberId !== userId
      );

      if (shiftEndTask) {
        // Shift ends when first task assigned to someone else starts
        const timeRemaining = this.formatTimeRemaining(shiftEndTask.startTime.getTime() - now.getTime());
        return {
          type: 'current',
          endTime: shiftEndTask.startTime,
          timeRemaining
        };
      } else {
        // No more tasks assigned to others in the current week
        // Check if we need to look at the next week for shift end
        return await this.calculateCrossWeekShiftEnd(familyId, userId, now);
      }
    } else {
      // User is not in shift - find their next task
      const nextUserTask = allWeekTasks.find(({ startTime, task }) =>
        startTime > now && task.memberId === userId
      );

      if (nextUserTask) {
        const timeUntilStart = this.formatTimeRemaining(nextUserTask.startTime.getTime() - now.getTime());
        return {
          type: 'next',
          startTime: nextUserTask.startTime,
          timeUntilStart
        };
      }

      // No more tasks for user this week - check next week
      return await this.calculateCrossWeekNextShift(familyId, userId, now);
    }
  }

  /**
   * Calculate shift end when it spans across weeks
   */
  private async calculateCrossWeekShiftEnd(familyId: string, userId: string, now: Date): Promise<ShiftInfo | null> {
    // Get the next week's schedule to find when shift ends
    const nextWeekStart = new Date(now);
    const daysUntilNextMonday = (8 - now.getDay()) % 7 || 7;
    nextWeekStart.setDate(now.getDate() + daysUntilNextMonday);

    const nextWeekStartStr = this.formatDateToString(nextWeekStart);

    try {
      const nextWeekSchedule = await this.getWeekSchedule(familyId, { weekStartDate: nextWeekStartStr });

      // Get all tasks from next week
      const nextWeekTasks: Array<{ task: ResolvedTask; startTime: Date }> = [];

      nextWeekSchedule.days.forEach(day => {
        day.tasks.forEach(task => {
          const startTime = task.overrideTime || task.task.defaultStartTime;
          const [hours, minutes] = startTime.split(':').map(Number);

          const dayDate = new Date(day.date.toISOString().split('T')[0] + 'T00:00:00');
          const taskStart = new Date(dayDate);
          taskStart.setHours(hours || 0, minutes || 0, 0, 0);

          nextWeekTasks.push({
            task,
            startTime: taskStart
          });
        });
      });

      // Sort by start time
      nextWeekTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Find first task assigned to someone else
      const shiftEndTask = nextWeekTasks.find(({ task }) => task.memberId !== userId);

      if (shiftEndTask) {
        const timeRemaining = this.formatTimeRemaining(shiftEndTask.startTime.getTime() - now.getTime());
        return {
          type: 'current',
          endTime: shiftEndTask.startTime,
          timeRemaining
        };
      }

      // If no tasks assigned to others in next week, default to end of next week
      const endOfNextWeek = new Date(nextWeekStart);
      endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);
      endOfNextWeek.setHours(23, 59, 59, 999);
      const timeRemaining = this.formatTimeRemaining(endOfNextWeek.getTime() - now.getTime());
      return {
        type: 'current',
        endTime: endOfNextWeek,
        timeRemaining
      };

    } catch (error) {
      // If we can't get next week's schedule, default to end of current week
      const endOfWeek = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7;
      endOfWeek.setDate(now.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);
      const timeRemaining = this.formatTimeRemaining(endOfWeek.getTime() - now.getTime());
      return {
        type: 'current',
        endTime: endOfWeek,
        timeRemaining
      };
    }
  }

  /**
   * Calculate next shift when it's in the following week
   */
  private async calculateCrossWeekNextShift(familyId: string, userId: string, now: Date): Promise<ShiftInfo | null> {
    // Get the next week's schedule to find user's next shift
    const nextWeekStart = new Date(now);
    const daysUntilNextMonday = (8 - now.getDay()) % 7 || 7;
    nextWeekStart.setDate(now.getDate() + daysUntilNextMonday);

    const nextWeekStartStr = this.formatDateToString(nextWeekStart);

    try {
      const nextWeekSchedule = await this.getWeekSchedule(familyId, { weekStartDate: nextWeekStartStr });

      // Get all tasks from next week
      const nextWeekTasks: Array<{ task: ResolvedTask; startTime: Date }> = [];

      nextWeekSchedule.days.forEach(day => {
        day.tasks.forEach(task => {
          const startTime = task.overrideTime || task.task.defaultStartTime;
          const [hours, minutes] = startTime.split(':').map(Number);

          const dayDate = new Date(day.date.toISOString().split('T')[0] + 'T00:00:00');
          const taskStart = new Date(dayDate);
          taskStart.setHours(hours || 0, minutes || 0, 0, 0);

          nextWeekTasks.push({
            task,
            startTime: taskStart
          });
        });
      });

      // Sort by start time
      nextWeekTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Find first task assigned to current user
      const nextUserTask = nextWeekTasks.find(({ task }) => task.memberId === userId);

      if (nextUserTask) {
        const timeUntilStart = this.formatTimeRemaining(nextUserTask.startTime.getTime() - now.getTime());
        return {
          type: 'next',
          startTime: nextUserTask.startTime,
          timeUntilStart
        };
      }

      return null; // No tasks for user in next week either
    } catch (error) {
      return null; // Can't determine next week's schedule
    }
  }

  /**
   * Get the current week start date (Monday)
   */
  private getCurrentWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToMonday);
    return this.formatDateToString(monday);
  }

  /**
   * Format a date to YYYY-MM-DD string
   */
  private formatDateToString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format time remaining in a human-readable format
   */
  private formatTimeRemaining(milliseconds: number): string {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      if (remainingHours > 0) {
        return `${days}d ${remainingHours}h`;
      }
      return `${days}d`;
    }

    if (hours > 0) {
      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${hours}h`;
    }

    return `${minutes}m`;
  }
}