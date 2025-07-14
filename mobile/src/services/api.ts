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
  async getFamilyTasks(familyId: string, params?: { isActive?: boolean }) {
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
  }
};

// Day Template API
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

// Week Template API
export const weekTemplateApi = {
  async getTemplates(familyId: string, params?: any) {
    return await apiClient.get(`/families/${familyId}/week-templates`, { params });
  },

  async createTemplate(familyId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/week-templates`, data);
  },

  async updateTemplate(familyId: string, templateId: string, data: any) {
    return await apiClient.put(`/families/${familyId}/week-templates/${templateId}`, data);
  },

  async deleteTemplate(familyId: string, templateId: string) {
    return await apiClient.delete(`/families/${familyId}/week-templates/${templateId}`);
  },

  async duplicateTemplate(familyId: string, templateId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/week-templates/${templateId}/duplicate`, data);
  },

  // Template days
  async getTemplateDays(familyId: string, templateId: string) {
    return await apiClient.get(`/families/${familyId}/week-templates/${templateId}/days`);
  },

  async addTemplateDay(familyId: string, templateId: string, data: any) {
    return await apiClient.post(`/families/${familyId}/week-templates/${templateId}/days`, data);
  },

  async updateTemplateDay(familyId: string, templateId: string, dayId: string, data: any) {
    return await apiClient.put(`/families/${familyId}/week-templates/${templateId}/days/${dayId}`, data);
  },

  async removeTemplateDay(familyId: string, templateId: string, dayId: string) {
    return await apiClient.delete(`/families/${familyId}/week-templates/${templateId}/days/${dayId}`);
  }
};