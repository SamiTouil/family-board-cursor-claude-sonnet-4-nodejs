import { z } from 'zod';

// Base Task interface matching Prisma model
export interface Task {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  defaultStartTime: string; // HH:MM format in UTC
  defaultDuration: number; // Duration in minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  familyId: string;
}

// TaskAssignment interface matching Prisma model
export interface TaskAssignment {
  id: string;
  memberId: string | null; // null means unassigned task
  taskId: string;
  overrideTime: string | null; // HH:MM format in UTC, overrides task's defaultStartTime
  overrideDuration: number | null; // Duration in minutes, overrides task's defaultDuration
  assignedDate: Date; // The date this task is assigned for (stored as UTC date)
  createdAt: Date;
  updatedAt: Date;
}

// TaskAssignment with related data
export interface TaskAssignmentWithRelations extends TaskAssignment {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null; // null for unassigned tasks
  task: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    defaultStartTime: string;
    defaultDuration: number;
    familyId: string;
  };
}

// Task with family relation
export interface TaskWithFamily extends Task {
  family: {
    id: string;
    name: string;
  };
}

// Task with assignments
export interface TaskWithAssignments extends Task {
  assignments: TaskAssignment[];
}

// Validation schemas using Zod
export const CreateTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(100, 'Task name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)'),
  icon: z.string().min(1, 'Icon is required').max(50, 'Icon name is too long'),
  defaultStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format (e.g., 14:30)'),
  defaultDuration: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours'),
});

export const UpdateTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(100, 'Task name is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)').optional(),
  icon: z.string().min(1, 'Icon is required').max(50, 'Icon name is too long').optional(),
  defaultStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format (e.g., 14:30)').optional(),
  defaultDuration: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours').optional(),
  isActive: z.boolean().optional(),
});

export const DuplicateTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(100, 'Task name is too long').optional(),
});

// TaskAssignment validation schemas
export const CreateTaskAssignmentSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required').optional().nullable(), // Optional - null means unassigned
  taskId: z.string().min(1, 'Task ID is required'),
  overrideTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Override time must be in HH:MM format (e.g., 14:30)').optional().nullable(),
  overrideDuration: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours').optional().nullable(),
  assignedDate: z.string().datetime('Assigned date must be a valid ISO datetime string'),
});

export const UpdateTaskAssignmentSchema = z.object({
  overrideTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Override time must be in HH:MM format (e.g., 14:30)').optional().nullable(),
  overrideDuration: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours').optional().nullable(),
  assignedDate: z.string().datetime('Assigned date must be a valid ISO datetime string').optional(),
});

// DTOs for API requests/responses
export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
export type DuplicateTaskDto = z.infer<typeof DuplicateTaskSchema>;
export type CreateTaskAssignmentDto = z.infer<typeof CreateTaskAssignmentSchema>;
export type UpdateTaskAssignmentDto = z.infer<typeof UpdateTaskAssignmentSchema>;

export interface TaskResponseDto {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  defaultStartTime: string;
  defaultDuration: number;
  isActive: boolean;
  createdAt: string; // ISO string for API responses
  updatedAt: string; // ISO string for API responses
  familyId: string;
}

export interface TaskAssignmentResponseDto {
  id: string;
  memberId: string | null; // null for unassigned tasks
  taskId: string;
  overrideTime: string | null;
  overrideDuration: number | null;
  assignedDate: string; // ISO string for API responses
  createdAt: string; // ISO string for API responses
  updatedAt: string; // ISO string for API responses
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null; // null for unassigned tasks
  task?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    defaultStartTime: string;
    defaultDuration: number;
    familyId: string;
  };
}

// Query parameters for listing tasks
export interface TaskQueryParams {
  isActive?: boolean;
  search?: string; // Search in name or description
  page?: number;
  limit?: number;
}

// Query parameters for listing task assignments
export interface TaskAssignmentQueryParams {
  memberId?: string | undefined;
  taskId?: string | undefined;
  assignedDate?: string | undefined; // ISO date string (YYYY-MM-DD)
  startDate?: string | undefined; // ISO date string for date range filtering
  endDate?: string | undefined; // ISO date string for date range filtering
  page?: number;
  limit?: number;
}

