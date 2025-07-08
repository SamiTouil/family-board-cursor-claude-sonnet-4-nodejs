import { Prisma } from '@prisma/client';

// Helper types for dynamic where clauses and update data
export type DayTemplateWhereInput = Prisma.DayTemplateWhereInput;
export type DayTemplateUpdateInput = Prisma.DayTemplateUpdateInput;
export type DayTemplateItemUpdateInput = Prisma.DayTemplateItemUpdateInput;

export type FamilyUpdateInput = Prisma.FamilyUpdateInput;

export type TaskWhereInput = Prisma.TaskWhereInput;
export type TaskUpdateInput = Prisma.TaskUpdateInput;

export type UserUpdateInput = Prisma.UserUpdateInput;

export type WeekTemplateWhereInput = Prisma.WeekTemplateWhereInput;
export type WeekTemplateUpdateInput = Prisma.WeekTemplateUpdateInput;
export type WeekTemplateDayUpdateInput = Prisma.WeekTemplateDayUpdateInput;

// Query parameter types
export interface PaginationParams {
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface DayTemplateQueryParams extends PaginationParams {
  where?: DayTemplateWhereInput;
  include?: Prisma.DayTemplateInclude;
}

export interface WeekTemplateQueryParams extends PaginationParams {
  where?: WeekTemplateWhereInput;
  include?: Prisma.WeekTemplateInclude;
}