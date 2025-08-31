import request from 'supertest';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import { clearDatabase, createTestUser, createTestProject } from '../utils/testHelpers';

describe('Authentication Integration Tests', () => {
  let server: Server;
  let prisma: PrismaClient;
  let testUser: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(validUser.email);
      expect(response.body.data.user.firstName).toBe(validUser.firstName);
      expect(response.body.data.user.lastName).toBe(validUser.lastName);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Verify refresh token cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find((cookie: string) =>
        cookie.startsWith('refreshToken=')
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');

      // Verify user exists in database
      const userInDb = await prisma.user.findUnique({
        where: { email: validUser.email },
      });
      expect(userInDb).toBeTruthy();
      expect(userInDb?.firstName).toBe(validUser.firstName);
    });

    it('should return validation errors for invalid data', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '',
        lastName: '',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should return error for existing email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already exists');
    });

    it('should hash password before storing', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      const userInDb = await prisma.user.findUnique({
        where: { email: validUser.email },
      });

      expect(userInDb?.password).not.toBe(validUser.password);
      expect(userInDb?.password).toMatch(/^\$2[aby]\$\d+\$.{53}$/); // Bcrypt hash pattern
    });

    it('should set default user role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body.data.user.role).toBe('USER');

      const userInDb = await prisma.user.findUnique({
        where: { email: validUser.email },
      });
      expect(userInDb?.role).toBe('USER');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      testUser = await createTestUser(prisma, {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Verify refresh token cookie
      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find((cookie: string) =>
        cookie.startsWith('refreshToken=')
      );
      expect(refreshTokenCookie).toBeDefined();
    });

    it('should return error for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return error for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should update lastLoginAt timestamp', async () => {
      const originalUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });

      expect(updatedUser?.lastLoginAt).toBeDefined();
      expect(updatedUser?.lastLoginAt).not.toEqual(originalUser?.lastLoginAt);
    });

    it('should clean up old refresh tokens', async () => {
      // Login multiple times to create multiple refresh tokens
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Password123!',
          })
          .expect(200);
      }

      // Check that only one refresh token exists
      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id },
      });

      expect(refreshTokens).toHaveLength(1);
    });

    it('should return error for inactive user', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.message).toContain('inactive');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      testUser = await createTestUser(prisma, {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      authToken = loginResponse.body.data.token;
    });

    it('should return current user data with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testUser.id);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.firstName).toBe('Test');
      expect(response.body.data.lastName).toBe('User');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('token');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return error with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let authToken: string;

    beforeEach(async () => {
      testUser = await createTestUser(prisma, {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Original',
        lastName: 'Name',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      authToken = loginResponse.body.data.token;
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('updated successfully');
      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data.lastName).toBe('User');

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser?.firstName).toBe('Updated');
      expect(updatedUser?.lastName).toBe('User');
    });

    it('should not allow email update through profile endpoint', async () => {
      const updateData = {
        firstName: 'Updated',
        email: 'newemail@example.com',
      };

      await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Email should remain unchanged
      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.email).toBe('test@example.com');
    });

    it('should validate update data', async () => {
      const invalidData = {
        firstName: '', // Empty string should be invalid
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let authToken: string;

    beforeEach(async () => {
      testUser = await createTestUser(prisma, {
        email: 'test@example.com',
        password: 'OldPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'OldPassword123!',
        });

      authToken = loginResponse.body.data.token;
    });

    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Password changed successfully');

      // Verify old password no longer works
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'OldPassword123!',
        })
        .expect(401);

      // Verify new password works
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPassword123!',
        })
        .expect(200);
    });

    it('should return error for incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword123!',
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Current password is incorrect');
    });

    it('should invalidate all refresh tokens after password change', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      // All refresh tokens should be deleted
      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id },
      });

      expect(refreshTokens).toHaveLength(0);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshTokenCookie: string;

    beforeEach(async () => {
      testUser = await createTestUser(prisma, {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      const cookies = loginResponse.headers['set-cookie'];
      refreshTokenCookie = cookies
        .find((cookie: string) => cookie.startsWith('refreshToken='))
        ?.split(';')[0]
        .split('=')[1];
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshTokenCookie}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');

      // Should set new refresh token cookie
      const cookies = response.headers['set-cookie'];
      const newRefreshTokenCookie = cookies.find((cookie: string) =>
        cookie.startsWith('refreshToken=')
      );
      expect(newRefreshTokenCookie).toBeDefined();
    });

    it('should return error without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Refresh token required');
    });

    it('should return error with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should remove old refresh token and create new one', async () => {
      const initialTokenCount = await prisma.refreshToken.count({
        where: { userId: testUser.id },
      });

      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshTokenCookie}`)
        .expect(200);

      // Should still have one token (old removed, new created)
      const finalTokenCount = await prisma.refreshToken.count({
        where: { userId: testUser.id },
      });

      expect(finalTokenCount).toBe(initialTokenCount);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;
    let refreshTokenCookie: string;

    beforeEach(async () => {
      testUser = await createTestUser(prisma, {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      authToken = loginResponse.body.data.token;
      const cookies = loginResponse.headers['set-cookie'];
      refreshTokenCookie = cookies
        .find((cookie: string) => cookie.startsWith('refreshToken='))
        ?.split(';')[0]
        .split('=')[1];
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', `refreshToken=${refreshTokenCookie}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Logged out successfully');

      // Should clear refresh token cookie
      const cookies = response.headers['set-cookie'];
      const clearedCookie = cookies.find((cookie: string) =>
        cookie.startsWith('refreshToken=;')
      );
      expect(clearedCookie).toBeDefined();
    });

    it('should remove refresh token from database', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', `refreshToken=${refreshTokenCookie}`)
        .expect(200);

      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id },
      });

      expect(refreshTokens).toHaveLength(0);
    });

    it('should work without refresh token cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});