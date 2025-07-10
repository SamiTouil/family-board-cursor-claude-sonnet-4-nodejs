import { UserService } from '../../services/user.service';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../config/jwt.config';
import { getMockUser } from '../integration-setup';

const prisma = new PrismaClient();

describe('Authentication Service', () => {
  describe('signup', () => {
    it('should create a new user and return user with token', async () => {
      const mockUser = getMockUser();
      const result = await UserService.signup(mockUser);

      expect(result.user).toMatchObject({
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
      });
      expect(result.user.id).toBeDefined();
      expect(result.user.createdAt).toBeDefined();
      expect(result.token).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(result.token, getJwtSecret()) as any;
      expect(decoded.userId).toBe(result.user.id);
      expect(decoded.email).toBe(result.user.email);
    });

    it('should throw error if email already exists', async () => {
      const mockUser = getMockUser();
      await UserService.signup(mockUser);

      await expect(UserService.signup(mockUser)).rejects.toThrow('Email already exists');
    });

    it('should hash the password', async () => {
      const mockUser = getMockUser();
      const result = await UserService.signup(mockUser);
      
      // Get the raw user from database to check password is hashed
      const dbUser = await prisma.user.findUnique({
        where: { id: result.user.id },
      });

      expect(dbUser?.password).not.toBe(mockUser.password);
      expect(dbUser?.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = getMockUser();
      const signupResult = await UserService.signup(mockUser);
      
      const loginResult = await UserService.login({
        email: mockUser.email,
        password: mockUser.password,
      });

      expect(loginResult.user.id).toBe(signupResult.user.id);
      expect(loginResult.user.email).toBe(mockUser.email);
      expect(loginResult.token).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(loginResult.token, getJwtSecret()) as any;
      expect(decoded.userId).toBe(loginResult.user.id);
      expect(decoded.email).toBe(loginResult.user.email);
    });

    it('should throw error with invalid email', async () => {
      const mockUser = getMockUser();
      await UserService.signup(mockUser);

      await expect(UserService.login({
        email: 'nonexistent@example.com',
        password: mockUser.password,
      })).rejects.toThrow('Invalid credentials');
    });

    it('should throw error with invalid password', async () => {
      const mockUser = getMockUser();
      await UserService.signup(mockUser);

      await expect(UserService.login({
        email: mockUser.email,
        password: 'wrongpassword',
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should generate new token for existing user', async () => {
      const mockUser = getMockUser();
      const signupResult = await UserService.signup(mockUser);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const refreshResult = await UserService.refreshToken(signupResult.user.id);

      expect(refreshResult.user.id).toBe(signupResult.user.id);
      expect(refreshResult.user.email).toBe(mockUser.email);
      expect(refreshResult.token).toBeDefined();
      expect(refreshResult.token).not.toBe(signupResult.token);

      // Verify new token is valid
      const decoded = jwt.verify(refreshResult.token, getJwtSecret()) as any;
      expect(decoded.userId).toBe(refreshResult.user.id);
      expect(decoded.email).toBe(refreshResult.user.email);
    });

    it('should throw error for non-existent user', async () => {
      await expect(UserService.refreshToken('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user with password for existing email', async () => {
      const mockUser = getMockUser();
      const signupResult = await UserService.signup(mockUser);
      
      const user = await UserService.getUserByEmail(mockUser.email);

      expect(user).toBeDefined();
      expect(user?.id).toBe(signupResult.user.id);
      expect(user?.email).toBe(mockUser.email);
      expect(user?.password).toBeDefined(); // Should include password for login verification
    });

    it('should return null for non-existent email', async () => {
      const user = await UserService.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });
}); 