import { z } from 'zod';

// Task interface matching Prisma model
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

// Task with family relation
export interface TaskWithFamily extends Task {
  family: {
    id: string;
    name: string;
  };
}

// Task with template items for display
export interface TaskWithTemplateItems extends Task {
  dayTemplateItems: DayTemplateItem[];
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



// DTOs for API requests/responses
export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
export type DuplicateTaskDto = z.infer<typeof DuplicateTaskSchema>;

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



// Query parameters for listing tasks
export interface TaskQueryParams {
  isActive?: boolean;
  search?: string; // Search in name or description
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

// ==================== WEEK TEMPLATE TYPES ====================

// WeekTemplate interface matching Prisma model
export interface WeekTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  applyRule: 'EVEN_WEEKS' | 'ODD_WEEKS' | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  familyId: string;
}

// WeekTemplateDay interface matching Prisma model
export interface WeekTemplateDay {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayTemplateId: string;
  createdAt: Date;
  updatedAt: Date;
  weekTemplateId: string;
}

// WeekTemplate with related data
export interface WeekTemplateWithRelations extends WeekTemplate {
  days: WeekTemplateDayWithRelations[];
  family: {
    id: string;
    name: string;
  };
}

// WeekTemplateDay with related data
export interface WeekTemplateDayWithRelations extends WeekTemplateDay {
  dayTemplate: DayTemplateWithRelations;
  weekTemplate: {
    id: string;
    name: string;
    description: string | null;
  };
}

// WeekTemplate validation schemas
export const CreateWeekTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name is too long'),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  applyRule: z.enum(['EVEN_WEEKS', 'ODD_WEEKS']).optional().nullable(),
  priority: z.number().int().min(0).max(1000).optional().default(0),
});

export const UpdateWeekTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  applyRule: z.enum(['EVEN_WEEKS', 'ODD_WEEKS']).optional().nullable(),
  priority: z.number().int().min(0).max(1000).optional(),
});

// WeekTemplateDay validation schemas
export const CreateWeekTemplateDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday, 6 = Saturday
  dayTemplateId: z.string().min(1, 'Day template ID is required'),
});

export const UpdateWeekTemplateDaySchema = z.object({
  dayTemplateId: z.string().min(1, 'Day template ID is required').optional(),
});

// DTOs for API requests/responses
export type CreateWeekTemplateDto = z.infer<typeof CreateWeekTemplateSchema>;
export type UpdateWeekTemplateDto = z.infer<typeof UpdateWeekTemplateSchema>;
export type CreateWeekTemplateDayDto = z.infer<typeof CreateWeekTemplateDaySchema>;
export type UpdateWeekTemplateDayDto = z.infer<typeof UpdateWeekTemplateDaySchema>;

export interface WeekTemplateResponseDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  applyRule: 'EVEN_WEEKS' | 'ODD_WEEKS' | null;
  priority: number;
  createdAt: string; // ISO string for API responses
  updatedAt: string; // ISO string for API responses
  familyId: string;
  days?: WeekTemplateDayResponseDto[];
}

export interface WeekTemplateDayResponseDto {
  id: string;
  dayOfWeek: number;
  dayTemplateId: string;
  createdAt: string; // ISO string for API responses
  updatedAt: string; // ISO string for API responses
  weekTemplateId: string;
  dayTemplate?: DayTemplateResponseDto;
}

// Query parameters for listing week templates
export interface WeekTemplateQueryParams {
  isActive?: boolean;
  search?: string; // Search in name or description
  page?: number;
  limit?: number;
}

// DTO for applying a week template to specific dates
export interface ApplyWeekTemplateDto {
  templateId: string;
  startDate: string; // ISO date string (YYYY-MM-DD) for the Monday of the week
  overrideMemberAssignments?: boolean; // Whether to override existing member assignments
}

// ==================== WEEK OVERRIDE TYPES ====================

// WeekOverride interface matching Prisma model
export interface WeekOverride {
  id: string;
  weekStartDate: Date; // Monday of the week
  weekTemplateId: string | null; // Base template (nullable for custom weeks)
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
}

