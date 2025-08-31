import { Router } from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController';
import { validateRequest, commonSchemas } from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', getNotifications);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', 
  validateRequest({ params: { id: commonSchemas.userId.extract('id') } }), 
  markNotificationAsRead
);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', 
  validateRequest({ params: { id: commonSchemas.userId.extract('id') } }), 
  deleteNotification
);

export default router;