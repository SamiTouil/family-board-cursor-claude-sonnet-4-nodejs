import { apiClient } from '../services/api-client';

export interface ShiftAnalyticsParams {
  timeframe?: '3months' | '6months' | '1year' | 'custom';
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

export interface ShiftAnalyticsResponse {
  monthlyScores: MonthlyScore[];
  memberScores: MemberShiftScore[];
  shiftDistribution: ShiftDistribution[];
}

export const analyticsApi = {
  getShiftAnalytics: async (params: ShiftAnalyticsParams): Promise<ShiftAnalyticsResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params.timeframe) queryParams.append('timeframe', params.timeframe);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.memberIds?.length) queryParams.append('memberIds', params.memberIds.join(','));
    if (params.showVirtual !== undefined) queryParams.append('showVirtual', params.showVirtual.toString());

    const response = await apiClient.get(`/analytics/shifts?${queryParams.toString()}`);
    return response.data;
  },

  getTaskSplit: async (periodDays = 28, referenceDate?: string) => {
    const params = new URLSearchParams();
    params.append('periodDays', periodDays.toString());
    if (referenceDate) params.append('referenceDate', referenceDate);

    const response = await apiClient.get(`/analytics/task-split?${params.toString()}`);
    return response.data;
  },

  getFairnessHistory: async (weeks = 12) => {
    const response = await apiClient.get(`/analytics/fairness-history?weeks=${weeks}`);
    return response.data;
  }
};