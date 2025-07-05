import apiClient from './api-client';

// Auth API
export const authApi = {
  async getMe() {
    return await apiClient.get('/auth/me');
  },
  
  async login(data: { email: string; password: string }) {
    return await apiClient.post('/auth/login', data);
  },
  
  async signup(data: { firstName: string; lastName: string; email: string; password: string }) {
    return await apiClient.post('/auth/signup', data);
  },
  
  async logout() {
    await apiClient.post('/auth/logout');
  },
  
  async changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    await apiClient.put('/auth/change-password', data);
  },
  
  async update(userId: string, data: any) {
    await apiClient.put(`/users/${userId}`, data);
  }
};

// Family API
export const familyApi = {
  async getUserFamilies() {
    return await apiClient.get('/families');
  },
  
  async create(data: { name: string; description?: string }) {
    return await apiClient.post('/families', data);
  },
  
  async join(data: { code: string; message?: string }) {
    return await apiClient.post('/families/join', data);
  },
  
  async getMyJoinRequests() {
    return await apiClient.get('/families/my-join-requests');
  },
  
  async cancelJoinRequest(requestId: string) {
    return await apiClient.delete(`/families/join-requests/${requestId}`);
  },
  
  async getMembers(familyId: string) {
    return await apiClient.get(`/families/${familyId}/members`);
  },
  
  async respondToJoinRequest(requestId: string, approve: boolean) {
    return await apiClient.post(`/families/join-requests/${requestId}/respond`, { 
      response: approve ? 'APPROVED' : 'REJECTED' 
    });
  },
  
  async getInvites(familyId: string) {
    return await apiClient.get(`/families/${familyId}/invites`);
  },
  
  async getJoinRequests(familyId: string) {
    return await apiClient.get(`/families/${familyId}/join-requests`);
  },
  
  async update(familyId: string, data: any) {
    return await apiClient.put(`/families/${familyId}`, data);
  },
  
  async createVirtualMember(familyId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/virtual-members`, data);
  },
  
  async updateVirtualMember(familyId: string, memberId: string, data: any) {
    return await apiClient.put(`/families/${familyId}/virtual-members/${memberId}`, data);
  },
  
  async removeMember(familyId: string, memberId: string) {
    return await apiClient.delete(`/families/${familyId}/members/${memberId}`);
  },
  
  async createInvite(familyId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/invites`, data);
  }
};

// Week Schedule API
export const weekScheduleApi = {
  async getWeekSchedule(familyId: string, weekStartDate: string) {
    return await apiClient.get(`/families/${familyId}/week-schedule`, { 
      params: { weekStartDate } 
    });
  },
  
  async applyWeekOverride(familyId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/week-schedule/override`, data);
  },
  
  async removeWeekOverride(familyId: string, weekStartDate: string) {
    return await apiClient.delete(`/families/${familyId}/week-schedule/override`, {
      params: { weekStartDate }
    });
  }
};

// Task API
export const taskApi = {
  async getFamilyTasks(familyId: string) {
    return await apiClient.get(`/tasks/family/${familyId}`);
  }
}; 