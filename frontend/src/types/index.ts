// Common types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
}

// User types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl?: string | null;
  isVirtual?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Family types
export interface Family {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  memberCount: number;
  userRole?: 'ADMIN' | 'MEMBER';
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user?: User;
}

export interface FamilyInvite {
  id: string;
  code: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
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

export interface FamilyJoinRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
  family: {
    id: string;
    name: string;
  };
  invite: {
    id: string;
    code: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateFamilyData {
  name: string;
  description?: string;
  avatarUrl?: string;
}

export interface UpdateFamilyData {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface JoinFamilyData {
  code: string;
  message?: string | undefined;
}

export interface CreateVirtualMemberData {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  familyId: string;
}

export interface UpdateVirtualMemberData {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

// Task types
export interface Task {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  defaultStartTime: string;
  defaultDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  familyId: string;
}

export interface CreateTaskData {
  name: string;
  description?: string;
  color: string;
  icon: string;
  defaultStartTime: string;
  defaultDuration: number;
}

export interface UpdateTaskData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  defaultStartTime?: string;
  defaultDuration?: number;
  isActive?: boolean;
}

export interface TaskQueryParams {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TaskStats {
  totalTasks: number;
  activeTasks: number;
  inactiveTasks: number;
  averageDuration: number;
}

export interface TaskAssignment {
  id: string;
  memberId: string | null;
  taskId: string;
  overrideTime: string | null;
  overrideDuration: number | null;
  assignedDate: string;
  createdAt: string;
  updatedAt: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null;
  task?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    defaultStartTime: string;
    defaultDuration: number;
    familyId: string;
  };
}

export interface CreateTaskAssignmentData {
  memberId?: string | null;
  taskId: string;
  overrideTime?: string | null;
  overrideDuration?: number | null;
  assignedDate: string;
}

export interface UpdateTaskAssignmentData {
  overrideTime?: string | null;
  overrideDuration?: number | null;
  assignedDate?: string;
}

// Day Template types
export interface DayTemplate {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  familyId: string;
}

export interface DayTemplateItem {
  id: string;
  memberId: string | null;
  taskId: string;
  overrideTime: string | null;
  overrideDuration: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  dayTemplateId: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null;
  task?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    defaultStartTime: string;
    defaultDuration: number;
    familyId: string;
  };
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
  memberId?: string | null;
  taskId: string;
  overrideTime?: string | null;
  overrideDuration?: number | null;
  sortOrder?: number;
}

export interface UpdateDayTemplateItemData {
  memberId?: string | null;
  overrideTime?: string | null;
  overrideDuration?: number | null;
  sortOrder?: number;
}

export interface ApplyDayTemplateData {
  templateId: string;
  dates: string[];
  overrideMemberAssignments?: boolean;
} 