import { rest } from 'msw'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const handlers = [
  // Auth handlers
  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'USER',
            isActive: true,
          },
          token: 'mock-jwt-token',
        },
      })
    )
  }),

  rest.post(`${API_BASE_URL}/auth/register`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: 'user-456',
            email: 'newuser@example.com',
            firstName: 'New',
            lastName: 'User',
            role: 'USER',
            isActive: true,
          },
          token: 'mock-jwt-token',
        },
      })
    )
  }),

  rest.get(`${API_BASE_URL}/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          message: 'No token provided',
        })
      )
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
          isActive: true,
        },
      })
    )
  }),

  rest.post(`${API_BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Logged out successfully',
      })
    )
  }),

  // Tasks handlers
  rest.get(`${API_BASE_URL}/tasks`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Tasks retrieved successfully',
        data: {
          tasks: [
            {
              id: 'task-1',
              title: 'Test Task 1',
              description: 'Description for test task 1',
              status: 'TODO',
              priority: 'HIGH',
              projectId: 'project-1',
              createdById: 'user-123',
              assignedToId: 'user-456',
              dueDate: '2024-12-31T23:59:59Z',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              tags: ['backend', 'urgent'],
              project: { id: 'project-1', name: 'Test Project' },
              assignedTo: {
                id: 'user-456',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
              },
              createdBy: {
                id: 'user-123',
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
              },
              _count: {
                comments: 2,
                dependencies: 0,
                dependentTasks: 1,
              },
            },
            {
              id: 'task-2',
              title: 'Test Task 2',
              description: 'Description for test task 2',
              status: 'IN_PROGRESS',
              priority: 'MEDIUM',
              projectId: 'project-1',
              createdById: 'user-123',
              assignedToId: null,
              dueDate: null,
              createdAt: '2024-01-02T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
              tags: ['frontend'],
              project: { id: 'project-1', name: 'Test Project' },
              assignedTo: null,
              createdBy: {
                id: 'user-123',
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
              },
              _count: {
                comments: 0,
                dependencies: 1,
                dependentTasks: 0,
              },
            },
          ],
          pagination: {
            current: 1,
            pages: 1,
            total: 2,
            limit: 20,
          },
        },
      })
    )
  }),

  rest.post(`${API_BASE_URL}/tasks`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        message: 'Task created successfully',
        data: {
          task: {
            id: 'new-task-123',
            title: 'New Task',
            description: 'New task description',
            status: 'TODO',
            priority: 'MEDIUM',
            projectId: 'project-1',
            createdById: 'user-123',
            assignedToId: null,
            dueDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
          },
        },
      })
    )
  }),

  rest.get(`${API_BASE_URL}/tasks/:taskId`, (req, res, ctx) => {
    const { taskId } = req.params
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Task retrieved successfully',
        data: {
          task: {
            id: taskId,
            title: 'Detailed Task',
            description: 'Detailed task description',
            status: 'TODO',
            priority: 'HIGH',
            projectId: 'project-1',
            createdById: 'user-123',
            assignedToId: 'user-456',
            dueDate: '2024-12-31T23:59:59Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            tags: ['backend', 'urgent'],
            project: { id: 'project-1', name: 'Test Project', ownerId: 'user-123' },
            assignedTo: {
              id: 'user-456',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              role: 'DEVELOPER',
            },
            createdBy: {
              id: 'user-123',
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.com',
            },
            comments: [
              {
                id: 'comment-1',
                content: 'First comment',
                createdAt: '2024-01-01T10:00:00Z',
                author: {
                  id: 'user-456',
                  firstName: 'John',
                  lastName: 'Doe',
                  email: 'john@example.com',
                },
              },
            ],
            dependencies: [],
            dependentTasks: [],
          },
        },
      })
    )
  }),

  rest.put(`${API_BASE_URL}/tasks/:taskId`, (req, res, ctx) => {
    const { taskId } = req.params
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Task updated successfully',
        data: {
          task: {
            id: taskId,
            title: 'Updated Task',
            description: 'Updated description',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            updatedAt: new Date().toISOString(),
          },
        },
      })
    )
  }),

  rest.delete(`${API_BASE_URL}/tasks/:taskId`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Task deleted successfully',
      })
    )
  }),

  // Projects handlers
  rest.get(`${API_BASE_URL}/projects`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Projects retrieved successfully',
        data: {
          projects: [
            {
              id: 'project-1',
              name: 'Test Project 1',
              description: 'First test project',
              ownerId: 'user-123',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              owner: {
                id: 'user-123',
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
              },
              _count: {
                tasks: 5,
                members: 3,
              },
            },
            {
              id: 'project-2',
              name: 'Test Project 2',
              description: 'Second test project',
              ownerId: 'user-456',
              createdAt: '2024-01-02T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
              owner: {
                id: 'user-456',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
              },
              _count: {
                tasks: 2,
                members: 1,
              },
            },
          ],
          pagination: {
            current: 1,
            pages: 1,
            total: 2,
            limit: 20,
          },
        },
      })
    )
  }),

  // Notifications handlers
  rest.get(`${API_BASE_URL}/notifications`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications: [
            {
              id: 'notification-1',
              type: 'TASK_ASSIGNED',
              title: 'Task Assigned',
              message: 'You have been assigned to a new task',
              isRead: false,
              createdAt: '2024-01-01T10:00:00Z',
              relatedId: 'task-1',
            },
            {
              id: 'notification-2',
              type: 'TASK_UPDATED',
              title: 'Task Updated',
              message: 'A task you are watching has been updated',
              isRead: true,
              createdAt: '2024-01-01T09:00:00Z',
              relatedId: 'task-2',
            },
          ],
          unreadCount: 1,
        },
      })
    )
  }),

  // Error simulation handlers
  rest.get(`${API_BASE_URL}/error/500`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
      })
    )
  }),

  rest.get(`${API_BASE_URL}/error/401`, (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        message: 'Unauthorized access',
        error: 'UNAUTHORIZED',
      })
    )
  }),

  rest.get(`${API_BASE_URL}/error/404`, (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        message: 'Resource not found',
        error: 'NOT_FOUND',
      })
    )
  }),

  // Network delay simulation
  rest.get(`${API_BASE_URL}/slow`, (req, res, ctx) => {
    return res(
      ctx.delay(2000),
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Slow response',
      })
    )
  }),
]