export interface MemberTaskStats {
  memberId: string;
  memberName: string;
  isVirtual: boolean;
  totalMinutes: number;
  taskCount: number;
  percentage: number;
}

export interface TaskSplitAnalytics {
  periodStart: string;
  periodEnd: string;
  periodDays: number;
  memberStats: MemberTaskStats[];
  totalMinutes: number;
  averageMinutesPerMember: number;
  fairnessScore: number;
}

export interface FairnessHistoryPoint {
  week: string;
  fairnessScore: number;
}