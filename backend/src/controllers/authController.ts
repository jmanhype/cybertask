import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { config } from '../config/environment';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, username, password, firstName, lastName } = req.body;

  // Check if user already exists by email
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUserByEmail) {
    throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
  }

  // Check if username is taken
  const existingUserByUsername = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });

  if (existingUserByUsername) {
    throw new AppError('Username is already taken', 409, 'USERNAME_EXISTS');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: 'USER', // Default role
      isActive: true,
      emailVerified: false, // Require email verification
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, rememberMe } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      password: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);

  // Store refresh token
  const expirationTime = rememberMe 
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: expirationTime,
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info(`User logged in: ${user.email}`);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: { user },
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (error) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Check if refresh token exists in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError('Refresh token expired or invalid', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(storedToken.user.id, storedToken.user.email);
  const newRefreshToken = generateRefreshToken(storedToken.user.id, storedToken.user.email);

  // Update refresh token in database
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: {
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  res.json({
    success: true,
    message: 'Tokens refreshed successfully',
    data: {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    },
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

  if (refreshToken) {
    // Remove refresh token from database
    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken as string,
        userId: req.userId,
      },
    });
  } else {
    // Remove all refresh tokens for the user (logout from all devices)
    await prisma.refreshToken.deleteMany({
      where: { userId: req.userId },
    });
  }

  logger.info(`User logged out: ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * @desc    Send password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
    return;
  }

  // Generate reset token (in production, send via email)
  const resetToken = Math.random().toString(36).substr(2, 15);
  const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetTokenExpiry,
    },
  });

  logger.info(`Password reset requested for: ${user.email}`);

  // In production, send email here
  // For now, just log the token (REMOVE IN PRODUCTION)
  if (config.NODE_ENV === 'development') {
    logger.info(`Reset token for ${user.email}: ${resetToken}`);
  }

  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent',
  });
});

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

  // Update user password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
      // Clear all refresh tokens to force re-login
    },
  });

  // Remove all refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id },
  });

  logger.info(`Password reset completed for: ${user.email}`);

  res.json({
    success: true,
    message: 'Password reset successful',
  });
});

/**
 * @desc    Verify email with token
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  // In a real implementation, you'd validate the token
  // For now, we'll just mark any user with this token as verified
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    throw new AppError('Invalid verification token', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
    },
  });

  logger.info(`Email verified for: ${user.email}`);

  res.json({
    success: true,
    message: 'Email verified successfully',
  });
});

/**
 * @desc    Resend email verification
 * @route   POST /api/auth/resend-verification
 * @access  Private
 */
export const resendVerification = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.emailVerified) {
    throw new AppError('Email already verified', 400, 'EMAIL_ALREADY_VERIFIED');
  }

  // Generate verification token
  const verificationToken = Math.random().toString(36).substr(2, 15);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { emailVerificationToken: verificationToken },
  });

  logger.info(`Verification email resent to: ${req.user.email}`);

  // In production, send email here
  if (config.NODE_ENV === 'development') {
    logger.info(`Verification token for ${req.user.email}: ${verificationToken}`);
  }

  res.json({
    success: true,
    message: 'Verification email sent',
  });
});