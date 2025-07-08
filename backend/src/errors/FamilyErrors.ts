import { AppError, ErrorCode } from './AppError';

export class FamilyNotFoundError extends AppError {
  constructor() {
    super(ErrorCode.FAMILY_NOT_FOUND, 'Family not found', 404);
    Object.setPrototypeOf(this, FamilyNotFoundError.prototype);
  }
}

export class NotFamilyMemberError extends AppError {
  constructor() {
    super(ErrorCode.NOT_FAMILY_MEMBER, 'You are not a member of this family', 403);
    Object.setPrototypeOf(this, NotFamilyMemberError.prototype);
  }
}

export class NotFamilyAdminError extends AppError {
  constructor() {
    super(ErrorCode.NOT_FAMILY_ADMIN, 'You must be an admin to perform this action', 403);
    Object.setPrototypeOf(this, NotFamilyAdminError.prototype);
  }
}

export class AlreadyFamilyMemberError extends AppError {
  constructor() {
    super(ErrorCode.ALREADY_FAMILY_MEMBER, 'User is already a member of this family', 409);
    Object.setPrototypeOf(this, AlreadyFamilyMemberError.prototype);
  }
}

export class CannotLeaveAsCreatorError extends AppError {
  constructor() {
    super(ErrorCode.CANNOT_LEAVE_AS_CREATOR, 'Cannot leave family as creator. Delete the family instead.', 403);
    Object.setPrototypeOf(this, CannotLeaveAsCreatorError.prototype);
  }
}

export class CannotRemoveCreatorError extends AppError {
  constructor() {
    super(ErrorCode.CANNOT_REMOVE_CREATOR, 'Cannot remove the family creator', 403);
    Object.setPrototypeOf(this, CannotRemoveCreatorError.prototype);
  }
}

export class InviteNotFoundError extends AppError {
  constructor() {
    super(ErrorCode.INVITE_NOT_FOUND, 'Invite not found or invalid', 404);
    Object.setPrototypeOf(this, InviteNotFoundError.prototype);
  }
}

export class InviteExpiredError extends AppError {
  constructor() {
    super(ErrorCode.INVITE_EXPIRED, 'This invite has expired', 410);
    Object.setPrototypeOf(this, InviteExpiredError.prototype);
  }
}

export class InviteAlreadyUsedError extends AppError {
  constructor() {
    super(ErrorCode.INVITE_ALREADY_USED, 'This invite has already been used', 410);
    Object.setPrototypeOf(this, InviteAlreadyUsedError.prototype);
  }
}