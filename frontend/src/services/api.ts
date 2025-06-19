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
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      // Redirect to login will be handled by auth context
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
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
  
  delete: (id: string): Promise<{ data: ApiResponse<{ message: string }> }> =>
    api.delete(`/users/${id}`),
};

export default api; 