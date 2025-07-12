import { PrismaClient } from '@prisma/client';
import { startOfDay, subDays } from 'date-fns';

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

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
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

    // Get all task overrides in the period
    const taskOverrides = await this.prisma.taskOverride.findMany({
      where: {
        task: {
          familyId: familyId
        },
        assignedDate: {
          gte: periodStart,
          lt: periodEnd
        },
        action: {
          not: 'REMOVE'
        }
      },
      include: {
        task: true,
        originalMember: true,
        newMember: true
      }
    });

    // Get all week overrides with day template assignments in the period
    const weekOverrides = await this.prisma.weekOverride.findMany({
      where: {
        familyId: familyId,
        weekStartDate: {
          gte: periodStart,
          lt: periodEnd
        },
        weekTemplateId: {
          not: null
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
                        task: true,
                        member: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
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

    // Process task overrides
    taskOverrides.forEach(override => {
      // Use newMember for ADD and REASSIGN actions
      const member = override.newMember;
      if (!member) return;

      const memberId = member.id;
      const duration = override.overrideDuration || override.task.defaultDuration;
      
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
    });

    // Process week template assignments
    weekOverrides.forEach(weekOverride => {
      if (!weekOverride.weekTemplate) return;
      
      weekOverride.weekTemplate.days.forEach(day => {
        if (!day.dayTemplate) return;
        
        // Calculate which actual date this day corresponds to
        const weekStart = new Date(weekOverride.weekStartDate);
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + day.dayOfWeek);
        
        // Only process if the day falls within our period
        if (dayDate >= periodStart && dayDate < periodEnd) {
          day.dayTemplate.items.forEach(item => {
            if (!item.member) return;
            
            const memberId = item.member.id;
            const duration = item.overrideDuration || item.task.defaultDuration;
            
            if (!memberTaskMap.has(memberId)) {
              memberTaskMap.set(memberId, {
                memberName: `${item.member.firstName} ${item.member.lastName}`,
                firstName: item.member.firstName,
                lastName: item.member.lastName,
                avatarUrl: item.member.avatarUrl,
                isVirtual: item.member.isVirtual || false,
                totalMinutes: 0,
                taskCount: 0
              });
            }
            
            const stats = memberTaskMap.get(memberId)!;
            stats.totalMinutes += duration;
            stats.taskCount += 1;
          });
        }
      });
    });

    // Calculate totals and percentages
    const totalMinutes = Array.from(memberTaskMap.values())
      .reduce((sum, stats) => sum + stats.totalMinutes, 0);

    const realMembers = Array.from(memberTaskMap.entries())
      .filter(([_, stats]) => !stats.isVirtual);

    const realMemberCount = realMembers.length;
    const averageMinutesPerMember = realMemberCount > 0 
      ? totalMinutes / realMemberCount 
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
    const fairnessScore = this.calculateFairnessScore(
      realMembers.map(([_, stats]) => stats.totalMinutes),
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