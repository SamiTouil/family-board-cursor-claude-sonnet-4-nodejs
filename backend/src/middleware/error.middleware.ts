import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { i18next } from '../config/i18n';
import { AppError } from '../utils/errors';
import { app as appConfig } from '../config';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: i18next.t('errors.validationError'),
      errors: error.errors,
    });
    return;
  }

  // Handle Prisma errors
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

  // Handle custom AppError instances
  if (error instanceof AppError) {
    const i18nKey = getI18nKeyFromErrorCode(error.code);
    const message = i18nKey ? i18next.t(i18nKey) : error.message;
    
    res.status(error.statusCode).json({
      success: false,
      message,
      code: error.code,
      type: error.type,
      // Include error details in development
      ...(appConfig.isDevelopment && {
        stack: error.stack
      })
    });
    return;
  }

  // Legacy error handling for backwards compatibility (will be removed as we migrate)
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
  console.error('Unhandled error:', error);
  console.error('Error stack:', error.stack);
  res.status(500).json({
    success: false,
    message: i18next.t('errors.internalServerError'),
    // Include error details in development
    ...(appConfig.isDevelopment && {
      error: error.message,
      stack: error.stack
    })
  });
}

/**
 * Map error codes to i18n keys
 */
function getI18nKeyFromErrorCode(code?: string): string | null {
  if (!code) return null;
  
  const codeToI18nMap: Record<string, string> = {
    'INVALID_CREDENTIALS': 'errors.invalidCredentials',
    'TOKEN_REQUIRED': 'errors.tokenRequired',
    'TOKEN_EXPIRED': 'errors.tokenExpired',
    'TOKEN_INVALID': 'errors.invalidToken',
    'ACCESS_DENIED': 'errors.accessDenied',
    'UNAUTHORIZED': 'errors.unauthorized',
    'ADMIN_REQUIRED': 'errors.adminRequired',
    'FAMILY_MEMBER_REQUIRED': 'errors.familyMemberRequired',
    'USER_NOT_FOUND': 'errors.userNotFound',
    'FAMILY_NOT_FOUND': 'errors.familyNotFound',
    'TASK_NOT_FOUND': 'errors.taskNotFound',
    'DAY_TEMPLATE_NOT_FOUND': 'errors.dayTemplateNotFound',
    'WEEK_TEMPLATE_NOT_FOUND': 'errors.weekTemplateNotFound',
    'WEEK_OVERRIDE_NOT_FOUND': 'errors.weekOverrideNotFound',
    'JOIN_REQUEST_NOT_FOUND': 'errors.joinRequestNotFound',
    'INVITE_NOT_FOUND': 'errors.inviteNotFound',
    'TEMPLATE_ITEM_NOT_FOUND': 'errors.templateItemNotFound',
    'WEEK_TEMPLATE_DAY_NOT_FOUND': 'errors.weekTemplateDayNotFound',
    'MEMBER_NOT_FOUND': 'errors.memberNotFound',
    'VIRTUAL_MEMBER_NOT_FOUND': 'errors.virtualMemberNotFound',
    'EMAIL_ALREADY_EXISTS': 'errors.emailAlreadyExists',
    'TEMPLATE_NAME_EXISTS': 'errors.templateNameExists',
    'WEEK_TEMPLATE_NAME_EXISTS': 'errors.weekTemplateNameExists',
    'ALREADY_FAMILY_MEMBER': 'errors.alreadyFamilyMember',
    'PENDING_JOIN_REQUEST': 'errors.pendingJoinRequest',
    'TASK_ALREADY_ASSIGNED': 'errors.taskAlreadyAssigned',
    'DAY_TEMPLATE_ASSIGNED': 'errors.dayTemplateAssigned',
    'INVALID_DATE_FORMAT': 'errors.invalidDateFormat',
    'INVALID_WEEK_START': 'errors.invalidWeekStart',
    'INVITE_EXPIRED': 'errors.inviteExpired',
    'INVITE_WRONG_USER': 'errors.inviteWrongUser',
    'JOIN_REQUEST_PROCESSED': 'errors.joinRequestProcessed',
    'CANNOT_REMOVE_CREATOR': 'errors.cannotRemoveCreator',
    'CANNOT_REMOVE_SELF': 'errors.cannotRemoveSelf',
    'CREATOR_CANNOT_LEAVE': 'errors.creatorCannotLeave',
    'VIRTUAL_USER_PASSWORD': 'errors.virtualUserPassword',
    'NO_PASSWORD_SET': 'errors.noPasswordSet',
    'INCORRECT_PASSWORD': 'errors.incorrectPassword',
    'VIRTUAL_USER_LOGIN': 'errors.virtualUserLogin',
    'VIRTUAL_USER_UPDATE': 'errors.virtualUserUpdate',
    'INACTIVE_TEMPLATE': 'errors.inactiveTemplate',
    'ONLY_VIRTUAL_MEMBER_UPDATE': 'errors.onlyVirtualMemberUpdate',
    'ONLY_PENDING_CANCELLABLE': 'errors.onlyPendingCancellable',
    'VALIDATION_ERROR': 'errors.validationError',
    'CSRF_TOKEN_REQUIRED': 'errors.csrfTokenRequired',
    'CSRF_TOKEN_INVALID': 'errors.csrfTokenInvalid',
    'INTERNAL_SERVER_ERROR': 'errors.internalServerError',
  };
  
  return codeToI18nMap[code] || null;
} 