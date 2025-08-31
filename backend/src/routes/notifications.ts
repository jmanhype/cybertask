import { Router } from 'express';
import Joi from 'joi';
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
  validateRequest({ params: Joi.object({ id: Joi.string().required() }) }), 
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
  validateRequest({ params: Joi.object({ id: Joi.string().required() }) }), 
  deleteNotification
);

export default router;