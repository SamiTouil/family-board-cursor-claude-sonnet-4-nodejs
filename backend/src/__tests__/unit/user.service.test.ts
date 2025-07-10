import { UserService } from '../../services/user.service';
import { getMockUser, getMockUserResponse, getMockJwtToken } from '../unit-setup';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock Prisma Client completely
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    __mockPrisma: mockPrisma,
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ userId: 'mock-id', email: 'test@example.com' }),
}));

// Get the mock instances
const { __mockPrisma: mockPrisma } = require('@prisma/client');
const mockBcrypt = jest.mocked(bcrypt);

describe('UserService - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const mockUserData = getMockUser();
      const mockUserResponse = getMockUserResponse();
      const hashedPassword = 'hashedPassword123';
      const createdUser = { ...mockUserData, id: 'user-id', createdAt: new Date(), updatedAt: new Date() };

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await UserService.createUser({
        firstName: mockUserData.firstName,
        lastName: mockUserData.lastName,
        email: mockUserData.email,
        password: 'plainPassword',
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('plainPassword', 12);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUserData.email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          isVirtual: true,
        },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
          email: mockUserData.email,
          password: hashedPassword,
          avatarUrl: null,
          isVirtual: false,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          isVirtual: true,
        },
      });
      // Result should be UserResponse (without password)
      expect(result).toEqual({
        ...mockUserResponse,
        id: 'user-id',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error if email already exists', async () => {
      const mockUserData = getMockUser();
      const existingUser = { ...mockUserData, id: 'existing-id' };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(UserService.createUser({
        firstName: mockUserData.firstName,
        lastName: mockUserData.lastName,
        email: mockUserData.email,
        password: 'plainPassword',
      })).rejects.toThrow('Email already exists');

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const mockUserData = getMockUser();
      const mockUserResponse = getMockUserResponse();
      mockPrisma.user.findUnique.mockResolvedValue(mockUserData);

      const result = await UserService.getUserById('user-id');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          isVirtual: true,
        },
      });
      expect(result).toEqual(mockUserResponse);
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUserData = getMockUser();
      const userWithPassword = { ...mockUserData, password: 'hashedPassword', isVirtual: false };
      const token = getMockJwtToken();

      // Mock getUserByEmail method
      jest.spyOn(UserService, 'getUserByEmail').mockResolvedValue(userWithPassword);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(token);

      const result = await UserService.login({
        email: mockUserData.email,
        password: 'plainPassword',
      });

      expect(UserService.getUserByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('plainPassword', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUserData.id, email: mockUserData.email },
        expect.any(String),
        { expiresIn: '7d' }
      );
      expect(result).toEqual({
        user: {
          id: mockUserData.id,
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
          email: mockUserData.email,
          avatarUrl: mockUserData.avatarUrl,
          isVirtual: mockUserData.isVirtual,
          createdAt: mockUserData.createdAt,
          updatedAt: mockUserData.updatedAt,
        },
        token,
      });
    });

    it('should throw error with invalid email', async () => {
      jest.spyOn(UserService, 'getUserByEmail').mockResolvedValue(null);

      await expect(UserService.login({
        email: 'nonexistent@example.com',
        password: 'password',
      })).rejects.toThrow('Invalid credentials');

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error with invalid password', async () => {
      const mockUserData = getMockUser();
      const userWithPassword = { ...mockUserData, password: 'hashedPassword', isVirtual: false };

      jest.spyOn(UserService, 'getUserByEmail').mockResolvedValue(userWithPassword);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(UserService.login({
        email: mockUserData.email,
        password: 'wrongPassword',
      })).rejects.toThrow('Invalid credentials');

      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully with correct current password', async () => {
      const mockUserData = getMockUser();
      const mockUserResponse = getMockUserResponse();
      const userWithPassword = { ...mockUserData, password: 'oldHashedPassword', isVirtual: false };
      const newHashedPassword = 'newHashedPassword';
      const updatedUser = { ...mockUserData, isVirtual: false };

      mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await UserService.changePassword('user-id', {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword',
        confirmPassword: 'newPassword',
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith('oldPassword', 'oldHashedPassword');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { password: newHashedPassword },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          isVirtual: true,
        },
      });
      expect(result).toEqual(mockUserResponse);
    });

    it('should throw error with incorrect current password', async () => {
      const mockUserData = getMockUser();
      const userWithPassword = { ...mockUserData, password: 'hashedPassword', isVirtual: false };

      mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(UserService.changePassword('user-id', {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword',
        confirmPassword: 'newPassword',
      })).rejects.toThrow('Current password is incorrect');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(UserService.changePassword('non-existent-id', {
        currentPassword: 'password',
        newPassword: 'newPassword',
        confirmPassword: 'newPassword',
      })).rejects.toThrow('User not found');
    });
  });
});
