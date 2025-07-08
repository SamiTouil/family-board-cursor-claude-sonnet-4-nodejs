import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { i18next } from '../config/i18n';
import { AppError } from '../errors/AppError';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging (in production, use proper logging service)
  if (process.env['NODE_ENV'] !== 'production') {
    console.error('Error:', error);
  }

  // Handle AppError instances
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    });
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: i18next.t('errors.validationError'),
      errors: error.errors,
    });
    return;
  }

  // Handle Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta && error.meta['target'] as string[];
      const message = field?.includes('email') 
        ? i18next.t('errors.emailAlreadyExists')
        : 'Resource already exists';
      
      res.status(409).json({
        success: false,
        code: 'RESOURCE_ALREADY_EXISTS',
        message,
      });
      return;
    }
    
    if (error.code === 'P2025') {
      // Record not found
      res.status(404).json({
        success: false,
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found',
      });
      return;
    }
  }

  // Handle legacy string-based errors (to be removed after migration)
  const legacyErrorMap: Record<string, { status: number; code: string; message?: string }> = {
    'Email already exists': { status: 409, code: 'USER_ALREADY_EXISTS' },
    'Invalid credentials': { status: 401, code: 'INVALID_CREDENTIALS' },
    'User not found': { status: 404, code: 'USER_NOT_FOUND' },
    'Family not found': { status: 404, code: 'FAMILY_NOT_FOUND' },
    'Not a family member': { status: 403, code: 'NOT_FAMILY_MEMBER' },
    'Not a family admin': { status: 403, code: 'NOT_FAMILY_ADMIN' },
  };

  const legacyError = legacyErrorMap[error.message];
  if (legacyError) {
    res.status(legacyError.status).json({
      success: false,
      code: legacyError.code,
      message: legacyError.message || error.message,
    });
    return;
  }

  // Default server error
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: i18next.t('errors.internalServerError'),
    ...(process.env['NODE_ENV'] !== 'production' && { stack: error.stack }),
  });
} 