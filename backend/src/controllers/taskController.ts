import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

/**
 * Check if user has access to task
 */
const checkTaskAccess = async (taskId: string, userId: string) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found or access denied', 404, 'TASK_NOT_FOUND');
  }

  return task;
};

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
export const createTask = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    title,
    description,
    status,
    priority,
    projectId,
    assignedTo,
    dueDate,
    estimatedHours,
    tags,
    dependencies,
  } = req.body;

  // Check if user has access to the project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: req.userId },
        { members: { some: { userId: req.userId } } },
      ],
    },
  });

  if (!project) {
    throw new AppError('Project not found or access denied', 404, 'PROJECT_NOT_FOUND');
  }

  // If assigning to someone, check if they're a project member
  if (assignedTo) {
    const isProjectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: assignedTo,
      },
    });

    const isOwner = project.ownerId === assignedTo;

    if (!isProjectMember && !isOwner) {
      throw new AppError('Assigned user is not a project member', 400, 'USER_NOT_PROJECT_MEMBER');
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status,
      priority,
      projectId,
      assignedToId: assignedTo,
      createdById: req.userId!,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours,
      tags: tags ? JSON.stringify(tags) : null,
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  // Add dependencies if provided
  if (dependencies && dependencies.length > 0) {
    await prisma.taskDependency.createMany({
      data: dependencies.map((depId: string) => ({
        taskId: task.id,
        dependsOnId: depId,
      })),
    });
  }

  logger.info(`Task created: ${task.title} by ${req.user?.email}`);

  // Emit real-time notification (if Socket.IO is available)
  const io = req.app.get('io');
  if (io) {
    io.to(`project:${projectId}`).emit('taskCreated', {
      task,
      createdBy: req.user,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: { task },
  });
});

/**
 * @desc    Get all tasks for the user
 * @route   GET /api/tasks
 * @access  Private
 */
export const getAllTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    priority,
    assignedTo,
    projectId,
    dueDate,
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build where clause
  const where: any = {
    project: {
      OR: [
        { ownerId: req.userId },
        { members: { some: { userId: req.userId } } },
      ],
    },
  };

  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (assignedTo) {
    if (assignedTo === 'me') {
      where.assignedToId = req.userId;
    } else if (assignedTo === 'unassigned') {
      where.assignedToId = null;
    } else {
      where.assignedToId = assignedTo;
    }
  }

  if (projectId) {
    where.projectId = projectId;
  }

  if (dueDate) {
    const date = new Date(dueDate as string);
    where.dueDate = {
      gte: new Date(date.setHours(0, 0, 0, 0)),
      lt: new Date(date.setHours(23, 59, 59, 999)),
    };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: {
            comments: true,
            dependencies: true,
            dependentTasks: true,
          },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({
    success: true,
    message: 'Tasks retrieved successfully',
    data: {
      tasks: tasks.map(task => ({
        ...task,
        tags: task.tags ? JSON.parse(task.tags) : [],
      })),
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
 * @desc    Get task by ID
 * @route   GET /api/tasks/:taskId
 * @access  Private
 */
export const getTaskById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  
  const task = await checkTaskAccess(taskId, req.userId!);

  // Get task with detailed information
  const detailedTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: { id: true, name: true, ownerId: true },
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      dependencies: {
        include: {
          dependsOn: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
      },
      dependentTasks: {
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
      },
    },
  });

  res.json({
    success: true,
    message: 'Task retrieved successfully',
    data: {
      task: {
        ...detailedTask,
        tags: detailedTask?.tags ? JSON.parse(detailedTask.tags) : [],
      },
    },
  });
});

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:taskId
 * @access  Private
 */
