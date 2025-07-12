import { PrismaClient } from '@prisma/client';
import { startOfDay, subDays, addDays } from 'date-fns';
import { WeekScheduleService } from './week-schedule.service';

export interface MemberTaskStats {
  memberId: string;
  memberName: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isVirtual: boolean;
  totalMinutes: number;
  taskCount: number;
  percentage: number;
}

export interface TaskSplitAnalytics {
  periodStart: Date;
  periodEnd: Date;
  periodDays: number;
  memberStats: MemberTaskStats[];
  totalMinutes: number;
  averageMinutesPerMember: number;
  fairnessScore: number; // 0-100, where 100 is perfectly fair
}

export class AnalyticsService {
  private prisma: PrismaClient;
  private weekScheduleService: WeekScheduleService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.weekScheduleService = new WeekScheduleService(prisma);
  }

  /**
   * Calculate task split analytics for a family over a rolling period
   * @param familyId - The family ID to analyze
   * @param periodDays - Number of days to analyze (default: 28 days / 4 weeks)
   * @returns Task split analytics including fairness score
   */
  async calculateTaskSplit(
    familyId: string,
    periodDays: number = 28
  ): Promise<TaskSplitAnalytics> {
    // Calculate period boundaries
    const periodEnd = startOfDay(new Date());
    const periodStart = startOfDay(subDays(periodEnd, periodDays));

    // Get all task overrides in the period (both ADD/REASSIGN and REMOVE)
    const allTaskOverrides = await this.prisma.taskOverride.findMany({
      where: {
        task: {
          familyId: familyId
        },
        assignedDate: {
          gte: periodStart,
          lt: periodEnd
        }
      },
      include: {
        task: true,
        originalMember: true,
        newMember: true
      }
    });

    // Create a map of task overrides by date for quick lookup
    const overridesByDate = new Map<string, typeof allTaskOverrides[0][]>();
    allTaskOverrides.forEach(override => {
      const dateKey = override.assignedDate.toISOString().split('T')[0]!;
      const existing = overridesByDate.get(dateKey) || [];
      overridesByDate.set(dateKey, [...existing, override]);
    });

    // Aggregate task durations by member
    const memberTaskMap = new Map<string, {
      memberName: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string | null;
      isVirtual: boolean;
      totalMinutes: number;
      taskCount: number;
    }>();

    // Helper function to add task time to a member
    const addTaskToMember = (member: any, duration: number) => {
      if (!member) return;
      
      const memberId = member.id;
      if (!memberTaskMap.has(memberId)) {
        memberTaskMap.set(memberId, {
          memberName: `${member.firstName} ${member.lastName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          avatarUrl: member.avatarUrl,
          isVirtual: member.isVirtual || false,
          totalMinutes: 0,
          taskCount: 0
        });
      }
      
      const stats = memberTaskMap.get(memberId)!;
      stats.totalMinutes += duration;
      stats.taskCount += 1;
    };

    // Process each day in the period
    let currentDate = new Date(periodStart);
    while (currentDate < periodEnd) {
      const dateKey = currentDate.toISOString().split('T')[0]!;
      const dayOfWeek = currentDate.getDay();
      
      // Find the Monday of this week
      const weekStart = new Date(currentDate);
      const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      weekStart.setDate(weekStart.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      // Get the week schedule for this date
      const weekSchedule = await this.weekScheduleService.getWeekSchedule(familyId, {
        weekStartDate: weekStart.toISOString().split('T')[0]!
      });
      
      // Find the day schedule for the current date
      const daySchedule = weekSchedule.days.find(day => {
        const dayDate = new Date(day.date);
        return dayDate.toISOString().split('T')[0]! === dateKey;
      });
      
      if (daySchedule) {
        // Process each task in the day
        daySchedule.tasks.forEach(task => {
          // Check if this task has been removed by an override
          const taskOverrides = overridesByDate.get(dateKey) || [];
          const removeOverride = taskOverrides.find(
            o => o.taskId === task.taskId && o.action === 'REMOVE'
          );
          
          if (!removeOverride && task.member) {
            // Task is not removed and has an assigned member, count it
            const duration = task.overrideDuration || task.task.defaultDuration;
            addTaskToMember(task.member, duration);
          }
        });
      }
      
      // Process ADD overrides for this date
      const addOverrides = (overridesByDate.get(dateKey) || [])
        .filter(o => o.action === 'ADD');
      
      addOverrides.forEach(override => {
        const duration = override.overrideDuration || override.task.defaultDuration;
        addTaskToMember(override.newMember, duration);
      });
      
      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

    // Calculate totals and percentages
    const totalMinutes = Array.from(memberTaskMap.values())
      .reduce((sum, stats) => sum + stats.totalMinutes, 0);

    const realMembers = Array.from(memberTaskMap.entries())
      .filter(([_, stats]) => !stats.isVirtual);

    const realMemberCount = realMembers.length;
    const realMemberTotalMinutes = realMembers
      .reduce((sum, [_, stats]) => sum + stats.totalMinutes, 0);
    const averageMinutesPerMember = realMemberCount > 0 
      ? realMemberTotalMinutes / realMemberCount 
      : 0;

    // Create member stats array
    const memberStats: MemberTaskStats[] = Array.from(memberTaskMap.entries())
      .map(([memberId, stats]) => ({
        memberId,
        memberName: stats.memberName,
        firstName: stats.firstName,
        lastName: stats.lastName,
        avatarUrl: stats.avatarUrl ?? null,
        isVirtual: stats.isVirtual,
        totalMinutes: stats.totalMinutes,
        taskCount: stats.taskCount,
        percentage: totalMinutes > 0 ? (stats.totalMinutes / totalMinutes) * 100 : 0
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Calculate fairness score (only for real members)
    const realMemberMinutes = realMembers.map(([_, stats]) => stats.totalMinutes);
    const fairnessScore = this.calculateFairnessScore(
      realMemberMinutes,
      averageMinutesPerMember
    );

    return {
      periodStart,
      periodEnd,
      periodDays,
      memberStats,
      totalMinutes,
      averageMinutesPerMember,
      fairnessScore
    };
  }

  /**
   * Calculate fairness score based on standard deviation from average
   * @param memberMinutes - Array of minutes for each member
   * @param average - Average minutes per member
   * @returns Fairness score from 0-100
   */
  private calculateFairnessScore(memberMinutes: number[], average: number): number {
    if (memberMinutes.length === 0 || average === 0) return 100;

    // Calculate standard deviation
    const squaredDifferences = memberMinutes.map(minutes => 
      Math.pow(minutes - average, 2)
    );
    const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / memberMinutes.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to coefficient of variation (normalized by average)
    const coefficientOfVariation = standardDeviation / average;

    // Convert to 0-100 score where 0 CV = 100 score
    // Using exponential decay: score = 100 * e^(-2 * CV)
    // This gives a nice curve where small variations still get high scores
    const fairnessScore = Math.max(0, Math.min(100, 100 * Math.exp(-2 * coefficientOfVariation)));

    return Math.round(fairnessScore);
  }

  /**
   * Get historical fairness scores over time
   * @param familyId - The family ID to analyze
   * @param weeks - Number of weeks to look back
   * @returns Array of weekly fairness scores
   */
  async getHistoricalFairness(
    familyId: string,
    weeks: number = 12
  ): Promise<Array<{ week: Date; fairnessScore: number }>> {
    const results: Array<{ week: Date; fairnessScore: number }> = [];

    for (let i = 0; i < weeks; i++) {
      const weekEnd = startOfDay(subDays(new Date(), i * 7));
      const analytics = await this.calculateTaskSplit(familyId, 28);
      
      results.push({
        week: weekEnd,
        fairnessScore: analytics.fairnessScore
      });
    }

    return results.reverse();
  }
}