import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { FamilyService } from '../services/family.service';
import { getWebSocketService } from '../services/websocket.service';

/**
 * Controller for handling family-related HTTP requests
 */
export class FamilyController extends BaseController {
  
  /**
   * Handle recent task assignments request
   */
  getRecentAssignments = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const { since } = req.query;

    if (!since || typeof since !== 'string') {
      this.sendError(res, 'Missing or invalid "since" parameter');
      return;
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      this.sendError(res, 'Invalid date format for "since" parameter');
      return;
    }

    // For now, return empty assignments until the notification system is fully implemented
    // This endpoint is used by mobile app for background notifications
    console.log(`📋 Recent assignments requested for user ${userId} since ${sinceDate.toISOString()}`);

    this.sendSuccess(res, { assignments: [] });
  });

  /**
   * Create a new family
   */
  createFamily = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const family = await FamilyService.createFamily(userId, req.body);
    
    this.sendSuccess(res, family, 'Family created successfully', 201);
  });

  /**
   * Get user's families
   */
  getUserFamilies = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const families = await FamilyService.getUserFamilies(userId);
    
    this.sendSuccess(res, families);
  });

  /**
   * Get user's own join requests
   */
  getUserJoinRequests = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const joinRequests = await FamilyService.getUserJoinRequests(userId);
    
    this.sendSuccess(res, joinRequests);
  });

  /**
   * Get family by ID
   */
  getFamilyById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const family = await FamilyService.getFamilyById(familyId, userId);
    
    if (!family) {
      this.sendError(res, 'Family not found', 404);
      return;
    }
    
    this.sendSuccess(res, family);
  });

  /**
   * Update family (admin only)
   */
  updateFamily = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const family = await FamilyService.updateFamily(familyId, userId, req.body);
    
    // Notify family members about the update via WebSocket
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.notifyFamilyUpdated(familyId, 'details', family);
    }
    
    this.sendSuccess(res, family, 'Family updated successfully');
  });

  /**
   * Delete family (creator only)
   */
  deleteFamily = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    await FamilyService.deleteFamily(familyId, userId);
    
    this.sendSuccessMessage(res, 'Family deleted successfully');
  });

  /**
   * Get family members
   */
  getFamilyMembers = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const members = await FamilyService.getFamilyMembers(familyId, userId);
    
    this.sendSuccess(res, members);
  });

  /**
   * Remove member from family (admin only)
   */
  removeMember = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const memberId = this.getParam(req, 'memberId');
    
    if (!familyId || !memberId) {
      this.sendError(res, 'Family ID and Member ID are required');
      return;
    }
    
    await FamilyService.removeMember(familyId, userId, memberId);
    
    this.sendSuccessMessage(res, 'Member removed successfully');
  });

  /**
   * Leave family
   */
  leaveFamily = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    await FamilyService.leaveFamily(familyId, userId);
    
    this.sendSuccessMessage(res, 'Left family successfully');
  });

  /**
   * Update member role (admin only)
   */
  updateMemberRole = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const member = await FamilyService.updateMemberRole(familyId, userId, req.body);
    
    this.sendSuccess(res, member, 'Member role updated successfully');
  });

  /**
   * Create family invite (admin only)
   */
  createInvite = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    // Merge familyId from URL parameter with request body
    const inviteData = {
      ...req.body,
      familyId: familyId,
    };
    
    const invite = await FamilyService.createInvite(userId, inviteData);
    
    this.sendSuccess(res, invite, 'Invite created successfully', 201);
  });

  /**
   * Get family invites (admin only)
   */
  getFamilyInvites = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const invites = await FamilyService.getFamilyInvites(familyId, userId);
    
    this.sendSuccess(res, invites);
  });

  /**
   * Join family with invite code (now creates join request)
   */
  requestToJoinFamily = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const joinRequest = await FamilyService.requestToJoinFamily(userId, req.body);
    
    this.sendSuccess(res, joinRequest, 'Join request submitted successfully. Please wait for admin approval.');
  });

  /**
   * Get family join requests (admin only)
   */
  getFamilyJoinRequests = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const joinRequests = await FamilyService.getFamilyJoinRequests(familyId, userId);
    
    this.sendSuccess(res, joinRequests);
  });

  /**
   * Respond to join request (admin only)
   */
  respondToJoinRequest = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const requestId = this.getParam(req, 'requestId');
    
    if (!requestId) {
      this.sendError(res, 'Request ID is required');
      return;
    }
    
    const updatedRequest = await FamilyService.respondToJoinRequest(userId, requestId, req.body);
    
    this.sendSuccess(res, updatedRequest, `Join request ${req.body.response.toLowerCase()} successfully`);
  });

  /**
   * Cancel user's own join request
   */
  cancelJoinRequest = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const requestId = this.getParam(req, 'requestId');
    
    if (!requestId) {
      this.sendError(res, 'Request ID is required');
      return;
    }
    
    await FamilyService.cancelJoinRequest(userId, requestId);
    
    this.sendSuccessMessage(res, 'Join request cancelled successfully');
  });

  /**
   * Get family stats (admin only)
   */
  getFamilyStats = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    const stats = await FamilyService.getFamilyStats(familyId, userId);
    
    this.sendSuccess(res, stats);
  });

  /**
   * Create virtual member (admin only)
   */
  createVirtualMember = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    
    if (!familyId) {
      this.sendError(res, 'Family ID is required');
      return;
    }
    
    // Validate that familyId in URL matches familyId in body
    if (req.body.familyId !== familyId) {
      this.sendError(res, 'Family ID mismatch');
      return;
    }
    
    const virtualMember = await FamilyService.createVirtualMember(userId, req.body);
    
    this.sendSuccess(res, virtualMember, 'Virtual member created successfully', 201);
  });

  /**
   * Update virtual member (admin only)
   */
  updateVirtualMember = this.asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const adminId = this.getUserId(req);
    const familyId = this.getParam(req, 'familyId');
    const userId = this.getParam(req, 'userId');
    
    if (!familyId || !userId) {
      this.sendError(res, 'Family ID and User ID are required');
      return;
    }
    
    const updatedVirtualMember = await FamilyService.updateVirtualMember(
      adminId, 
      familyId, 
      userId, 
      req.body
    );
    
    this.sendSuccess(res, updatedVirtualMember, 'Virtual member updated successfully');
  });
}

// Export a singleton instance
export const familyController = new FamilyController();