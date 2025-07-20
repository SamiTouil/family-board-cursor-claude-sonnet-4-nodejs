import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt.config';
import { UserService } from '../services/user.service';
import { i18next } from '../config/i18n';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    familyId?: string;
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
      getJwtSecret()
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

    // Get user's family membership
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        userId: decoded.userId
      }
    });

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      ...(familyMember?.familyId && { familyId: familyMember.familyId })
    };

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
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

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      getJwtSecret()
    ) as JWTPayload;

    // Get user's family membership
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        userId: decoded.userId
      }
    });

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      ...(familyMember?.familyId && { familyId: familyMember.familyId })
    };
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
} 