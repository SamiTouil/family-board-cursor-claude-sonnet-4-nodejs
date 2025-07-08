export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REQUIRED = 'TOKEN_REQUIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  VIRTUAL_USER_LOGIN = 'VIRTUAL_USER_LOGIN',
  
  // Family errors
  FAMILY_NOT_FOUND = 'FAMILY_NOT_FOUND',
  NOT_FAMILY_MEMBER = 'NOT_FAMILY_MEMBER',
  NOT_FAMILY_ADMIN = 'NOT_FAMILY_ADMIN',
  ALREADY_FAMILY_MEMBER = 'ALREADY_FAMILY_MEMBER',
  CANNOT_LEAVE_AS_CREATOR = 'CANNOT_LEAVE_AS_CREATOR',
  CANNOT_REMOVE_CREATOR = 'CANNOT_REMOVE_CREATOR',
  
  // Invite errors
  INVITE_NOT_FOUND = 'INVITE_NOT_FOUND',
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  INVITE_ALREADY_USED = 'INVITE_ALREADY_USED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  
  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    isOperational = true,
    details?: any
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Common error factories
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, message, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(ErrorCode.PERMISSION_DENIED, message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`, 404, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.RESOURCE_ALREADY_EXISTS, message, 409, true);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(ErrorCode.INTERNAL_SERVER_ERROR, message, 500, false, details);
  }
}