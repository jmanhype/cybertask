import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

/**
 * Check if user has access to project
 */
const checkProjectAccess = async (projectId: string, userId: string, requireOwnership = false) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      owner: { select: { id: true, email: true } },
      members: { select: { userId: true } },
    },
  });

  if (!project) {
    throw new AppError('Project not found or access denied', 404, 'PROJECT_NOT_FOUND');
  }

  const isOwner = project.ownerId === userId;
  
  if (requireOwnership && !isOwner) {
    throw new AppError('Only project owner can perform this action', 403, 'OWNER_REQUIRED');
  }

  return { project, isOwner };
};

/**
 * @desc    Create a new project
 * @route   POST /api/projects
 * @access  Private
 */
export const createProject = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description, status, priority, startDate, endDate, teamMembers } = req.body;

  const project = await prisma.project.create({
    data: {
      name,
      description,
      status,
      priority,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      ownerId: req.userId!,
      members: teamMembers ? {
        create: teamMembers.map((userId: string) => ({ userId }))
      } : undefined,
    },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  logger.info(`Project created: ${project.name} by ${req.user?.email}`);

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: { project },
  });
});

/**
 * @desc    Get all projects for the user
 * @route   GET /api/projects
 * @access  Private
 */
export const getAllProjects = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20, search, status, priority } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build where clause
  const where: any = {
    OR: [
      { ownerId: req.userId },
      { members: { some: { userId: req.userId } } },
    ],
  };

  if (search) {
    where.AND = [
      where.OR ? { OR: where.OR } : {},
      {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ],
      },
    ];
    delete where.OR;
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        _count: {
          select: { 
            tasks: true,
            members: true,
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({
    success: true,
    message: 'Projects retrieved successfully',
    data: {
      projects,
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
 * @desc    Get project by ID
 * @route   GET /api/projects/:projectId
 * @access  Private
 */
export const getProjectById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  
  const { project } = await checkProjectAccess(projectId, req.userId!);

  const projectWithDetails = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
      },
      tasks: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  res.json({
    success: true,
    message: 'Project retrieved successfully',
    data: { project: projectWithDetails },
  });
});

/**
 * @desc    Update project
 * @route   PUT /api/projects/:projectId
 * @access  Private (Owner/Admin)
 */
export const updateProject = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { name, description, status, priority, startDate, endDate, teamMembers } = req.body;

  // Check ownership or admin role
  const { isOwner } = await checkProjectAccess(projectId, req.userId!, req.user?.role !== 'ADMIN');

  const updateData: any = {
    name,
    description,
    status,
    priority,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  };

  // Handle team members update
  if (teamMembers) {
    updateData.members = {
      deleteMany: {},
      create: teamMembers.map((userId: string) => ({ userId })),
    };
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  logger.info(`Project updated: ${project.name} by ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Project updated successfully',
    data: { project },
  });
});

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:projectId
 * @access  Private (Owner/Admin)
 */
export const deleteProject = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;

  const { project } = await checkProjectAccess(projectId, req.userId!, req.user?.role !== 'ADMIN');

  // Check if project has tasks
  const taskCount = await prisma.task.count({
    where: { projectId },
  });

  if (taskCount > 0) {
    throw new AppError(
      'Cannot delete project with existing tasks. Please delete or move all tasks first.',
      400,
      'PROJECT_HAS_TASKS'
    );
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  logger.info(`Project deleted: ${project.name} by ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Project deleted successfully',
  });
});

/**
 * @desc    Get project members
 * @route   GET /api/projects/:projectId/members
 * @access  Private
 */
export const getProjectMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  
  await checkProjectAccess(projectId, req.userId!);

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          _count: {
            select: {
              assignedTasks: {
                where: { projectId },
              },
            },
          },
        },
      },
    },
  });

  res.json({
    success: true,
    message: 'Project members retrieved successfully',
    data: { members },
  });
});

/**
 * @desc    Add project member
 * @route   POST /api/projects/:projectId/members
 * @access  Private (Owner/Admin)
 */
export const addProjectMember = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { userId } = req.body;

  await checkProjectAccess(projectId, req.userId!, req.user?.role !== 'ADMIN');

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Check if already a member
  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (existingMember) {
    throw new AppError('User is already a project member', 400, 'ALREADY_MEMBER');
  }

  const member = await prisma.projectMember.create({
    data: { projectId, userId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
    },
  });

  logger.info(`User ${user.email} added to project ${projectId} by ${req.user?.email}`);

  res.status(201).json({
    success: true,
    message: 'Project member added successfully',
    data: { member },
  });
});

/**
 * @desc    Remove project member
 * @route   DELETE /api/projects/:projectId/members/:userId
 * @access  Private (Owner/Admin)
 */
export const removeProjectMember = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId, userId } = req.params;

  const { project } = await checkProjectAccess(projectId, req.userId!, req.user?.role !== 'ADMIN');

  // Cannot remove project owner
  if (project.ownerId === userId) {
    throw new AppError('Cannot remove project owner', 400, 'CANNOT_REMOVE_OWNER');
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    include: {
      user: { select: { email: true } },
    },
  });

  if (!member) {
    throw new AppError('User is not a project member', 400, 'NOT_A_MEMBER');
  }

  // Unassign tasks from this user in this project
  await prisma.task.updateMany({
    where: {
      projectId,
      assignedToId: userId,
    },
    data: {
      assignedToId: null,
    },
  });

  // Remove member
  await prisma.projectMember.delete({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  logger.info(`User ${member.user.email} removed from project ${projectId} by ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Project member removed successfully',
  });
});

/**
 * @desc    Get project tasks
 * @route   GET /api/projects/:projectId/tasks
 * @access  Private
 */
export const getProjectTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { page = 1, limit = 20, status, priority, assignedTo } = req.query;

  await checkProjectAccess(projectId, req.userId!);

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = { projectId };

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (assignedTo) {
    where.assignedToId = assignedTo;
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({
    success: true,
    message: 'Project tasks retrieved successfully',
    data: {
      tasks,
      pagination: {
        current: Number(page),
        pages: totalPages,
        total,
        limit: take,
      },
    },
  });
});