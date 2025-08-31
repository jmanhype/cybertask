import { Router } from 'express';
import { getDashboardStats, getRecentActivity } from '../controllers/dashboardController';

const router = Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private
 */
router.get('/stats', getDashboardStats);

/**
 * @route   GET /api/dashboard/activity
 * @desc    Get recent activity for dashboard
 * @access  Private
 */
router.get('/activity', getRecentActivity);

export default router;