/**
 * Standard error codes and messages for consistent error handling across the application
 */

// HTTP status codes
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error types for categorization
export const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  CONFLICT: 'CONFLICT_ERROR',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

// Standard error messages with their corresponding HTTP status codes
export const ERROR_MESSAGES = {
  // Authentication errors (401)
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    type: ERROR_TYPES.AUTHENTICATION,
  },
  TOKEN_REQUIRED: {
    code: 'TOKEN_REQUIRED',
    message: 'Authentication token is required',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    type: ERROR_TYPES.AUTHENTICATION,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    type: ERROR_TYPES.AUTHENTICATION,
  },
  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    message: 'Invalid authentication token',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    type: ERROR_TYPES.AUTHENTICATION,
  },

  // Authorization errors (403)
  ACCESS_DENIED: {
    code: 'ACCESS_DENIED',
    message: 'Access denied',
    statusCode: HTTP_STATUS.FORBIDDEN,
    type: ERROR_TYPES.AUTHORIZATION,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Unauthorized access',
    statusCode: HTTP_STATUS.FORBIDDEN,
    type: ERROR_TYPES.AUTHORIZATION,
  },
  ADMIN_REQUIRED: {
    code: 'ADMIN_REQUIRED',
    message: 'Only family admins can perform this action',
    statusCode: HTTP_STATUS.FORBIDDEN,
    type: ERROR_TYPES.AUTHORIZATION,
  },
  FAMILY_MEMBER_REQUIRED: {
    code: 'FAMILY_MEMBER_REQUIRED',
    message: 'You are not a member of this family',
    statusCode: HTTP_STATUS.FORBIDDEN,
    type: ERROR_TYPES.AUTHORIZATION,
  },

  // Not found errors (404)
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  FAMILY_NOT_FOUND: {
    code: 'FAMILY_NOT_FOUND',
    message: 'Family not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  TASK_NOT_FOUND: {
    code: 'TASK_NOT_FOUND',
    message: 'Task not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  DAY_TEMPLATE_NOT_FOUND: {
    code: 'DAY_TEMPLATE_NOT_FOUND',
    message: 'Day template not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  WEEK_TEMPLATE_NOT_FOUND: {
    code: 'WEEK_TEMPLATE_NOT_FOUND',
    message: 'Week template not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  WEEK_OVERRIDE_NOT_FOUND: {
    code: 'WEEK_OVERRIDE_NOT_FOUND',
    message: 'Week override not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  JOIN_REQUEST_NOT_FOUND: {
    code: 'JOIN_REQUEST_NOT_FOUND',
    message: 'Join request not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  INVITE_NOT_FOUND: {
    code: 'INVITE_NOT_FOUND',
    message: 'Invalid invite code',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  TEMPLATE_ITEM_NOT_FOUND: {
    code: 'TEMPLATE_ITEM_NOT_FOUND',
    message: 'Template item not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  WEEK_TEMPLATE_DAY_NOT_FOUND: {
    code: 'WEEK_TEMPLATE_DAY_NOT_FOUND',
    message: 'Week template day not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  MEMBER_NOT_FOUND: {
    code: 'MEMBER_NOT_FOUND',
    message: 'Member not found',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },
  VIRTUAL_MEMBER_NOT_FOUND: {
    code: 'VIRTUAL_MEMBER_NOT_FOUND',
    message: 'Virtual member not found in this family',
    statusCode: HTTP_STATUS.NOT_FOUND,
    type: ERROR_TYPES.NOT_FOUND,
  },

  // Conflict errors (409)
  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Email already exists',
    statusCode: HTTP_STATUS.CONFLICT,
    type: ERROR_TYPES.CONFLICT,
  },
  TEMPLATE_NAME_EXISTS: {
    code: 'TEMPLATE_NAME_EXISTS',
    message: 'A template with this name already exists in this family',
    statusCode: HTTP_STATUS.CONFLICT,
    type: ERROR_TYPES.CONFLICT,
  },
  WEEK_TEMPLATE_NAME_EXISTS: {
    code: 'WEEK_TEMPLATE_NAME_EXISTS',
    message: 'A week template with this name already exists in this family',
    statusCode: HTTP_STATUS.CONFLICT,
    type: ERROR_TYPES.CONFLICT,
  },
  ALREADY_FAMILY_MEMBER: {
    code: 'ALREADY_FAMILY_MEMBER',
    message: 'User is already a member of this family',
    statusCode: HTTP_STATUS.CONFLICT,
    type: ERROR_TYPES.CONFLICT,
  },
  PENDING_JOIN_REQUEST: {
    code: 'PENDING_JOIN_REQUEST',
    message: 'You already have a pending join request for this family',
    statusCode: HTTP_STATUS.CONFLICT,
    type: ERROR_TYPES.CONFLICT,
  },
  TASK_ALREADY_ASSIGNED: {
    code: 'TASK_ALREADY_ASSIGNED',
    message: 'This task is already assigned to this member in the template',
    statusCode: HTTP_STATUS.CONFLICT,
    type: ERROR_TYPES.CONFLICT,
  },
  DAY_TEMPLATE_ASSIGNED: {
    code: 'DAY_TEMPLATE_ASSIGNED',
    message: 'Day already has a template assigned',
    statusCode: HTTP_STATUS.CONFLICT,
    type: ERROR_TYPES.CONFLICT,
  },

  // Business logic errors (400)
  INVALID_DATE_FORMAT: {
    code: 'INVALID_DATE_FORMAT',
    message: 'Invalid week start date format. Expected YYYY-MM-DD.',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.VALIDATION,
  },
  INVALID_WEEK_START: {
    code: 'INVALID_WEEK_START',
    message: 'Week start date must be a Monday.',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.VALIDATION,
  },
  INVITE_EXPIRED: {
    code: 'INVITE_EXPIRED',
    message: 'Invite has expired',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  INVITE_WRONG_USER: {
    code: 'INVITE_WRONG_USER',
    message: 'This invite is for a different user',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  JOIN_REQUEST_PROCESSED: {
    code: 'JOIN_REQUEST_PROCESSED',
    message: 'This join request has already been processed',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  CANNOT_REMOVE_CREATOR: {
    code: 'CANNOT_REMOVE_CREATOR',
    message: 'Cannot remove family creator',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  CANNOT_REMOVE_SELF: {
    code: 'CANNOT_REMOVE_SELF',
    message: 'Cannot remove yourself from the family',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  CREATOR_CANNOT_LEAVE: {
    code: 'CREATOR_CANNOT_LEAVE',
    message: 'Family creator cannot leave. Transfer ownership first.',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  VIRTUAL_USER_PASSWORD: {
    code: 'VIRTUAL_USER_PASSWORD',
    message: 'Virtual users cannot change passwords',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  NO_PASSWORD_SET: {
    code: 'NO_PASSWORD_SET',
    message: 'User has no password set',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  INCORRECT_PASSWORD: {
    code: 'INCORRECT_PASSWORD',
    message: 'Current password is incorrect',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  VIRTUAL_USER_LOGIN: {
    code: 'VIRTUAL_USER_LOGIN',
    message: 'Cannot login as virtual user',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  VIRTUAL_USER_UPDATE: {
    code: 'VIRTUAL_USER_UPDATE',
    message: 'Cannot update virtual user profile',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  INACTIVE_TEMPLATE: {
    code: 'INACTIVE_TEMPLATE',
    message: 'Cannot preview inactive template',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  ONLY_VIRTUAL_MEMBER_UPDATE: {
    code: 'ONLY_VIRTUAL_MEMBER_UPDATE',
    message: 'Only virtual members can be updated through this endpoint',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },
  ONLY_PENDING_CANCELLABLE: {
    code: 'ONLY_PENDING_CANCELLABLE',
    message: 'Only pending join requests can be cancelled',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.BUSINESS_LOGIC,
  },

  // Validation errors (400)
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation error',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    type: ERROR_TYPES.VALIDATION,
  },

  // CSRF errors (403)
  CSRF_TOKEN_REQUIRED: {
    code: 'CSRF_TOKEN_REQUIRED',
    message: 'CSRF token is required for this request',
    statusCode: HTTP_STATUS.FORBIDDEN,
    type: ERROR_TYPES.AUTHENTICATION,
  },
  CSRF_TOKEN_INVALID: {
    code: 'CSRF_TOKEN_INVALID',
    message: 'Invalid CSRF token',
    statusCode: HTTP_STATUS.FORBIDDEN,
    type: ERROR_TYPES.AUTHENTICATION,
  },

  // Internal server errors (500)
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    type: ERROR_TYPES.INTERNAL,
  },
} as const;

// Helper type for error message keys
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

// Helper function to create standardized error objects
export function createErrorInfo(key: ErrorMessageKey, customMessage?: string) {
  const errorInfo = ERROR_MESSAGES[key];
  return {
    ...errorInfo,
    message: customMessage || errorInfo.message,
  };
}