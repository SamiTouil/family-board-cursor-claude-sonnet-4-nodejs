import { Router, Response, NextFunction } from 'express';
import { FamilyService } from '../services/family.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  createFamilySchema,
  updateFamilySchema,
  joinFamilySchema,
  createInviteBodySchema,
  updateMemberRoleSchema,
} from '../types/family.types';
import { z } from 'zod';

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

// Join family with invite code
router.post('/join', validateBody(joinFamilySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const family = await FamilyService.joinFamily(userId, req.body);
    
    res.json({
      success: true,
      message: 'Joined family successfully',
      data: family,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to join family',
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

export default router; 