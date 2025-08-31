import request from 'supertest';
import app from '../server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Mock data
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

const testProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'Test Description',
  ownerId: testUser.id,
};

const generateToken = (userId: string) => {
  return jwt.sign(
    { userId, email: testUser.email },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );
};

describe('Dashboard API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.task.deleteMany({ where: { createdById: testUser.id } });
    await prisma.projectMember.deleteMany({ where: { userId: testUser.id } });
    await prisma.project.deleteMany({ where: { ownerId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });

    // Create test user
    await prisma.user.create({
      data: testUser,
    });

    // Create test project
    await prisma.project.create({
      data: testProject,
    });

    // Generate auth token
    authToken = generateToken(testUser.id);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.task.deleteMany({ where: { createdById: testUser.id } });
    await prisma.projectMember.deleteMany({ where: { userId: testUser.id } });
    await prisma.project.deleteMany({ where: { ownerId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard statistics for authenticated user', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const stats = response.body.data;
      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('completedTasks');
      expect(stats).toHaveProperty('inProgressTasks');
      expect(stats).toHaveProperty('overdueTasks');
      expect(stats).toHaveProperty('totalProjects');
      expect(typeof stats.totalTasks).toBe('number');
      expect(typeof stats.completedTasks).toBe('number');
      expect(typeof stats.inProgressTasks).toBe('number');
      expect(typeof stats.overdueTasks).toBe('number');
      expect(typeof stats.totalProjects).toBe('number');
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/dashboard/stats')
        .expect(401);
    });

    it('should return 401 for invalid token', async () => {
      await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('GET /api/dashboard/activity', () => {
    it('should return recent activity for authenticated user', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const data = response.body.data;
      expect(data).toHaveProperty('recentTasks');
      expect(data).toHaveProperty('recentProjects');
      expect(Array.isArray(data.recentTasks)).toBe(true);
      expect(Array.isArray(data.recentProjects)).toBe(true);
    });

    it('should limit results based on query parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const data = response.body.data;
      expect(data.recentTasks.length).toBeLessThanOrEqual(5);
      expect(data.recentProjects.length).toBeLessThanOrEqual(5);
    });
  });
});