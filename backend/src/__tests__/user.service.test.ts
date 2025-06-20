import { UserService } from '../services/user.service';
import { getMockUser } from './setup';

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const mockUser = getMockUser();
      const user = await UserService.createUser(mockUser);

      expect(user).toMatchObject({
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
      });
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      const mockUser = getMockUser();
      await UserService.createUser(mockUser);

      await expect(UserService.createUser(mockUser)).rejects.toThrow('Email already exists');
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const mockUser = getMockUser();
      const createdUser = await UserService.createUser(mockUser);
      const foundUser = await UserService.getUserById(createdUser.id);

      expect(foundUser).toMatchObject({
        id: createdUser.id,
        email: mockUser.email,
      });
    });

    it('should return null if user not found', async () => {
      const user = await UserService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = getMockUser();
      await UserService.createUser(mockUser);
      
      const result = await UserService.login({
        email: mockUser.email,
        password: mockUser.password,
      });

      expect(result.user.email).toBe(mockUser.email);
      expect(result.token).toBeDefined();
    });

    it('should throw error with invalid credentials', async () => {
      const mockUser = getMockUser();
      await UserService.createUser(mockUser);

      await expect(UserService.login({
        email: mockUser.email,
        password: 'wrongpassword',
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully with correct current password', async () => {
      const mockUser = getMockUser();
      const createdUser = await UserService.createUser(mockUser);
      
      const result = await UserService.changePassword(createdUser.id, {
        currentPassword: mockUser.password,
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      });

      expect(result.id).toBe(createdUser.id);
      expect(result.email).toBe(mockUser.email);

      // Verify the password was actually changed by trying to login with new password
      const loginResult = await UserService.login({
        email: mockUser.email,
        password: 'newPassword123',
      });
      expect(loginResult.user.id).toBe(createdUser.id);
    });

    it('should throw error with incorrect current password', async () => {
      const mockUser = getMockUser();
      const createdUser = await UserService.createUser(mockUser);

      await expect(UserService.changePassword(createdUser.id, {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      })).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error if user not found', async () => {
      await expect(UserService.changePassword('non-existent-id', {
        currentPassword: 'password123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      })).rejects.toThrow('User not found');
    });
  });
}); 