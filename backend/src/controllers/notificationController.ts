import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20, unread } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = { userId: req.userId };
  
  if (unread === 'true') {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
        data: true,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ 
      where: { userId: req.userId, isRead: false } 
    }),
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications: notifications.map(notification => ({
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : null,
      })),
      pagination: {
        current: Number(page),
        pages: totalPages,
        total,
        limit: take,
      },
      unreadCount,
    },
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: req.userId,
    },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  const updatedNotification = await prisma.notification.update({
    where: { id },
    data: { 
      isRead: true,
      readAt: new Date(),
    },
  });

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: { notification: updatedNotification },
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await prisma.notification.updateMany({
    where: {
      userId: req.userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  logger.info(`Marked ${result.count} notifications as read for user ${req.user?.email}`);

  res.json({
    success: true,
    message: `${result.count} notifications marked as read`,
    data: { count: result.count },
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: req.userId,
    },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  await prisma.notification.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Notification deleted successfully',
  });
});

/**
 * Utility function to create notifications
 */
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  data,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}) => {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
      isRead: false,
    },
  });
};