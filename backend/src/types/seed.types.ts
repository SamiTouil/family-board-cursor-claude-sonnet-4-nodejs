import { 
  User, 
  Family, 
  FamilyMember, 
  FamilyInvite, 
  FamilyJoinRequest, 
  Task, 
  DayTemplate, 
  DayTemplateItem,
  WeekTemplate,
  WeekTemplateDay,
  WeekOverride,
  TaskOverride
} from '@prisma/client';

export interface DbExport {
  users: Partial<User>[];
  families: Partial<Family>[];
  familyMembers: Partial<FamilyMember>[];
  familyInvites: Partial<FamilyInvite>[];
  familyJoinRequests: Partial<FamilyJoinRequest>[];
  tasks: Partial<Task>[];
  dayTemplates: Partial<DayTemplate>[];
  dayTemplateItems: Partial<DayTemplateItem>[];
  weekTemplates?: Partial<WeekTemplate>[];
  weekTemplateDays?: Partial<WeekTemplateDay>[];
  weekOverrides?: Partial<WeekOverride>[];
  taskOverrides?: Partial<TaskOverride>[];
  exportedAt?: string;
}