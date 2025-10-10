import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  deleteUser,
} from '../controllers/userController';
import { validateRequest, userSchemas, commonSchemas } from '../middleware/validation';
import { requireAdmin, requireManager } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', validateRequest({ body: userSchemas.updateProfile }), updateProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', validateRequest({ body: userSchemas.changePassword }), changePassword);

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin/Manager only)
 * @access  Private (Admin/Manager)
 */
router.get('/', requireManager, getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Admin/Manager only)
 * @access  Private (Admin/Manager)
 */
router.get('/:id', requireManager, validateRequest({ params: commonSchemas.userId }), getUserById);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', requireAdmin, validateRequest({ params: commonSchemas.userId }), deleteUser);

export default router;