export const updateTask = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const {
    title,
    description,
    status,
    priority,
    assignedTo,
    dueDate,
    estimatedHours,
    actualHours,
    tags,
    dependencies,
  } = req.body;

  const existingTask = await checkTaskAccess(taskId, req.userId!);

  // If changing assignee, verify they're a project member
  if (assignedTo && assignedTo !== existingTask.assignedTo?.id) {
    const isProjectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: existingTask.projectId,
        userId: assignedTo,
      },
    });

    const isOwner = existingTask.project.ownerId === assignedTo;

    if (!isProjectMember && !isOwner) {
      throw new AppError('Assigned user is not a project member', 400, 'USER_NOT_PROJECT_MEMBER');
    }
  }

  const updateData: any = {
    title,
    description,
    status,
    priority,
    assignedToId: assignedTo,
    dueDate: dueDate ? new Date(dueDate) : null,
    estimatedHours,
    actualHours,
    tags: tags ? JSON.stringify(tags) : null,
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  // Handle dependencies update
  if (dependencies) {
    // Remove existing dependencies
    await prisma.taskDependency.deleteMany({
      where: { taskId },
    });

    // Add new dependencies
    if (dependencies.length > 0) {
      await prisma.taskDependency.createMany({
        data: dependencies.map((depId: string) => ({
          taskId,
          dependsOnId: depId,
        })),
      });
    }
  }

  logger.info(`Task updated: ${task.title} by ${req.user?.email}`);

  // Emit real-time notification
  const io = req.app.get('io');
  if (io) {
    io.to(`project:${task.projectId}`).emit('taskUpdated', {
      task,
      updatedBy: req.user,
    });
  }

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: {
      task: {
        ...task,
        tags: task.tags ? JSON.parse(task.tags) : [],
      },
    },
  });
});

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:taskId
 * @access  Private
 */
export const deleteTask = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;

  const task = await checkTaskAccess(taskId, req.userId!);

  // Check if task has dependencies (other tasks depend on this one)
  const dependentTasks = await prisma.taskDependency.findMany({
    where: { dependsOnId: taskId },
    include: {
      task: { select: { id: true, title: true } },
    },
  });

  if (dependentTasks.length > 0) {
    throw new AppError(
      `Cannot delete task. ${dependentTasks.length} other task(s) depend on this task.`,
      400,
      'TASK_HAS_DEPENDENCIES'
    );
  }

  // Delete task and related data in transaction
  await prisma.$transaction(async (tx) => {
    // Delete comments
    await tx.taskComment.deleteMany({ where: { taskId } });
    
    // Delete dependencies
    await tx.taskDependency.deleteMany({ where: { taskId } });
    
    // Delete task
    await tx.task.delete({ where: { id: taskId } });
  });

  logger.info(`Task deleted: ${task.title} by ${req.user?.email}`);

  // Emit real-time notification
  const io = req.app.get('io');
  if (io) {
    io.to(`project:${task.projectId}`).emit('taskDeleted', {
      taskId,
      deletedBy: req.user,
    });
  }

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
});

/**
 * @desc    Assign task to user
 * @route   POST /api/tasks/:taskId/assign
 * @access  Private
 */
export const assignTask = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { userId } = req.body;

  const task = await checkTaskAccess(taskId, req.userId!);

  // Check if user is a project member
  const isProjectMember = await prisma.projectMember.findFirst({
    where: {
      projectId: task.projectId,
      userId,
    },
  });

  const isOwner = task.project.ownerId === userId;

  if (!isProjectMember && !isOwner) {
    throw new AppError('User is not a project member', 400, 'USER_NOT_PROJECT_MEMBER');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { assignedToId: userId },
    include: {
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  logger.info(`Task assigned: ${task.title} to ${updatedTask.assignedTo?.email} by ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Task assigned successfully',
    data: { task: updatedTask },
  });
});

/**
 * @desc    Unassign task
 * @route   POST /api/tasks/:taskId/unassign
 * @access  Private
 */
export const unassignTask = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;

  const task = await checkTaskAccess(taskId, req.userId!);

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { assignedToId: null },
  });

  logger.info(`Task unassigned: ${task.title} by ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Task unassigned successfully',
    data: { task: updatedTask },
  });
});

/**
 * @desc    Archive task
 * @route   POST /api/tasks/:taskId/archive
 * @access  Private
 */
