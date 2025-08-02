import { Family, FamilyMember, User, FamilyInvite, FamilyJoinRequest } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface FamilyWithDetails extends Family {
  creator: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  members: FamilyMember[];
  _count?: { members: number };
}

export interface FamilyMemberWithUser extends FamilyMember {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl' | 'isVirtual'>;
}

export interface FamilyInviteWithFamily extends FamilyInvite {
  family: Pick<Family, 'id' | 'name'>;
}

export interface FamilyJoinRequestWithDetails extends FamilyJoinRequest {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  family: Pick<Family, 'id' | 'name'>;
}

/**
 * Repository for family-related database operations
 */
export class FamilyRepository extends BaseRepository<Family> {
  protected getModelName(): string {
    return 'family';
  }

  /**
   * Create a family with the creator as admin member
   */
  async createFamilyWithMember(
    creatorId: string, 
    familyData: Pick<Family, 'name' | 'description' | 'avatarUrl'>
  ): Promise<FamilyWithDetails> {
    return this.prisma.family.create({
      data: {
        name: familyData.name,
        description: familyData.description || null,
        avatarUrl: familyData.avatarUrl || null,
        creatorId,
        members: {
          create: {
            userId: creatorId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: true,
      },
    });
  }

  /**
   * Get families where user is a member
   */
  async getFamiliesByUserId(userId: string): Promise<FamilyWithDetails[]> {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    return memberships.map(membership => ({
      ...membership.family,
      members: [], // Not needed for this query
    }));
  }

  /**
   * Get family by ID with member validation
   */
  async getFamilyByIdWithMemberCheck(
    familyId: string, 
    userId: string
  ): Promise<FamilyWithDetails | null> {
    // First check if user is a member
    const membership = await this.prisma.familyMember.findFirst({
      where: {
        familyId,
        userId,
      },
    });

    if (!membership) {
      return null;
    }

    return this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                isVirtual: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get family members with user details
   */
  async getFamilyMembers(familyId: string, userId: string): Promise<FamilyMemberWithUser[]> {
    // First check if user is a member
    const userMembership = await this.prisma.familyMember.findFirst({
      where: {
        familyId,
        userId,
      },
    });

    if (!userMembership) {
      throw new Error('Access denied: User is not a member of this family');
    }

    return this.prisma.familyMember.findMany({
      where: { familyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            isVirtual: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  /**
   * Check if user is admin of family
   */
  async isUserAdmin(familyId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.familyMember.findFirst({
      where: {
        familyId,
        userId,
        role: 'ADMIN',
      },
    });

    return !!membership;
  }

  /**
   * Check if user is creator of family
   */
  async isUserCreator(familyId: string, userId: string): Promise<boolean> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { creatorId: true },
    });

    return family?.creatorId === userId;
  }

  /**
   * Get family invites for a family (admin only)
   */
  async getFamilyInvites(familyId: string, userId: string): Promise<FamilyInvite[]> {
    const isAdmin = await this.isUserAdmin(familyId, userId);
    if (!isAdmin) {
      throw new Error('Access denied: Only admins can view family invites');
    }

    return this.prisma.familyInvite.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get join requests for a family (admin only)
   */
  async getFamilyJoinRequests(familyId: string, userId: string): Promise<FamilyJoinRequestWithDetails[]> {
    const isAdmin = await this.isUserAdmin(familyId, userId);
    if (!isAdmin) {
      throw new Error('Access denied: Only admins can view join requests');
    }

    return this.prisma.familyJoinRequest.findMany({
      where: { familyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user's join requests
   */
  async getUserJoinRequests(userId: string): Promise<FamilyJoinRequestWithDetails[]> {
    return this.prisma.familyJoinRequest.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Remove member from family
   */
  async removeMember(familyId: string, adminId: string, memberId: string): Promise<void> {
    const isAdmin = await this.isUserAdmin(familyId, adminId);
    if (!isAdmin) {
      throw new Error('Access denied: Only admins can remove members');
    }

    // Prevent removing the creator
    const isCreator = await this.isUserCreator(familyId, memberId);
    if (isCreator) {
      throw new Error('Cannot remove the family creator');
    }

    await this.prisma.familyMember.deleteMany({
      where: {
        familyId,
        userId: memberId,
      },
    });
  }

  /**
   * Leave family
   */
  async leaveFamily(familyId: string, userId: string): Promise<void> {
    // Prevent creator from leaving
    const isCreator = await this.isUserCreator(familyId, userId);
    if (isCreator) {
      throw new Error('Family creator cannot leave the family. Delete the family instead.');
    }

    await this.prisma.familyMember.deleteMany({
      where: {
        familyId,
        userId,
      },
    });
  }

  /**
   * Get family statistics
   */
  async getFamilyStats(familyId: string, userId: string): Promise<any> {
    const isAdmin = await this.isUserAdmin(familyId, userId);
    if (!isAdmin) {
      throw new Error('Access denied: Only admins can view family statistics');
    }

    const [memberCount, taskCount, inviteCount, joinRequestCount] = await Promise.all([
      this.prisma.familyMember.count({ where: { familyId } }),
      this.prisma.task.count({ where: { familyId } }),
      this.prisma.familyInvite.count({ where: { familyId } }),
      this.prisma.familyJoinRequest.count({ 
        where: { familyId, status: 'PENDING' } 
      }),
    ]);

    return {
      memberCount,
      taskCount,
      inviteCount,
      pendingJoinRequests: joinRequestCount,
    };
  }
}

// Export singleton instance
export const familyRepository = new FamilyRepository();