import { z } from 'zod';

// Password validation schema with strong requirements
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

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
  password: passwordSchema,
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
  newPassword: passwordSchema,
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