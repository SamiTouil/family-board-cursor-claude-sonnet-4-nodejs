import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import familyRoutes from '../routes/family.routes';

const app = express();
app.use(express.json());
app.use('/', familyRoutes);

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

// Mock the FamilyService
jest.mock('../services/family.service', () => ({
  FamilyService: {
    createFamily: jest.fn(),
    getUserFamilies: jest.fn(),
    getFamilyById: jest.fn(),
    updateFamily: jest.fn(),
    deleteFamily: jest.fn(),
    getFamilyMembers: jest.fn(),
    removeMember: jest.fn(),
    leaveFamily: jest.fn(),
    updateMemberRole: jest.fn(),
    createInvite: jest.fn(),
    getFamilyInvites: jest.fn(),
    joinFamily: jest.fn(),
    getFamilyStats: jest.fn(),
  },
}));

// Mock the UserService
jest.mock('../services/user.service', () => ({
  UserService: {
    getUserById: jest.fn(),
  },
}));

describe('Family Routes', () => {
  const userId = 'user-1';
  const validToken = 'valid-token';
  const familyId = 'family-1';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock JWT verification
    (jwt.verify as jest.Mock).mockReturnValue({
      userId,
      email: 'test@example.com',
      iat: Date.now(),
      exp: Date.now() + 3600000,
    } as any);

    // Mock user exists
    const { UserService } = require('../services/user.service');
    UserService.getUserById.mockResolvedValue({
      id: userId,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });
  });

  describe('POST /', () => {
    it('should create a new family', async () => {
      const familyData = {
        name: 'Test Family',
        description: 'A test family',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        description: 'A test family',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: {
          id: userId,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
        },
        memberCount: 1,
        userRole: 'ADMIN',
      };

      const { FamilyService } = require('../services/family.service');
      FamilyService.createFamily.mockResolvedValue(mockFamily);

      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${validToken}`)
        .send(familyData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Family');
      expect(FamilyService.createFamily).toHaveBeenCalledWith(userId, familyData);
    });
  });

  describe('GET /', () => {
    it('should return user families', async () => {
      const mockFamilies = [
        {
          id: 'family-1',
          name: 'Family 1',
          description: 'First family',
          userRole: 'ADMIN',
          memberCount: 3,
        },
      ];

      const { FamilyService } = require('../services/family.service');
      FamilyService.getUserFamilies.mockResolvedValue(mockFamilies);

      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(FamilyService.getUserFamilies).toHaveBeenCalledWith(userId);
    });
  });

  describe('GET /:familyId', () => {
    it('should return family details', async () => {
      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        description: 'A test family',
        userRole: 'ADMIN',
        memberCount: 1,
      };

      const { FamilyService } = require('../services/family.service');
      FamilyService.getFamilyById.mockResolvedValue(mockFamily);

      const response = await request(app)
        .get(`/${familyId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(familyId);
      expect(FamilyService.getFamilyById).toHaveBeenCalledWith(familyId, userId);
    });
  });

  describe('GET /api/families', () => {
    it('should return user families', async () => {
      const mockFamilies = [
        {
          id: 'family-1',
          name: 'Family 1',
          description: 'First family',
          userRole: 'ADMIN',
          memberCount: 3,
        },
        {
          id: 'family-2',
          name: 'Family 2',
          description: 'Second family',
          userRole: 'MEMBER',
          memberCount: 2,
        },
      ];

      const mockGetUserFamilies = jest.fn().mockResolvedValue(mockFamilies);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.getUserFamilies = mockGetUserFamilies;

      const response = await request(app)
        .get('/api/families')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockGetUserFamilies).toHaveBeenCalledWith(userId);
    });
  });

  describe('GET /api/families/:familyId', () => {
    it('should return family details', async () => {
      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        description: 'A test family',
        userRole: 'ADMIN',
        memberCount: 1,
      };

      const mockGetFamilyById = jest.fn().mockResolvedValue(mockFamily);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.getFamilyById = mockGetFamilyById;

      const response = await request(app)
        .get(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(familyId);
      expect(mockGetFamilyById).toHaveBeenCalledWith(familyId, userId);
    });

    it('should return 404 for unauthorized access', async () => {
      const mockGetFamilyById = jest.fn().mockRejectedValue(new Error('Family not found or access denied'));
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.getFamilyById = mockGetFamilyById;

      const response = await request(app)
        .get(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/families/:familyId', () => {
    it('should update family details', async () => {
      const updateData = {
        name: 'Updated Family Name',
        description: 'Updated description',
      };

      const mockUpdatedFamily = {
        id: familyId,
        name: 'Updated Family Name',
        description: 'Updated description',
        userRole: 'ADMIN',
      };

      const mockUpdateFamily = jest.fn().mockResolvedValue(mockUpdatedFamily);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.updateFamily = mockUpdateFamily;

      const response = await request(app)
        .put(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Family Name');
      expect(mockUpdateFamily).toHaveBeenCalledWith(familyId, userId, updateData);
    });

    it('should return 403 for non-admin user', async () => {
      const updateData = {
        name: 'Updated Family Name',
      };

      const mockUpdateFamily = jest.fn().mockRejectedValue(new Error('Only family admins can update family details'));
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.updateFamily = mockUpdateFamily;

      const response = await request(app)
        .put(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/families/:familyId', () => {
    it('should delete family', async () => {
      const mockDeleteFamily = jest.fn().mockResolvedValue(undefined);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.deleteFamily = mockDeleteFamily;

      const response = await request(app)
        .delete(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Family deleted successfully');
      expect(mockDeleteFamily).toHaveBeenCalledWith(familyId, userId);
    });

    it('should return 403 for non-creator', async () => {
      const mockDeleteFamily = jest.fn().mockRejectedValue(new Error('Only family creator can delete the family'));
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.deleteFamily = mockDeleteFamily;

      const response = await request(app)
        .delete(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/families/:familyId/members', () => {
    it('should return family members', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: {
            id: userId,
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
          },
        },
        {
          id: 'member-2',
          role: 'MEMBER',
          joinedAt: new Date(),
          user: {
            id: 'user-2',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
          },
        },
      ];

      const mockGetFamilyMembers = jest.fn().mockResolvedValue(mockMembers);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.getFamilyMembers = mockGetFamilyMembers;

      const response = await request(app)
        .get(`/api/families/${familyId}/members`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockGetFamilyMembers).toHaveBeenCalledWith(familyId, userId);
    });
  });

  describe('POST /api/families/:familyId/invites', () => {
    it('should create family invite', async () => {
      const inviteData = {
        familyId,
        receiverEmail: 'newmember@example.com',
        expiresIn: 7,
      };

      const mockInvite = {
        id: 'invite-1',
        code: 'ABCD1234',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        family: {
          id: familyId,
          name: 'Test Family',
        },
        sender: {
          id: userId,
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const mockCreateInvite = jest.fn().mockResolvedValue(mockInvite);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.createInvite = mockCreateInvite;

      const response = await request(app)
        .post(`/api/families/${familyId}/invites`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(inviteData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('ABCD1234');
      expect(mockCreateInvite).toHaveBeenCalledWith(userId, inviteData);
    });

    it('should return 403 for non-admin user', async () => {
      const inviteData = {
        familyId,
        expiresIn: 7,
      };

      const mockCreateInvite = jest.fn().mockRejectedValue(new Error('Only family admins can create invites'));
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.createInvite = mockCreateInvite;

      const response = await request(app)
        .post(`/api/families/${familyId}/invites`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(inviteData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/families/join', () => {
    it('should join family with valid invite code', async () => {
      const joinData = {
        code: 'ABCD1234',
      };

      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        userRole: 'MEMBER',
        memberCount: 2,
      };

      const mockJoinFamily = jest.fn().mockResolvedValue(mockFamily);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.joinFamily = mockJoinFamily;

      const response = await request(app)
        .post('/api/families/join')
        .set('Authorization', `Bearer ${validToken}`)
        .send(joinData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userRole).toBe('MEMBER');
      expect(mockJoinFamily).toHaveBeenCalledWith(userId, joinData);
    });

    it('should return 400 for invalid invite code', async () => {
      const joinData = {
        code: 'INVALID',
      };

      const mockJoinFamily = jest.fn().mockRejectedValue(new Error('Invalid invite code'));
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.joinFamily = mockJoinFamily;

      const response = await request(app)
        .post('/api/families/join')
        .set('Authorization', `Bearer ${validToken}`)
        .send(joinData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/families/:familyId/members/:memberId', () => {
    it('should remove member from family', async () => {
      const memberId = 'member-1';

      const mockRemoveMember = jest.fn().mockResolvedValue(undefined);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.removeMember = mockRemoveMember;

      const response = await request(app)
        .delete(`/api/families/${familyId}/members/${memberId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member removed successfully');
      expect(mockRemoveMember).toHaveBeenCalledWith(familyId, userId, memberId);
    });

    it('should return 403 for non-admin user', async () => {
      const memberId = 'member-1';

      const mockRemoveMember = jest.fn().mockRejectedValue(new Error('Only family admins can remove members'));
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.removeMember = mockRemoveMember;

      const response = await request(app)
        .delete(`/api/families/${familyId}/members/${memberId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/families/:familyId/leave', () => {
    it('should leave family', async () => {
      const mockLeaveFamily = jest.fn().mockResolvedValue(undefined);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.leaveFamily = mockLeaveFamily;

      const response = await request(app)
        .post(`/api/families/${familyId}/leave`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Left family successfully');
      expect(mockLeaveFamily).toHaveBeenCalledWith(familyId, userId);
    });

    it('should return 400 if family creator tries to leave', async () => {
      const mockLeaveFamily = jest.fn().mockRejectedValue(new Error('Family creator cannot leave. Transfer ownership first.'));
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.leaveFamily = mockLeaveFamily;

      const response = await request(app)
        .post(`/api/families/${familyId}/leave`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/families/:familyId/stats', () => {
    it('should return family stats for admin', async () => {
      const mockStats = {
        totalMembers: 5,
        totalAdmins: 2,
        pendingInvites: 3,
        createdAt: new Date(),
      };

      const mockGetFamilyStats = jest.fn().mockResolvedValue(mockStats);
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.getFamilyStats = mockGetFamilyStats;

      const response = await request(app)
        .get(`/api/families/${familyId}/stats`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalMembers).toBe(5);
      expect(mockGetFamilyStats).toHaveBeenCalledWith(familyId, userId);
    });

    it('should return 403 for non-admin user', async () => {
      const mockGetFamilyStats = jest.fn().mockRejectedValue(new Error('Only family admins can view family stats'));
      const FamilyService = require('../services/family.service').FamilyService;
      FamilyService.getFamilyStats = mockGetFamilyStats;

      const response = await request(app)
        .get(`/api/families/${familyId}/stats`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
}); 