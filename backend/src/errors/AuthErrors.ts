import { AppError, ErrorCode } from './AppError';

export class TokenExpiredError extends AppError {
  constructor() {
    super(ErrorCode.TOKEN_EXPIRED, 'Token has expired', 401);
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super(ErrorCode.TOKEN_INVALID, 'Invalid token', 401);
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class TokenRequiredError extends AppError {
  constructor() {
    super(ErrorCode.TOKEN_REQUIRED, 'Authentication token required', 401);
    Object.setPrototypeOf(this, TokenRequiredError.prototype);
  }
}

export class TokenRevokedError extends AppError {
  constructor() {
    super(ErrorCode.TOKEN_REVOKED, 'Token has been revoked', 401);
    Object.setPrototypeOf(this, TokenRevokedError.prototype);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}