import { PrismaClient } from '@prisma/client';
import { 
  CreateFamilyData, 
  UpdateFamilyData, 
  JoinFamilyData, 
  CreateInviteData, 
  UpdateMemberRoleData,
  FamilyResponse,
  FamilyMemberResponse,
  FamilyInviteResponse,
  FamilyStatsResponse
} from '../types/family.types';
import crypto from 'crypto';

// Use a global instance like other services
declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma || new PrismaClient();
if (process.env['NODE_ENV'] !== 'production') globalThis.__prisma = prisma;

export class FamilyService {
  // Generate a unique invite code
  private static generateInviteCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  // Create a new family
  static async createFamily(creatorId: string, data: CreateFamilyData): Promise<FamilyResponse> {
    const family = await prisma.family.create({
      data: {
        name: data.name,
        description: data.description || null,
        avatarUrl: data.avatarUrl || null,
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

    return {
      id: family.id,
      name: family.name,
      description: family.description || undefined,
      avatarUrl: family.avatarUrl || undefined,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
      creator: family.creator,
      memberCount: family.members.length,
      userRole: 'ADMIN',
    };
  }

  // Get user's families
  static async getUserFamilies(userId: string): Promise<FamilyResponse[]> {
    const memberships = await prisma.familyMember.findMany({
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

    return memberships.map((membership: any) => ({
      id: membership.family.id,
      name: membership.family.name,
      description: membership.family.description || undefined,
      avatarUrl: membership.family.avatarUrl || undefined,
      createdAt: membership.family.createdAt,
      updatedAt: membership.family.updatedAt,
      creator: membership.family.creator,
      memberCount: membership.family._count.members,
      userRole: membership.role,
    }));
  }

  // Get family by ID (requires membership)
  static async getFamilyById(familyId: string, userId: string): Promise<FamilyResponse> {
    const membership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId,
        },
      },
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

    if (!membership) {
      throw new Error('Family not found or access denied');
    }

    return {
      id: membership.family.id,
      name: membership.family.name,
      description: membership.family.description || undefined,
      avatarUrl: membership.family.avatarUrl || undefined,
      createdAt: membership.family.createdAt,
      updatedAt: membership.family.updatedAt,
      creator: membership.family.creator,
      memberCount: membership.family._count.members,
      userRole: membership.role,
    };
  }

  // Update family (admin only)
  static async updateFamily(familyId: string, userId: string, data: UpdateFamilyData): Promise<FamilyResponse> {
    // Check if user is admin
    const membership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      throw new Error('Only family admins can update family details');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;

    const updatedFamily = await prisma.family.update({
      where: { id: familyId },
      data: updateData,
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
    });

    return {
      id: updatedFamily.id,
      name: updatedFamily.name,
      description: updatedFamily.description || undefined,
      avatarUrl: updatedFamily.avatarUrl || undefined,
      createdAt: updatedFamily.createdAt,
      updatedAt: updatedFamily.updatedAt,
      creator: updatedFamily.creator,
      memberCount: updatedFamily._count.members,
      userRole: 'ADMIN',
    };
  }

  // Get family members (requires membership)
  static async getFamilyMembers(familyId: string, userId: string): Promise<FamilyMemberResponse[]> {
    // Check if user is a member
    const userMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId,
        },
      },
    });

    if (!userMembership) {
      throw new Error('Access denied');
    }

    const members = await prisma.familyMember.findMany({
      where: { familyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return members.map((member: any) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt,
      user: {
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl || undefined,
      },
    }));
  }

