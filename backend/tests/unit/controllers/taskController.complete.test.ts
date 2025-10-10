import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  archiveTask,
  getTaskComments,
  addTaskComment,
  getTaskDependencies,
  addTaskDependency,
  removeTaskDependency
} from '../../../src/controllers/taskController';
import { AppError } from '../../../src/middleware/errorHandler';
import { AuthenticatedRequest } from '../../../src/types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../src/config/logger');

const mockPrisma = {
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
  },
  projectMember: {
    findFirst: jest.fn(),
  },
  taskDependency: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  taskComment: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);

describe('TaskController', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      get: jest.fn().mockReturnValue({
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      }),
    };

    req = {
      userId: 'user-1',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      } as any,
      body: {},
      params: {},
      query: {},
      app: mockApp,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('createTask', () => {
    beforeEach(() => {
      req.body = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: 'project-1',
        assignedTo: 'user-2',
        dueDate: '2024-12-31',
        estimatedHours: 8,
        tags: ['frontend', 'bug'],
      };
    });

    it('should create task successfully', async () => {
      const mockProject = {
        id: 'project-1',
        ownerId: 'user-1',
        name: 'Test Project',
      };

      const mockProjectMember = {
        projectId: 'project-1',
        userId: 'user-2',
      };

      const mockCreatedTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: 'project-1',
        assignedToId: 'user-2',
        createdById: 'user-1',
        dueDate: new Date('2024-12-31'),
        estimatedHours: 8,
        tags: JSON.stringify(['frontend', 'bug']),
        project: { id: 'project-1', name: 'Test Project' },
        assignedTo: { id: 'user-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        createdBy: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      };

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectMember.findFirst.mockResolvedValue(mockProjectMember);
      mockPrisma.task.create.mockResolvedValue(mockCreatedTask);

      await createTask(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'project-1',
          OR: [
            { ownerId: 'user-1' },
            { members: { some: { userId: 'user-1' } } },
          ],
        },
      });

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Task',
          description: 'Test Description',
          status: 'TODO',
          priority: 'MEDIUM',
          projectId: 'project-1',
          assignedToId: 'user-2',
          createdById: 'user-1',
          dueDate: new Date('2024-12-31'),
          estimatedHours: 8,
          tags: JSON.stringify(['frontend', 'bug']),
        },
        include: expect.any(Object),
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task created successfully',
        data: { task: mockCreatedTask },
      });
    });

    it('should throw error if project not found', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(createTask(req as AuthenticatedRequest, res as Response)).rejects.toThrow(
        new AppError('Project not found or access denied', 404, 'PROJECT_NOT_FOUND')
      );
    });

    it('should throw error if assigned user is not project member', async () => {
      const mockProject = {
        id: 'project-1',
        ownerId: 'user-1',
        name: 'Test Project',
      };

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectMember.findFirst.mockResolvedValue(null);

      req.body.assignedTo = 'user-3'; // Not project owner or member

      await expect(createTask(req as AuthenticatedRequest, res as Response)).rejects.toThrow(
        new AppError('Assigned user is not a project member', 400, 'USER_NOT_PROJECT_MEMBER')
      );
    });

    it('should create task with dependencies', async () => {
      const mockProject = {
        id: 'project-1',
        ownerId: 'user-1',
      };

      const mockCreatedTask = {
        id: 'task-1',
        title: 'Test Task',
        projectId: 'project-1',
      };

      req.body.dependencies = ['dep-task-1', 'dep-task-2'];

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.task.create.mockResolvedValue(mockCreatedTask);
      mockPrisma.taskDependency.createMany.mockResolvedValue({ count: 2 });

      await createTask(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.taskDependency.createMany).toHaveBeenCalledWith({
        data: [
          { taskId: 'task-1', dependsOnId: 'dep-task-1' },
          { taskId: 'task-1', dependsOnId: 'dep-task-2' },
        ],
      });
    });

    it('should emit real-time notification', async () => {
      const mockProject = { id: 'project-1', ownerId: 'user-1' };
      const mockTask = { id: 'task-1', projectId: 'project-1' };

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.task.create.mockResolvedValue(mockTask);

      await createTask(req as AuthenticatedRequest, res as Response);

      const mockIo = mockApp.get();
      expect(mockIo.to).toHaveBeenCalledWith('project:project-1');
      expect(mockIo.emit).toHaveBeenCalledWith('taskCreated', {
        task: mockTask,
        createdBy: req.user,
      });
    });
  });

  describe('getAllTasks', () => {
    it('should get all tasks with pagination', async () => {
      req.query = {
        page: '1',
        limit: '10',
        search: 'test',
        status: 'TODO',
        priority: 'HIGH',
        assignedTo: 'me',
        projectId: 'project-1',
      };

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task 1',
          tags: JSON.stringify(['tag1']),
          project: { id: 'project-1', name: 'Project 1' },
          assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          createdBy: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          _count: { comments: 2, dependencies: 1, dependentTasks: 0 },
        },
        {
          id: 'task-2',
          title: 'Test Task 2',
          tags: null,
          project: { id: 'project-1', name: 'Project 1' },
          assignedTo: null,
          createdBy: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          _count: { comments: 0, dependencies: 0, dependentTasks: 1 },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);
      mockPrisma.task.count.mockResolvedValue(2);

      await getAllTasks(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          project: {
            OR: [
              { ownerId: 'user-1' },
              { members: { some: { userId: 'user-1' } } },
            ],
          },
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
          status: 'TODO',
          priority: 'HIGH',
          assignedToId: 'user-1',
          projectId: 'project-1',
        },
        skip: 0,
        take: 10,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        include: expect.any(Object),
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tasks retrieved successfully',
        data: {
          tasks: [
            {
              ...mockTasks[0],
              tags: ['tag1'],
            },
            {
              ...mockTasks[1],
              tags: [],
            },
          ],
          pagination: {
            current: 1,
            pages: 1,
            total: 2,
            limit: 10,
          },
        },
      });
    });

    it('should filter tasks by unassigned', async () => {
      req.query = { assignedTo: 'unassigned' };

      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await getAllTasks(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: null,
          }),
        })
      );
    });

    it('should filter tasks by due date', async () => {
      const dueDate = '2024-12-31';
      req.query = { dueDate };

      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await getAllTasks(req as AuthenticatedRequest, res as Response);

      const expectedDate = new Date(dueDate);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: new Date(expectedDate.setHours(0, 0, 0, 0)),
              lt: new Date(expectedDate.setHours(23, 59, 59, 999)),
            },
          }),
        })
      );
    });
  });

  describe('getTaskById', () => {
    beforeEach(() => {
      req.params = { taskId: 'task-1' };
    });

    it('should get task by ID successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        tags: JSON.stringify(['tag1', 'tag2']),
        project: { id: 'project-1', name: 'Project 1', ownerId: 'user-1' },
        assignedTo: { id: 'user-2', firstName: 'Jane', lastName: 'Smith' },
        createdBy: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        comments: [
          {
            id: 'comment-1',
            content: 'Test comment',
            author: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          },
        ],
        dependencies: [
          {
            dependsOn: {
              id: 'dep-task-1',
              title: 'Dependency Task',
              status: 'DONE',
              priority: 'HIGH',
            },
          },
        ],
        dependentTasks: [],
      };

      // Mock checkTaskAccess
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      await getTaskById(req as AuthenticatedRequest, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task retrieved successfully',
        data: {
          task: {
            ...mockTask,
            tags: ['tag1', 'tag2'],
          },
        },
      });
    });

    it('should throw error if task not found or access denied', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(getTaskById(req as AuthenticatedRequest, res as Response)).rejects.toThrow(
        new AppError('Task not found or access denied', 404, 'TASK_NOT_FOUND')
      );
    });
  });

  describe('updateTask', () => {
    beforeEach(() => {
      req.params = { taskId: 'task-1' };
      req.body = {
        title: 'Updated Task',
        description: 'Updated Description',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignedTo: 'user-3',
        dueDate: '2024-12-31',
        estimatedHours: 10,
        actualHours: 5,
        tags: ['updated-tag'],
        dependencies: ['new-dep-1', 'new-dep-2'],
      };
    });

    it('should update task successfully', async () => {
      const mockExistingTask = {
        id: 'task-1',
        projectId: 'project-1',
        assignedTo: { id: 'user-2' },
        project: { ownerId: 'user-1' },
      };

      const mockProjectMember = {
        projectId: 'project-1',
        userId: 'user-3',
      };

      const mockUpdatedTask = {
        id: 'task-1',
        title: 'Updated Task',
        tags: JSON.stringify(['updated-tag']),
        projectId: 'project-1',
        project: { id: 'project-1', name: 'Project 1' },
        assignedTo: { id: 'user-3', firstName: 'Alice', lastName: 'Johnson' },
        createdBy: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockExistingTask);
      mockPrisma.projectMember.findFirst.mockResolvedValue(mockProjectMember);
      mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);
      mockPrisma.taskDependency.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.taskDependency.createMany.mockResolvedValue({ count: 2 });

      await updateTask(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: {
          title: 'Updated Task',
          description: 'Updated Description',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignedToId: 'user-3',
          dueDate: new Date('2024-12-31'),
          estimatedHours: 10,
          actualHours: 5,
          tags: JSON.stringify(['updated-tag']),
        },
        include: expect.any(Object),
      });

      expect(mockPrisma.taskDependency.deleteMany).toHaveBeenCalledWith({
        where: { taskId: 'task-1' },
      });

      expect(mockPrisma.taskDependency.createMany).toHaveBeenCalledWith({
        data: [
          { taskId: 'task-1', dependsOnId: 'new-dep-1' },
          { taskId: 'task-1', dependsOnId: 'new-dep-2' },
        ],
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task updated successfully',
        data: {
          task: {
            ...mockUpdatedTask,
            tags: ['updated-tag'],
          },
        },
      });
    });

    it('should throw error if assigned user is not project member', async () => {
      const mockExistingTask = {
        id: 'task-1',
        projectId: 'project-1',
        assignedTo: { id: 'user-2' },
        project: { ownerId: 'user-1' },
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockExistingTask);
      mockPrisma.projectMember.findFirst.mockResolvedValue(null);

      await expect(updateTask(req as AuthenticatedRequest, res as Response)).rejects.toThrow(
        new AppError('Assigned user is not a project member', 400, 'USER_NOT_PROJECT_MEMBER')
      );
    });
  });

  describe('deleteTask', () => {
    beforeEach(() => {
      req.params = { taskId: 'task-1' };
    });

    it('should delete task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Task to Delete',
        projectId: 'project-1',
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.taskDependency.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      await deleteTask(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task deleted successfully',
      });
    });

    it('should throw error if task has dependent tasks', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Task with Dependencies',
      };

      const mockDependentTasks = [
        {
          task: { id: 'dependent-task-1', title: 'Dependent Task 1' },
        },
        {
          task: { id: 'dependent-task-2', title: 'Dependent Task 2' },
        },
      ];

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.taskDependency.findMany.mockResolvedValue(mockDependentTasks);

      await expect(deleteTask(req as AuthenticatedRequest, res as Response)).rejects.toThrow(
        new AppError(
          'Cannot delete task. 2 other task(s) depend on this task.',
          400,
          'TASK_HAS_DEPENDENCIES'
        )
      );
    });
  });

  describe('assignTask', () => {
    beforeEach(() => {
      req.params = { taskId: 'task-1' };
      req.body = { userId: 'user-2' };
    });

    it('should assign task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Task to Assign',
        projectId: 'project-1',
        project: { ownerId: 'user-1' },
      };

      const mockProjectMember = {
        projectId: 'project-1',
        userId: 'user-2',
      };

      const mockUpdatedTask = {
        id: 'task-1',
        assignedTo: { id: 'user-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.projectMember.findFirst.mockResolvedValue(mockProjectMember);
      mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);

      await assignTask(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { assignedToId: 'user-2' },
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task assigned successfully',
        data: { task: mockUpdatedTask },
      });
    });

    it('should assign task to project owner', async () => {
      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { ownerId: 'user-2' },
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.projectMember.findFirst.mockResolvedValue(null); // Not a member
      mockPrisma.task.update.mockResolvedValue({ id: 'task-1' });

      await assignTask(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.task.update).toHaveBeenCalled();
    });

    it('should throw error if user is not project member or owner', async () => {
      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { ownerId: 'user-1' },
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.projectMember.findFirst.mockResolvedValue(null);

      await expect(assignTask(req as AuthenticatedRequest, res as Response)).rejects.toThrow(
        new AppError('User is not a project member', 400, 'USER_NOT_PROJECT_MEMBER')
      );
    });
  });

  describe('addTaskComment', () => {
    beforeEach(() => {
      req.params = { taskId: 'task-1' };
      req.body = { content: 'This is a test comment' };
    });

    it('should add task comment successfully', async () => {
      const mockTask = { id: 'task-1', projectId: 'project-1' };
      const mockComment = {
        id: 'comment-1',
        content: 'This is a test comment',
        taskId: 'task-1',
        authorId: 'user-1',
        author: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.taskComment.create.mockResolvedValue(mockComment);

      await addTaskComment(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.taskComment.create).toHaveBeenCalledWith({
        data: {
          content: 'This is a test comment',
          taskId: 'task-1',
          authorId: 'user-1',
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Comment added successfully',
        data: { comment: mockComment },
      });
    });
  });

  describe('addTaskDependency', () => {
    beforeEach(() => {
      req.params = { taskId: 'task-1' };
      req.body = { dependsOnId: 'task-2' };
    });

    it('should add task dependency successfully', async () => {
      const mockTask1 = { id: 'task-1', projectId: 'project-1' };
      const mockTask2 = { id: 'task-2', projectId: 'project-1' };
      const mockDependency = {
        taskId: 'task-1',
        dependsOnId: 'task-2',
        dependsOn: {
          id: 'task-2',
          title: 'Dependency Task',
          status: 'TODO',
          priority: 'MEDIUM',
        },
      };

      mockPrisma.task.findFirst
        .mockResolvedValueOnce(mockTask1) // First call for task-1
        .mockResolvedValueOnce(mockTask2); // Second call for task-2
      mockPrisma.taskDependency.findMany.mockResolvedValue([]); // No circular dependencies
      mockPrisma.taskDependency.findUnique.mockResolvedValue(null); // Dependency doesn't exist
      mockPrisma.taskDependency.create.mockResolvedValue(mockDependency);

      await addTaskDependency(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.taskDependency.create).toHaveBeenCalledWith({
        data: { taskId: 'task-1', dependsOnId: 'task-2' },
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

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task dependency added successfully',
        data: { dependency: mockDependency },
      });
    });

    it('should throw error if dependency already exists', async () => {
      const mockTask = { id: 'task-1' };
      const mockExistingDependency = { taskId: 'task-1', dependsOnId: 'task-2' };

      mockPrisma.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask);
      mockPrisma.taskDependency.findMany.mockResolvedValue([]);
      mockPrisma.taskDependency.findUnique.mockResolvedValue(mockExistingDependency);

      await expect(addTaskDependency(req as AuthenticatedRequest, res as Response)).rejects.toThrow(
        new AppError('Dependency already exists', 400, 'DEPENDENCY_EXISTS')
      );
    });

    it('should throw error for circular dependency', async () => {
      const mockTask = { id: 'task-1' };
      const mockCircularDependencies = [
        { dependsOnId: 'task-1' }, // This would create a circular dependency
      ];

      mockPrisma.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask);
      mockPrisma.taskDependency.findMany.mockResolvedValue(mockCircularDependencies);

      await expect(addTaskDependency(req as AuthenticatedRequest, res as Response)).rejects.toThrow(
        new AppError('Cannot create circular dependency', 400, 'CIRCULAR_DEPENDENCY')
      );
    });
  });

  describe('archiveTask', () => {
    beforeEach(() => {
      req.params = { taskId: 'task-1' };
    });

    it('should archive task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Task to Archive',
      };

      const mockUpdatedTask = {
        id: 'task-1',
        status: 'DONE',
        archivedAt: expect.any(Date),
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);

      await archiveTask(req as AuthenticatedRequest, res as Response);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: {
          status: 'DONE',
          archivedAt: expect.any(Date),
        },
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task archived successfully',
        data: { task: mockUpdatedTask },
      });
    });
  });
});