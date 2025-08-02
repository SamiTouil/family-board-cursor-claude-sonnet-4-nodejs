import { startOfDay, subDays, addDays, format } from 'date-fns';
import { WeekScheduleService } from './week-schedule.service';
import prisma from '../lib/prisma';

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

export interface ShiftAnalyticsParams {
  familyId: string;
  timeframe: '3months' | '6months' | '1year' | 'custom';
  startDate?: string;
  endDate?: string;
  memberIds?: string[];
  showVirtual?: boolean;
}

export interface MonthlyScore {
  month: string;
  year: number;
  totalShifts: number;
  averageScore: number;
  topPerformer: string;
}

export interface MemberShiftScore {
  memberId: string;
  memberName: string;
  isVirtual: boolean;
  totalScore: number;
  shiftsCompleted: number;
  averageScore: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ShiftDistribution {
  memberId: string;
  memberName: string;
  morningShifts: number;
  afternoonShifts: number;
  eveningShifts: number;
  weekendShifts: number;
}

export class AnalyticsService {
  private prisma = prisma;
  private weekScheduleService: WeekScheduleService;

  constructor() {
    this.weekScheduleService = new WeekScheduleService();
  }

  /**
   * Calculate task split analytics for a family over a rolling period
   * @param familyId - The family ID to analyze
   * @param periodDays - Number of days to analyze (default: 28 days / 4 weeks)
   * @param referenceDate - Optional reference date (defaults to today). Period ends at end of reference week.
   * @returns Task split analytics including fairness score
   */
  async calculateTaskSplit(
    familyId: string,
    periodDays: number = 28,
    referenceDate?: string
  ): Promise<TaskSplitAnalytics> {
    // Calculate period boundaries
    let periodEnd: Date;
    
    if (referenceDate) {
      // If reference date provided, calculate the end of that week (Sunday at 23:59:59)
      const refDate = new Date(referenceDate + 'T00:00:00');
      const dayOfWeek = refDate.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 6 : (7 - dayOfWeek) % 7;
      periodEnd = new Date(refDate);
      periodEnd.setDate(refDate.getDate() + daysUntilSunday);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      periodEnd = new Date();
      periodEnd.setHours(23, 59, 59, 999);
    }
    
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodEnd.getDate() - periodDays + 1);
    periodStart.setHours(0, 0, 0, 0);
    

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
    while (currentDate <= periodEnd) {
      const dateKey = currentDate.toISOString().split('T')[0]!;
      const dayOfWeek = currentDate.getDay();
      
      // Find the Monday of this week
      const weekStart = new Date(currentDate);
      const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      weekStart.setDate(weekStart.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      // Format as local date string
      const year = weekStart.getFullYear();
      const month = String(weekStart.getMonth() + 1).padStart(2, '0');
      const day = String(weekStart.getDate()).padStart(2, '0');
      const weekStartStr = `${year}-${month}-${day}`;
      
      // Get the week schedule for this date
      const weekSchedule = await this.weekScheduleService.getWeekSchedule(familyId, {
        weekStartDate: weekStartStr
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

  /**
   * Get comprehensive shift analytics for scoring
   */
  async getShiftAnalytics(params: ShiftAnalyticsParams) {
    const { familyId, timeframe, startDate, endDate, memberIds, showVirtual = true } = params;

    // Calculate date range
    const dateRange = this.getShiftDateRange(timeframe, startDate, endDate);

    // Get all family members
    const familyMembers = await this.getFamilyMembers(familyId, showVirtual, memberIds);

    // Get monthly scores
    const monthlyScores = await this.getMonthlyShiftScores(familyId, dateRange, familyMembers);

    // Get member scores
    const memberScores = await this.getMemberShiftScores(familyId, dateRange, familyMembers);

    // Get shift distribution
    const shiftDistribution = await this.getShiftDistribution(familyId, dateRange, familyMembers);

    return {
      monthlyScores,
      memberScores,
      shiftDistribution
    };
  }

  private getShiftDateRange(timeframe: string, customStart?: string, customEnd?: string): { start: Date; end: Date } {
    const now = new Date();
    const end = customEnd ? new Date(customEnd) : now;
    let start: Date;

    switch (timeframe) {
      case '3months':
        start = subDays(end, 90);
        break;
      case '6months':
        start = subDays(end, 180);
        break;
      case '1year':
        start = subDays(end, 365);
        break;
      case 'custom':
        start = customStart ? new Date(customStart) : subDays(end, 90);
        break;
      default:
        start = subDays(end, 90);
    }

    return {
      start: startOfDay(start),
      end: startOfDay(addDays(end, 1))
    };
  }

  private async getFamilyMembers(familyId: string, showVirtual: boolean, memberIds?: string[]) {
    const where: any = {
      familyId,
      ...(memberIds && memberIds.length > 0 ? { id: { in: memberIds } } : {}),
      ...(!showVirtual ? { user: { isVirtual: false } } : {})
    };

    return await this.prisma.familyMember.findMany({
      where,
      include: {
        user: true
      }
    });
  }

  private async getMonthlyShiftScores(
    familyId: string,
    dateRange: { start: Date; end: Date },
    familyMembers: any[]
  ): Promise<MonthlyScore[]> {
    // Get all task overrides in the date range
    const taskOverrides = await this.prisma.taskOverride.findMany({
      where: {
        task: {
          familyId
        },
        assignedDate: {
          gte: dateRange.start,
          lt: dateRange.end
        },
        newMemberId: {
          in: familyMembers.map(m => m.id)
        }
      },
      include: {
        newMember: true,
        task: true
      },
      orderBy: {
        assignedDate: 'asc'
      }
    });

    // Group by month and calculate scores
    const monthlyData = new Map<string, {
      shifts: any[];
      memberCounts: Map<string, { name: string; count: number; totalDuration: number }>;
    }>();

    taskOverrides.forEach(override => {
      const monthKey = format(override.assignedDate, 'MM-yyyy');
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          shifts: [],
          memberCounts: new Map()
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.shifts.push(override);

      if (override.newMemberId) {
        const memberName = override.newMember 
          ? `${override.newMember.firstName} ${override.newMember.lastName}`
          : 'Unknown';

        const memberStats = monthData.memberCounts.get(override.newMemberId) || {
          name: memberName,
          count: 0,
          totalDuration: 0
        };

        memberStats.count += 1;
        memberStats.totalDuration += override.overrideDuration || override.task.defaultDuration;
        monthData.memberCounts.set(override.newMemberId, memberStats);
      }
    });

    // Convert to monthly scores
    const monthlyScores: MonthlyScore[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    monthlyData.forEach((data, monthKey) => {
      const [monthStr, yearStr] = monthKey.split('-');
      const month = parseInt(monthStr || '1');
      const year = parseInt(yearStr || new Date().getFullYear().toString());
      let topPerformer = '';
      let topCount = 0;

      data.memberCounts.forEach((memberData) => {
        if (memberData.count > topCount) {
          topCount = memberData.count;
          topPerformer = memberData.name;
        }
      });

      monthlyScores.push({
        month: monthNames[month - 1] || 'Unknown',
        year: year || new Date().getFullYear(),
        totalShifts: data.shifts.length,
        averageScore: 0, // No scores available
        topPerformer: topPerformer || 'N/A'
      });
    });

    return monthlyScores.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
    });
  }

  private async getMemberShiftScores(
    _familyId: string,
    dateRange: { start: Date; end: Date },
    familyMembers: any[]
  ): Promise<MemberShiftScore[]> {
    const memberScores: MemberShiftScore[] = [];

    for (const member of familyMembers) {
      // Get all shifts for this member
      const shifts = await this.prisma.taskOverride.findMany({
        where: {
          newMemberId: member.id,
          assignedDate: {
            gte: dateRange.start,
            lt: dateRange.end
          }
        },
        include: {
          task: true
        }
      });

      // Calculate current period stats
      const currentCount = shifts.length;
      const currentTotalDuration = shifts.reduce((sum, shift) => 
        sum + (shift.overrideDuration || shift.task?.defaultDuration || 0), 0
      );

      // Get previous period for trend calculation
      const prevDateRange = {
        start: subDays(dateRange.start, 90),
        end: dateRange.start
      };

      const prevShifts = await this.prisma.taskOverride.findMany({
        where: {
          newMemberId: member.id,
          assignedDate: {
            gte: prevDateRange.start,
            lt: prevDateRange.end
          }
        }
      });

      const prevCount = prevShifts.length;

      // Calculate trend based on shift count
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (currentCount > prevCount * 1.1) trend = 'up';
      else if (currentCount < prevCount * 0.9) trend = 'down';

      const memberName = `${member.user?.firstName} ${member.user?.lastName}`;

      memberScores.push({
        memberId: member.id,
        memberName,
        isVirtual: member.user?.isVirtual || false,
        totalScore: currentTotalDuration, // Using duration as a proxy for score
        shiftsCompleted: currentCount,
        averageScore: currentCount > 0 ? currentTotalDuration / currentCount : 0,
        trend
      });
    }

    // Sort by shifts completed descending
    return memberScores.sort((a, b) => b.shiftsCompleted - a.shiftsCompleted);
  }

  private async getShiftDistribution(
    _familyId: string,
    dateRange: { start: Date; end: Date },
    familyMembers: any[]
  ): Promise<ShiftDistribution[]> {
    const distributions: ShiftDistribution[] = [];

    for (const member of familyMembers) {
      const shifts = await this.prisma.taskOverride.findMany({
        where: {
          newMemberId: member.id,
          assignedDate: {
            gte: dateRange.start,
            lt: dateRange.end
          }
        },
        include: {
          task: true
        }
      });

      let morningShifts = 0;
      let afternoonShifts = 0;
      let eveningShifts = 0;
      let weekendShifts = 0;

      shifts.forEach(shift => {
        const date = shift.assignedDate;
        const hour = parseInt(shift.overrideTime?.split(':')[0] || shift.task?.defaultStartTime?.split(':')[0] || '0');
        
        // Time of day distribution
        if (hour >= 6 && hour < 12) morningShifts++;
        else if (hour >= 12 && hour < 18) afternoonShifts++;
        else eveningShifts++;

        // Weekend distribution
        if (date.getDay() === 0 || date.getDay() === 6) weekendShifts++;
      });

      const memberName = `${member.user?.firstName} ${member.user?.lastName}`;

      distributions.push({
        memberId: member.id,
        memberName,
        morningShifts,
        afternoonShifts,
        eveningShifts,
        weekendShifts
      });
    }

    return distributions;
  }
}