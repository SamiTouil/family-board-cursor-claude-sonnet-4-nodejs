import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { i18next } from '../config/i18n';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: i18next.t('errors.validationError'),
      errors: error.errors,
    });
    return;
  }

  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      res.status(409).json({
        success: false,
        message: i18next.t('errors.emailAlreadyExists'),
      });
      return;
    }
  }

  // Handle custom application errors
  if (error.message === 'Email already exists') {
    res.status(409).json({
      success: false,
      message: i18next.t('errors.emailAlreadyExists'),
    });
    return;
  }

  if (error.message === 'Invalid credentials') {
    res.status(401).json({
      success: false,
      message: i18next.t('errors.invalidCredentials'),
    });
    return;
  }

  if (error.message === 'User not found') {
    res.status(404).json({
      success: false,
      message: i18next.t('errors.userNotFound'),
    });
    return;
  }

  // Default server error
  res.status(500).json({
    success: false,
    message: i18next.t('errors.internalServerError'),
  });
} 