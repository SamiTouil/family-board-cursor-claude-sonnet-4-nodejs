import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/user.service';
import { i18next } from '../config/i18n';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: i18next.t('errors.tokenRequired'),
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env['JWT_SECRET'] || 'fallback-secret'
    ) as JWTPayload;

    // Verify user still exists
    const user = await UserService.getUserById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: i18next.t('errors.userNotFound'),
      });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: i18next.t('errors.tokenExpired'),
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: i18next.t('errors.invalidToken'),
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: i18next.t('errors.internalServerError'),
    });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env['JWT_SECRET'] || 'fallback-secret'
    ) as JWTPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
} 