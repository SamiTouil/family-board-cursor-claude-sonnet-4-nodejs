import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { i18next } from '../config/i18n';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', error);

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: i18next.t('errors.validationError'),
      errors: error.errors,
    });
    return;
  }

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

  res.status(500).json({
    success: false,
    message: i18next.t('errors.internalServerError'),
  });
} 