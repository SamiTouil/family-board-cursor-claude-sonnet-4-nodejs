import { ErrorMessageKey, createErrorInfo } from './error-constants';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public type?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    type?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (code !== undefined) this.code = code;
    if (type !== undefined) this.type = type;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create an AppError from a predefined error constant
   */
  static fromErrorKey(key: ErrorMessageKey, customMessage?: string): AppError {
    const errorInfo = createErrorInfo(key, customMessage);
    return new AppError(
      errorInfo.message,
      errorInfo.statusCode,
      true,
      errorInfo.code,
      errorInfo.type
    );
  }

  /**
   * Create a validation error
   */
  static validation(message: string): AppError {
    return AppError.fromErrorKey('VALIDATION_ERROR', message);
  }

  /**
   * Create an authentication error
   */
  static unauthorized(message?: string): AppError {
    return AppError.fromErrorKey('UNAUTHORIZED', message);
  }

  /**
   * Create a not found error
   */
  static notFound(message?: string): AppError {
    return AppError.fromErrorKey('USER_NOT_FOUND', message);
  }

  /**
   * Create a conflict error
   */
  static conflict(message?: string): AppError {
    return AppError.fromErrorKey('EMAIL_ALREADY_EXISTS', message);
  }

  /**
   * Create an access denied error
   */
  static forbidden(message?: string): AppError {
    return AppError.fromErrorKey('ACCESS_DENIED', message);
  }
}