import request from 'supertest'
import { app } from '../../server'
import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

describe('Auth Endpoints Integration', () => {
  beforeEach(async () => {
    await prisma.taskComment.deleteMany()
    await prisma.taskDependency.deleteMany()
    await prisma.task.deleteMany()
    await prisma.projectMember.deleteMany()
    await prisma.project.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.token).toBeDefined()

      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      expect(user).toBeDefined()
      expect(user?.firstName).toBe(userData.firstName)
    })

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      }

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('already exists')
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      )
    })

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'password' })
      )
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10)
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: hashedPassword,
          firstName: 'Existing',
          lastName: 'User'
        }
      })
    })

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'Password123!'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('existing@example.com')
      expect(response.body.data.token).toBeDefined()

      const decoded = jwt.verify(
        response.body.data.token,
        process.env.JWT_SECRET || 'test-secret'
      ) as any
      expect(decoded.userId).toBeDefined()
    })

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Invalid credentials')
    })

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'WrongPassword!'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Invalid credentials')
    })

    it('should reject inactive users', async () => {
      await prisma.user.update({
        where: { email: 'existing@example.com' },
        data: { isActive: false }
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'Password123!'
        })
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('deactivated')
    })
  })

  describe('GET /api/auth/me', () => {
    let token: string
    let userId: string

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10)
      const user = await prisma.user.create({
        data: {
          email: 'auth@example.com',
          password: hashedPassword,
          firstName: 'Auth',
          lastName: 'User'
        }
      })
      userId = user.id
      token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      )
    })

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.email).toBe('auth@example.com')
      expect(response.body.data.password).toBeUndefined()
    })

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('No token provided')
    })

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('Invalid token')
    })

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId, email: 'auth@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' }
      )

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    it('should reject token for deleted user', async () => {
      await prisma.user.delete({ where: { id: userId } })

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string
    let userId: string

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: 'refresh@example.com',
          password: await bcrypt.hash('Password123!', 10),
          firstName: 'Refresh',
          lastName: 'User'
        }
      })
      userId = user.id
      refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '7d' }
      )
    })

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
      expect(response.body.data.token).not.toBe(refreshToken)
    })

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    it('should reject access token as refresh token', async () => {
      const accessToken = jwt.sign(
        { userId, email: 'refresh@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      )

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken })
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/logout', () => {
    let token: string

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: 'logout@example.com',
          password: await bcrypt.hash('Password123!', 10),
          firstName: 'Logout',
          lastName: 'User'
        }
      })
      token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      )
    })

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Logged out')
    })

    it('should allow logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'Password123!'
      }

      const requests = Array.from({ length: 10 }, () =>
        request(app).post('/api/auth/login').send(loginData)
      )

      const responses = await Promise.all(requests)
      const rateLimited = responses.some(r => r.status === 429)
      
      expect(rateLimited).toBe(true)
    })
  })
})