// Predefined common task icons (can be extended)
export const TASK_ICONS = [
  'cleaning',
  'cooking',
  'shopping',
  'laundry',
  'dishes',
  'vacuuming',
  'gardening',
  'maintenance',
  'childcare',
  'petcare',
  'bills',
  'appointment',
  'exercise',
  'study',
  'work',
  'other'
] as const;

export type TaskIcon = typeof TASK_ICONS[number];

// Predefined color palette for tasks
export const TASK_COLORS = [
  '#FF5733', // Red-Orange
  '#33FF57', // Green
  '#3357FF', // Blue
  '#FF33F5', // Magenta
  '#F5FF33', // Yellow
  '#33FFF5', // Cyan
  '#FF8C33', // Orange
  '#8C33FF', // Purple
  '#33FF8C', // Light Green
  '#FF3333', // Red
  '#33FFFF', // Aqua
  '#FFFF33', // Bright Yellow
] as const;

export type TaskColor = typeof TASK_COLORS[number];

// ==================== DAY TEMPLATE TYPES ====================

// DayTemplate interface matching Prisma model
export interface DayTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  familyId: string;
}

// DayTemplateItem interface matching Prisma model
export interface DayTemplateItem {
  id: string;
  memberId: string | null; // null means unassigned in template
  taskId: string;
  overrideTime: string | null; // HH:MM format in UTC, overrides task's defaultStartTime
  overrideDuration: number | null; // Duration in minutes, overrides task's defaultDuration
  sortOrder: number; // Order within the template
  createdAt: Date;
  updatedAt: Date;
  dayTemplateId: string;
}

// DayTemplate with related data
export interface DayTemplateWithRelations extends DayTemplate {
  items: DayTemplateItemWithRelations[];
  family: {
    id: string;
    name: string;
  };
}

// DayTemplateItem with related data
export interface DayTemplateItemWithRelations extends DayTemplateItem {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null; // null for unassigned template items
  task: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    defaultStartTime: string;
    defaultDuration: number;
    familyId: string;
  };
  dayTemplate: {
    id: string;
    name: string;
    description: string | null;
  };
}

// DayTemplate validation schemas
export const CreateDayTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name is too long'),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
});

export const UpdateDayTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  isActive: z.boolean().optional(),
});

// DayTemplateItem validation schemas
export const CreateDayTemplateItemSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required').optional().nullable(), // Optional - null means unassigned
  taskId: z.string().min(1, 'Task ID is required'),
  overrideTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Override time must be in HH:MM format (e.g., 14:30)').optional().nullable(),
  overrideDuration: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours').optional().nullable(),
  sortOrder: z.number().int().min(0).default(0).optional(),
});

export const UpdateDayTemplateItemSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required').optional().nullable(),
  overrideTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Override time must be in HH:MM format (e.g., 14:30)').optional().nullable(),
  overrideDuration: z.number().int().min(1, 'Duration must be at least 1 minute').max(1440, 'Duration cannot exceed 24 hours').optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

// DTOs for API requests/responses
export type CreateDayTemplateDto = z.infer<typeof CreateDayTemplateSchema>;
export type UpdateDayTemplateDto = z.infer<typeof UpdateDayTemplateSchema>;
export type CreateDayTemplateItemDto = z.infer<typeof CreateDayTemplateItemSchema>;
export type UpdateDayTemplateItemDto = z.infer<typeof UpdateDayTemplateItemSchema>;

export interface DayTemplateResponseDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string; // ISO string for API responses
  updatedAt: string; // ISO string for API responses
  familyId: string;
  items?: DayTemplateItemResponseDto[];
}

export interface DayTemplateItemResponseDto {
  id: string;
  memberId: string | null; // null for unassigned template items
  taskId: string;
  overrideTime: string | null;
  overrideDuration: number | null;
  sortOrder: number;
  createdAt: string; // ISO string for API responses
  updatedAt: string; // ISO string for API responses
  dayTemplateId: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null; // null for unassigned template items
  task?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    defaultStartTime: string;
    defaultDuration: number;
    familyId: string;
  };
}

// Query parameters for listing day templates
export interface DayTemplateQueryParams {
  isActive?: boolean;
  search?: string; // Search in name or description
  page?: number;
  limit?: number;
}

// DTO for applying a day template to specific dates
export interface ApplyDayTemplateDto {
  templateId: string;
  dates: string[]; // Array of ISO date strings (YYYY-MM-DD)
  overrideMemberAssignments?: boolean; // Whether to override existing member assignments
} 