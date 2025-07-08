import { CreateTaskOverrideSchema, TaskOverrideAction } from '../../types/task.types';

describe('CreateTaskOverrideSchema Validation', () => {
  describe('originalMemberId and newMemberId nullable fields', () => {
    it('should accept null values for originalMemberId and newMemberId', () => {
      const validData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.ADD,
        originalMemberId: null,
        newMemberId: null,
      };

      const result = CreateTaskOverrideSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept undefined values for originalMemberId and newMemberId', () => {
      const validData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.REMOVE,
        // originalMemberId and newMemberId are undefined (not provided)
      };

      const result = CreateTaskOverrideSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid string values for originalMemberId and newMemberId', () => {
      const validData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.REASSIGN,
        originalMemberId: 'member1',
        newMemberId: 'member2',
      };

      const result = CreateTaskOverrideSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty string values for originalMemberId and newMemberId', () => {
      const invalidData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.REASSIGN,
        originalMemberId: '',
        newMemberId: '',
      };

      const result = CreateTaskOverrideSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should handle day template application scenario with null member IDs', () => {
      // This is the exact scenario that was failing before the fix
      const dayTemplateOverrideData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.ADD,
        originalMemberId: null, // Day template items can have null member IDs
        newMemberId: 'member1', // Assigned to a specific member
        overrideTime: null,
        overrideDuration: null,
      };

      const result = CreateTaskOverrideSchema.safeParse(dayTemplateOverrideData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.originalMemberId).toBe(null);
        expect(result.data.newMemberId).toBe('member1');
      }
    });

    it('should handle REMOVE action with null newMemberId', () => {
      const removeOverrideData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.REMOVE,
        originalMemberId: 'member1',
        newMemberId: null, // REMOVE actions don't assign to anyone
      };

      const result = CreateTaskOverrideSchema.safeParse(removeOverrideData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.originalMemberId).toBe('member1');
        expect(result.data.newMemberId).toBe(null);
      }
    });
  });

  describe('overrideTime and overrideDuration nullable fields', () => {
    it('should accept null values for overrideTime and overrideDuration', () => {
      const validData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.ADD,
        overrideTime: null,
        overrideDuration: null,
      };

      const result = CreateTaskOverrideSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid time format for overrideTime', () => {
      const validData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.ADD,
        overrideTime: '14:30',
        overrideDuration: 60,
      };

      const result = CreateTaskOverrideSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid time format for overrideTime', () => {
      const invalidData = {
        assignedDate: '2025-06-29',
        taskId: 'task123',
        action: TaskOverrideAction.ADD,
        overrideTime: '25:30', // Invalid hour
        overrideDuration: 60,
      };

      const result = CreateTaskOverrideSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
}); 