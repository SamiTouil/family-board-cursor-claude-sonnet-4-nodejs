import { 
  CreateFamilyData, 
  UpdateFamilyData, 
  JoinFamilyData, 
  CreateInviteData, 
  UpdateMemberRoleData,
  RespondToJoinRequestData,
  FamilyResponse,
  FamilyMemberResponse,
  FamilyInviteResponse,
  FamilyJoinRequestResponse,
  FamilyStatsResponse,
  CreateVirtualMemberInput
} from '../types/family.types';
import { UpdateVirtualMemberInput } from '../types/user.types';
import crypto from 'crypto';
import { getWebSocketService } from './websocket.service';
import prisma from '../lib/prisma';

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
      avatarUrl: membership.family.avatarUrl || null,
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
            isVirtual: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return members.map((member: any) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      user: {
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email || null,
        avatarUrl: member.user.avatarUrl || null,
        isVirtual: member.user.isVirtual,
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
      userId: updatedMember.userId,
      role: updatedMember.role,
      joinedAt: updatedMember.joinedAt,
      user: {
        id: updatedMember.user.id,
        firstName: updatedMember.user.firstName,
        lastName: updatedMember.user.lastName,
        email: updatedMember.user.email,
        avatarUrl: updatedMember.user.avatarUrl || null,
      },
    };
  }

  // Create family invite (admin only) - Only one active invite per family
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

    // Check for existing active invites and expire them
    const existingInvites = await prisma.familyInvite.findMany({
      where: {
        familyId: data.familyId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Expire all existing active invites (only one active invite allowed)
    if (existingInvites.length > 0) {
      await prisma.familyInvite.updateMany({
        where: {
          familyId: data.familyId,
          status: 'PENDING',
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          status: 'EXPIRED',
          respondedAt: new Date(),
        },
      });
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

  // Request to join family with invite code (creates join request instead of auto-joining)
  static async requestToJoinFamily(userId: string, data: JoinFamilyData): Promise<any> {
    // Find the invite
    const invite = await prisma.familyInvite.findUnique({
      where: { code: data.code },
      include: {
        family: {
          select: {
            id: true,
            name: true,
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

    // Check if user already has a pending join request
    const existingRequest = await prisma.familyJoinRequest.findUnique({
      where: {
        userId_familyId: {
          userId,
          familyId: invite.familyId,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        throw new Error('You already have a pending join request for this family');
      } else if (existingRequest.status === 'REJECTED' || existingRequest.status === 'APPROVED') {
        // Allow resubmission after rejection or if user was approved but later removed
        await prisma.familyJoinRequest.delete({
          where: { id: existingRequest.id },
        });
      }
    }

    // Create join request
    const joinRequest = await prisma.familyJoinRequest.create({
      data: {
        userId,
        familyId: invite.familyId,
        inviteId: invite.id,
        message: data.message || null,
        status: 'PENDING',
      },
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
        family: {
          select: {
            id: true,
            name: true,
          },
        },
        invite: {
          select: {
            id: true,
            code: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify family admins via WebSocket
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      await webSocketService.notifyJoinRequestCreated(invite.familyId, {
        id: joinRequest.id,
        status: joinRequest.status,
        message: joinRequest.message || undefined,
        createdAt: joinRequest.createdAt,
        updatedAt: joinRequest.updatedAt,
        respondedAt: joinRequest.respondedAt || undefined,
        user: joinRequest.user,
        family: joinRequest.family,
        invite: joinRequest.invite,
        reviewer: joinRequest.reviewer || undefined,
      });
    }

    return {
      id: joinRequest.id,
      status: joinRequest.status,
      message: joinRequest.message || undefined,
      createdAt: joinRequest.createdAt,
      updatedAt: joinRequest.updatedAt,
      respondedAt: joinRequest.respondedAt || undefined,
      user: {
        id: joinRequest.user.id,
        firstName: joinRequest.user.firstName,
        lastName: joinRequest.user.lastName,
        email: joinRequest.user.email,
        avatarUrl: joinRequest.user.avatarUrl,
      },
      family: joinRequest.family,
      invite: joinRequest.invite,
      reviewer: joinRequest.reviewer || undefined,
    };
  }

  // Get family join requests (admin only)
  static async getFamilyJoinRequests(familyId: string, userId: string): Promise<FamilyJoinRequestResponse[]> {
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
      throw new Error('Only family admins can view join requests');
    }

    const joinRequests = await prisma.familyJoinRequest.findMany({
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
        family: {
          select: {
            id: true,
            name: true,
          },
        },
        invite: {
          select: {
            id: true,
            code: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return joinRequests.map((request: any) => ({
      id: request.id,
      status: request.status,
      message: request.message || undefined,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      respondedAt: request.respondedAt || undefined,
      user: request.user,
      family: request.family,
      invite: request.invite,
      reviewer: request.reviewer || undefined,
    }));
  }

  // Respond to join request (admin only)
  static async respondToJoinRequest(adminId: string, requestId: string, data: RespondToJoinRequestData): Promise<FamilyJoinRequestResponse> {
    // Get the join request
    const joinRequest = await prisma.familyJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        family: true,
        user: true,
      },
    });

    if (!joinRequest) {
      throw new Error('Join request not found');
    }

    // Check if admin has permission
    const adminMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: adminId,
          familyId: joinRequest.familyId,
        },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new Error('Only family admins can respond to join requests');
    }

    // Check if request is still pending
    if (joinRequest.status !== 'PENDING') {
      throw new Error('This join request has already been processed');
    }

    // Process the response
    if (data.response === 'APPROVED') {
      // Add user to family and update request status
      await prisma.$transaction([
        prisma.familyMember.create({
          data: {
            userId: joinRequest.userId,
            familyId: joinRequest.familyId,
            role: 'MEMBER',
          },
        }),
        prisma.familyJoinRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewerId: adminId,
            respondedAt: new Date(),
          },
        }),
      ]);
    } else {
      // Just update request status to rejected
      await prisma.familyJoinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewerId: adminId,
          respondedAt: new Date(),
        },
      });
    }

    // Return updated join request
    const updatedRequest = await prisma.familyJoinRequest.findUnique({
      where: { id: requestId },
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
        family: {
          select: {
            id: true,
            name: true,
          },
        },
        invite: {
          select: {
            id: true,
            code: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify users via WebSocket
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      if (data.response === 'APPROVED') {
        await webSocketService.notifyJoinRequestApproved(
          joinRequest.userId, 
          joinRequest.familyId, 
          joinRequest.family.name
        );
      } else {
        await webSocketService.notifyJoinRequestRejected(
          joinRequest.userId, 
          joinRequest.familyId, 
          joinRequest.family.name
        );
      }
    }

    return {
      id: updatedRequest!.id,
      status: updatedRequest!.status,
      message: updatedRequest!.message || undefined,
      createdAt: updatedRequest!.createdAt,
      updatedAt: updatedRequest!.updatedAt,
      respondedAt: updatedRequest!.respondedAt || undefined,
      user: updatedRequest!.user,
      family: updatedRequest!.family,
      invite: updatedRequest!.invite,
      reviewer: updatedRequest!.reviewer || undefined,
    };
  }

  // Legacy method - now redirects to requestToJoinFamily
  static async joinFamily(userId: string, data: JoinFamilyData): Promise<FamilyJoinRequestResponse> {
    return this.requestToJoinFamily(userId, data);
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

    // Don't allow self-removal
    if (memberToRemove.userId === adminId) {
      throw new Error('Cannot remove yourself from the family');
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

    const [totalMembers, totalAdmins, pendingInvites, pendingJoinRequests, family] = await Promise.all([
      prisma.familyMember.count({
        where: { familyId },
      }),
      prisma.familyMember.count({
        where: { familyId, role: 'ADMIN' },
      }),
      prisma.familyInvite.count({
        where: { familyId, status: 'PENDING' },
      }),
      prisma.familyJoinRequest.count({
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
      pendingJoinRequests,
      createdAt: family!.createdAt,
    };
  }

  // Get user's own join requests
  static async getUserJoinRequests(userId: string): Promise<FamilyJoinRequestResponse[]> {
    const joinRequests = await prisma.familyJoinRequest.findMany({
      where: { userId },
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
        family: {
          select: {
            id: true,
            name: true,
          },
        },
        invite: {
          select: {
            id: true,
            code: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return joinRequests.map((request: any) => ({
      id: request.id,
      status: request.status,
      message: request.message || undefined,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      respondedAt: request.respondedAt || undefined,
      user: request.user,
      family: request.family,
      invite: request.invite,
      reviewer: request.reviewer || undefined,
    }));
  }

  // Cancel user's own join request
  static async cancelJoinRequest(userId: string, requestId: string): Promise<void> {
    // Get the join request
    const joinRequest = await prisma.familyJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest) {
      throw new Error('Join request not found');
    }

    // Check if the request belongs to the user
    if (joinRequest.userId !== userId) {
      throw new Error('You can only cancel your own join requests');
    }

    // Check if request is still pending
    if (joinRequest.status !== 'PENDING') {
      throw new Error('Only pending join requests can be cancelled');
    }

    // Delete the join request
    await prisma.familyJoinRequest.delete({
      where: { id: requestId },
    });
  }

  // Create virtual member (admin only)
  static async createVirtualMember(adminId: string, data: CreateVirtualMemberInput): Promise<FamilyMemberResponse> {
    // Check if admin user is actually admin
    const adminMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: adminId,
          familyId: data.familyId,
        },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new Error('Only family admins can create virtual members');
    }

    // Create virtual user and add to family in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create virtual user
      const virtualUser = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl || null,
          isVirtual: true,
          email: null,
          password: null,
        },
      });

      // Add virtual user to family
      const familyMember = await tx.familyMember.create({
        data: {
          userId: virtualUser.id,
          familyId: data.familyId,
          role: 'MEMBER',
        },
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
      });

      return familyMember;
    });

    return {
      id: result.id,
      userId: result.userId,
      role: result.role,
      joinedAt: result.joinedAt,
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email || null,
        avatarUrl: result.user.avatarUrl || null,
        isVirtual: result.user.isVirtual,
      },
    };
  }

  // Update virtual member (admin only)
  static async updateVirtualMember(adminId: string, familyId: string, virtualUserId: string, data: UpdateVirtualMemberInput): Promise<FamilyMemberResponse> {
    // Check if admin user is actually admin
    const adminMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: adminId,
          familyId: familyId,
        },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new Error('Only family admins can update virtual members');
    }

    // Check if the user being updated is a virtual member of this family
    const virtualMembership = await prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: virtualUserId,
          familyId: familyId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!virtualMembership) {
      throw new Error('Virtual member not found in this family');
    }

    if (!virtualMembership.user.isVirtual) {
      throw new Error('Only virtual members can be updated through this endpoint');
    }

    // Update the virtual user
    const updatedUser = await prisma.user.update({
      where: { id: virtualUserId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl || null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        isVirtual: true,
      },
    });

    return {
      id: virtualMembership.id,
      userId: virtualMembership.userId,
      role: virtualMembership.role,
      joinedAt: virtualMembership.joinedAt,
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email || null,
        avatarUrl: updatedUser.avatarUrl || null,
        isVirtual: updatedUser.isVirtual,
      },
    };
  }
} 