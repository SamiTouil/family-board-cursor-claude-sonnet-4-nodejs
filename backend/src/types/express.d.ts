import { FamilyMember } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        familyId?: string;
        familyMember?: FamilyMember;
      };
    }
  }
}

export {};