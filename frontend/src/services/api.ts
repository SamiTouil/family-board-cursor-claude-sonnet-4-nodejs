import { apiClient } from './api-client';

// Re-export types
export type * from '../types';

// Simplified API that matches what contexts expect
export const authApi = {
  async getMe() {
    return await apiClient.get('/auth/me');
  },
  
  async login(data: any) {
    return await apiClient.post('/auth/login', data);
  },
  
  async signup(data: any) {
    return await apiClient.post('/auth/signup', data);
  },
  
  async logout() {
    await apiClient.post('/auth/logout');
  },
  
  async changePassword(data: any) {
    await apiClient.put('/auth/change-password', data);
  },
  
  async update(userId: string, data: any) {
    await apiClient.put(`/users/${userId}`, data);
  }
};

export const familyApi = {
  async getUserFamilies() {
    return await apiClient.get('/families');
  },
  
  async create(data: any) {
    return await apiClient.post('/families', data);
  },
  
  async join(data: any) {
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
    return await apiClient.post(`/families/join-requests/${requestId}/respond`, { approve });
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

export const taskApi = {
  async getFamilyTasks(familyId: string, params?: any) {
    return await apiClient.get(`/tasks/family/${familyId}`, { params });
  },
  
  async createTask(familyId: string, data: any) {
    return await apiClient.post(`/tasks/family/${familyId}`, data);
  },
  
  async updateTask(taskId: string, data: any) {
    return await apiClient.put(`/tasks/${taskId}`, data);
  },
  
  async deleteTask(taskId: string) {
    return await apiClient.delete(`/tasks/${taskId}`);
  },
  
  async delete(taskId: string) {
    return await apiClient.delete(`/tasks/${taskId}`);
  }
};

export const dayTemplateApi = {
  async getTemplates(familyId: string) {
    return await apiClient.get(`/families/${familyId}/day-templates`);
  },
  
  async createTemplate(familyId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/day-templates`, data);
  },
  
  async updateTemplate(familyId: string, templateId: string, data: any) {
    return await apiClient.put(`/families/${familyId}/day-templates/${templateId}`, data);
  },
  
  async deleteTemplate(familyId: string, templateId: string) {
    return await apiClient.delete(`/families/${familyId}/day-templates/${templateId}`);
  },
  
  async applyTemplate(familyId: string, templateId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/day-templates/${templateId}/apply`, data);
  },
  
  // Template items
  async getItems(familyId: string, templateId: string) {
    return await apiClient.get(`/families/${familyId}/day-templates/${templateId}/items`);
  },
  
  async addItem(familyId: string, templateId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/day-templates/${templateId}/items`, data);
  },
  
  async updateItem(familyId: string, templateId: string, itemId: string, data: any) {
    return await apiClient.put(`/families/${familyId}/day-templates/${templateId}/items/${itemId}`, data);
  },
  
  async removeItem(familyId: string, templateId: string, itemId: string) {
    return await apiClient.delete(`/families/${familyId}/day-templates/${templateId}/items/${itemId}`);
  }
};

export const taskAssignmentApi = {
  async getAssignments(familyId: string, params?: any) {
    return await apiClient.get(`/families/${familyId}/task-assignments`, { params });
  },
  
  async createAssignment(familyId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/task-assignments`, data);
  },
  
  async updateAssignment(familyId: string, assignmentId: string, data: any) {
    return await apiClient.put(`/families/${familyId}/task-assignments/${assignmentId}`, data);
  },
  
  async deleteAssignment(familyId: string, assignmentId: string) {
    return await apiClient.delete(`/families/${familyId}/task-assignments/${assignmentId}`);
  },
  
  async getMemberAssignments(familyId: string, memberId: string, params?: any) {
    return await apiClient.get(`/families/${familyId}/members/${memberId}/assignments`, { params });
  },
  
  async getTaskAssignments(familyId: string, taskId: string, params?: any) {
    return await apiClient.get(`/families/${familyId}/tasks/${taskId}/assignments`, { params });
  }
}; 