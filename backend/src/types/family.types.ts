import { z } from 'zod';
import { FamilyMemberRole, FamilyInviteStatus, FamilyJoinRequestStatus } from '@prisma/client';

// Helper function to handle avatar URL validation
const avatarUrlSchema = z
  .union([z.string(), z.undefined(), z.null()])
  .optional()
  .transform((val) => {
    if (!val || val === '' || val === null) {
      return undefined;
    }
    return val;
  })
  .pipe(z.string().url('Invalid avatar URL').optional());

// Family DTOs
export const createFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required').max(100, 'Family name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  avatarUrl: avatarUrlSchema,
});

export const updateFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required').max(100, 'Family name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  avatarUrl: avatarUrlSchema,
});

export const joinFamilySchema = z.object({
  code: z.string().min(6, 'Invalid invite code').max(20, 'Invalid invite code'),
  message: z.string().max(500, 'Message too long').optional(),
});

export const createInviteSchema = z.object({
  familyId: z.string().cuid('Invalid family ID'),
  receiverEmail: z.string().email('Invalid email address').optional(),
  expiresIn: z.number().min(1).max(30).default(7), // days
});

export const createInviteBodySchema = z.object({
  receiverEmail: z.string().email('Invalid email address').optional(),
  expiresIn: z.number().min(1).max(30).default(7), // days
});

export const respondToInviteSchema = z.object({
  inviteId: z.string().cuid('Invalid invite ID'),
  response: z.enum(['ACCEPTED', 'REJECTED']),
});

export const respondToJoinRequestSchema = z.object({
  response: z.enum(['APPROVED', 'REJECTED']),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().cuid('Invalid member ID'),
  role: z.nativeEnum(FamilyMemberRole),
});

// Type exports
export type CreateFamilyData = z.infer<typeof createFamilySchema>;
export type UpdateFamilyData = z.infer<typeof updateFamilySchema>;
export type JoinFamilyData = z.infer<typeof joinFamilySchema>;
export type CreateInviteData = z.infer<typeof createInviteSchema>;
export type RespondToInviteData = z.infer<typeof respondToInviteSchema>;
export type RespondToJoinRequestData = z.infer<typeof respondToJoinRequestSchema>;
export type UpdateMemberRoleData = z.infer<typeof updateMemberRoleSchema>;

// Response types
export interface FamilyResponse {
  id: string;
  name: string;
  description?: string | undefined;
  avatarUrl?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  memberCount: number;
  userRole?: FamilyMemberRole;
}

export interface FamilyMemberResponse {
  id: string;
  userId: string;
  role: FamilyMemberRole;
  joinedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl?: string | null;
    isVirtual?: boolean;
  };
}

export interface FamilyInviteResponse {
  id: string;
  code: string;
  status: FamilyInviteStatus;
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date | undefined;
  family: {
    id: string;
    name: string;
  };
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
  receiver?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | undefined;
}

export interface FamilyJoinRequestResponse {
  id: string;
  status: FamilyJoinRequestStatus;
  message?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  respondedAt?: Date | undefined;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl?: string | null;
  };
  family: {
    id: string;
    name: string;
  };
  invite: {
    id: string;
    code: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  } | undefined;
}

export interface FamilyStatsResponse {
  totalMembers: number;
  totalAdmins: number;
  pendingInvites: number;
  pendingJoinRequests: number;
  createdAt: Date;
}

// Re-export from user types for convenience
export type { CreateVirtualMemberInput } from './user.types'; 