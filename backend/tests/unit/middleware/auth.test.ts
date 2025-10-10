import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireAdmin,
  requireManager,
  requireVerifiedEmail,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../../src/middleware/auth';
import { AuthenticatedRequest } from '../../../src/types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('jsonwebtoken');
jest.mock('../../../src/config/logger');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
} as any;

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate user with valid token', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecodedToken = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'access',
      };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        emailVerified: true,
      };

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String), {
        issuer: expect.any(String),
        audience: expect.any(String),
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
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
      expect(req.user).toEqual(mockUser);
      expect(req.userId).toBe('user-1');
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no authorization header', async () => {
      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      req.headers!.authorization = 'InvalidFormat token';

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN',
      });
    });

    it('should return 401 if user not found', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecodedToken = { userId: 'user-1', email: 'test@example.com' };

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user is inactive', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecodedToken = { userId: 'user-1', email: 'test@example.com' };
      const mockUser = {
        id: 'user-1',
        isActive: false,
        emailVerified: true,
      };

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is deactivated',
        error: 'ACCOUNT_DEACTIVATED',
      });
    });

    it('should return 401 for expired token', async () => {
      const mockToken = 'expired-jwt-token';
      const mockError = new Error('Token expired');
      mockError.name = 'TokenExpiredError';

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockJwt.verify.mockImplementation(() => {
        throw mockError;
      });

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED',
      });
    });

    it('should return 401 for malformed token', async () => {
      const mockToken = 'malformed-jwt-token';
      const mockError = new Error('Malformed token');
      mockError.name = 'JsonWebTokenError';

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockJwt.verify.mockImplementation(() => {
        throw mockError;
      });

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Malformed token',
        error: 'MALFORMED_TOKEN',
      });
    });

    it('should return 500 for unexpected errors', async () => {
      req.headers!.authorization = 'Bearer valid-token';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed',
        error: 'AUTH_ERROR',
      });
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should continue without user if no token provided', async () => {
      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should validate token if provided', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecodedToken = { userId: 'user-1', email: 'test@example.com' };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        isActive: true,
        emailVerified: true,
      };

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockJwt.verify.mockReturnValue(mockDecodedToken as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      } as any;
    });

    it('should allow access for user with required role', () => {
      const middleware = requireRole('USER');
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for user with one of multiple required roles', () => {
      req.user!.role = 'ADMIN';
      const middleware = requireRole(['ADMIN', 'MANAGER']);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for user without required role', () => {
      const middleware = requireRole('ADMIN');
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: ['ADMIN'],
        current: 'USER',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      req.user = undefined;
      const middleware = requireRole('USER');
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', () => {
      req.user = { role: 'ADMIN' } as any;
      requireAdmin(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-admin user', () => {
      req.user = { role: 'USER' } as any;
      requireAdmin(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireManager', () => {
    it('should allow access for manager user', () => {
      req.user = { role: 'MANAGER' } as any;
      requireManager(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for admin user', () => {
      req.user = { role: 'ADMIN' } as any;
      requireManager(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for regular user', () => {
      req.user = { role: 'USER' } as any;
      requireManager(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireVerifiedEmail', () => {
    it('should allow access for user with verified email', () => {
      req.user = { emailVerified: true } as any;
      requireVerifiedEmail(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for user with unverified email', () => {
      req.user = { emailVerified: false } as any;
      requireVerifiedEmail(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email verification required',
        error: 'EMAIL_NOT_VERIFIED',
      });
    });

    it('should deny access for unauthenticated user', () => {
      req.user = undefined;
      requireVerifiedEmail(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    });
  });

  describe('JWT Token Functions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('generateAccessToken', () => {
      it('should generate access token with correct payload', () => {
        const mockToken = 'generated-access-token';
        mockJwt.sign.mockReturnValue(mockToken);

        const token = generateAccessToken('user-1', 'test@example.com');

        expect(jwt.sign).toHaveBeenCalledWith(
          { userId: 'user-1', email: 'test@example.com', type: 'access' },
          expect.any(String),
          {
            expiresIn: expect.any(String),
            issuer: expect.any(String),
            audience: expect.any(String),
            algorithm: expect.any(String),
          }
        );
        expect(token).toBe(mockToken);
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate refresh token with correct payload', () => {
        const mockToken = 'generated-refresh-token';
        mockJwt.sign.mockReturnValue(mockToken);

        const token = generateRefreshToken('user-1', 'test@example.com');

        expect(jwt.sign).toHaveBeenCalledWith(
          { userId: 'user-1', email: 'test@example.com', type: 'refresh' },
          expect.any(String),
          {
            expiresIn: expect.any(String),
            issuer: expect.any(String),
            audience: expect.any(String),
            algorithm: expect.any(String),
          }
        );
        expect(token).toBe(mockToken);
      });
    });

    describe('verifyRefreshToken', () => {
      it('should verify refresh token successfully', () => {
        const mockPayload = {
          userId: 'user-1',
          email: 'test@example.com',
          type: 'refresh',
        };
        mockJwt.verify.mockReturnValue(mockPayload as any);

        const payload = verifyRefreshToken('valid-refresh-token');

        expect(jwt.verify).toHaveBeenCalledWith(
          'valid-refresh-token',
          expect.any(String),
          {
            issuer: expect.any(String),
            audience: expect.any(String),
          }
        );
        expect(payload).toEqual(mockPayload);
      });

      it('should throw error for invalid refresh token', () => {
        mockJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        expect(() => verifyRefreshToken('invalid-token')).toThrow();
      });
    });
  });
});