import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear auth data and redirect if this is NOT a login attempt
      if (!error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        // Redirect to login will be handled by auth context
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
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

// Task interfaces
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

// Authentication API
export const authApi = {
  signup: (data: SignupData): Promise<{ data: ApiResponse<AuthResponse> }> =>
    api.post('/auth/signup', data),
  
  login: (data: LoginData): Promise<{ data: ApiResponse<AuthResponse> }> =>
    api.post('/auth/login', data),
  
  logout: (): Promise<{ data: ApiResponse<{ message: string }> }> =>
    api.post('/auth/logout'),
  
  refresh: (): Promise<{ data: ApiResponse<{ token: string }> }> =>
    api.post('/auth/refresh'),
  
  getMe: (): Promise<{ data: ApiResponse<User> }> =>
    api.get('/auth/me'),
};

// User API (protected routes)
export const userApi = {
  getById: (id: string): Promise<{ data: ApiResponse<User> }> =>
    api.get(`/users/${id}`),
  
  update: (id: string, data: Partial<SignupData>): Promise<{ data: ApiResponse<User> }> =>
    api.put(`/users/${id}`, data),
  
  changePassword: (id: string, data: ChangePasswordData): Promise<{ data: ApiResponse<User> }> =>
    api.put(`/users/${id}/password`, data),
  
  delete: (id: string): Promise<{ data: ApiResponse<{ message: string }> }> =>
    api.delete(`/users/${id}`),
};

// Family API (protected routes)
export const familyApi = {
  // Get user's families
  getUserFamilies: (): Promise<{ data: ApiResponse<Family[]> }> =>
    api.get('/families'),
  
  // Create a new family
  create: (data: CreateFamilyData): Promise<{ data: ApiResponse<Family> }> =>
    api.post('/families', data),
  
  // Update family (admin only)
  update: (id: string, data: UpdateFamilyData): Promise<{ data: ApiResponse<Family> }> =>
    api.put(`/families/${id}`, data),
  
  // Join a family using invite code (now creates join request)
  join: (data: JoinFamilyData): Promise<{ data: ApiResponse<FamilyJoinRequest> }> =>
    api.post('/families/join', data),
  
  // Get family details
  getById: (id: string): Promise<{ data: ApiResponse<Family> }> =>
    api.get(`/families/${id}`),
  
  // Get family members
  getMembers: (id: string): Promise<{ data: ApiResponse<FamilyMember[]> }> =>
    api.get(`/families/${id}/members`),
  
  // Remove family member (admin only)
  removeMember: (familyId: string, memberId: string): Promise<{ data: ApiResponse<{ message: string }> }> =>
    api.delete(`/families/${familyId}/members/${memberId}`),
  
  // Create virtual member (admin only)
  createVirtualMember: (familyId: string, data: CreateVirtualMemberData): Promise<{ data: ApiResponse<FamilyMember> }> =>
    api.post(`/families/${familyId}/virtual-members`, data),
  
  // Update virtual member (admin only)
  updateVirtualMember: (familyId: string, userId: string, data: UpdateVirtualMemberData): Promise<{ data: ApiResponse<FamilyMember> }> =>
    api.put(`/families/${familyId}/virtual-members/${userId}`, data),
  
  // Get family invites
  getInvites: (id: string): Promise<{ data: ApiResponse<FamilyInvite[]> }> =>
    api.get(`/families/${id}/invites`),
  
  // Create family invite
  createInvite: (id: string, data: { receiverEmail?: string; expiresIn?: number }): Promise<{ data: ApiResponse<FamilyInvite> }> =>
    api.post(`/families/${id}/invites`, data),
  
  // Get family join requests (admin only)
  getJoinRequests: (id: string): Promise<{ data: ApiResponse<FamilyJoinRequest[]> }> =>
    api.get(`/families/${id}/join-requests`),
  
  // Respond to join request (admin only)
  respondToJoinRequest: (requestId: string, response: 'APPROVED' | 'REJECTED'): Promise<{ data: ApiResponse<FamilyJoinRequest> }> =>
    api.post(`/families/join-requests/${requestId}/respond`, { response }),
  
  // Get user's own join requests
  getMyJoinRequests: (): Promise<{ data: ApiResponse<FamilyJoinRequest[]> }> =>
    api.get('/families/my-join-requests'),
  
  // Cancel user's own join request
  cancelJoinRequest: (requestId: string): Promise<{ data: ApiResponse<{ message: string }> }> =>
    api.delete(`/families/join-requests/${requestId}`),
};

// Task API (protected routes)
export const taskApi = {
  // Get all tasks for a family
  getFamilyTasks: (familyId: string, params?: TaskQueryParams): Promise<{ data: ApiResponse<Task[]> }> => {
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const queryString = searchParams.toString();
    return api.get(`/tasks/family/${familyId}${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get task statistics for a family
  getFamilyTaskStats: (familyId: string): Promise<{ data: ApiResponse<TaskStats> }> =>
    api.get(`/tasks/family/${familyId}/stats`),
  
  // Create a new task for a family (admin only)
  createTask: (familyId: string, data: CreateTaskData): Promise<{ data: ApiResponse<Task> }> =>
    api.post(`/tasks/family/${familyId}`, data),
  
  // Get a specific task
  getById: (taskId: string): Promise<{ data: ApiResponse<Task> }> =>
    api.get(`/tasks/${taskId}`),
  
  // Update a task (admin only)
  update: (taskId: string, data: UpdateTaskData): Promise<{ data: ApiResponse<Task> }> =>
    api.put(`/tasks/${taskId}`, data),
  
  // Soft delete a task (admin only)
  delete: (taskId: string): Promise<{ data: ApiResponse<{ message: string }> }> =>
    api.delete(`/tasks/${taskId}`),
  
  // Permanently delete a task (admin only)
  permanentDelete: (taskId: string): Promise<{ data: ApiResponse<{ message: string }> }> =>
    api.delete(`/tasks/${taskId}/permanent`),
  
  // Restore a soft-deleted task (admin only)
  restore: (taskId: string): Promise<{ data: ApiResponse<Task> }> =>
    api.post(`/tasks/${taskId}/restore`),
  
  // Duplicate a task (admin only)
  duplicate: (taskId: string, name?: string): Promise<{ data: ApiResponse<Task> }> =>
    api.post(`/tasks/${taskId}/duplicate`, { name }),
};

export default api; 