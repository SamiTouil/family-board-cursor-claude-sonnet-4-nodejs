import { FamilyService } from '../services/family.service';
import { CreateFamilyData, JoinFamilyData, CreateInviteData } from '../types/family.types';

// Mock crypto first
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('ABCD1234'),
  }),
}));

// Mock Prisma Client completely
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    family: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    familyMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    familyInvite: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
    familyJoinRequest: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    FamilyMemberRole: {
      ADMIN: 'ADMIN',
      MEMBER: 'MEMBER',
    },
    FamilyInviteStatus: {
      PENDING: 'PENDING',
      ACCEPTED: 'ACCEPTED',
      REJECTED: 'REJECTED',
      EXPIRED: 'EXPIRED',
    },
    __mockPrisma: mockPrisma, // Export for test access
  };
});

// Get the mock instance
const { __mockPrisma: mockPrisma } = require('@prisma/client');

describe('FamilyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFamily', () => {
    it('should create a new family with admin membership', async () => {
      const userId = 'user-1';
      const familyData: CreateFamilyData = {
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
        creatorId: userId,
        creator: {
          id: userId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        members: [{ id: 'member-1', role: 'ADMIN' }],
      };

      (mockPrisma.family.create as jest.Mock).mockResolvedValue(mockFamily);

      const result = await FamilyService.createFamily(userId, familyData);

      expect(mockPrisma.family.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Family',
          description: 'A test family',
          avatarUrl: 'https://example.com/avatar.jpg',
          creatorId: userId,
          members: {
            create: {
              userId,
              role: 'ADMIN',
            },
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          members: true,
        },
      });

      expect(result).toEqual({
        id: 'family-1',
        name: 'Test Family',
        description: 'A test family',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: mockFamily.createdAt,
        updatedAt: mockFamily.updatedAt,
        creator: mockFamily.creator,
        memberCount: 1,
        userRole: 'ADMIN',
      });
    });

    it('should handle null optional fields', async () => {
      const userId = 'user-1';
      const familyData: CreateFamilyData = {
        name: 'Test Family',
      };

      const mockFamily = {
        id: 'family-1',
        name: 'Test Family',
        description: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatorId: userId,
        creator: {
          id: userId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        members: [{ id: 'member-1', role: 'ADMIN' }],
      };

      (mockPrisma.family.create as jest.Mock).mockResolvedValue(mockFamily);

      const result = await FamilyService.createFamily(userId, familyData);

      expect(result.description).toBeUndefined();
      expect(result.avatarUrl).toBeUndefined();
    });
  });

  describe('getUserFamilies', () => {
    it('should return user families with role information', async () => {
      const userId = 'user-1';
      const mockMemberships = [
        {
          role: 'ADMIN',
          family: {
            id: 'family-1',
            name: 'Family 1',
            description: 'First family',
            avatarUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            creator: {
              id: 'user-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
            _count: {
              members: 3,
            },
          },
        },
        {
          role: 'MEMBER',
          family: {
            id: 'family-2',
            name: 'Family 2',
            description: null,
            avatarUrl: 'https://example.com/avatar.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
            creator: {
              id: 'user-2',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@example.com',
            },
            _count: {
              members: 2,
            },
          },
        },
      ];

      (mockPrisma.familyMember.findMany as jest.Mock).mockResolvedValue(mockMemberships);

      const result = await FamilyService.getUserFamilies(userId);

      expect(result).toHaveLength(2);
      expect(result[0]?.userRole).toBe('ADMIN');
      expect(result[1]?.userRole).toBe('MEMBER');
      expect(result[0]?.memberCount).toBe(3);
      expect(result[1]?.memberCount).toBe(2);
    });
  });

  describe('getFamilyById', () => {
    it('should return family details for authorized user', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';

      const mockMembership = {
        role: 'ADMIN',
        family: {
          id: familyId,
          name: 'Test Family',
          description: 'A test family',
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: {
            id: userId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          _count: {
            members: 1,
          },
        },
      };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      const result = await FamilyService.getFamilyById(familyId, userId);

      expect(result.id).toBe(familyId);
      expect(result.userRole).toBe('ADMIN');
    });

    it('should throw error for unauthorized user', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(FamilyService.getFamilyById(familyId, userId)).rejects.toThrow(
        'Family not found or access denied'
      );
    });
  });

  describe('createInvite', () => {
    it('should create invite for admin user', async () => {
      const userId = 'user-1';
      const inviteData: CreateInviteData = {
        familyId: 'family-1',
        receiverEmail: 'receiver@example.com',
        expiresIn: 7,
      };

      const mockMembership = {
        role: 'ADMIN',
      };

      const mockReceiver = {
        id: 'user-2',
        email: 'receiver@example.com',
      };

      const mockInvite = {
        id: 'invite-1',
        code: 'ABCD1234',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        respondedAt: null,
        family: {
          id: 'family-1',
          name: 'Test Family',
        },
        sender: {
          id: userId,
          firstName: 'John',
          lastName: 'Doe',
        },
        receiver: {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'receiver@example.com',
        },
      };

      (mockPrisma.familyMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership) // Admin check
        .mockResolvedValueOnce(null); // Existing membership check

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockReceiver);
      (mockPrisma.familyInvite.findMany as jest.Mock).mockResolvedValue([]); // No existing active invites
      (mockPrisma.familyInvite.findUnique as jest.Mock).mockResolvedValue(null); // Code is unique
      (mockPrisma.familyInvite.create as jest.Mock).mockResolvedValue(mockInvite);

      const result = await FamilyService.createInvite(userId, inviteData);

      expect(result.code).toBe('ABCD1234');
      expect(result.status).toBe('PENDING');
      expect(result.receiver).toBeDefined();
    });

    it('should throw error for non-admin user', async () => {
      const userId = 'user-1';
      const inviteData: CreateInviteData = {
        familyId: 'family-1',
        expiresIn: 7,
      };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue({
        role: 'MEMBER',
      });

      await expect(FamilyService.createInvite(userId, inviteData)).rejects.toThrow(
        'Only family admins can create invites'
      );
    });

    it('should throw error if receiver is already a member', async () => {
      const userId = 'user-1';
      const inviteData: CreateInviteData = {
        familyId: 'family-1',
        receiverEmail: 'receiver@example.com',
        expiresIn: 7,
      };

      const mockMembership = {
        role: 'ADMIN',
      };

      const mockReceiver = {
        id: 'user-2',
        email: 'receiver@example.com',
      };

      const mockExistingMembership = {
        id: 'member-1',
        userId: 'user-2',
        familyId: 'family-1',
      };

      (mockPrisma.familyMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMembership) // Admin check
        .mockResolvedValueOnce(mockExistingMembership); // Existing membership check

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockReceiver);
      (mockPrisma.familyInvite.findMany as jest.Mock).mockResolvedValue([]); // No existing active invites

      await expect(FamilyService.createInvite(userId, inviteData)).rejects.toThrow(
        'User is already a member of this family'
      );
    });
  });

  describe('joinFamily', () => {
    it('should join family with valid invite code', async () => {
      const userId = 'user-1';
      const joinData: JoinFamilyData = {
        code: 'ABCD1234',
      };

      const mockInvite = {
        id: 'invite-1',
        code: 'ABCD1234',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        familyId: 'family-1',
        receiverId: null,
        family: {
          id: 'family-1',
          name: 'Test Family',
        },
      };

      const mockJoinRequest = {
        id: 'request-1',
        status: 'PENDING',
        message: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        respondedAt: null,
        user: {
          id: userId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          avatarUrl: null,
        },
        family: {
          id: 'family-1',
          name: 'Test Family',
        },
        invite: {
          id: 'invite-1',
          code: 'ABCD1234',
        },
        reviewer: null,
      };

      (mockPrisma.familyInvite.findUnique as jest.Mock).mockResolvedValue(mockInvite);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null); // Not already a member
      (mockPrisma.familyJoinRequest.findUnique as jest.Mock).mockResolvedValue(null); // No existing join request
      (mockPrisma.familyJoinRequest.create as jest.Mock).mockResolvedValue(mockJoinRequest);

      const result = await FamilyService.joinFamily(userId, joinData);

      expect(result.id).toBe('request-1'); // Join request ID, not family ID
      expect(result.status).toBe('PENDING');
      expect(result.user.id).toBe(userId);
      expect(result.family.id).toBe('family-1');
    });

    it('should throw error for invalid invite code', async () => {
      const userId = 'user-1';
      const joinData: JoinFamilyData = {
        code: 'INVALID',
      };

      (mockPrisma.familyInvite.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(FamilyService.joinFamily(userId, joinData)).rejects.toThrow(
        'Invalid invite code'
      );
    });

    it('should throw error for expired invite', async () => {
      const userId = 'user-1';
      const joinData: JoinFamilyData = {
        code: 'ABCD1234',
      };

      const mockInvite = {
        id: 'invite-1',
        code: 'ABCD1234',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        familyId: 'family-1',
      };

      (mockPrisma.familyInvite.findUnique as jest.Mock).mockResolvedValue(mockInvite);
      (mockPrisma.familyInvite.update as jest.Mock).mockResolvedValue({});

      await expect(FamilyService.joinFamily(userId, joinData)).rejects.toThrow(
        'Invite has expired'
      );

      expect(mockPrisma.familyInvite.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: { status: 'EXPIRED' },
      });
    });

    it('should throw error if user is already a member', async () => {
      const userId = 'user-1';
      const joinData: JoinFamilyData = {
        code: 'ABCD1234',
      };

      const mockInvite = {
        id: 'invite-1',
        code: 'ABCD1234',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        familyId: 'family-1',
        receiverId: null,
      };

      const mockExistingMembership = {
        id: 'member-1',
        userId,
        familyId: 'family-1',
      };

      (mockPrisma.familyInvite.findUnique as jest.Mock).mockResolvedValue(mockInvite);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockExistingMembership);

      await expect(FamilyService.joinFamily(userId, joinData)).rejects.toThrow(
        'You are already a member of this family'
      );
    });
  });

  describe('removeMember', () => {
    it('should remove member as admin', async () => {
      const adminId = 'admin-1';
      const familyId = 'family-1';
      const memberId = 'member-1';

      const mockAdminMembership = {
        role: 'ADMIN',
      };

      const mockMemberToRemove = {
        id: memberId,
        userId: 'user-2',
        familyId,
        family: {
          creatorId: 'admin-1',
        },
      };

      (mockPrisma.familyMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAdminMembership) // Admin check
        .mockResolvedValueOnce(mockMemberToRemove); // Member to remove

      (mockPrisma.familyMember.delete as jest.Mock).mockResolvedValue({});

      await FamilyService.removeMember(familyId, adminId, memberId);

      expect(mockPrisma.familyMember.delete).toHaveBeenCalledWith({
        where: { id: memberId },
      });
    });

    it('should throw error when trying to remove family creator', async () => {
      const adminId = 'admin-1';
      const familyId = 'family-1';
      const memberId = 'member-1';

      const mockAdminMembership = {
        role: 'ADMIN',
      };

      const mockMemberToRemove = {
        id: memberId,
        userId: 'creator-1',
        familyId,
        family: {
          creatorId: 'creator-1', // Same as userId
        },
      };

      (mockPrisma.familyMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce(mockMemberToRemove);

      await expect(FamilyService.removeMember(familyId, adminId, memberId)).rejects.toThrow(
        'Cannot remove family creator'
      );
    });

    it('should throw error for non-admin user', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const memberId = 'member-1';

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue({
        role: 'MEMBER',
      });

      await expect(FamilyService.removeMember(familyId, userId, memberId)).rejects.toThrow(
        'Only family admins can remove members'
      );
    });

    it('should throw error when admin tries to remove themselves', async () => {
      const adminId = 'admin-1';
      const familyId = 'family-1';
      const memberId = 'member-1';

      const mockAdminMembership = {
        role: 'ADMIN',
      };

      const mockMemberToRemove = {
        id: memberId,
        userId: adminId, // Same as adminId - trying to remove self
        familyId,
        family: {
          creatorId: 'creator-1', // Different from adminId
        },
      };

      (mockPrisma.familyMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce(mockMemberToRemove);

      await expect(FamilyService.removeMember(familyId, adminId, memberId)).rejects.toThrow(
        'Cannot remove yourself from the family'
      );
    });
  });

  describe('leaveFamily', () => {
    it('should allow member to leave family', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';

      const mockMembership = {
        id: 'member-1',
        userId,
        familyId,
        family: {
          creatorId: 'creator-1', // Different from userId
        },
      };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (mockPrisma.familyMember.delete as jest.Mock).mockResolvedValue({});

      await FamilyService.leaveFamily(familyId, userId);

      expect(mockPrisma.familyMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-1' },
      });
    });

    it('should throw error if family creator tries to leave', async () => {
      const userId = 'creator-1';
      const familyId = 'family-1';

      const mockMembership = {
        id: 'member-1',
        userId,
        familyId,
        family: {
          creatorId: userId, // Same as userId
        },
      };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

      await expect(FamilyService.leaveFamily(familyId, userId)).rejects.toThrow(
        'Family creator cannot leave. Transfer ownership first.'
      );
    });
  });

  describe('deleteFamily', () => {
    it('should delete family as creator', async () => {
      const userId = 'creator-1';
      const familyId = 'family-1';

      const mockFamily = {
        id: familyId,
        creatorId: userId,
      };

      (mockPrisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (mockPrisma.family.delete as jest.Mock).mockResolvedValue({});

      await FamilyService.deleteFamily(familyId, userId);

      expect(mockPrisma.family.delete).toHaveBeenCalledWith({
        where: { id: familyId },
      });
    });

    it('should throw error for non-creator', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';

      const mockFamily = {
        id: familyId,
        creatorId: 'creator-1', // Different from userId
      };

      (mockPrisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);

      await expect(FamilyService.deleteFamily(familyId, userId)).rejects.toThrow(
        'Only family creator can delete the family'
      );
    });

    it('should throw error if family not found', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';

      (mockPrisma.family.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(FamilyService.deleteFamily(familyId, userId)).rejects.toThrow(
        'Family not found'
      );
    });
  });

  describe('requestToJoinFamily', () => {
    it('should allow user to rejoin after being removed (APPROVED -> removed -> new request)', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const inviteCode = 'TEST123';

      // Mock invite
      const mockInvite = {
        id: 'invite-1',
        code: inviteCode,
        familyId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        receiverId: null,
      };

      // Mock existing APPROVED join request (user was previously approved but later removed)
      const mockExistingRequest = {
        id: 'existing-request-1',
        status: 'APPROVED',
        userId,
        familyId,
      };

      // Mock the new join request after deletion
      const mockNewJoinRequest = {
        id: 'new-request-1',
        status: 'PENDING',
        message: 'Please let me rejoin',
        createdAt: new Date(),
        updatedAt: new Date(),
        respondedAt: null,
        user: {
          id: userId,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          avatarUrl: null,
        },
        family: {
          id: familyId,
          name: 'Test Family',
        },
        invite: {
          id: 'invite-1',
          code: inviteCode,
        },
        reviewer: null,
      };

      (mockPrisma.familyInvite.findUnique as jest.Mock).mockResolvedValue(mockInvite);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null); // Not a member
      (mockPrisma.familyJoinRequest.findUnique as jest.Mock).mockResolvedValue(mockExistingRequest);
      (mockPrisma.familyJoinRequest.delete as jest.Mock).mockResolvedValue({});
      (mockPrisma.familyJoinRequest.create as jest.Mock).mockResolvedValue(mockNewJoinRequest);

      const result = await FamilyService.requestToJoinFamily(userId, {
        code: inviteCode,
        message: 'Please let me rejoin',
      });

      // Should delete the old APPROVED request
      expect(mockPrisma.familyJoinRequest.delete).toHaveBeenCalledWith({
        where: { id: 'existing-request-1' },
      });

      // Should create a new PENDING request
      expect(mockPrisma.familyJoinRequest.create).toHaveBeenCalledWith({
        data: {
          userId,
          familyId,
          inviteId: 'invite-1',
          message: 'Please let me rejoin',
          status: 'PENDING',
        },
        include: expect.any(Object),
      });

      expect(result.status).toBe('PENDING');
      expect(result.message).toBe('Please let me rejoin');
    });

    it('should throw error when user already has pending join request', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const inviteCode = 'TEST123';

      // Mock existing PENDING join request
      const mockExistingRequest = {
        id: 'existing-request-1',
        status: 'PENDING',
        userId,
        familyId,
      };

      (mockPrisma.familyJoinRequest.findUnique as jest.Mock).mockResolvedValue(mockExistingRequest);

      await expect(FamilyService.requestToJoinFamily(userId, {
        code: inviteCode,
        message: 'Please let me rejoin',
      })).rejects.toThrow('You already have a pending join request for this family');
    });
  });

  describe('createVirtualMember', () => {
    let family: any;
    let adminUser: any;
    let memberUser: any;

    beforeEach(() => {
      // Mock test users
      adminUser = {
        id: 'admin-user-1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        password: 'hashedpassword',
        isVirtual: false,
      };

      memberUser = {
        id: 'member-user-1',
        firstName: 'Member',
        lastName: 'User',
        email: 'member@test.com',
        password: 'hashedpassword',
        isVirtual: false,
      };

      // Mock test family
      family = {
        id: 'family-1',
        name: 'Test Family',
        description: 'Test Description',
        creatorId: adminUser.id,
      };

      // Mock the family member lookup for admin check
      (mockPrisma.familyMember.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.userId_familyId?.userId === adminUser.id && where.userId_familyId?.familyId === family.id) {
          return Promise.resolve({ userId: adminUser.id, familyId: family.id, role: 'ADMIN' });
        }
        if (where.userId_familyId?.userId === memberUser.id && where.userId_familyId?.familyId === family.id) {
          return Promise.resolve({ userId: memberUser.id, familyId: family.id, role: 'MEMBER' });
        }
        return Promise.resolve(null);
      });

      // Mock the transaction function
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        // Create a mock transaction object with the same methods
        const mockTx = {
          user: { create: mockPrisma.user.create },
          familyMember: { create: mockPrisma.familyMember.create },
        };
        return callback(mockTx);
      });
    });

    it('should create virtual member successfully when user is admin', async () => {
      const virtualMemberData = {
        firstName: 'Grandma',
        lastName: 'Smith',
        avatarUrl: 'https://example.com/grandma.jpg',
        familyId: family.id,
      };

      const mockVirtualUser = {
        id: 'virtual-user-1',
        firstName: 'Grandma',
        lastName: 'Smith',
        email: null,
        password: null,
        avatarUrl: 'https://example.com/grandma.jpg',
        isVirtual: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFamilyMember = {
        id: 'family-member-1',
        userId: mockVirtualUser.id,
        familyId: family.id,
        role: 'MEMBER',
        joinedAt: new Date(),
        user: mockVirtualUser,
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockVirtualUser);
      (mockPrisma.familyMember.create as jest.Mock).mockResolvedValue(mockFamilyMember);

      const result = await FamilyService.createVirtualMember(adminUser.id, virtualMemberData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Grandma',
          lastName: 'Smith',
          email: null,
          password: null,
          avatarUrl: 'https://example.com/grandma.jpg',
          isVirtual: true,
        },
      });

      expect(mockPrisma.familyMember.create).toHaveBeenCalledWith({
        data: {
          userId: mockVirtualUser.id,
          familyId: family.id,
          role: 'MEMBER',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              isVirtual: true,
            },
          },
        },
      });

      // Check the structure matches what the service returns
      expect(result).toMatchObject({
        id: 'family-member-1',
        userId: 'virtual-user-1',
        role: 'MEMBER',
        joinedAt: expect.any(Date),
        user: {
          id: 'virtual-user-1',
          firstName: 'Grandma',
          lastName: 'Smith',
          email: null,
          avatarUrl: 'https://example.com/grandma.jpg',
          isVirtual: true,
        },
      });
    });

    it('should create virtual member without avatar URL', async () => {
      const virtualMemberData = {
        firstName: 'Uncle',
        lastName: 'Bob',
        familyId: family.id,
      };

      const mockVirtualUser = {
        id: 'virtual-user-2',
        firstName: 'Uncle',
        lastName: 'Bob',
        email: null,
        password: null,
        avatarUrl: null,
        isVirtual: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFamilyMember = {
        id: 'family-member-2',
        userId: mockVirtualUser.id,
        familyId: family.id,
        role: 'MEMBER',
        joinedAt: new Date(),
        user: mockVirtualUser,
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockVirtualUser);
      (mockPrisma.familyMember.create as jest.Mock).mockResolvedValue(mockFamilyMember);

      const result = await FamilyService.createVirtualMember(adminUser.id, virtualMemberData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Uncle',
          lastName: 'Bob',
          email: null,
          password: null,
          avatarUrl: null,
          isVirtual: true,
        },
      });

      expect(result.user).toMatchObject({
        firstName: 'Uncle',
        lastName: 'Bob',
        email: null,
        avatarUrl: null,
        isVirtual: true,
      });
    });

    it('should throw error when user is not admin', async () => {
      const virtualMemberData = {
        firstName: 'Grandma',
        lastName: 'Smith',
        familyId: family.id,
      };

      await expect(
        FamilyService.createVirtualMember(memberUser.id, virtualMemberData)
      ).rejects.toThrow('Only family admins can create virtual members');
    });

    it('should throw error when user is not family member', async () => {
      const outsideUserId = 'outside-user-1';

      const virtualMemberData = {
        firstName: 'Grandma',
        lastName: 'Smith',
        familyId: family.id,
      };

      await expect(
        FamilyService.createVirtualMember(outsideUserId, virtualMemberData)
      ).rejects.toThrow('Only family admins can create virtual members');
    });

    it('should throw error when family does not exist', async () => {
      const virtualMemberData = {
        firstName: 'Grandma',
        lastName: 'Smith',
        familyId: 'non-existent-family',
      };

      // Mock no family member found (user not in family)
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        FamilyService.createVirtualMember(adminUser.id, virtualMemberData)
      ).rejects.toThrow('Only family admins can create virtual members');
    });
  });
}); 