import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  createFamilySchema,
  updateFamilySchema,
  joinFamilySchema,
  createInviteBodySchema,
  updateMemberRoleSchema,
  respondToJoinRequestSchema,
} from '../types/family.types';
import { CreateVirtualMemberSchema, UpdateVirtualMemberSchema } from '../types/user.types';
import { familyController } from '../controllers/family.controller';

const router = Router();

// Apply auth middleware to all family routes
router.use(authenticateToken);

// Get recent task assignments for background notifications (must be before other routes)
router.get('/recent-assignments', familyController.getRecentAssignments);


// Create a new family
router.post('/', validateBody(createFamilySchema), familyController.createFamily);

// Get user's families
router.get('/', familyController.getUserFamilies);

// Get user's own join requests
router.get('/my-join-requests', familyController.getUserJoinRequests);

// Get family by ID
router.get('/:familyId', familyController.getFamilyById);

// Update family (admin only)
router.put('/:familyId', validateBody(updateFamilySchema), familyController.updateFamily);

// Delete family (creator only)
router.delete('/:familyId', familyController.deleteFamily);

// Get family members
router.get('/:familyId/members', familyController.getFamilyMembers);

// Remove member from family (admin only)
router.delete('/:familyId/members/:memberId', familyController.removeMember);

// Leave family
router.post('/:familyId/leave', familyController.leaveFamily);

// Update member role (admin only)
router.put('/:familyId/members/:memberId/role', validateBody(updateMemberRoleSchema), familyController.updateMemberRole);

// Create family invite (admin only)
router.post('/:familyId/invites', validateBody(createInviteBodySchema), familyController.createInvite);

// Get family invites (admin only)
router.get('/:familyId/invites', familyController.getFamilyInvites);

// Join family with invite code (now creates join request)
router.post('/join', validateBody(joinFamilySchema), familyController.requestToJoinFamily);

// Get family join requests (admin only)
router.get('/:familyId/join-requests', familyController.getFamilyJoinRequests);

// Respond to join request (admin only)
router.post('/join-requests/:requestId/respond', validateBody(respondToJoinRequestSchema), familyController.respondToJoinRequest);

// Cancel user's own join request
router.delete('/join-requests/:requestId', familyController.cancelJoinRequest);

// Get family stats (admin only)
router.get('/:familyId/stats', familyController.getFamilyStats);

// Create virtual member (admin only)
router.post('/:familyId/virtual-members', validateBody(CreateVirtualMemberSchema), familyController.createVirtualMember);

// Update virtual member (admin only)
router.put('/:familyId/virtual-members/:userId', validateBody(UpdateVirtualMemberSchema), familyController.updateVirtualMember);

export default router; 