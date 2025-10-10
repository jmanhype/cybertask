import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../../src/server';

// Mock Prisma Client for integration tests
jest.mock('@prisma/client');

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  project: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  projectMember: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
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
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);

describe('API Integration Tests', () => {
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let projectId: string;
  let taskId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default user context
    userId = 'test-user-id';
    accessToken = 'mock-access-token';
    refreshToken = 'mock-refresh-token';
    projectId = 'test-project-id';
    taskId = 'test-task-id';

    // Mock JWT verify to always return our test user
    const jwt = require('jsonwebtoken');
    jwt.verify = jest.fn().mockReturnValue({
      userId,
      email: 'test@example.com',
      type: 'access',
    });
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          email: 'newuser@example.com',
          password: 'TestPass123!',
          firstName: 'John',
          lastName: 'Doe',
        };

        const hashedPassword = 'hashed-password';
        const createdUser = {
          id: 'new-user-id',
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
        };

        // Mock bcrypt
        const bcryptModule = require('bcryptjs');
        bcryptModule.hash = jest.fn().mockResolvedValue(hashedPassword);

        // Mock database operations
        mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
        mockPrisma.user.create.mockResolvedValue(createdUser);
        mockPrisma.refreshToken.create.mockResolvedValue({
          token: refreshToken,
          userId: createdUser.id,
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: 'User registered successfully',
          data: {
            user: expect.objectContaining({
              email: 'newuser@example.com',
              firstName: 'John',
              lastName: 'Doe',
            }),
            tokens: {
              accessToken: expect.any(String),
              refreshToken: expect.any(String),
            },
          },
        });
      });

      it('should return 409 if user already exists', async () => {
        const userData = {
          email: 'existing@example.com',
          password: 'TestPass123!',
          firstName: 'John',
          lastName: 'Doe',
        };

        mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(409);

        expect(response.body).toMatchObject({
          success: false,
          error: 'USER_EXISTS',
        });
      });

      it('should return 400 for invalid email', async () => {
        const userData = {
          email: 'invalid-email',
          password: 'TestPass123!',
          firstName: 'John',
          lastName: 'Doe',
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should return 400 for weak password', async () => {
        const userData = {
          email: 'test@example.com',
          password: '123', // Too weak
          firstName: 'John',
          lastName: 'Doe',
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login user successfully', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'TestPass123!',
          rememberMe: false,
        };

        const user = {
          id: userId,
          email: 'test@example.com',
          password: 'hashed-password',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          isActive: true,
          emailVerified: true,
          createdAt: new Date(),
        };

        // Mock bcrypt
        const bcryptModule = require('bcryptjs');
        bcryptModule.compare = jest.fn().mockResolvedValue(true);

        mockPrisma.user.findUnique.mockResolvedValue(user);
        mockPrisma.refreshToken.create.mockResolvedValue({});
        mockPrisma.user.update.mockResolvedValue({});

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Login successful',
          data: {
            user: expect.objectContaining({
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
            }),
            tokens: {
              accessToken: expect.any(String),
              refreshToken: expect.any(String),
            },
          },
        });

        // Password should not be in response
        expect(response.body.data.user.password).toBeUndefined();
      });

      it('should return 401 for invalid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'WrongPassword',
        };

        mockPrisma.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: 'INVALID_CREDENTIALS',
        });
      });

      it('should return 401 for inactive account', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'TestPass123!',
        };

        const user = {
          id: userId,
          email: 'test@example.com',
          isActive: false,
        };

        mockPrisma.user.findUnique.mockResolvedValue(user);

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: 'ACCOUNT_DEACTIVATED',
        });
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('should refresh tokens successfully', async () => {
        const refreshData = { refreshToken };

        const storedToken = {
          id: 'token-id',
          token: refreshToken,
          expiresAt: new Date(Date.now() + 86400000), // Future date
          user: {
            id: userId,
            email: 'test@example.com',
          },
        };

        mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
        mockPrisma.refreshToken.update.mockResolvedValue({});

        const response = await request(app)
          .post('/api/auth/refresh')
          .send(refreshData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Tokens refreshed successfully',
          data: {
            tokens: {
              accessToken: expect.any(String),
              refreshToken: expect.any(String),
            },
          },
        });
      });

      it('should return 401 for expired refresh token', async () => {
        const refreshData = { refreshToken };

        const expiredToken = {
          token: refreshToken,
          expiresAt: new Date(Date.now() - 86400000), // Past date
          user: { id: userId },
        };

        mockPrisma.refreshToken.findUnique.mockResolvedValue(expiredToken);

        const response = await request(app)
          .post('/api/auth/refresh')
          .send(refreshData)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: 'REFRESH_TOKEN_EXPIRED',
        });
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout user successfully', async () => {
        const user = {
          id: userId,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          isActive: true,
          emailVerified: true,
        };

        mockPrisma.user.findUnique.mockResolvedValue(user);
        mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ refreshToken })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Logout successful',
        });
      });
    });
  });

  describe('Task Management Endpoints', () => {
    beforeEach(() => {
      // Mock authenticated user for task operations
      const user = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        emailVerified: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
    });

    describe('POST /api/tasks', () => {
      it('should create task successfully', async () => {
        const taskData = {
          title: 'New Task',
          description: 'Task description',
          status: 'TODO',
          priority: 'MEDIUM',
          projectId,
          dueDate: '2024-12-31T00:00:00.000Z',
          estimatedHours: 8,
          tags: ['frontend', 'bug'],
        };

        const project = {
          id: projectId,
          name: 'Test Project',
          ownerId: userId,
        };

        const createdTask = {
          id: taskId,
          ...taskData,
          dueDate: new Date(taskData.dueDate),
          tags: JSON.stringify(taskData.tags),
          assignedToId: null,
          createdById: userId,
          project: { id: projectId, name: 'Test Project' },
          assignedTo: null,
          createdBy: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
        };

        mockPrisma.project.findFirst.mockResolvedValue(project);
        mockPrisma.task.create.mockResolvedValue(createdTask);

        const response = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(taskData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Task created successfully',
          data: {
            task: expect.objectContaining({
              id: taskId,
              title: 'New Task',
              description: 'Task description',
              status: 'TODO',
              priority: 'MEDIUM',
            }),
          },
        });
      });

      it('should return 404 if project not found', async () => {
        const taskData = {
          title: 'New Task',
          projectId: 'non-existent-project',
        };

        mockPrisma.project.findFirst.mockResolvedValue(null);

        const response = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(taskData)
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          error: 'PROJECT_NOT_FOUND',
        });
      });

      it('should return 401 without authentication', async () => {
        const taskData = {
          title: 'New Task',
          projectId,
        };

        const response = await request(app)
          .post('/api/tasks')
          .send(taskData)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: 'MISSING_TOKEN',
        });
      });
    });

    describe('GET /api/tasks', () => {
      it('should get all tasks with pagination', async () => {
        const tasks = [
          {
            id: 'task-1',
            title: 'Task 1',
            tags: JSON.stringify(['tag1']),
            project: { id: projectId, name: 'Project 1' },
            assignedTo: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
            createdBy: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
            _count: { comments: 2, dependencies: 1, dependentTasks: 0 },
          },
          {
            id: 'task-2',
            title: 'Task 2',
            tags: null,
            project: { id: projectId, name: 'Project 1' },
            assignedTo: null,
            createdBy: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
            _count: { comments: 0, dependencies: 0, dependentTasks: 1 },
          },
        ];

        mockPrisma.task.findMany.mockResolvedValue(tasks);
        mockPrisma.task.count.mockResolvedValue(2);

        const response = await request(app)
          .get('/api/tasks')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            page: '1',
            limit: '10',
            search: 'test',
            status: 'TODO',
            priority: 'HIGH',
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Tasks retrieved successfully',
          data: {
            tasks: expect.arrayContaining([
              expect.objectContaining({
                id: 'task-1',
                title: 'Task 1',
                tags: ['tag1'],
              }),
              expect.objectContaining({
                id: 'task-2',
                title: 'Task 2',
                tags: [],
              }),
            ]),
            pagination: {
              current: 1,
              pages: 1,
              total: 2,
              limit: 10,
            },
          },
        });
      });

      it('should filter tasks by search query', async () => {
        mockPrisma.task.findMany.mockResolvedValue([]);
        mockPrisma.task.count.mockResolvedValue(0);

        const response = await request(app)
          .get('/api/tasks')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ search: 'important task' })
          .expect(200);

        expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { title: { contains: 'important task', mode: 'insensitive' } },
                { description: { contains: 'important task', mode: 'insensitive' } },
              ],
            }),
          })
        );
      });
    });

    describe('GET /api/tasks/:taskId', () => {
      it('should get task by ID successfully', async () => {
        const task = {
          id: taskId,
          title: 'Test Task',
          description: 'Task description',
          tags: JSON.stringify(['tag1', 'tag2']),
          project: { id: projectId, name: 'Project 1', ownerId: userId },
          assignedTo: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
          createdBy: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
          comments: [],
          dependencies: [],
          dependentTasks: [],
        };

        mockPrisma.task.findFirst.mockResolvedValue(task);
        mockPrisma.task.findUnique.mockResolvedValue(task);

        const response = await request(app)
          .get(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Task retrieved successfully',
          data: {
            task: expect.objectContaining({
              id: taskId,
              title: 'Test Task',
              tags: ['tag1', 'tag2'],
            }),
          },
        });
      });

      it('should return 404 for non-existent task', async () => {
        mockPrisma.task.findFirst.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/tasks/non-existent-task')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          error: 'TASK_NOT_FOUND',
        });
      });
    });

    describe('PUT /api/tasks/:taskId', () => {
      it('should update task successfully', async () => {
        const updateData = {
          title: 'Updated Task',
          description: 'Updated description',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
        };

        const existingTask = {
          id: taskId,
          projectId,
          assignedTo: { id: userId },
          project: { ownerId: userId },
        };

        const updatedTask = {
          id: taskId,
          ...updateData,
          tags: null,
          project: { id: projectId, name: 'Project 1' },
          assignedTo: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
          createdBy: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
        };

        mockPrisma.task.findFirst.mockResolvedValue(existingTask);
        mockPrisma.task.update.mockResolvedValue(updatedTask);

        const response = await request(app)
          .put(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Task updated successfully',
          data: {
            task: expect.objectContaining({
              id: taskId,
              title: 'Updated Task',
              description: 'Updated description',
              status: 'IN_PROGRESS',
              priority: 'HIGH',
            }),
          },
        });
      });
    });

    describe('DELETE /api/tasks/:taskId', () => {
      it('should delete task successfully', async () => {
        const task = {
          id: taskId,
          title: 'Task to Delete',
          projectId,
        };

        mockPrisma.task.findFirst.mockResolvedValue(task);
        mockPrisma.taskDependency.findMany.mockResolvedValue([]); // No dependent tasks
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          return callback(mockPrisma);
        });

        const response = await request(app)
          .delete(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Task deleted successfully',
        });
      });

      it('should return 400 if task has dependent tasks', async () => {
        const task = { id: taskId, title: 'Task with Dependencies' };
        const dependentTasks = [
          { task: { id: 'dep-1', title: 'Dependent Task 1' } },
        ];

        mockPrisma.task.findFirst.mockResolvedValue(task);
        mockPrisma.taskDependency.findMany.mockResolvedValue(dependentTasks);

        const response = await request(app)
          .delete(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'TASK_HAS_DEPENDENCIES',
        });
      });
    });

    describe('POST /api/tasks/:taskId/comments', () => {
      it('should add task comment successfully', async () => {
        const commentData = {
          content: 'This is a test comment',
        };

        const task = { id: taskId, projectId };
        const comment = {
          id: 'comment-1',
          content: commentData.content,
          taskId,
          authorId: userId,
          author: { id: userId, firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
        };

        mockPrisma.task.findFirst.mockResolvedValue(task);
        mockPrisma.taskComment.create.mockResolvedValue(comment);

        const response = await request(app)
          .post(`/api/tasks/${taskId}/comments`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(commentData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Comment added successfully',
          data: {
            comment: expect.objectContaining({
              id: 'comment-1',
              content: 'This is a test comment',
            }),
          },
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email', // Invalid format
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Route not found',
        error: 'NOT_FOUND',
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
        })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // Mock multiple rapid requests
      const promises = Array(10).fill(null).map(() => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong-password',
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });
});