import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import familyRoutes from '../routes/family.routes';

const app = express();
app.use(express.json());
app.use('/api/families', familyRoutes);

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

// Mock UserService
jest.mock('../services/user.service', () => ({
  UserService: {
    getUserById: jest.fn(),
  },
}));

describe('Family Routes', () => {
  const userId = 'cmc3xvd5b0000arkqcapzcmen'; // Valid CUID
  const familyId = 'cmc3xvd5b0001arkqcapzcmeo'; // Valid CUID
  const validToken = 'valid-token';

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
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  describe('POST /api/families', () => {
    it('should create a new family', async () => {
      const familyData = {
        name: 'Test Family',
        description: 'A test family',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const mockFamily = {
        id: 'family-1',
        name: 'Test Family',
        description: 'A test family',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: {
          id: userId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        memberCount: 1,
        userRole: 'ADMIN',
      };

      const { FamilyService } = require('../services/family.service');
      FamilyService.createFamily.mockResolvedValue(mockFamily);

      const response = await request(app)
        .post('/api/families')
        .set('Authorization', `Bearer ${validToken}`)
        .send(familyData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Family');
      expect(FamilyService.createFamily).toHaveBeenCalledWith(userId, familyData);
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
      ];

      const { FamilyService } = require('../services/family.service');
      FamilyService.getUserFamilies.mockResolvedValue(mockFamilies);

      const response = await request(app)
        .get('/api/families')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(FamilyService.getUserFamilies).toHaveBeenCalledWith(userId);
    });
  });

  describe('GET /api/families/:familyId', () => {
    it('should return family details', async () => {
      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        description: 'A test family',
        creator: { firstName: 'John', lastName: 'Doe' },
        memberCount: 3,
        userRole: 'ADMIN',
      };

      const { FamilyService } = require('../services/family.service');
      FamilyService.getFamilyById.mockResolvedValue(mockFamily);

      const response = await request(app)
        .get(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(familyId);
      expect(FamilyService.getFamilyById).toHaveBeenCalledWith(familyId, userId);
    });
  });

  describe('POST /api/families/:familyId/invites', () => {
    it('should create family invite', async () => {
      const inviteData = {
        receiverEmail: 'newmember@example.com',
        expiresIn: 7,
      };

      const mockInvite = {
        id: 'invite-1',
        code: 'ABCD1234',
        familyId,
        receiverEmail: 'newmember@example.com',
        status: 'PENDING',
        expiresAt: new Date(),
      };

      const { FamilyService } = require('../services/family.service');
      FamilyService.createInvite.mockResolvedValue(mockInvite);

      const response = await request(app)
        .post(`/api/families/${familyId}/invites`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(inviteData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('ABCD1234');
      expect(FamilyService.createInvite).toHaveBeenCalledWith(userId, expect.objectContaining({
        familyId,
        receiverEmail: 'newmember@example.com',
        expiresIn: 7,
      }));
    });
  });
}); 