import { TaskService } from '../../services/task.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryParams } from '../../types/task.types';

// Mock Prisma Client completely
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    task: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    family: {
      findUnique: jest.fn(),
    },
    familyMember: {
      findUnique: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    __mockPrisma: mockPrisma, // Export for test access
  };
});

// Get the mock instance
const { __mockPrisma: mockPrisma } = require('@prisma/client');

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });



  const mockFamily = {
    id: 'family-1',
    name: 'Test Family',
    description: 'A test family',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTask = {
    id: 'task-1',
    name: 'Clean Kitchen',
    description: 'Clean the kitchen thoroughly',
    color: '#FF5733',
    icon: 'cleaning',
    defaultStartTime: '09:00',
    defaultDuration: 60,
    isActive: true,
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
    familyId: 'family-1',
  };

  const mockAdminMembership = {
    id: 'member-1',
    role: 'ADMIN',
    userId: 'user-1',
    familyId: 'family-1',
  };

  const mockMemberMembership = {
    id: 'member-2',
    role: 'MEMBER',
    userId: 'user-2',
    familyId: 'family-1',
  };

  describe('createTask', () => {
    it('should create a new task when user is family admin', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const taskData: CreateTaskDto = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
      };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (mockPrisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await TaskService.createTask(userId, familyId, taskData);

      expect(mockPrisma.familyMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_familyId: {
            userId,
            familyId,
          },
        },
      });

      expect(mockPrisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: familyId },
      });

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          name: 'Clean Kitchen',
          description: 'Clean the kitchen thoroughly',
          color: '#FF5733',
          icon: 'cleaning',
          defaultStartTime: '09:00',
          defaultDuration: 60,
          familyId,
        },
      });

      expect(result).toEqual({
        id: 'task-1',
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
        isActive: true,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z',
        familyId: 'family-1',
      });
    });

    it('should throw error when user is not family admin', async () => {
      const userId = 'user-2';
      const familyId = 'family-1';
      const taskData: CreateTaskDto = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
      };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockMemberMembership);

      await expect(TaskService.createTask(userId, familyId, taskData)).rejects.toThrow(
        'Only family admins can perform this action'
      );
    });

    it('should throw error when user is not family member', async () => {
      const userId = 'user-3';
      const familyId = 'family-1';
      const taskData: CreateTaskDto = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
      };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(TaskService.createTask(userId, familyId, taskData)).rejects.toThrow(
        'You are not a member of this family'
      );
    });

    it('should throw error when family does not exist', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const taskData: CreateTaskDto = {
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
      };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.family.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(TaskService.createTask(userId, familyId, taskData)).rejects.toThrow(
        'Family not found'
      );
    });

    it('should handle null description', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const taskData: CreateTaskDto = {
        name: 'Clean Kitchen',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
      };

      const taskWithNullDescription = { ...mockTask, description: null };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (mockPrisma.task.create as jest.Mock).mockResolvedValue(taskWithNullDescription);

      const result = await TaskService.createTask(userId, familyId, taskData);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          name: 'Clean Kitchen',
          description: null,
          color: '#FF5733',
          icon: 'cleaning',
          defaultStartTime: '09:00',
          defaultDuration: 60,
          familyId,
        },
      });

      expect(result.description).toBeNull();
    });
  });

  describe('getFamilyTasks', () => {
    it('should return family tasks for family member', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const params: TaskQueryParams = {};

      const mockTasks = [mockTask];

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

      const result = await TaskService.getFamilyTasks(userId, familyId, params);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          familyId,
          isActive: true,
        },
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: 0,
        take: 50,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'task-1',
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
        isActive: true,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z',
        familyId: 'family-1',
      });
    });

    it('should filter tasks by search term', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const params: TaskQueryParams = { search: 'kitchen' };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);

      await TaskService.getFamilyTasks(userId, familyId, params);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          familyId,
          isActive: true,
          OR: [
            { name: { contains: 'kitchen', mode: 'insensitive' } },
            { description: { contains: 'kitchen', mode: 'insensitive' } },
          ],
        },
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: 0,
        take: 50,
      });
    });

    it('should handle pagination', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const params: TaskQueryParams = { page: 2, limit: 10 };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);

      await TaskService.getFamilyTasks(userId, familyId, params);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          familyId,
          isActive: true,
        },
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: 10,
        take: 10,
      });
    });

    it('should filter inactive tasks', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';
      const params: TaskQueryParams = { isActive: false };

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue([]);

      await TaskService.getFamilyTasks(userId, familyId, params);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          familyId,
          isActive: false,
        },
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: 0,
        take: 50,
      });
    });

    it('should throw error when user is not family member', async () => {
      const userId = 'user-3';
      const familyId = 'family-1';

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(TaskService.getFamilyTasks(userId, familyId)).rejects.toThrow(
        'You are not a member of this family'
      );
    });
  });

  describe('getTaskById', () => {
    it('should return task when user is family member', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';

      const taskWithFamily = { ...mockTask, family: mockFamily };

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(taskWithFamily);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);

      const result = await TaskService.getTaskById(userId, taskId);

      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
        include: {
          family: true,
        },
      });

      expect(result).toEqual({
        id: 'task-1',
        name: 'Clean Kitchen',
        description: 'Clean the kitchen thoroughly',
        color: '#FF5733',
        icon: 'cleaning',
        defaultStartTime: '09:00',
        defaultDuration: 60,
        isActive: true,
        createdAt: '2023-01-01T10:00:00.000Z',
        updatedAt: '2023-01-01T10:00:00.000Z',
        familyId: 'family-1',
      });
    });

    it('should throw error when task does not exist', async () => {
      const userId = 'user-1';
      const taskId = 'task-999';

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(TaskService.getTaskById(userId, taskId)).rejects.toThrow(
        'Task not found'
      );
    });

    it('should throw error when user is not family member', async () => {
      const userId = 'user-3';
      const taskId = 'task-1';

      const taskWithFamily = { ...mockTask, family: mockFamily };

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(taskWithFamily);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(TaskService.getTaskById(userId, taskId)).rejects.toThrow(
        'You are not a member of this family'
      );
    });
  });

  describe('updateTask', () => {
    it('should update task when user is family admin', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';
      const updateData: UpdateTaskDto = {
        name: 'Updated Task Name',
        description: 'Updated description',
        color: '#33FF57',
      };

      const updatedTask = { ...mockTask, ...updateData };

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await TaskService.updateTask(userId, taskId, updateData);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          name: 'Updated Task Name',
          description: 'Updated description',
          color: '#33FF57',
        },
      });

      expect(result.name).toBe('Updated Task Name');
      expect(result.description).toBe('Updated description');
      expect(result.color).toBe('#33FF57');
    });

    it('should throw error when user is not family admin', async () => {
      const userId = 'user-2';
      const taskId = 'task-1';
      const updateData: UpdateTaskDto = { name: 'Updated Task Name' };

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockMemberMembership);

      await expect(TaskService.updateTask(userId, taskId, updateData)).rejects.toThrow(
        'Only family admins can perform this action'
      );
    });

    it('should throw error when task does not exist', async () => {
      const userId = 'user-1';
      const taskId = 'task-999';
      const updateData: UpdateTaskDto = { name: 'Updated Task Name' };

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(TaskService.updateTask(userId, taskId, updateData)).rejects.toThrow(
        'Task not found'
      );
    });
  });

  describe('deleteTask', () => {
    it('should soft delete task when user is family admin', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.update as jest.Mock).mockResolvedValue({ ...mockTask, isActive: false });

      await TaskService.deleteTask(userId, taskId);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: { isActive: false },
      });
    });

    it('should throw error when user is not family admin', async () => {
      const userId = 'user-2';
      const taskId = 'task-1';

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockMemberMembership);

      await expect(TaskService.deleteTask(userId, taskId)).rejects.toThrow(
        'Only family admins can perform this action'
      );
    });
  });

  describe('permanentlyDeleteTask', () => {
    it('should permanently delete task when user is family admin', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.delete as jest.Mock).mockResolvedValue(mockTask);

      await TaskService.permanentlyDeleteTask(userId, taskId);

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });
  });

  describe('restoreTask', () => {
    it('should restore task when user is family admin', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';
      const inactiveTask = { ...mockTask, isActive: false };

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(inactiveTask);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.update as jest.Mock).mockResolvedValue(mockTask);

      const result = await TaskService.restoreTask(userId, taskId);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: { isActive: true },
      });

      expect(result.isActive).toBe(true);
    });
  });

  describe('getFamilyTaskStats', () => {
    it('should return task statistics for family member', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.count as jest.Mock)
        .mockResolvedValueOnce(10) // totalTasks
        .mockResolvedValueOnce(8)  // activeTasks
        .mockResolvedValueOnce(2); // inactiveTasks
      (mockPrisma.task.aggregate as jest.Mock).mockResolvedValue({
        _avg: { defaultDuration: 45.5 },
      });

      const result = await TaskService.getFamilyTaskStats(userId, familyId);

      expect(result).toEqual({
        totalTasks: 10,
        activeTasks: 8,
        inactiveTasks: 2,
        averageDuration: 46, // Rounded
      });
    });

    it('should handle zero average duration', async () => {
      const userId = 'user-1';
      const familyId = 'family-1';

      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      (mockPrisma.task.aggregate as jest.Mock).mockResolvedValue({
        _avg: { defaultDuration: null },
      });

      const result = await TaskService.getFamilyTaskStats(userId, familyId);

      expect(result.averageDuration).toBe(0);
    });
  });

  describe('duplicateTask', () => {
    it('should duplicate task with new name when user is family admin', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';
      const newName = 'Clean Kitchen (Copy)';

      const duplicatedTask = { ...mockTask, id: 'task-2', name: newName };

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.create as jest.Mock).mockResolvedValue(duplicatedTask);

      const result = await TaskService.duplicateTask(userId, taskId, newName);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          name: newName,
          description: mockTask.description,
          color: mockTask.color,
          icon: mockTask.icon,
          defaultStartTime: mockTask.defaultStartTime,
          defaultDuration: mockTask.defaultDuration,
          familyId: mockTask.familyId,
        },
      });

      expect(result.name).toBe(newName);
      expect(result.id).toBe('task-2');
    });

    it('should duplicate task with default copy name when no name provided', async () => {
      const userId = 'user-1';
      const taskId = 'task-1';

      const duplicatedTask = { ...mockTask, id: 'task-2', name: 'Clean Kitchen (Copy)' };

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMembership);
      (mockPrisma.task.create as jest.Mock).mockResolvedValue(duplicatedTask);

      const result = await TaskService.duplicateTask(userId, taskId);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          name: 'Clean Kitchen (Copy)',
          description: mockTask.description,
          color: mockTask.color,
          icon: mockTask.icon,
          defaultStartTime: mockTask.defaultStartTime,
          defaultDuration: mockTask.defaultDuration,
          familyId: mockTask.familyId,
        },
      });

      expect(result.name).toBe('Clean Kitchen (Copy)');
    });
  });
}); 