export const archiveTask = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;

  const task = await checkTaskAccess(taskId, req.userId!);

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { 
      status: 'DONE',
      archivedAt: new Date(),
    },
  });

  logger.info(`Task archived: ${task.title} by ${req.user?.email}`);

  res.json({
    success: true,
    message: 'Task archived successfully',
    data: { task: updatedTask },
  });
});

/**
 * @desc    Get task comments
 * @route   GET /api/tasks/:taskId/comments
 * @access  Private
 */
export const getTaskComments = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  await checkTaskAccess(taskId, req.userId!);

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [comments, total] = await Promise.all([
    prisma.taskComment.findMany({
      where: { taskId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.taskComment.count({ where: { taskId } }),
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({
    success: true,
    message: 'Task comments retrieved successfully',
    data: {
      comments,
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
 * @desc    Add task comment
 * @route   POST /api/tasks/:taskId/comments
 * @access  Private
 */
export const addTaskComment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { content } = req.body;

  await checkTaskAccess(taskId, req.userId!);

  const comment = await prisma.taskComment.create({
    data: {
      content,
      taskId,
      authorId: req.userId!,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  logger.info(`Comment added to task ${taskId} by ${req.user?.email}`);

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: { comment },
  });
});

/**
 * @desc    Get task dependencies
 * @route   GET /api/tasks/:taskId/dependencies
 * @access  Private
 */
export const getTaskDependencies = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;

  await checkTaskAccess(taskId, req.userId!);

  const dependencies = await prisma.taskDependency.findMany({
    where: { taskId },
    include: {
      dependsOn: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  res.json({
    success: true,
    message: 'Task dependencies retrieved successfully',
    data: { dependencies },
  });
});

/**
 * @desc    Add task dependency
 * @route   POST /api/tasks/:taskId/dependencies
 * @access  Private
 */
export const addTaskDependency = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { dependsOnId } = req.body;

  await checkTaskAccess(taskId, req.userId!);
  await checkTaskAccess(dependsOnId, req.userId!);

  // Check for circular dependencies
  const wouldCreateCycle = async (fromId: string, toId: string): Promise<boolean> => {
    const dependencies = await prisma.taskDependency.findMany({
      where: { taskId: toId },
      select: { dependsOnId: true },
    });

    for (const dep of dependencies) {
      if (dep.dependsOnId === fromId) {
        return true;
      }
      if (await wouldCreateCycle(fromId, dep.dependsOnId)) {
        return true;
      }
    }
    return false;
  };

  if (await wouldCreateCycle(taskId, dependsOnId)) {
    throw new AppError('Cannot create circular dependency', 400, 'CIRCULAR_DEPENDENCY');
  }

  // Check if dependency already exists
  const existing = await prisma.taskDependency.findUnique({
    where: {
      taskId_dependsOnId: { taskId, dependsOnId },
    },
  });

  if (existing) {
    throw new AppError('Dependency already exists', 400, 'DEPENDENCY_EXISTS');
  }

  const dependency = await prisma.taskDependency.create({
    data: { taskId, dependsOnId },
    include: {
      dependsOn: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Task dependency added successfully',
    data: { dependency },
  });
});

/**
 * @desc    Remove task dependency
 * @route   DELETE /api/tasks/:taskId/dependencies/:dependencyId
 * @access  Private
 */
export const removeTaskDependency = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId, dependencyId } = req.params;

  await checkTaskAccess(taskId, req.userId!);

  const dependency = await prisma.taskDependency.findUnique({
    where: {
      taskId_dependsOnId: { taskId, dependsOnId: dependencyId },
    },
  });

  if (!dependency) {
    throw new AppError('Dependency not found', 404, 'DEPENDENCY_NOT_FOUND');
  }

  await prisma.taskDependency.delete({
    where: {
      taskId_dependsOnId: { taskId, dependsOnId: dependencyId },
    },
  });

  res.json({
    success: true,
    message: 'Task dependency removed successfully',
  });
});