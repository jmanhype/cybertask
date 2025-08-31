import request from 'supertest';
import app from '../../server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Dashboard API Integration', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Register a test user and get token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'dashboard-test@example.com',
        username: 'dashboardtest',
        password: 'Password123@',
        firstName: 'Dashboard',
        lastName: 'Test',
      });

    if (registerResponse.status === 201) {
      authToken = registerResponse.body.data.tokens.accessToken;
      userId = registerResponse.body.data.user.id;
    } else {
      // User might already exist, try login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dashboard-test@example.com',
          password: 'Password123@',
        });
      
      authToken = loginResponse.body.data.tokens.accessToken;
      userId = loginResponse.body.data.user.id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prisma.task.deleteMany({ where: { createdById: userId } });
      await prisma.projectMember.deleteMany({ where: { userId } });
      await prisma.project.deleteMany({ where: { ownerId: userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {
        // Ignore if user doesn't exist
      });
    }
    await prisma.$disconnect();
  });

  describe('Dashboard Stats Endpoint', () => {
    it('should return correct dashboard statistics structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Dashboard statistics retrieved successfully');
      expect(response.body.data).toHaveProperty('totalTasks');
      expect(response.body.data).toHaveProperty('completedTasks');
      expect(response.body.data).toHaveProperty('inProgressTasks');
      expect(response.body.data).toHaveProperty('overdueTasks');
      expect(response.body.data).toHaveProperty('totalProjects');
      expect(response.body.data).toHaveProperty('pendingTasks');
      expect(response.body.data).toHaveProperty('completionRate');
      
      // All values should be numbers
      Object.values(response.body.data).forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should return 401 for missing authorization', async () => {
      await request(app)
        .get('/api/dashboard/stats')
        .expect(401);
    });
  });

  describe('Dashboard Activity Endpoint', () => {
    it('should return recent activity structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recentTasks');
      expect(response.body.data).toHaveProperty('recentProjects');
      expect(Array.isArray(response.body.data.recentTasks)).toBe(true);
      expect(Array.isArray(response.body.data.recentProjects)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.recentTasks.length).toBeLessThanOrEqual(3);
      expect(response.body.data.recentProjects.length).toBeLessThanOrEqual(5); // Projects have fixed limit of 5
    });
  });
});