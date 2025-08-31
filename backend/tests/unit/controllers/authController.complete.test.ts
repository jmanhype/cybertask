import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification
} from '../../../src/controllers/authController';
import { AppError } from '../../../src/middleware/errorHandler';
import { logger } from '../../../src/config/logger';
import { AuthenticatedRequest } from '../../../src/types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../src/config/logger');
jest.mock('../../../src/middleware/auth');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
} as any;

// Mock the PrismaClient constructor
(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('AuthController', () => {
  let req: Partial<Request | AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    beforeEach(() => {
      req.body = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe',
      };
    });

    it('should register a new user successfully', async () => {
      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock password hashing
      mockBcrypt.hash.mockResolvedValue('hashedPassword');
      
      // Mock user creation
      const createdUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);
      
      // Mock token generation
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      
      // Mock the imported functions
      const authModule = require('../../../src/middleware/auth');
      authModule.generateAccessToken = jest.fn().mockReturnValue(mockAccessToken);
      authModule.generateRefreshToken = jest.fn().mockReturnValue(mockRefreshToken);
      
      // Mock refresh token creation
      mockPrisma.refreshToken.create.mockResolvedValue({
        token: mockRefreshToken,
        userId: 'user-1',
        expiresAt: new Date(),
      });

      await register(req as Request, res as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('TestPass123!', expect.any(Number));
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashedPassword',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          isActive: true,
          emailVerified: false,
        },
        select: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          user: createdUser,
          tokens: {
            accessToken: mockAccessToken,
            refreshToken: mockRefreshToken,
          },
        },
      });
    });

    it('should throw error if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(register(req as Request, res as Response)).rejects.toThrow(AppError);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(register(req as Request, res as Response)).rejects.toThrow();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      req.body = {
        email: 'test@example.com',
        password: 'TestPass123!',
        rememberMe: false,
      };
    });

    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      
      const authModule = require('../../../src/middleware/auth');
      authModule.generateAccessToken = jest.fn().mockReturnValue(mockAccessToken);
      authModule.generateRefreshToken = jest.fn().mockReturnValue(mockRefreshToken);
      
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      await login(req as Request, res as Response);

      expect(mockBcrypt.compare).toHaveBeenCalledWith('TestPass123!', 'hashedPassword');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: expect.objectContaining({
            id: 'user-1',
            email: 'test@example.com',
          }),
          tokens: {
            accessToken: mockAccessToken,
            refreshToken: mockRefreshToken,
          },
        },
      });
    });

    it('should throw error for invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(login(req as Request, res as Response)).rejects.toThrow(AppError);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error for inactive account', async () => {
      const mockUser = {
        id: 'user-1',
        isActive: false,
        password: 'hashedPassword',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(login(req as Request, res as Response)).rejects.toThrow(AppError);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error for wrong password', async () => {
      const mockUser = {
        id: 'user-1',
        isActive: true,
        password: 'hashedPassword',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(login(req as Request, res as Response)).rejects.toThrow(AppError);
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      req.body = {
        refreshToken: 'valid-refresh-token',
      };
    });

    it('should refresh tokens successfully', async () => {
      const mockDecodedToken = { userId: 'user-1', email: 'test@example.com' };
      const mockStoredToken = {
        id: 'token-1',
        token: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      };

      const authModule = require('../../../src/middleware/auth');
      authModule.verifyRefreshToken = jest.fn().mockReturnValue(mockDecodedToken);
      authModule.generateAccessToken = jest.fn().mockReturnValue('new-access-token');
      authModule.generateRefreshToken = jest.fn().mockReturnValue('new-refresh-token');

      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrisma.refreshToken.update.mockResolvedValue({});

      await refreshToken(req as Request, res as Response);

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: {
          token: 'new-refresh-token',
          expiresAt: expect.any(Date),
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      });
    });

    it('should throw error for invalid refresh token', async () => {
      const authModule = require('../../../src/middleware/auth');
      authModule.verifyRefreshToken = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(refreshToken(req as Request, res as Response)).rejects.toThrow(AppError);
    });

    it('should throw error for expired refresh token', async () => {
      const mockDecodedToken = { userId: 'user-1', email: 'test@example.com' };
      const mockStoredToken = {
        token: 'valid-refresh-token',
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      };

      const authModule = require('../../../src/middleware/auth');
      authModule.verifyRefreshToken = jest.fn().mockReturnValue(mockDecodedToken);
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);

      await expect(refreshToken(req as Request, res as Response)).rejects.toThrow(AppError);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      req.body = { refreshToken: 'token-to-logout' };
      (req as AuthenticatedRequest).userId = 'user-1';
      (req as AuthenticatedRequest).user = {
        id: 'user-1',
        email: 'test@example.com',
      } as any;
    });

    it('should logout user with specific refresh token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await logout(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          token: 'token-to-logout',
          userId: 'user-1',
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should logout user from all devices when no refresh token provided', async () => {
      req.body = {};
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await logout(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('forgotPassword', () => {
    beforeEach(() => {
      req.body = { email: 'test@example.com' };
    });

    it('should send password reset for existing user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});

      await forgotPassword(req as Request, res as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          passwordResetToken: expect.any(String),
          passwordResetExpiry: expect.any(Date),
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    });

    it('should return success for non-existing user (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await forgotPassword(req as Request, res as Response);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      req.body = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      };
    });

    it('should reset password successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordResetToken: 'valid-reset-token',
        passwordResetExpiry: new Date(Date.now() + 900000), // 15 minutes from now
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockBcrypt.hash.mockResolvedValue('newHashedPassword');
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      await resetPassword(req as Request, res as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          password: 'newHashedPassword',
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successful',
      });
    });

    it('should throw error for invalid reset token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(resetPassword(req as Request, res as Response)).rejects.toThrow(AppError);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      req.body = { token: 'valid-verification-token' };
    });

    it('should verify email successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerificationToken: 'valid-verification-token',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});

      await verifyEmail(req as Request, res as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully',
      });
    });

    it('should throw error for invalid verification token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(verifyEmail(req as Request, res as Response)).rejects.toThrow(AppError);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    beforeEach(() => {
      (req as AuthenticatedRequest).user = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: false,
      } as any;
    });

    it('should resend verification email', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await resendVerification(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerificationToken: expect.any(String) },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Verification email sent',
      });
    });

    it('should throw error if email already verified', async () => {
      (req as AuthenticatedRequest).user!.emailVerified = true;

      await expect(resendVerification(req as AuthenticatedRequest, res as Response)).rejects.toThrow(AppError);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if user not authenticated', async () => {
      (req as AuthenticatedRequest).user = undefined;

      await expect(resendVerification(req as AuthenticatedRequest, res as Response)).rejects.toThrow(AppError);
    });
  });
});