  // Update member role (admin only)
  static async updateMemberRole(familyId: string, adminId: string, data: UpdateMemberRoleData): Promise<FamilyMemberResponse> {
    // Check if admin user is actually admin
    const adminMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: adminId,
          familyId,
        },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new Error('Only family admins can update member roles');
    }

    const updatedMember = await prisma.familyMember.update({
      where: { id: data.memberId },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: updatedMember.id,
      role: updatedMember.role,
      joinedAt: updatedMember.joinedAt,
      user: {
        id: updatedMember.user.id,
        firstName: updatedMember.user.firstName,
        lastName: updatedMember.user.lastName,
        email: updatedMember.user.email,
        avatarUrl: updatedMember.user.avatarUrl || undefined,
      },
    };
  }

  // Create family invite (admin only)
  static async createInvite(senderId: string, data: CreateInviteData): Promise<FamilyInviteResponse> {
    // Check if sender is admin
    const senderMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: senderId,
          familyId: data.familyId,
        },
      },
    });

    if (!senderMembership || senderMembership.role !== 'ADMIN') {
      throw new Error('Only family admins can create invites');
    }

    let receiverId: string | null = null;
    
    // If specific email provided, check if user exists and isn't already a member
    if (data.receiverEmail) {
      const receiver = await prisma.user.findUnique({
        where: { email: data.receiverEmail },
      });

      if (receiver) {
        receiverId = receiver.id;
        
        // Check if already a member
        const existingMembership = await prisma.familyMember.findUnique({
          where: {
            userId_familyId: {
              userId: receiverId,
              familyId: data.familyId,
            },
          },
        });

        if (existingMembership) {
          throw new Error('User is already a member of this family');
        }
      }
    }

    // Generate unique invite code
    let code: string;
    let isUnique = false;
    do {
      code = this.generateInviteCode();
      const existingInvite = await prisma.familyInvite.findUnique({
        where: { code },
      });
      isUnique = !existingInvite;
    } while (!isUnique);

    const expiresAt = new Date(Date.now() + data.expiresIn * 24 * 60 * 60 * 1000);

    const invite = await prisma.familyInvite.create({
      data: {
        code,
        familyId: data.familyId,
        senderId,
        receiverId,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      id: invite.id,
      code: invite.code,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      respondedAt: invite.respondedAt || undefined,
      family: invite.family,
      sender: invite.sender,
      receiver: invite.receiver || undefined,
    };
  }

  // Join family with invite code
  static async joinFamily(userId: string, data: JoinFamilyData): Promise<FamilyResponse> {
    // Find the invite
    const invite = await prisma.familyInvite.findUnique({
      where: { code: data.code },
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
          },
        },
      },
    });

    if (!invite) {
      throw new Error('Invalid invite code');
    }

    // Check if invite has expired
    if (invite.expiresAt < new Date()) {
      await prisma.familyInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Invite has expired');
    }

    // Check if invite is for specific user
    if (invite.receiverId && invite.receiverId !== userId) {
      throw new Error('This invite is for a different user');
    }

    // Check if user is already a member
    const existingMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId: invite.familyId,
        },
      },
    });

    if (existingMembership) {
      throw new Error('You are already a member of this family');
    }

    // Join the family
    await prisma.$transaction([
      prisma.familyMember.create({
        data: {
          userId,
          familyId: invite.familyId,
          role: 'MEMBER',
        },
      }),
      prisma.familyInvite.update({
        where: { id: invite.id },
        data: { 
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      }),
    ]);

    // Get member count
    const memberCount = await prisma.familyMember.count({
      where: { familyId: invite.familyId },
    });

    return {
      id: invite.family.id,
      name: invite.family.name,
      description: invite.family.description || undefined,
      avatarUrl: invite.family.avatarUrl || undefined,
      createdAt: invite.family.createdAt,
      updatedAt: invite.family.updatedAt,
      creator: invite.family.creator,
      memberCount,
      userRole: 'MEMBER',
    };
  }

  // Remove member from family (admin only)
  static async removeMember(familyId: string, adminId: string, memberId: string): Promise<void> {
    // Check if admin user is actually admin
    const adminMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: adminId,
          familyId,
        },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new Error('Only family admins can remove members');
    }

    // Get member to remove
    const memberToRemove = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        family: true,
      },
    });

    if (!memberToRemove) {
      throw new Error('Member not found');
    }

    // Don't allow removing family creator
    if (memberToRemove.userId === memberToRemove.family.creatorId) {
      throw new Error('Cannot remove family creator');
    }

    await prisma.familyMember.delete({
      where: { id: memberId },
    });
  }

  // Leave family
  static async leaveFamily(familyId: string, userId: string): Promise<void> {
    const membership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId,
        },
      },
      include: {
        family: true,
      },
    });

    if (!membership) {
      throw new Error('You are not a member of this family');
    }

    // Don't allow family creator to leave
    if (userId === membership.family.creatorId) {
      throw new Error('Family creator cannot leave. Transfer ownership first.');
    }

    await prisma.familyMember.delete({
      where: { id: membership.id },
    });
  }

  // Delete family (creator only)
  static async deleteFamily(familyId: string, userId: string): Promise<void> {
    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      throw new Error('Family not found');
    }

    if (family.creatorId !== userId) {
      throw new Error('Only family creator can delete the family');
    }

    await prisma.family.delete({
      where: { id: familyId },
    });
  }

  // Get family invites (admin only)
  static async getFamilyInvites(familyId: string, userId: string): Promise<FamilyInviteResponse[]> {
    // Check if user is admin
    const membership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      throw new Error('Only family admins can view family invites');
    }

    const invites = await prisma.familyInvite.findMany({
      where: { familyId },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invites.map((invite: any) => ({
      id: invite.id,
      code: invite.code,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      respondedAt: invite.respondedAt || undefined,
      family: invite.family,
      sender: invite.sender,
      receiver: invite.receiver || undefined,
    }));
  }

  // Get family stats (admin only)
  static async getFamilyStats(familyId: string, userId: string): Promise<FamilyStatsResponse> {
    // Check if user is admin
    const membership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      throw new Error('Only family admins can view family stats');
    }

    const [totalMembers, totalAdmins, pendingInvites, family] = await Promise.all([
      prisma.familyMember.count({
        where: { familyId },
      }),
      prisma.familyMember.count({
        where: { familyId, role: 'ADMIN' },
      }),
      prisma.familyInvite.count({
        where: { familyId, status: 'PENDING' },
      }),
      prisma.family.findUnique({
        where: { id: familyId },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalMembers,
      totalAdmins,
      pendingInvites,
      createdAt: family!.createdAt,
    };
  }
} 