import { WeekScheduleService } from '../../services/week-schedule.service';
import { CreateTaskOverrideDto, TaskOverrideAction } from '../../types/task.types';

// Mock the PrismaClient with proper structure
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    weekOverride: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
    weekTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    taskOverride: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

// Import after mocking
import { PrismaClient } from '@prisma/client';

describe('Day Template Application Logic', () => {
  let weekScheduleService: WeekScheduleService;
  let mockPrisma: any;

  beforeEach(() => {
    // Get the mock instance
    mockPrisma = new PrismaClient();
    
    // Create new instance for each test
    weekScheduleService = new WeekScheduleService();
    
    // Replace the private prisma property with our mock
    (weekScheduleService as any).prisma = mockPrisma;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('applyWeekOverride with day template logic', () => {
    it('should handle day template application without conflicts', async () => {
      const familyId = 'test-family';
      const weekStartDate = '2024-01-01';
      const targetDate = '2024-01-01';

      // Mock existing week override
      const mockWeekOverride = {
        id: 'week-override-1',
        familyId,
        weekStartDate: new Date(weekStartDate),
        weekTemplateId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock the upsert operation
      mockPrisma.weekOverride.upsert.mockResolvedValue(mockWeekOverride);
      
      // Mock deleteMany operation
      mockPrisma.taskOverride.deleteMany.mockResolvedValue({ count: 0 });
      
      // Mock weekTemplate.findMany for getApplicableWeekTemplate
      mockPrisma.weekTemplate.findMany.mockResolvedValue([]);
      
      // Mock taskOverride creation
      mockPrisma.taskOverride.create
        .mockResolvedValueOnce({
          id: 'override-1',
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-1',
          action: TaskOverrideAction.REMOVE,
          originalMemberId: 'member-1',
          newMemberId: null,
          overrideTime: null,
          overrideDuration: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'override-2',
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-2',
          action: TaskOverrideAction.ADD,
          originalMemberId: null,
          newMemberId: 'member-2',
          overrideTime: '09:00',
          overrideDuration: 30,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      // Mock the getWeekOverrideById method
      jest.spyOn(weekScheduleService as any, 'getWeekOverrideById').mockResolvedValue({
        ...mockWeekOverride,
        family: { id: familyId, name: 'Test Family' },
        weekTemplate: null,
        taskOverrides: []
      });

      // Simulate day template application: remove task-1, add task-2
      const taskOverrides: CreateTaskOverrideDto[] = [
        {
          assignedDate: targetDate,
          taskId: 'task-1',
          action: TaskOverrideAction.REMOVE,
          originalMemberId: 'member-1',
          newMemberId: null,
          overrideTime: null,
          overrideDuration: null
        },
        {
          assignedDate: targetDate,
          taskId: 'task-2',
          action: TaskOverrideAction.ADD,
          originalMemberId: null,
          newMemberId: 'member-2',
          overrideTime: '09:00',
          overrideDuration: 30
        }
      ];

      // Apply the overrides with replaceExisting: true (day template application)
      const result = await weekScheduleService.applyWeekOverride(familyId, {
        weekStartDate,
        taskOverrides,
        replaceExisting: true // Day template application should replace existing overrides
      });

      // Verify the week override was created/updated
      expect(mockPrisma.weekOverride.upsert).toHaveBeenCalledWith({
        where: { 
          familyId_weekStartDate: { 
            familyId, 
            weekStartDate: new Date(weekStartDate) 
          } 
        },
        create: {
          familyId,
          weekStartDate: new Date(weekStartDate),
          weekTemplateId: null
        },
        update: {
          weekTemplateId: undefined
        }
      });

      // Verify day-level override detection and cleanup
      expect(mockPrisma.taskOverride.deleteMany).toHaveBeenCalledWith({
        where: {
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate)
        }
      });

      // Verify task overrides were created (2 calls for 2 overrides)
      expect(mockPrisma.taskOverride.create).toHaveBeenCalledTimes(2);
      
      // Verify REMOVE override
      expect(mockPrisma.taskOverride.create).toHaveBeenNthCalledWith(1, {
        data: {
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-1',
          action: TaskOverrideAction.REMOVE,
          originalMemberId: 'member-1',
          newMemberId: null,
          overrideTime: null,
          overrideDuration: null
        }
      });

      // Verify ADD override
      expect(mockPrisma.taskOverride.create).toHaveBeenNthCalledWith(2, {
        data: {
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-2',
          action: TaskOverrideAction.ADD,
          originalMemberId: null,
          newMemberId: 'member-2',
          overrideTime: '09:00',
          overrideDuration: 30
        }
      });

      expect(result).toBeDefined();
    });

    it('should handle deduplication correctly for same task with different actions', async () => {
      const familyId = 'test-family';
      const weekStartDate = '2024-01-01';
      const targetDate = '2024-01-01';

      // Mock existing week override
      const mockWeekOverride = {
        id: 'week-override-1',
        familyId,
        weekStartDate: new Date(weekStartDate),
        weekTemplateId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.weekOverride.upsert.mockResolvedValue(mockWeekOverride);
      mockPrisma.taskOverride.deleteMany.mockResolvedValue({ count: 0 });
      
      // Mock weekTemplate.findMany for getApplicableWeekTemplate
      mockPrisma.weekTemplate.findMany.mockResolvedValue([]);
      
      mockPrisma.taskOverride.create.mockResolvedValue({
        id: 'override-1',
        weekOverrideId: 'week-override-1',
        assignedDate: new Date(targetDate),
        taskId: 'task-1',
        action: TaskOverrideAction.ADD,
        originalMemberId: null,
        newMemberId: 'member-1',
        overrideTime: '09:00',
        overrideDuration: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      jest.spyOn(weekScheduleService as any, 'getWeekOverrideById').mockResolvedValue({
        ...mockWeekOverride,
        family: { id: familyId, name: 'Test Family' },
        weekTemplate: null,
        taskOverrides: []
      });

      // Simulate conflicting overrides for the same task (REMOVE then ADD)
      // This tests the deduplication logic
      const taskOverrides: CreateTaskOverrideDto[] = [
        {
          assignedDate: targetDate,
          taskId: 'task-1',
          action: TaskOverrideAction.REMOVE,
          originalMemberId: 'member-1',
          newMemberId: null,
          overrideTime: null,
          overrideDuration: null
        },
        {
          assignedDate: targetDate,
          taskId: 'task-1',
          action: TaskOverrideAction.ADD,
          originalMemberId: null,
          newMemberId: 'member-1',
          overrideTime: '09:00',
          overrideDuration: 30
        }
      ];

      await weekScheduleService.applyWeekOverride(familyId, {
        weekStartDate,
        taskOverrides,
        replaceExisting: false // Individual task overrides should be cumulative
      });

      // Should delete conflicting overrides for task-1 (called twice, once for each override)
      expect(mockPrisma.taskOverride.deleteMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.taskOverride.deleteMany).toHaveBeenNthCalledWith(1, {
        where: {
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-1'
        }
      });
      expect(mockPrisma.taskOverride.deleteMany).toHaveBeenNthCalledWith(2, {
        where: {
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-1'
        }
      });

      // Should only create one override (the ADD one, since it comes last in deduplication)
      expect(mockPrisma.taskOverride.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.taskOverride.create).toHaveBeenCalledWith({
        data: {
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-1',
          action: TaskOverrideAction.ADD,
          originalMemberId: null,
          newMemberId: 'member-1',
          overrideTime: '09:00',
          overrideDuration: 30
        }
      });
    });

    it('should handle cumulative overrides correctly (replaceExisting: false)', async () => {
      const familyId = 'test-family';
      const weekStartDate = '2024-01-01';
      const targetDate = '2024-01-01';

      // Mock existing week override
      const mockWeekOverride = {
        id: 'week-override-1',
        familyId,
        weekStartDate: new Date(weekStartDate),
        weekTemplateId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.weekOverride.upsert.mockResolvedValue(mockWeekOverride);
      mockPrisma.taskOverride.deleteMany.mockResolvedValue({ count: 0 });
      
      // Mock weekTemplate.findMany for getApplicableWeekTemplate
      mockPrisma.weekTemplate.findMany.mockResolvedValue([]);
      
      mockPrisma.taskOverride.create.mockResolvedValue({
        id: 'override-1',
        weekOverrideId: 'week-override-1',
        assignedDate: new Date(targetDate),
        taskId: 'task-1',
        action: TaskOverrideAction.ADD,
        originalMemberId: null,
        newMemberId: 'member-1',
        overrideTime: '09:00',
        overrideDuration: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      jest.spyOn(weekScheduleService as any, 'getWeekOverrideById').mockResolvedValue({
        ...mockWeekOverride,
        family: { id: familyId, name: 'Test Family' },
        weekTemplate: null,
        taskOverrides: []
      });

      // Apply individual task override (should be cumulative)
      const taskOverrides: CreateTaskOverrideDto[] = [
        {
          assignedDate: targetDate,
          taskId: 'task-1',
          action: TaskOverrideAction.ADD,
          originalMemberId: null,
          newMemberId: 'member-1',
          overrideTime: '09:00',
          overrideDuration: 30
        }
      ];

      await weekScheduleService.applyWeekOverride(familyId, {
        weekStartDate,
        taskOverrides,
        replaceExisting: false // Individual task overrides should be cumulative
      });

      // Should only delete conflicting overrides for the specific task, not all overrides for the day
      expect(mockPrisma.taskOverride.deleteMany).toHaveBeenCalledWith({
        where: {
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-1'
        }
      });

      // Should create the override
      expect(mockPrisma.taskOverride.create).toHaveBeenCalledWith({
        data: {
          weekOverrideId: 'week-override-1',
          assignedDate: new Date(targetDate),
          taskId: 'task-1',
          action: TaskOverrideAction.ADD,
          originalMemberId: null,
          newMemberId: 'member-1',
          overrideTime: '09:00',
          overrideDuration: 30
        }
      });
    });
  });
}); 