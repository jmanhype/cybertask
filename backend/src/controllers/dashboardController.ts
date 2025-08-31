import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  // Get all projects the user has access to
  const userProjects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  const projectIds = userProjects.map(project => project.id);

  // Get task statistics in parallel
  const [
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    reviewTasks,
    overdueTasks,
    totalProjects
  ] = await Promise.all([
    // Total tasks
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
      },
    }),
    
    // Completed tasks
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        status: 'DONE',
      },
    }),
    
    // In progress tasks
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        status: 'IN_PROGRESS',
      },
    }),
    
    // Todo tasks
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        status: 'TODO',
      },
    }),
    
    // Review tasks
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        status: 'IN_REVIEW',
      },
    }),
    
    // Overdue tasks
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: new Date() },
        status: { not: 'DONE' },
      },
    }),
    
    // Total projects
    prisma.project.count({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    }),
  ]);

  // Calculate additional metrics
  const pendingTasks = todoTasks + reviewTasks;
  const totalActiveTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = {
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    totalProjects,
    pendingTasks,
    todoTasks,
    reviewTasks,
    totalActiveTasks,
    completionRate,
  };

  res.json({
    success: true,
    message: 'Dashboard statistics retrieved successfully',
    data: stats,
  });
});

/**
 * @desc    Get recent activity for dashboard
 * @route   GET /api/dashboard/activity
 * @access  Private
 */
export const getRecentActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { limit = 10 } = req.query;

  // Get recent tasks and projects the user has access to
  const [recentTasks, recentProjects] = await Promise.all([
    prisma.task.findMany({
      where: {
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      },
      take: Number(limit),
      orderBy: { updatedAt: 'desc' },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    
    prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    message: 'Recent activity retrieved successfully',
    data: {
      recentTasks: recentTasks.map(task => ({
        ...task,
        tags: task.tags ? JSON.parse(task.tags) : [],
      })),
      recentProjects,
    },
  });
});