// TaskOverride interface matching Prisma model
export interface TaskOverride {
  id: string;
  assignedDate: Date; // Specific date
  taskId: string;
  action: TaskOverrideAction; // ADD, REMOVE, REASSIGN
  originalMemberId: string | null; // For REASSIGN: who it was assigned to
  newMemberId: string | null; // For ADD/REASSIGN: who it's now assigned to
  overrideTime: string | null; // For ADD: specific time
  overrideDuration: number | null; // For ADD: specific duration
  createdAt: Date;
  updatedAt: Date;
  weekOverrideId: string;
}

// Enum for task override actions
export enum TaskOverrideAction {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  REASSIGN = 'REASSIGN',
}

// WeekOverride with related data
export interface WeekOverrideWithRelations extends WeekOverride {
  family: {
    id: string;
    name: string;
  };
  weekTemplate?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  taskOverrides: TaskOverrideWithRelations[];
}

// TaskOverride with related data
export interface TaskOverrideWithRelations extends TaskOverride {
  weekOverride: {
    id: string;
    weekStartDate: Date;
    weekTemplateId: string | null;
    familyId: string;
  };
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
  originalMember?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null;
  newMember?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null;
}

// Validation schemas for week overrides
export const CreateWeekOverrideSchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start date must be in YYYY-MM-DD format'),
  weekTemplateId: z.string().min(1, 'Week template ID is required').optional().nullable(),
});

export const CreateTaskOverrideSchema = z.object({
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Assigned date must be in YYYY-MM-DD format'),
  taskId: z.string().min(1, 'Task ID is required'),
  action: z.nativeEnum(TaskOverrideAction),
  originalMemberId: z.string().min(1).optional().nullable(),
  newMemberId: z.string().min(1).optional().nullable(),
  overrideTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Override time must be in HH:MM format').optional().nullable(),
  overrideDuration: z.number().int().min(1).max(1440).optional().nullable(),
});

// DTOs for API requests/responses
export type CreateWeekOverrideDto = z.infer<typeof CreateWeekOverrideSchema>;
export type CreateTaskOverrideDto = z.infer<typeof CreateTaskOverrideSchema>;

export interface WeekOverrideResponseDto {
  id: string;
  weekStartDate: string; // ISO string for API responses
  weekTemplateId: string | null;
  familyId: string;
  createdAt: string; // ISO string for API responses
  updatedAt: string; // ISO string for API responses
  taskOverrides?: TaskOverrideResponseDto[];
}

export interface TaskOverrideResponseDto {
  id: string;
  assignedDate: string; // ISO string for API responses
  taskId: string;
  action: TaskOverrideAction;
  originalMemberId: string | null;
  newMemberId: string | null;
  overrideTime: string | null;
  overrideDuration: number | null;
  createdAt: string; // ISO string for API responses
  updatedAt: string; // ISO string for API responses
  weekOverrideId: string;
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
  originalMember?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null;
  newMember?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null;
}

// ==================== WEEK SCHEDULE TYPES ====================

// Resolved task for a specific date (combines template + overrides)
export interface ResolvedTask {
  taskId: string;
  memberId: string | null;
  overrideTime: string | null;
  overrideDuration: number | null;
  source: 'template' | 'override'; // Whether this comes from template or override
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
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    isVirtual: boolean;
  } | null;
}

// Resolved schedule for a specific day
export interface ResolvedDaySchedule {
  date: Date;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  tasks: ResolvedTask[];
}

// Resolved schedule for a full week
export interface ResolvedWeekSchedule {
  weekStartDate: Date; // Monday of the week
  familyId: string;
  baseTemplate?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  hasOverrides: boolean;
  days: ResolvedDaySchedule[];
}

// Query parameters for getting week schedules
export interface WeekScheduleQueryParams {
  weekStartDate: string; // ISO date string (YYYY-MM-DD) for the Monday of the week
}

// DTO for applying week overrides
export interface ApplyWeekOverrideDto {
  weekStartDate: string; // ISO date string (YYYY-MM-DD) for the Monday of the week
  weekTemplateId?: string | null; // Optional: change the base template for this week
  taskOverrides: CreateTaskOverrideDto[]; // Array of task overrides to apply
  replaceExisting?: boolean; // If true, replace all existing overrides for affected dates. If false (default), add to existing overrides
} 