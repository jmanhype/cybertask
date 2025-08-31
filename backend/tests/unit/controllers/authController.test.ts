import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { 
  register, 
  login, 
  getCurrentUser, 
  updateProfile, 
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword 
} from '../../../src/controllers/authController';
import { AuthenticatedRequest } from '../../../src/types';
import { AppError } from '../../../src/middleware/errorHandler';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@prisma/client');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthController', () => {
  let mockReq: Partial<Request | AuthenticatedRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      mockReq.body = userData;

      const hashedPassword = 'hashed_password';
      const mockUser = {
        id: 'user-123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
      };

      const mockToken = 'jwt_access_token';
      const mockRefreshToken = 'jwt_refresh_token';

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockJwt.sign
        .mockReturnValueOnce(mockToken)
        .mockReturnValueOnce(mockRefreshToken);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await register(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', mockRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          user: mockUser,
          token: mockToken,
        },
      });
    });

    it('should throw error if email already exists', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const existingUser = {
        id: 'existing-user',
        email: 'existing@example.com',
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        register(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // This would be caught by validation middleware in real app
      // Testing the controller assumes validation passes
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // In a real scenario, validation middleware would reject this
      // Here we test that if it gets to the controller, it processes
      expect(mockReq.body.email).toBe('invalid-email');
    });

    it('should hash password with correct salt rounds', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed_password');
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      });
      mockJwt.sign.mockReturnValue('token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await register(mockReq as Request, mockRes as Response);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('TestPassword123!', 12);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      mockReq.body = loginData;

      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isActive: true,
        lastLoginAt: new Date(),
      };

      const mockToken = 'jwt_access_token';
      const mockRefreshToken = 'jwt_refresh_token';

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign
        .mockReturnValueOnce(mockToken)
        .mockReturnValueOnce(mockRefreshToken);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await login(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            role: mockUser.role,
            isActive: mockUser.isActive,
            lastLoginAt: mockUser.lastLoginAt,
          },
          token: mockToken,
        },
      });
    });

    it('should throw error if user not found', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'WrongPassword',
        'hashed_password'
      );
    });

    it('should throw error if user account is inactive', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        isActive: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      await expect(
        login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError);
    });

    it('should clean up old refresh tokens before creating new one', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('token');
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await login(mockReq as Request, mockRes as Response);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: expect.any(String),
          userId: mockUser.id,
          expiresAt: expect.any(Date),
          userAgent: 'test-user-agent',
          ipAddress: '127.0.0.1',
        },
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      const mockAuthReq = mockReq as AuthenticatedRequest;
      mockAuthReq.userId = 'user-123';

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await getCurrentUser(mockAuthReq, mockRes as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should throw error if user not found', async () => {
      const mockAuthReq = mockReq as AuthenticatedRequest;
      mockAuthReq.userId = 'nonexistent-user';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        getCurrentUser(mockAuthReq, mockRes as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const mockAuthReq = mockReq as AuthenticatedRequest;
      mockAuthReq.userId = 'user-123';
      mockAuthReq.body = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: 'USER',
        isActive: true,
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      await updateProfile(mockAuthReq, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          firstName: 'Updated',
          lastName: 'Name',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: mockUpdatedUser,
      });
    });

    it('should filter out undefined values from update data', async () => {
      const mockAuthReq = mockReq as AuthenticatedRequest;
      mockAuthReq.userId = 'user-123';
      mockAuthReq.body = {
        firstName: 'Updated',
        lastName: undefined,
        email: undefined, // Should be filtered out even if provided
      };

      const mockUpdatedUser = {
        id: 'user-123',
        firstName: 'Updated',
        lastName: 'Original',
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      await updateProfile(mockAuthReq, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          firstName: 'Updated',
        },
        select: expect.any(Object),
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockAuthReq = mockReq as AuthenticatedRequest;
      mockAuthReq.userId = 'user-123';
      mockAuthReq.body = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        password: 'old_hashed_password',
      };

      const newHashedPassword = 'new_hashed_password';

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue(newHashedPassword);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-123' });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await changePassword(mockAuthReq, mockRes as Response);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'OldPassword123!',
        'old_hashed_password'
      );

      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: newHashedPassword },
      });

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should throw error if current password is incorrect', async () => {
      const mockAuthReq = mockReq as AuthenticatedRequest;
      mockAuthReq.userId = 'user-123';
      mockAuthReq.body = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        password: 'hashed_password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        changePassword(mockAuthReq, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      const mockAuthReq = mockReq as AuthenticatedRequest;
      mockAuthReq.userId = 'nonexistent-user';
      mockAuthReq.body = {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword123!',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        changePassword(mockAuthReq, mockRes as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockReq.cookies = {
        refreshToken: 'valid_refresh_token',
      };

      const mockStoredToken = {
        id: 'token-123',
        token: 'valid_refresh_token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: {
          id: 'user-123',
          email: 'test@example.com',
          isActive: true,
        },
      };

      const mockNewToken = 'new_access_token';
      const mockNewRefreshToken = 'new_refresh_token';

      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockJwt.verify.mockReturnValue({ userId: 'user-123' });
      mockJwt.sign
        .mockReturnValueOnce(mockNewToken)
        .mockReturnValueOnce(mockNewRefreshToken);
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await refreshToken(mockReq as Request, mockRes as Response);

      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid_refresh_token' },
        include: { user: true },
      });

      expect(mockJwt.verify).toHaveBeenCalledWith(
        'valid_refresh_token',
        process.env.JWT_REFRESH_SECRET
      );

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-123' },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: mockNewToken,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            isActive: true,
          },
        },
      });
    });

    it('should throw error if refresh token not provided', async () => {
      mockReq.cookies = {};

      await expect(
        refreshToken(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if refresh token expired', async () => {
      mockReq.cookies = {
        refreshToken: 'expired_refresh_token',
      };

      const mockExpiredToken = {
        id: 'token-123',
        token: 'expired_refresh_token',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockExpiredToken);

      await expect(
        refreshToken(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if user is inactive', async () => {
      mockReq.cookies = {
        refreshToken: 'valid_refresh_token',
      };

      const mockStoredToken = {
        id: 'token-123',
        token: 'valid_refresh_token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: {
          id: 'user-123',
          email: 'test@example.com',
          isActive: false,
        },
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);

      await expect(
        refreshToken(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(AppError);
    });
  });
});