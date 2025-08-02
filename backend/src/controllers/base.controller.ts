import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Base controller class providing common functionality for all controllers
 */
export abstract class BaseController {
  /**
   * Send a successful response with data
   */
  protected sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      ...(message && { message }),
      data,
    });
  }

  /**
   * Send a successful response without data
   */
  protected sendSuccessMessage(res: Response, message: string, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      message,
    });
  }

  /**
   * Send an error response
   */
  protected sendError(res: Response, message: string, statusCode: number = 400): void {
    res.status(statusCode).json({
      success: false,
      message,
    });
  }

  /**
   * Send a validation error response
   */
  protected sendValidationError(res: Response, errors: z.ZodError['errors']): void {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  /**
   * Extract user ID from authenticated request
   */
  protected getUserId(req: AuthenticatedRequest): string {
    return req.user!.userId;
  }

  /**
   * Validate request parameters and return them if valid
   */
  protected validateParams(req: AuthenticatedRequest, requiredParams: string[]): { [key: string]: string } | null {
    const params: { [key: string]: string } = {};
    
    for (const param of requiredParams) {
      const value = req.params[param];
      if (!value) {
        return null;
      }
      params[param] = value;
    }
    
    return params;
  }

  /**
   * Get parameter value safely with type checking
   */
  protected getParam(req: AuthenticatedRequest, paramName: string): string | null {
    const value = req.params[paramName];
    return value || null;
  }

  /**
   * Handle async controller methods with automatic error handling
   */
  protected asyncHandler(
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>
  ) {
    return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        await handler(req, res);
      } catch (error) {
        console.error('Controller error:', error);
        
        if (error instanceof Error) {
          // Map specific error messages to appropriate status codes
          if (error.message.includes('Access denied') || error.message.includes('Forbidden') || error.message.includes('Request not found')) {
            this.sendError(res, error.message, 403);
          } else if (error.message.includes('Family not found') || error.message.includes('Task not found') || error.message.includes('User not found')) {
            this.sendError(res, error.message, 404);
          } else {
            this.sendError(res, error.message, 400);
          }
        } else {
          this.sendError(res, 'An unexpected error occurred', 500);
        }
      }
    };
  }
}