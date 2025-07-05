// User types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Family types
export interface Family {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  inviteCode: string;
  userRole: 'ADMIN' | 'MEMBER';
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl?: string | null;
    isVirtual?: boolean;
  };
}

export interface FamilyJoinRequest {
  id: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  family: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FamilyInvite {
  id: string;
  code: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  family: {
    id: string;
    name: string;
  };
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
  receiver?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateFamilyData {
  name: string;
  description?: string;
}

export interface JoinFamilyData {
  code: string;
  message?: string;
}

// Navigation types
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type FamilyStackParamList = {
  FamilyOnboarding: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Family: undefined;
  Tasks: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  FamilyOnboarding: undefined;
  Main: undefined;
};

// Task types
export interface Task {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  defaultStartTime: string;
  defaultDuration: number;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedTask {
  taskId: string;
  memberId: string | null;
  overrideTime?: string | null;
  overrideDuration?: number | null;
  source: 'template' | 'override';
  task: Task;
  member?: User | null;
}

export interface ResolvedDay {
  date: string;
  tasks: ResolvedTask[];
}

export interface ResolvedWeekSchedule {
  familyId: string;
  weekStartDate: string;
  baseTemplate?: {
    id: string;
    name: string;
  } | null;
  hasOverrides: boolean;
  days: ResolvedDay[];
}

export interface CreateTaskOverrideData {
  assignedDate: string;
  taskId: string;
  action: 'ADD' | 'REMOVE' | 'REASSIGN';
  originalMemberId: string | null;
  newMemberId: string | null;
  overrideTime: string | null;
  overrideDuration: number | null;
}

export interface WeekOverrideData {
  weekStartDate: string;
  weekTemplateId?: string;
  taskOverrides: CreateTaskOverrideData[];
  replaceExisting: boolean;
} 