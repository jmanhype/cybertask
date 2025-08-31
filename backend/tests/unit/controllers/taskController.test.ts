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
import { AuthenticatedRequest } from '../../../src/types';
import { AppError } from '../../../src/middleware/errorHandler';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  task: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
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
    findMany: jest.fn(),
    findUnique: jest.fn(),
    createMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  },
  taskComment: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('TaskController', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      userId: 'user-123',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
      body: {},
      params: {},
      query: {},
      app: {
        get: jest.fn(),
      } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock PrismaClient constructor
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
  });

  describe('createTask', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        priority: 'HIGH',
        projectId: 'project-123',
        assignedTo: 'user-456',
        dueDate: '2024-12-31T23:59:59Z',
        estimatedHours: 8,
        tags: ['backend', 'urgent'],
        dependencies: ['task-456'],
      };

      mockReq.body = taskData;

      const mockProject = {
        id: 'project-123',
        ownerId: 'user-123',
      };

      const mockProjectMember = {
        userId: 'user-456',
        projectId: 'project-123',
      };

      const mockCreatedTask = {
        id: 'task-123',
        ...taskData,
        projectId: 'project-123',
        assignedToId: 'user-456',
        createdById: 'user-123',
        project: { id: 'project-123', name: 'Test Project' },
        assignedTo: { id: 'user-456', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        createdBy: { id: 'user-123', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      };

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectMember.findFirst.mockResolvedValue(mockProjectMember);
      mockPrisma.task.create.mockResolvedValue(mockCreatedTask);
      mockPrisma.taskDependency.createMany.mockResolvedValue({ count: 1 });

      await createTask(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'project-123',
          OR: [
            { ownerId: 'user-123' },
            { members: { some: { userId: 'user-123' } } },
          ],
        },
      });

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          projectId: taskData.projectId,
          assignedToId: taskData.assignedTo,
          createdById: 'user-123',
          dueDate: new Date(taskData.dueDate),
          estimatedHours: taskData.estimatedHours,
          tags: JSON.stringify(taskData.tags),
        },
        include: expect.any(Object),
      });

      expect(mockPrisma.taskDependency.createMany).toHaveBeenCalledWith({
        data: [{ taskId: 'task-123', dependsOnId: 'task-456' }],
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task created successfully',
        data: { task: mockCreatedTask },
      });
    });

    it('should throw error if project not found', async () => {
      mockReq.body = {
        title: 'Test Task',
        projectId: 'nonexistent-project',
      };

      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        createTask(mockReq as AuthenticatedRequest, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockPrisma.project.findFirst).toHaveBeenCalled();
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('should throw error if assigned user is not project member', async () => {
      mockReq.body = {
        title: 'Test Task',
        projectId: 'project-123',
        assignedTo: 'user-456',
      };

      const mockProject = {
        id: 'project-123',
        ownerId: 'user-789',
      };

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        createTask(mockReq as AuthenticatedRequest, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockPrisma.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 'project-123',
          userId: 'user-456',
        },
      });
    });

    it('should create task without dependencies', async () => {
      const taskData = {
        title: 'Simple Task',
        description: 'Simple Description',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: 'project-123',
      };

      mockReq.body = taskData;

      const mockProject = {
        id: 'project-123',
        ownerId: 'user-123',
      };

      const mockCreatedTask = {
        id: 'task-123',
        ...taskData,
        createdById: 'user-123',
        project: { id: 'project-123', name: 'Test Project' },
        assignedTo: null,
        createdBy: { id: 'user-123', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      };

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.task.create.mockResolvedValue(mockCreatedTask);

      await createTask(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.task.create).toHaveBeenCalled();
      expect(mockPrisma.taskDependency.createMany).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should emit socket event when task created', async () => {
      const mockIo = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      mockReq.app!.get = jest.fn().mockReturnValue(mockIo);
      mockReq.body = {
        title: 'Socket Test Task',
        projectId: 'project-123',
      };

      const mockProject = {
        id: 'project-123',
        ownerId: 'user-123',
      };

      const mockCreatedTask = {
        id: 'task-123',
        projectId: 'project-123',
        title: 'Socket Test Task',
      };

      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.task.create.mockResolvedValue(mockCreatedTask);

      await createTask(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockReq.app!.get).toHaveBeenCalledWith('io');
      expect(mockIo.to).toHaveBeenCalledWith('project:project-123');
      expect(mockIo.emit).toHaveBeenCalledWith('taskCreated', {
        task: mockCreatedTask,
        createdBy: mockReq.user,
      });
    });
  });

  describe('getAllTasks', () => {
    it('should retrieve tasks with pagination', async () => {
      mockReq.query = {
        page: '2',
        limit: '10',
        search: 'test',
        status: 'TODO',
        priority: 'HIGH',
        assignedTo: 'me',
        projectId: 'project-123',
      };

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          tags: JSON.stringify(['tag1', 'tag2']),
          project: { id: 'project-123', name: 'Project 1' },
          assignedTo: { id: 'user-123', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
          createdBy: { id: 'user-456', firstName: 'Creator', lastName: 'User', email: 'creator@example.com' },
          _count: { comments: 3, dependencies: 1, dependentTasks: 2 },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);
      mockPrisma.task.count.mockResolvedValue(25);

      await getAllTasks(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          project: {
            OR: [
              { ownerId: 'user-123' },
              { members: { some: { userId: 'user-123' } } },
            ],
          },
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
          status: 'TODO',
          priority: 'HIGH',
          assignedToId: 'user-123',
          projectId: 'project-123',
        },
        skip: 10,
        take: 10,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        include: expect.any(Object),
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tasks retrieved successfully',
        data: {
          tasks: [
            {
              ...mockTasks[0],
              tags: ['tag1', 'tag2'],
            },
          ],
          pagination: {
            current: 2,
            pages: 3,
            total: 25,
            limit: 10,
          },
        },
      });
    });

    it('should handle unassigned filter', async () => {
      mockReq.query = { assignedTo: 'unassigned' };

      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await getAllTasks(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: null,
          }),
        })
      );
    });

    it('should handle date filter', async () => {
      const testDate = '2024-01-15';
      mockReq.query = { dueDate: testDate };

      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await getAllTasks(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: expect.any(Date),
              lt: expect.any(Date),
            },
          }),
        })
      );
    });
  });

  describe('getTaskById', () => {
    it('should retrieve task by ID with detailed information', async () => {
      mockReq.params = { taskId: 'task-123' };

      const mockTask = {
        id: 'task-123',
        title: 'Test Task',
        projectId: 'project-123',
        assignedTo: { id: 'user-456' },
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockDetailedTask = {
        id: 'task-123',
        title: 'Test Task',
        tags: JSON.stringify(['tag1']),
        project: { id: 'project-123', name: 'Test Project', ownerId: 'user-123' },
        assignedTo: { id: 'user-456', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'DEVELOPER' },
        createdBy: { id: 'user-123', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
        comments: [],
        dependencies: [],
        dependentTasks: [],
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.findUnique.mockResolvedValue(mockDetailedTask);

      await getTaskById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'task-123',
          project: {
            OR: [
              { ownerId: 'user-123' },
              { members: { some: { userId: 'user-123' } } },
            ],
          },
        },
        include: expect.any(Object),
      });

      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        include: expect.objectContaining({
          project: expect.any(Object),
          assignedTo: expect.any(Object),
          createdBy: expect.any(Object),
          comments: expect.any(Object),
          dependencies: expect.any(Object),
          dependentTasks: expect.any(Object),
        }),
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task retrieved successfully',
        data: {
          task: {
            ...mockDetailedTask,
            tags: ['tag1'],
          },
        },
      });
    });

    it('should throw error if task not found or access denied', async () => {
      mockReq.params = { taskId: 'nonexistent-task' };
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        getTaskById(mockReq as AuthenticatedRequest, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockPrisma.task.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      mockReq.params = { taskId: 'task-123' };
      mockReq.body = {
        title: 'Updated Task',
        description: 'Updated Description',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assignedTo: 'user-456',
        tags: ['updated'],
      };

      const mockExistingTask = {
        id: 'task-123',
        projectId: 'project-123',
        assignedTo: { id: 'user-789' },
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockProjectMember = {
        userId: 'user-456',
        projectId: 'project-123',
      };

      const mockUpdatedTask = {
        id: 'task-123',
        title: 'Updated Task',
        projectId: 'project-123',
        tags: JSON.stringify(['updated']),
        project: { id: 'project-123', name: 'Test Project' },
        assignedTo: { id: 'user-456', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        createdBy: { id: 'user-123', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockExistingTask);
      mockPrisma.projectMember.findFirst.mockResolvedValue(mockProjectMember);
      mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);

      await updateTask(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: {
          title: 'Updated Task',
          description: 'Updated Description',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          assignedToId: 'user-456',
          dueDate: null,
          estimatedHours: undefined,
          actualHours: undefined,
          tags: JSON.stringify(['updated']),
        },
        include: expect.any(Object),
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task updated successfully',
        data: {
          task: {
            ...mockUpdatedTask,
            tags: ['updated'],
          },
        },
      });
    });

    it('should update dependencies when provided', async () => {
      mockReq.params = { taskId: 'task-123' };
      mockReq.body = {
        title: 'Task with Dependencies',
        dependencies: ['task-456', 'task-789'],
      };

      const mockExistingTask = {
        id: 'task-123',
        projectId: 'project-123',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockUpdatedTask = {
        id: 'task-123',
        title: 'Task with Dependencies',
        projectId: 'project-123',
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockExistingTask);
      mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);
      mockPrisma.taskDependency.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.taskDependency.createMany.mockResolvedValue({ count: 2 });

      await updateTask(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.taskDependency.deleteMany).toHaveBeenCalledWith({
        where: { taskId: 'task-123' },
      });

      expect(mockPrisma.taskDependency.createMany).toHaveBeenCalledWith({
        data: [
          { taskId: 'task-123', dependsOnId: 'task-456' },
          { taskId: 'task-123', dependsOnId: 'task-789' },
        ],
      });
    });

    it('should throw error if assigned user is not project member', async () => {
      mockReq.params = { taskId: 'task-123' };
      mockReq.body = { assignedTo: 'user-456' };

      const mockExistingTask = {
        id: 'task-123',
        assignedTo: { id: 'user-789' },
        project: { id: 'project-123', ownerId: 'user-999' },
        projectId: 'project-123',
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockExistingTask);
      mockPrisma.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        updateTask(mockReq as AuthenticatedRequest, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      mockReq.params = { taskId: 'task-123' };

      const mockTask = {
        id: 'task-123',
        title: 'Task to Delete',
        projectId: 'project-123',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.taskDependency.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          taskComment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          taskDependency: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          task: { delete: jest.fn().mockResolvedValue(mockTask) },
        });
      });

      await deleteTask(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.taskDependency.findMany).toHaveBeenCalledWith({
        where: { dependsOnId: 'task-123' },
        include: {
          task: { select: { id: true, title: true } },
        },
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task deleted successfully',
      });
    });

    it('should throw error if task has dependent tasks', async () => {
      mockReq.params = { taskId: 'task-123' };

      const mockTask = {
        id: 'task-123',
        projectId: 'project-123',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockDependentTasks = [
        { task: { id: 'task-456', title: 'Dependent Task' } },
      ];

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.taskDependency.findMany.mockResolvedValue(mockDependentTasks);

      await expect(
        deleteTask(mockReq as AuthenticatedRequest, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('addTaskDependency', () => {
    it('should add task dependency successfully', async () => {
      mockReq.params = { taskId: 'task-123' };
      mockReq.body = { dependsOnId: 'task-456' };

      const mockTask1 = {
        id: 'task-123',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockTask2 = {
        id: 'task-456',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockDependency = {
        taskId: 'task-123',
        dependsOnId: 'task-456',
        dependsOn: {
          id: 'task-456',
          title: 'Dependency Task',
          status: 'TODO',
          priority: 'HIGH',
        },
      };

      mockPrisma.task.findFirst
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(mockTask2);
      mockPrisma.taskDependency.findMany.mockResolvedValue([]);
      mockPrisma.taskDependency.findUnique.mockResolvedValue(null);
      mockPrisma.taskDependency.create.mockResolvedValue(mockDependency);

      await addTaskDependency(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockPrisma.taskDependency.findUnique).toHaveBeenCalledWith({
        where: {
          taskId_dependsOnId: { taskId: 'task-123', dependsOnId: 'task-456' },
        },
      });

      expect(mockPrisma.taskDependency.create).toHaveBeenCalledWith({
        data: { taskId: 'task-123', dependsOnId: 'task-456' },
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

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task dependency added successfully',
        data: { dependency: mockDependency },
      });
    });

    it('should throw error for circular dependency', async () => {
      mockReq.params = { taskId: 'task-123' };
      mockReq.body = { dependsOnId: 'task-456' };

      const mockTask1 = {
        id: 'task-123',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockTask2 = {
        id: 'task-456',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      // Mock circular dependency
      mockPrisma.task.findFirst
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(mockTask2);
      mockPrisma.taskDependency.findMany.mockResolvedValue([
        { dependsOnId: 'task-123' }
      ]);

      await expect(
        addTaskDependency(mockReq as AuthenticatedRequest, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockPrisma.taskDependency.create).not.toHaveBeenCalled();
    });

    it('should throw error if dependency already exists', async () => {
      mockReq.params = { taskId: 'task-123' };
      mockReq.body = { dependsOnId: 'task-456' };

      const mockTask1 = {
        id: 'task-123',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockTask2 = {
        id: 'task-456',
        project: { id: 'project-123', ownerId: 'user-123' },
      };

      const mockExistingDependency = {
        taskId: 'task-123',
        dependsOnId: 'task-456',
      };

      mockPrisma.task.findFirst
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(mockTask2);
      mockPrisma.taskDependency.findMany.mockResolvedValue([]);
      mockPrisma.taskDependency.findUnique.mockResolvedValue(mockExistingDependency);

      await expect(
        addTaskDependency(mockReq as AuthenticatedRequest, mockRes as Response)
      ).rejects.toThrow(AppError);

      expect(mockPrisma.taskDependency.create).not.toHaveBeenCalled();
    });
  });
});