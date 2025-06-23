import { Router, Response, NextFunction } from 'express';
import { FamilyService } from '../services/family.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  createFamilySchema,
  updateFamilySchema,
  joinFamilySchema,
  createInviteBodySchema,
  updateMemberRoleSchema,
  respondToJoinRequestSchema,
} from '../types/family.types';
import { z } from 'zod';
import { CreateVirtualMemberSchema, UpdateVirtualMemberSchema } from '../types/user.types';
import { getWebSocketService } from '../services/websocket.service';

const router = Router();

// Apply auth middleware to all family routes
router.use(authenticateToken);

// Validation middleware
const validateBody = (schema: z.ZodSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      // Replace body with validated data
      (req as any).body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};

// Create a new family
router.post('/', validateBody(createFamilySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const family = await FamilyService.createFamily(userId, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Family created successfully',
      data: family,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create family',
    });
  }
});

// Get user's families
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const families = await FamilyService.getUserFamilies(userId);
    
    res.json({
      success: true,
      data: families,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch families',
    });
  }
});

// Get user's own join requests
router.get('/my-join-requests', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    
    const joinRequests = await FamilyService.getUserJoinRequests(userId);
    
    res.json({
      success: true,
      data: joinRequests,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get join requests',
    });
  }
});

// Get family by ID
router.get('/:familyId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const family = await FamilyService.getFamilyById(familyId, userId);
    
    res.json({
      success: true,
      data: family,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : 'Family not found',
    });
  }
});

// Update family (admin only)
router.put('/:familyId', validateBody(updateFamilySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const family = await FamilyService.updateFamily(familyId, userId, req.body);
    
    // Notify family members about the update via WebSocket
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.notifyFamilyUpdated(familyId, 'details', family);
    }
    
    res.json({
      success: true,
      message: 'Family updated successfully',
      data: family,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update family',
    });
  }
});

// Delete family (creator only)
router.delete('/:familyId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    await FamilyService.deleteFamily(familyId, userId);
    
    res.json({
      success: true,
      message: 'Family deleted successfully',
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete family',
    });
  }
});

// Get family members
router.get('/:familyId/members', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const members = await FamilyService.getFamilyMembers(familyId, userId);
    
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Access denied',
    });
  }
});

// Remove member from family (admin only)
router.delete('/:familyId/members/:memberId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId, memberId } = req.params;
    
    if (!familyId || !memberId) {
      res.status(400).json({
        success: false,
        message: 'Family ID and Member ID are required',
      });
      return;
    }
    
    await FamilyService.removeMember(familyId, userId, memberId);
    
    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to remove member',
    });
  }
});

// Leave family
router.post('/:familyId/leave', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    await FamilyService.leaveFamily(familyId, userId);
    
    res.json({
      success: true,
      message: 'Left family successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to leave family',
    });
  }
});

// Update member role (admin only)
router.put('/:familyId/members/:memberId/role', validateBody(updateMemberRoleSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const member = await FamilyService.updateMemberRole(familyId, userId, req.body);
    
    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: member,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update member role',
    });
  }
});

// Create family invite (admin only)
router.post('/:familyId/invites', validateBody(createInviteBodySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    // Merge familyId from URL parameter with request body
    const inviteData = {
      ...req.body,
      familyId,
    };
    
    const invite = await FamilyService.createInvite(userId, inviteData);
    
    res.status(201).json({
      success: true,
      message: 'Invite created successfully',
      data: invite,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create invite',
    });
  }
});

// Get family invites (admin only)
router.get('/:familyId/invites', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const invites = await FamilyService.getFamilyInvites(familyId, userId);
    
    res.json({
      success: true,
      data: invites,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Access denied',
    });
  }
});

// Join family with invite code (now creates join request)
router.post('/join', validateBody(joinFamilySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const joinRequest = await FamilyService.requestToJoinFamily(userId, req.body);
    
    res.json({
      success: true,
      message: 'Join request submitted successfully. Please wait for admin approval.',
      data: joinRequest,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to submit join request',
    });
  }
});

// Get family join requests (admin only)
router.get('/:familyId/join-requests', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const joinRequests = await FamilyService.getFamilyJoinRequests(familyId, userId);
    
    res.json({
      success: true,
      data: joinRequests,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Access denied',
    });
  }
});

// Respond to join request (admin only)
router.post('/join-requests/:requestId/respond', validateBody(respondToJoinRequestSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { requestId } = req.params;
    
    if (!requestId) {
      res.status(400).json({
        success: false,
        message: 'Request ID is required',
      });
      return;
    }
    
    const updatedRequest = await FamilyService.respondToJoinRequest(userId, requestId, req.body);
    
    res.json({
      success: true,
      message: `Join request ${req.body.response.toLowerCase()} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to respond to join request',
    });
  }
});

// Cancel user's own join request
router.delete('/join-requests/:requestId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { requestId } = req.params;
    
    if (!requestId) {
      res.status(400).json({
        success: false,
        message: 'Request ID is required',
      });
      return;
    }
    
    await FamilyService.cancelJoinRequest(userId, requestId);
    
    res.json({
      success: true,
      message: 'Join request cancelled successfully',
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel join request',
    });
  }
});

// Get family stats (admin only)
router.get('/:familyId/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    const stats = await FamilyService.getFamilyStats(familyId, userId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Access denied',
    });
  }
});

// Create virtual member (admin only)
router.post('/:familyId/virtual-members', validateBody(CreateVirtualMemberSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { familyId } = req.params;
    
    if (!familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
      return;
    }
    
    // Validate that familyId in URL matches familyId in body
    if (req.body.familyId !== familyId) {
      res.status(400).json({
        success: false,
        message: 'Family ID mismatch',
      });
      return;
    }
    
    const virtualMember = await FamilyService.createVirtualMember(userId, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Virtual member created successfully',
      data: virtualMember,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create virtual member',
    });
  }
});

// Update virtual member (admin only)
router.put('/:familyId/virtual-members/:userId', validateBody(UpdateVirtualMemberSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user!.userId;
    const { familyId, userId: virtualUserId } = req.params;
    
    if (!familyId || !virtualUserId) {
      res.status(400).json({
        success: false,
        message: 'Family ID and User ID are required',
      });
      return;
    }
    
    const updatedVirtualMember = await FamilyService.updateVirtualMember(adminId, familyId, virtualUserId, req.body);
    
    res.json({
      success: true,
      message: 'Virtual member updated successfully',
      data: updatedVirtualMember,
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update virtual member',
    });
  }
});

export default router; 