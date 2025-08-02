import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Validation middleware for request bodies
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      // Replace body with validated data
      (req as any).body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Validation middleware for query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      // Store validated query params in a custom property
      (req as any).validatedQuery = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Query validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Validation middleware for route parameters
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      // Store validated params in a custom property
      (req as any).validatedParams = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Parameter validation error',
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};