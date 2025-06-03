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
      // Redirect to login or refresh token
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

export interface CreateUserData {
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

export interface LoginResponse {
  user: User;
  token: string;
}

export const userApi = {
  create: (data: CreateUserData): Promise<{ data: { data: User } }> =>
    api.post('/users', data),
  
  login: (data: LoginData): Promise<{ data: { data: LoginResponse } }> =>
    api.post('/users/login', data),
  
  getById: (id: string): Promise<{ data: { data: User } }> =>
    api.get(`/users/${id}`),
  
  update: (id: string, data: Partial<CreateUserData>): Promise<{ data: { data: User } }> =>
    api.put(`/users/${id}`, data),
  
  delete: (id: string): Promise<{ data: { success: boolean } }> =>
    api.delete(`/users/${id}`),
};

export default api; 