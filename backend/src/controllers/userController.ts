import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { config } from '../config/environment';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      bio: true,
      phone: true,
      timezone: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          ownedProjects: true,
          assignedTasks: true,
          projectMemberships: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: { user },
  });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { firstName, lastName, bio, phone, timezone } = req.body;

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      firstName,
      lastName,
      bio,
      phone,
      timezone,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      bio: true,
      phone: true,
      timezone: true,
      role: true,
      updatedAt: true,
    },
  });

  logger.info(`User profile updated: ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
});

/**
 * @desc    Change user password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, password: true },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword },
  });

  // Remove all refresh tokens to force re-login
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id },
  });

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  });
});

/**
 * @desc    Get all users (Admin/Manager only)
 * @route   GET /api/users
 * @access  Private (Admin/Manager)
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20, search, role, isActive } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build where clause
  const where: any = {};
  
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  
  if (role) {
    where.role = role;
  }
  
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            ownedProjects: true,
            assignedTasks: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({
    success: true,
    message: 'Users retrieved successfully',
    data: {
      users,
      pagination: {
        current: Number(page),
        pages: totalPages,
        total,
        limit: take,
      },
    },
  });
});

/**
 * @desc    Get user by ID (Admin/Manager only)
 * @route   GET /api/users/:id
 * @access  Private (Admin/Manager)
 */
export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      bio: true,
      phone: true,
      timezone: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      ownedProjects: {
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
      },
      assignedTasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          ownedProjects: true,
          assignedTasks: true,
          projectMemberships: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'User retrieved successfully',
    data: { user },
  });
});

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent deletion of admin users by non-super-admin
  if (user.role === 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    throw new AppError('Cannot delete admin users', 403, 'INSUFFICIENT_PERMISSIONS');
  }

  // Prevent users from deleting themselves
  if (user.id === req.userId) {
    throw new AppError('Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
  }

  // Start transaction to handle related data
  await prisma.$transaction(async (tx) => {
    // Remove user from project memberships
    await tx.projectMember.deleteMany({
      where: { userId: id },
    });

    // Unassign tasks from user
    await tx.task.updateMany({
      where: { assignedToId: id },
      data: { assignedToId: null },
    });

    // Transfer project ownership to current user (admin)
    await tx.project.updateMany({
      where: { ownerId: id },
      data: { ownerId: req.userId },
    });

    // Delete refresh tokens
    await tx.refreshToken.deleteMany({
      where: { userId: id },
    });

    // Delete user
    await tx.user.delete({
      where: { id },
    });
  });

  logger.info(`User deleted: ${user.email} (deleted by: ${req.user?.email})`);

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});