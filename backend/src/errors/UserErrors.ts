import { AppError, ErrorCode } from './AppError';

export class UserNotFoundError extends AppError {
  constructor() {
    super(ErrorCode.USER_NOT_FOUND, 'User not found', 404);
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

export class UserAlreadyExistsError extends AppError {
  constructor() {
    super(ErrorCode.USER_ALREADY_EXISTS, 'User with this email already exists', 409);
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype);
  }
}

export class VirtualUserLoginError extends AppError {
  constructor() {
    super(ErrorCode.VIRTUAL_USER_LOGIN, 'Cannot login as virtual user', 403);
    Object.setPrototypeOf(this, VirtualUserLoginError.prototype);
  }
}