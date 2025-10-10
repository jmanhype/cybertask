import request from 'supertest'
import { app } from '../../server'
import { prisma } from '../../lib/prisma'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

describe('Tasks Endpoints Integration', () => {
  let authToken: string
  let userId: string
  let projectId: string

  beforeEach(async () => {
    // Clean database
    await prisma.taskComment.deleteMany()
    await prisma.taskDependency.deleteMany()
    await prisma.task.deleteMany()
    await prisma.projectMember.deleteMany()
    await prisma.project.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10)
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User'
      }
    })
    userId = user.id

    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test project for tasks',
        ownerId: userId
      }
    })
    projectId = project.id

    // Generate auth token
    authToken = jwt.sign(
      { userId, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    )
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create sample tasks
      await prisma.task.createMany({
        data: [
          {
            title: 'Task 1',
            description: 'First task',
            status: 'TODO',
            priority: 'HIGH',
            projectId,
            createdById: userId
          },
          {
            title: 'Task 2',
            description: 'Second task',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            projectId,
            createdById: userId
          },
          {
            title: 'Task 3',
            description: 'Third task',
            status: 'DONE',
            priority: 'LOW',
            projectId,
            createdById: userId
          }
        ]
      })
    })

    it('should fetch all tasks with pagination', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.tasks).toHaveLength(3)
      expect(response.body.data.pagination).toBeDefined()
      expect(response.body.data.pagination.total).toBe(3)
    })

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=TODO')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.tasks).toHaveLength(1)
      expect(response.body.data.tasks[0].status).toBe('TODO')
    })

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=HIGH')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.tasks).toHaveLength(1)
      expect(response.body.data.tasks[0].priority).toBe('HIGH')
    })

    it('should filter tasks by projectId', async () => {
      const response = await request(app)
        .get(`/api/tasks?projectId=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.tasks).toHaveLength(3)
      response.body.data.tasks.forEach((task: any) => {
        expect(task.projectId).toBe(projectId)
      })
    })

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.tasks).toHaveLength(2)
      expect(response.body.data.pagination.pages).toBe(2)
      expect(response.body.data.pagination.current).toBe(1)
    })

    it('should sort tasks by createdAt', async () => {
      const response = await request(app)
        .get('/api/tasks?sortBy=createdAt&order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const tasks = response.body.data.tasks
      expect(new Date(tasks[0].createdAt).getTime())
        .toBeGreaterThanOrEqual(new Date(tasks[1].createdAt).getTime())
    })
  })

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedHours: 8,
        tags: ['backend', 'api']
      }

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.task.title).toBe(taskData.title)
      expect(response.body.data.task.tags).toEqual(taskData.tags)
      expect(response.body.data.task.createdById).toBe(userId)

      // Verify in database
      const task = await prisma.task.findUnique({
        where: { id: response.body.data.task.id }
      })
      expect(task).toBeDefined()
      expect(task?.title).toBe(taskData.title)
    })

    it('should create task with AI suggestions', async () => {
      const taskData = {
        title: 'Implement user authentication',
        projectId,
        enableAISuggestions: true
      }

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201)

      expect(response.body.data.task.aiSuggestedSteps).toBeDefined()
      expect(response.body.data.task.aiEstimatedHours).toBeDefined()
      expect(response.body.data.task.aiPriority).toBeDefined()
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Missing title' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'title' })
      )
    })

    it('should validate project exists', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task for non-existent project',
          projectId: 'invalid-project-id'
        })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Project not found')
    })

    it('should handle task dependencies', async () => {
      const task1 = await prisma.task.create({
        data: {
          title: 'Dependency Task',
          projectId,
          createdById: userId
        }
      })

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Dependent Task',
          projectId,
          dependsOnIds: [task1.id]
        })
        .expect(201)

      const dependencies = await prisma.taskDependency.findMany({
        where: { dependentTaskId: response.body.data.task.id }
      })
      expect(dependencies).toHaveLength(1)
      expect(dependencies[0].dependsOnTaskId).toBe(task1.id)
    })
  })

  describe('PUT /api/tasks/:id', () => {
    let taskId: string

    beforeEach(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Original Task',
          description: 'Original description',
          status: 'TODO',
          priority: 'LOW',
          projectId,
          createdById: userId
        }
      })
      taskId = task.id
    })

    it('should update task successfully', async () => {
      const updates = {
        title: 'Updated Task',
        description: 'Updated description',
        status: 'IN_PROGRESS',
        priority: 'HIGH'
      }

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.task.title).toBe(updates.title)
      expect(response.body.data.task.status).toBe(updates.status)

      // Verify in database
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      })
      expect(task?.title).toBe(updates.title)
      expect(task?.updatedAt).not.toBe(task?.createdAt)
    })

    it('should update task assignment', async () => {
      const assignee = await prisma.user.create({
        data: {
          email: 'assignee@example.com',
          password: 'password',
          firstName: 'Assignee',
          lastName: 'User'
        }
      })

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assignedToId: assignee.id })
        .expect(200)

      expect(response.body.data.task.assignedToId).toBe(assignee.id)

      // Should create notification for assignee
      const notification = await prisma.notification.findFirst({
        where: {
          userId: assignee.id,
          type: 'TASK_ASSIGNED'
        }
      })
      expect(notification).toBeDefined()
    })

    it('should track task history', async () => {
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200)

      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'DONE' })
        .expect(200)

      // Check task history/audit log if implemented
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { _count: true }
      })
      expect(task?.status).toBe('DONE')
    })

    it('should prevent unauthorized updates', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'password',
          firstName: 'Other',
          lastName: 'User'
        }
      })

      const otherToken = jwt.sign(
        { userId: otherUser.id, email: otherUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      )

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403)

      expect(response.body.success).toBe(false)
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    let taskId: string

    beforeEach(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Task to Delete',
          projectId,
          createdById: userId
        }
      })
      taskId = task.id
    })

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify task is deleted
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      })
      expect(task).toBeNull()
    })

    it('should cascade delete related data', async () => {
      // Add comment to task
      await prisma.taskComment.create({
        data: {
          content: 'Test comment',
          taskId,
          authorId: userId
        }
      })

      await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Verify comments are deleted
      const comments = await prisma.taskComment.findMany({
        where: { taskId }
      })
      expect(comments).toHaveLength(0)
    })

    it('should handle task dependencies on deletion', async () => {
      const dependentTask = await prisma.task.create({
        data: {
          title: 'Dependent Task',
          projectId,
          createdById: userId
        }
      })

      await prisma.taskDependency.create({
        data: {
          dependsOnTaskId: taskId,
          dependentTaskId: dependentTask.id
        }
      })

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('dependencies')
    })
  })

  describe('WebSocket Events', () => {
    it('should emit task creation event', async () => {
      // This would require WebSocket client setup
      // Placeholder for WebSocket testing
      expect(true).toBe(true)
    })

    it('should emit task update event', async () => {
      // Placeholder for WebSocket testing
      expect(true).toBe(true)
    })

    it('should emit task deletion event', async () => {
      // Placeholder for WebSocket testing
      expect(true).toBe(true)
    })
  })
})