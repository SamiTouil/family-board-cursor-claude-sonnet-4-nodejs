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

// Task with family relation
export interface TaskWithFamily extends Task {
  family: {
    id: string;
    name: string;
  };
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

// DTOs for API requests/responses
export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;

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