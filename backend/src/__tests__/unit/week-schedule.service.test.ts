import { WeekScheduleService } from '../../services/week-schedule.service';
import { TaskOverrideAction } from '../../types/task.types';

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

describe('WeekScheduleService', () => {
  let weekScheduleService: WeekScheduleService;
  let mockPrisma: any;
  
  beforeEach(() => {
    // Get the mock instance
    mockPrisma = new PrismaClient();
    
    // Create new instance for each test with injected mock
    weekScheduleService = new WeekScheduleService(mockPrisma);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Rule-based Template Selection', () => {
    const familyId = 'family-1';
    
    const mockDefaultTemplate = {
      id: 'default-template',
      name: 'Default Week',
      description: 'Default weekly schedule',
      isDefault: true,
      applyRule: null,
      priority: 0,
      familyId: familyId,
      days: [],
      family: { id: familyId, name: 'Test Family' },
    };

    const mockEvenWeekTemplate = {
      id: 'even-template',
      name: 'Even Week Schedule',
      description: 'Schedule for even weeks',
      isDefault: false,
      applyRule: 'EVEN_WEEKS' as const,
      priority: 10,
      familyId: familyId,
      days: [],
      family: { id: familyId, name: 'Test Family' },
    };

    const mockOddWeekTemplate = {
      id: 'odd-template',
      name: 'Odd Week Schedule',
      description: 'Schedule for odd weeks',
      isDefault: false,
      applyRule: 'ODD_WEEKS' as const,
      priority: 5,
      familyId: familyId,
      days: [],
      family: { id: familyId, name: 'Test Family' },
    };

    it('should select default template when no rules match', async () => {
      const weekStartDate = '2024-01-01'; // Week 1 (odd week)
      
      // Mock no week override found
      mockPrisma.weekOverride.findUnique.mockResolvedValue(null);
      
      // Mock templates available (no odd week template, only default)
      mockPrisma.weekTemplate.findMany.mockResolvedValue([
        mockDefaultTemplate,
        mockEvenWeekTemplate,
      ]);

      const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

      expect(result.baseTemplate).toEqual({
        id: 'default-template',
        name: 'Default Week',
        description: 'Default weekly schedule',
      });
    });

    it('should select even week template for even weeks', async () => {
      const weekStartDate = '2024-01-08'; // Week 2 (even week)
      
      // Mock no week override found
      mockPrisma.weekOverride.findUnique.mockResolvedValue(null);
      
      // Mock templates available
      mockPrisma.weekTemplate.findMany.mockResolvedValue([
        mockEvenWeekTemplate,
        mockDefaultTemplate,
        mockOddWeekTemplate,
      ]);

      const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

      expect(result.baseTemplate).toEqual({
        id: 'even-template',
        name: 'Even Week Schedule',
        description: 'Schedule for even weeks',
      });
    });

    it('should select odd week template for odd weeks', async () => {
      const weekStartDate = '2024-01-15'; // Week 3 (odd week)
      
      // Mock no week override found
      mockPrisma.weekOverride.findUnique.mockResolvedValue(null);
      
      // Mock templates available
      mockPrisma.weekTemplate.findMany.mockResolvedValue([
        mockOddWeekTemplate,
        mockDefaultTemplate,
        mockEvenWeekTemplate,
      ]);

      const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

      expect(result.baseTemplate).toEqual({
        id: 'odd-template',
        name: 'Odd Week Schedule',
        description: 'Schedule for odd weeks',
      });
    });

    it('should select highest priority template when multiple rules match', async () => {
      const weekStartDate = '2024-01-01'; // Week 1 (odd week)
      
      // Mock no week override found
      mockPrisma.weekOverride.findUnique.mockResolvedValue(null);
      
      // Mock multiple templates that could match (default + odd week)
      const highPriorityOddTemplate = {
        ...mockOddWeekTemplate,
        id: 'high-priority-odd',
        name: 'High Priority Odd Week',
        priority: 20,
      };
      
      mockPrisma.weekTemplate.findMany.mockResolvedValue([
        highPriorityOddTemplate,
        mockOddWeekTemplate,
        mockDefaultTemplate,
      ]);

      const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

      expect(result.baseTemplate).toEqual({
        id: 'high-priority-odd',
        name: 'High Priority Odd Week',
        description: 'Schedule for odd weeks',
      });
    });

    it('should fall back to first available template when no default exists', async () => {
      const weekStartDate = '2024-01-01'; // Week 1 (odd week)
      
      // Mock no week override found
      mockPrisma.weekOverride.findUnique.mockResolvedValue(null);
      
      // Mock templates without default or matching rules
      mockPrisma.weekTemplate.findMany.mockResolvedValue([
        mockEvenWeekTemplate, // Only even week template available
      ]);

      const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

      expect(result.baseTemplate).toEqual({
        id: 'even-template',
        name: 'Even Week Schedule',
        description: 'Schedule for even weeks',
      });
    });

    it('should return null when no templates are available', async () => {
      const weekStartDate = '2024-01-01';
      
      // Mock no week override found
      mockPrisma.weekOverride.findUnique.mockResolvedValue(null);
      
      // Mock no templates available
      mockPrisma.weekTemplate.findMany.mockResolvedValue([]);

      const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

      expect(result.baseTemplate).toBeNull();
    });

    it('should correctly calculate ISO week numbers for rule matching', async () => {
      // Test various dates to ensure ISO week calculation is correct
      const testCases = [
        { date: '2024-01-01', expectedWeek: 1 }, // Week 1 (odd)
        { date: '2024-01-08', expectedWeek: 2 }, // Week 2 (even)
        { date: '2024-12-30', expectedWeek: 1 }, // Week 1 of next year (odd)
      ];

      for (const testCase of testCases) {
        // Mock no week override found
        mockPrisma.weekOverride.findUnique.mockResolvedValue(null);
        
        const expectedTemplate = testCase.expectedWeek % 2 === 0 ? mockEvenWeekTemplate : mockOddWeekTemplate;
        
        mockPrisma.weekTemplate.findMany.mockResolvedValue([
          mockEvenWeekTemplate,
          mockOddWeekTemplate,
          mockDefaultTemplate,
        ]);

        const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate: testCase.date });

        expect(result.baseTemplate?.id).toBe(expectedTemplate.id);
      }
    });
  });

  describe.skip('getWeekSchedule', () => {
    it('should get week schedule with template only (no overrides)', async () => {
      const familyId = 'family-1';
      const weekStartDate = '2024-01-01'; // Monday

      // Mock no week override found
      mockPrisma.weekOverride.findUnique.mockResolvedValue(null);

      // Mock default week template
      const mockWeekTemplate = {
        id: 'template-1',
        name: 'Standard Week',
        description: 'Default weekly schedule',
        familyId: familyId,
        days: [
          {
            dayOfWeek: 1, // Monday
            dayTemplate: {
              id: 'day-template-1',
              name: 'Weekday',
              items: [
                {
                  taskId: 'task-1',
                  memberId: 'member-1',
                  overrideTime: '09:00',
                  overrideDuration: 60,
                  task: {
                    id: 'task-1',
                    name: 'Morning Exercise',
                    description: 'Daily workout',
                    color: '#FF5722',
                    icon: 'fitness',
                    defaultStartTime: '08:00',
                    defaultDuration: 30,
                    familyId: familyId,
                  },
                  member: {
                    id: 'member-1',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    avatarUrl: null,
                    isVirtual: false,
                  },
                },
              ],
            },
          },
        ],
      };

      mockPrisma.weekTemplate.findFirst.mockResolvedValue(mockWeekTemplate);

      const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

      expect(result).toEqual({
        weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
        familyId: familyId,
        baseTemplate: {
          id: 'template-1',
          name: 'Standard Week',
          description: 'Default weekly schedule',
        },
        hasOverrides: false,
        days: expect.arrayContaining([
          expect.objectContaining({
            date: new Date('2024-01-01T00:00:00.000Z'), // Monday
            dayOfWeek: 1,
            tasks: [
              {
                taskId: 'task-1',
                memberId: 'member-1',
                overrideTime: '09:00',
                overrideDuration: 60,
                source: 'template',
                task: mockWeekTemplate.days[0]!.dayTemplate.items[0]!.task,
                member: mockWeekTemplate.days[0]!.dayTemplate.items[0]!.member,
              },
            ],
          }),
        ]),
      });

      expect(mockPrisma.weekOverride.findUnique).toHaveBeenCalledWith({
        where: {
          familyId_weekStartDate: {
            familyId,
            weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
          },
        },
        include: expect.any(Object),
      });
    });

    it('should get week schedule with overrides applied', async () => {
      const familyId = 'family-1';
      const weekStartDate = '2024-01-01'; // Monday

      // Mock week override with task overrides
      const mockWeekOverride = {
        id: 'override-1',
        weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
        weekTemplateId: 'template-1',
        familyId: familyId,
        weekTemplate: {
          id: 'template-1',
          name: 'Standard Week',
          description: 'Default weekly schedule',
          familyId: familyId,
          days: [
            {
              dayOfWeek: 1, // Monday
              dayTemplate: {
                id: 'day-template-1',
                name: 'Weekday',
                items: [
                  {
                    taskId: 'task-1',
                    memberId: 'member-1',
                    overrideTime: '09:00',
                    overrideDuration: 60,
                    task: {
                      id: 'task-1',
                      name: 'Morning Exercise',
                      description: 'Daily workout',
                      color: '#FF5722',
                      icon: 'fitness',
                      defaultStartTime: '08:00',
                      defaultDuration: 30,
                      familyId: familyId,
                    },
                    member: {
                      id: 'member-1',
                      firstName: 'John',
                      lastName: 'Doe',
                      email: 'john@example.com',
                      avatarUrl: null,
                      isVirtual: false,
                    },
                  },
                ],
              },
            },
          ],
        },
        taskOverrides: [
          {
            id: 'override-task-1',
            assignedDate: new Date('2024-01-01T00:00:00.000Z'),
            taskId: 'task-1',
            action: 'REASSIGN' as any,
            originalMemberId: 'member-1',
            newMemberId: 'member-2',
            overrideTime: null,
            overrideDuration: null,
            task: {
              id: 'task-1',
              name: 'Morning Exercise',
              description: 'Daily workout',
              color: '#FF5722',
              icon: 'fitness',
              defaultStartTime: '08:00',
              defaultDuration: 30,
              familyId: familyId,
            },
            originalMember: {
              id: 'member-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              avatarUrl: null,
              isVirtual: false,
            },
            newMember: {
              id: 'member-2',
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane@example.com',
              avatarUrl: null,
              isVirtual: false,
            },
          },
        ],
      };

      (mockPrisma.weekOverride.findUnique as jest.Mock).mockResolvedValue(mockWeekOverride);

      const result = await weekScheduleService.getWeekSchedule(familyId, { weekStartDate });

      expect(result.hasOverrides).toBe(true);
      expect(result.days[0]!.tasks[0]).toEqual({
        taskId: 'task-1',
        memberId: 'member-2', // Reassigned to member-2
        overrideTime: '09:00',
        overrideDuration: 60,
        source: 'override',
        task: mockWeekOverride.taskOverrides[0]!.task,
        member: mockWeekOverride.taskOverrides[0]!.newMember,
      });
    });

    it('should throw error for invalid week start date', async () => {
      const familyId = 'family-1';
      const weekStartDate = 'invalid-date';

      await expect(
        weekScheduleService.getWeekSchedule(familyId, { weekStartDate })
      ).rejects.toThrow('Invalid week start date format');
    });

    it('should throw error for non-Monday start date', async () => {
      const familyId = 'family-1';
      const weekStartDate = '2024-01-02'; // Tuesday

      await expect(
        weekScheduleService.getWeekSchedule(familyId, { weekStartDate })
      ).rejects.toThrow('Week start date must be a Monday');
    });
  });

  describe('applyWeekOverride', () => {
    it('should create new week override with task overrides', async () => {
      const familyId = 'family-1';
      const overrideData = {
        weekStartDate: '2024-01-01',
        weekTemplateId: 'template-1',
        taskOverrides: [
          {
            assignedDate: '2024-01-01',
            taskId: 'task-1',
            action: TaskOverrideAction.REASSIGN,
            originalMemberId: 'member-1',
            newMemberId: 'member-2',
            overrideTime: null,
            overrideDuration: null,
          },
        ],
      };

      const mockCreatedOverride = {
        id: 'override-1',
        weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
        weekTemplateId: 'template-1',
        familyId: familyId,
      };

      const mockCreatedTaskOverride = {
        id: 'task-override-1',
        weekOverrideId: 'override-1',
        assignedDate: new Date('2024-01-01T00:00:00.000Z'),
        taskId: 'task-1',
        action: 'REASSIGN',
        originalMemberId: 'member-1',
        newMemberId: 'member-2',
        overrideTime: null,
        overrideDuration: null,
      };

      const mockWeekOverrideWithRelations = {
        ...mockCreatedOverride,
        family: { id: familyId, name: 'Test Family' },
        weekTemplate: { id: 'template-1', name: 'Standard Week', description: null },
        taskOverrides: [
          {
            ...mockCreatedTaskOverride,
            weekOverride: mockCreatedOverride,
            task: {
              id: 'task-1',
              name: 'Morning Exercise',
              description: 'Daily workout',
              color: '#FF5722',
              icon: 'fitness',
              defaultStartTime: '08:00',
              defaultDuration: 30,
              familyId: familyId,
            },
            originalMember: {
              id: 'member-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              avatarUrl: null,
              isVirtual: false,
            },
            newMember: {
              id: 'member-2',
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane@example.com',
              avatarUrl: null,
              isVirtual: false,
            },
          },
        ],
      };

      (mockPrisma.weekOverride.upsert as jest.Mock).mockResolvedValue(mockCreatedOverride);
      (mockPrisma.taskOverride.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.taskOverride.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.taskOverride.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.taskOverride.create as jest.Mock).mockResolvedValue(mockCreatedTaskOverride);
      (mockPrisma.weekOverride.findFirst as jest.Mock).mockResolvedValue(mockWeekOverrideWithRelations);

      // Mock getFamilyDefaultWeekTemplateId
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue({ id: 'template-1' });

      const result = await weekScheduleService.applyWeekOverride(familyId, overrideData);

      expect(result).toEqual(mockWeekOverrideWithRelations);

      expect(mockPrisma.weekOverride.upsert).toHaveBeenCalledWith({
        where: {
          familyId_weekStartDate: {
            familyId,
            weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
          },
        },
        create: {
          familyId,
          weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
          weekTemplateId: 'template-1',
        },
        update: {
          weekTemplateId: 'template-1',
        },
      });

      expect(mockPrisma.taskOverride.create).toHaveBeenCalledWith({
        data: {
          weekOverrideId: 'override-1',
          assignedDate: new Date('2024-01-01T00:00:00.000Z'),
          taskId: 'task-1',
          action: TaskOverrideAction.REASSIGN,
          originalMemberId: 'member-1',
          newMemberId: 'member-2',
          overrideTime: null,
          overrideDuration: null,
        },
      });
    });

    it('should validate override data', async () => {
      const familyId = 'family-1';
      const invalidOverrideData = {
        weekStartDate: 'invalid-date',
        taskOverrides: [],
      };

      await expect(
        weekScheduleService.applyWeekOverride(familyId, invalidOverrideData as any)
      ).rejects.toThrow();
    });
  });

  describe('removeWeekOverride', () => {
    it('should remove week override for specified week', async () => {
      const familyId = 'family-1';
      const weekStartDate = '2024-01-01';

      (mockPrisma.weekOverride.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await weekScheduleService.removeWeekOverride(familyId, weekStartDate);

      expect(mockPrisma.weekOverride.deleteMany).toHaveBeenCalledWith({
        where: {
          familyId,
          weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
        },
      });
    });

    it('should throw error for invalid week start date', async () => {
      const familyId = 'family-1';
      const weekStartDate = 'invalid-date';

      await expect(
        weekScheduleService.removeWeekOverride(familyId, weekStartDate)
      ).rejects.toThrow('Invalid week start date format');
    });
  });
}); 