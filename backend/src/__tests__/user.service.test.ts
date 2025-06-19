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
}); 