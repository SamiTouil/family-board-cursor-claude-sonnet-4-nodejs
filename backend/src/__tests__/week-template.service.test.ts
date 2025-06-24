import { WeekTemplateService } from '../services/week-template.service';

// Mock Prisma Client completely
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    weekTemplate: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    weekTemplateDay: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dayTemplate: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    __mockPrisma: mockPrisma,
  };
});

// Mock the DayTemplateService
jest.mock('../services/day-template.service');

// Get the mock instance
const { __mockPrisma: mockPrisma } = require('@prisma/client');

describe('WeekTemplateService', () => {
  let weekTemplateService: WeekTemplateService;

  beforeEach(() => {
    weekTemplateService = new WeekTemplateService();
    jest.clearAllMocks();
  });

  describe('createWeekTemplate', () => {
    const mockFamilyId = 'family-1';
    const mockCreateData = {
      name: 'Test Week Template',
      description: 'Test description',
    };

    it('should create a week template successfully', async () => {
      const mockWeekTemplate = {
        id: 'template-1',
        name: mockCreateData.name,
        description: mockCreateData.description,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        days: [],
        family: { id: mockFamilyId, name: 'Test Family' },
      };

      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.weekTemplate.create as jest.Mock).mockResolvedValue(mockWeekTemplate);

      const result = await weekTemplateService.createWeekTemplate(mockCreateData, mockFamilyId);

      expect(result).toEqual(mockWeekTemplate);
      expect(mockPrisma.weekTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          name: mockCreateData.name,
        },
      });
    });

    it('should throw error if name already exists in family', async () => {
      const existingTemplate = { id: 'existing-1', name: mockCreateData.name };
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue(existingTemplate);

      await expect(
        weekTemplateService.createWeekTemplate(mockCreateData, mockFamilyId)
      ).rejects.toThrow('A week template with this name already exists in this family');
    });
  });

  describe('getWeekTemplateById', () => {
    const mockTemplateId = 'template-1';
    const mockFamilyId = 'family-1';

    it('should return week template with relations', async () => {
      const mockWeekTemplate = {
        id: mockTemplateId,
        name: 'Test Template',
        description: 'Test description',
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        days: [],
        family: { id: mockFamilyId, name: 'Test Family' },
      };

      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue(mockWeekTemplate);

      const result = await weekTemplateService.getWeekTemplateById(mockTemplateId, mockFamilyId);

      expect(result).toEqual(mockWeekTemplate);
    });

    it('should return null if template not found', async () => {
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await weekTemplateService.getWeekTemplateById(mockTemplateId, mockFamilyId);

      expect(result).toBeNull();
    });
  });

  describe('getWeekTemplates', () => {
    const mockFamilyId = 'family-1';

    it('should return paginated week templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: 'Description 1',
          familyId: mockFamilyId,
          createdAt: new Date(),
          updatedAt: new Date(),
          days: [],
          family: { id: mockFamilyId, name: 'Test Family' },
        },
      ];

      (mockPrisma.weekTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (mockPrisma.weekTemplate.count as jest.Mock).mockResolvedValue(1);

      const result = await weekTemplateService.getWeekTemplates(mockFamilyId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        templates: mockTemplates,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('updateWeekTemplate', () => {
    const mockTemplateId = 'template-1';
    const mockFamilyId = 'family-1';
    const mockUpdateData = {
      name: 'Updated Template',
      description: 'Updated description',
    };

    it('should update week template successfully', async () => {
      const mockUpdatedTemplate = {
        id: mockTemplateId,
        name: mockUpdateData.name,
        description: mockUpdateData.description,
        familyId: mockFamilyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        days: [],
        family: { id: mockFamilyId, name: 'Test Family' },
      };

      (mockPrisma.weekTemplate.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: mockTemplateId, familyId: mockFamilyId })
        .mockResolvedValueOnce(null);
      (mockPrisma.weekTemplate.update as jest.Mock).mockResolvedValue(mockUpdatedTemplate);

      const result = await weekTemplateService.updateWeekTemplate(
        mockTemplateId,
        mockUpdateData,
        mockFamilyId
      );

      expect(result).toEqual(mockUpdatedTemplate);
    });

    it('should throw error if template not found', async () => {
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        weekTemplateService.updateWeekTemplate(mockTemplateId, mockUpdateData, mockFamilyId)
      ).rejects.toThrow('Week template not found');
    });
  });

  describe('deleteWeekTemplate', () => {
    const mockTemplateId = 'template-1';
    const mockFamilyId = 'family-1';

    it('should delete week template successfully', async () => {
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue({
        id: mockTemplateId,
        familyId: mockFamilyId,
      });
      (mockPrisma.weekTemplate.delete as jest.Mock).mockResolvedValue({});

      await weekTemplateService.deleteWeekTemplate(mockTemplateId, mockFamilyId);

      expect(mockPrisma.weekTemplate.delete).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
      });
    });

    it('should throw error if template not found', async () => {
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        weekTemplateService.deleteWeekTemplate(mockTemplateId, mockFamilyId)
      ).rejects.toThrow('Week template not found');
    });
  });

  describe('addTemplateDay', () => {
    const mockTemplateId = 'template-1';
    const mockFamilyId = 'family-1';
    const mockData = {
      dayOfWeek: 0,
      dayTemplateId: 'day-template-1',
    };

    it('should add template day successfully', async () => {
      const mockTemplateDay = {
        id: 'template-day-1',
        weekTemplateId: mockTemplateId,
        dayOfWeek: mockData.dayOfWeek,
        dayTemplateId: mockData.dayTemplateId,
        dayTemplate: {
          id: mockData.dayTemplateId,
          name: 'Monday Template',
          description: 'Monday tasks',
          familyId: mockFamilyId,
        },
        weekTemplate: {
          id: mockTemplateId,
          name: 'Test Template',
          description: 'Test description',
        },
      };

      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue({
        id: mockTemplateId,
        familyId: mockFamilyId,
      });
      (mockPrisma.dayTemplate.findFirst as jest.Mock).mockResolvedValue({
        id: mockData.dayTemplateId,
        familyId: mockFamilyId,
      });
      (mockPrisma.weekTemplateDay.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.weekTemplateDay.create as jest.Mock).mockResolvedValue(mockTemplateDay);

      const result = await weekTemplateService.addTemplateDay(
        mockTemplateId,
        mockData,
        mockFamilyId
      );

      expect(result).toEqual(mockTemplateDay);
    });

    it('should throw error if week template not found', async () => {
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        weekTemplateService.addTemplateDay(mockTemplateId, mockData, mockFamilyId)
      ).rejects.toThrow('Week template not found');
    });

    it('should throw error if day template not found', async () => {
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue({
        id: mockTemplateId,
        familyId: mockFamilyId,
      });
      (mockPrisma.dayTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        weekTemplateService.addTemplateDay(mockTemplateId, mockData, mockFamilyId)
      ).rejects.toThrow('Day template not found');
    });
  });

  describe('duplicateTemplate', () => {
    const mockTemplateId = 'template-1';
    const mockFamilyId = 'family-1';
    const mockNewName = 'Duplicated Template';

    it('should throw error if original template not found', async () => {
      (mockPrisma.weekTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        weekTemplateService.duplicateTemplate(mockTemplateId, mockNewName, mockFamilyId)
      ).rejects.toThrow('Source week template not found');
    });
  });


}); 