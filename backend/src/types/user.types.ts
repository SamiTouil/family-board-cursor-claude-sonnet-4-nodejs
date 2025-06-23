import { z } from 'zod';

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
  .pipe(z.string().url().optional());

export const CreateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  avatarUrl: avatarUrlSchema,
});

export const CreateVirtualMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  avatarUrl: avatarUrlSchema,
  familyId: z.string().min(1, 'Family ID is required'),
});

export const UpdateVirtualMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  avatarUrl: avatarUrlSchema,
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  avatarUrl: avatarUrlSchema,
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreateVirtualMemberInput = z.infer<typeof CreateVirtualMemberSchema>;
export type UpdateVirtualMemberInput = z.infer<typeof UpdateVirtualMemberSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  isVirtual: boolean;
  createdAt: Date;
  updatedAt: Date;
} 