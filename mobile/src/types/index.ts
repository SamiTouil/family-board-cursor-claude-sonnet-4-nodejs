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
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  name: string;
  description?: string;
  icon?: string;
  color: string;
  defaultStartTime: string;
  defaultDuration: number;
}

export interface UpdateTaskData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultStartTime?: string;
  defaultDuration?: number;
  isActive?: boolean;
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

// Notification types
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  requestPermissions: () => Promise<boolean>;
  registerForPushNotifications: () => Promise<string | null>;
}

// Day Template types
export interface DayTemplate {
  id: string;
  name: string;
  description?: string;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayTemplateItem {
  id: string;
  dayTemplateId: string;
  taskId: string;
  memberId?: string;
  overrideTime?: string;
  overrideDuration?: number;
  task: Task;
  member?: FamilyMember;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDayTemplateData {
  name: string;
  description?: string;
}

export interface UpdateDayTemplateData {
  name?: string;
  description?: string;
}

export interface CreateDayTemplateItemData {
  taskId: string;
  memberId?: string;
  overrideTime?: string;
  overrideDuration?: number;
}

export interface UpdateDayTemplateItemData {
  memberId?: string;
  overrideTime?: string;
  overrideDuration?: number;
}

// Week Template types
export interface WeekTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  applyRule?: 'EVEN_WEEKS' | 'ODD_WEEKS' | null;
  priority: number;
  familyId: string;
  days?: WeekTemplateDay[];
  createdAt: string;
  updatedAt: string;
}

export interface WeekTemplateDay {
  id: string;
  weekTemplateId: string;
  dayOfWeek: number;
  dayTemplateId: string;
  dayTemplate?: DayTemplate;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeekTemplateData {
  name: string;
  description?: string;
  isDefault?: boolean;
  applyRule?: 'EVEN_WEEKS' | 'ODD_WEEKS' | null;
  priority?: number;
}

export interface UpdateWeekTemplateData {
  name?: string;
  description?: string;
  isDefault?: boolean;
  applyRule?: 'EVEN_WEEKS' | 'ODD_WEEKS' | null;
  priority?: number;
}

export interface CreateWeekTemplateDayData {
  dayOfWeek: number;
  dayTemplateId: string;
}

export interface UpdateWeekTemplateDayData {
  dayTemplateId: string;
}