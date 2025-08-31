import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config, jwtConfig } from '../config/environment';
import { logger } from '../config/logger';
import { AuthenticatedRequest, JWTPayload } from '../types';

const prisma = new PrismaClient();

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and attaches user to request
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN',
      });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as JWTPayload;
      
      // Fetch user from database to ensure they still exist
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
        },
      });
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        });
        return;
      }
      
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Account is deactivated',
          error: 'ACCOUNT_DEACTIVATED',
        });
        return;
      }
      
      // Attach user to request
      req.user = user;
      req.userId = user.id;
      
      next();
    } catch (jwtError: any) {
      logger.warn('JWT verification failed:', {
        error: jwtError.message,
        token: token.substring(0, 20) + '...',
        ip: req.ip,
      });
      
      let errorMessage = 'Invalid token';
      let errorCode = 'INVALID_TOKEN';
      
      if (jwtError.name === 'TokenExpiredError') {
        errorMessage = 'Token expired';
        errorCode = 'TOKEN_EXPIRED';
      } else if (jwtError.name === 'JsonWebTokenError') {
        errorMessage = 'Malformed token';
        errorCode = 'MALFORMED_TOKEN';
      }
      
      res.status(401).json({
        success: false,
        message: errorMessage,
        error: errorCode,
      });
      return;
    }
  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional Auth Middleware
 * Validates JWT tokens but doesn't fail if no token is provided
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without user
    next();
    return;
  }
  
  // Token provided, validate it
  await authMiddleware(req, res, next);
};

/**
 * Role-based Authorization Middleware Factory
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }
    
    next();
  };
};

/**
 * Admin Role Middleware
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Manager Role Middleware (Admin + Manager)
 */
export const requireManager = requireRole(['ADMIN', 'MANAGER']);

/**
 * Verified Email Middleware
 */
export const requireVerifiedEmail = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED',
    });
    return;
  }
  
  if (!req.user.emailVerified) {
    res.status(403).json({
      success: false,
      message: 'Email verification required',
      error: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }
  
  next();
};

/**
 * Generate JWT Access Token
 */
export const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'access' },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: jwtConfig.algorithm,
    }
  );
};

/**
 * Generate JWT Refresh Token
 */
export const generateRefreshToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'refresh' },
    jwtConfig.refreshSecret,
    {
      expiresIn: jwtConfig.refreshExpiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: jwtConfig.algorithm,
    }
  );
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, jwtConfig.refreshSecret, {
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  }) as JWTPayload;
};