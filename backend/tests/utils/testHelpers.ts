import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Test helper utilities for CyberTask testing
 */

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password?: string;
}

export interface TestProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
}

export interface TestTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId: string;
  createdById: string;
  assignedToId?: string;
}

/**
 * Clear all test data from database
 */
export async function clearDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in reverse order of dependencies
  await prisma.taskComment.deleteMany({});
  await prisma.taskDependency.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
}

/**
 * Create a test user
 */
export async function createTestUser(
  prisma: PrismaClient,
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'USER' | 'ADMIN';
  }
): Promise<TestUser> {
  const hashedPassword = await bcrypt.hash(userData.password, 12);

  const user = await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'USER',
      isActive: true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    password: userData.password, // Return plain password for login tests
  };
}

/**
 * Create multiple test users
 */
export async function createTestUsers(
  prisma: PrismaClient,
  count: number = 3
): Promise<TestUser[]> {
  const users: TestUser[] = [];
  
  for (let i = 1; i <= count; i++) {
    const user = await createTestUser(prisma, {
      email: `user${i}@example.com`,
      password: 'Password123!',
      firstName: `User${i}`,
      lastName: 'Test',
    });
    users.push(user);
  }

  return users;
}

/**
 * Create a test project
 */
export async function createTestProject(
  prisma: PrismaClient,
  projectData: {
    name: string;
    description: string;
    ownerId: string;
  }
): Promise<TestProject> {
  const project = await prisma.project.create({
    data: {
      name: projectData.name,
      description: projectData.description,
      ownerId: projectData.ownerId,
    },
  });

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
  };
}

/**
 * Create a test task
 */
export async function createTestTask(
  prisma: PrismaClient,
  taskData: {
    title: string;
    description: string;
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    projectId: string;
    createdById: string;
    assignedToId?: string;
    dueDate?: Date;
    estimatedHours?: number;
    tags?: string[];
  }
): Promise<TestTask> {
  const task = await prisma.task.create({
    data: {
      title: taskData.title,
      description: taskData.description,
      status: taskData.status || 'TODO',
      priority: taskData.priority || 'MEDIUM',
      projectId: taskData.projectId,
      createdById: taskData.createdById,
      assignedToId: taskData.assignedToId,
      dueDate: taskData.dueDate,
      estimatedHours: taskData.estimatedHours,
      tags: taskData.tags ? JSON.stringify(taskData.tags) : null,
    },
  });

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    createdById: task.createdById,
    assignedToId: task.assignedToId,
  };
}

/**
 * Add user to project as member
 */
export async function addProjectMember(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
  role: 'MEMBER' | 'MANAGER' = 'MEMBER'
): Promise<void> {
  await prisma.projectMember.create({
    data: {
      projectId,
      userId,
      role,
    },
  });
}

/**
 * Create task dependency
 */
export async function createTaskDependency(
  prisma: PrismaClient,
  taskId: string,
  dependsOnId: string
): Promise<void> {
  await prisma.taskDependency.create({
    data: {
      taskId,
      dependsOnId,
    },
  });
}

/**
 * Create task comment
 */
export async function createTaskComment(
  prisma: PrismaClient,
  taskId: string,
  authorId: string,
  content: string
): Promise<any> {
  return await prisma.taskComment.create({
    data: {
      taskId,
      authorId,
      content,
    },
  });
}

/**
 * Generate JWT token for testing
 */
export function generateTestToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
}

/**
 * Generate expired JWT token for testing
 */
export function generateExpiredToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '-1h' } // Already expired
  );
}

/**
 * Create test notification
 */
export async function createTestNotification(
  prisma: PrismaClient,
  data: {
    userId: string;
    type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'COMMENT_ADDED' | 'PROJECT_INVITATION';
    title: string;
    message: string;
    relatedId?: string;
  }
): Promise<any> {
  return await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedId: data.relatedId,
      isRead: false,
    },
  });
}

/**
 * Setup test data with users, projects and tasks
 */
export async function setupCompleteTestData(prisma: PrismaClient): Promise<{
  users: TestUser[];
  projects: TestProject[];
  tasks: TestTask[];
}> {
  // Create users
  const users = await createTestUsers(prisma, 3);
  
  // Create projects
  const project1 = await createTestProject(prisma, {
    name: 'Test Project 1',
    description: 'First test project',
    ownerId: users[0].id,
  });

  const project2 = await createTestProject(prisma, {
    name: 'Test Project 2',
    description: 'Second test project',
    ownerId: users[1].id,
  });

  // Add members to projects
  await addProjectMember(prisma, project1.id, users[1].id, 'MEMBER');
  await addProjectMember(prisma, project1.id, users[2].id, 'MEMBER');
  await addProjectMember(prisma, project2.id, users[0].id, 'MEMBER');

  // Create tasks
  const task1 = await createTestTask(prisma, {
    title: 'Task 1',
    description: 'First task',
    status: 'TODO',
    priority: 'HIGH',
    projectId: project1.id,
    createdById: users[0].id,
    assignedToId: users[1].id,
  });

  const task2 = await createTestTask(prisma, {
    title: 'Task 2',
    description: 'Second task',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    projectId: project1.id,
    createdById: users[0].id,
    assignedToId: users[2].id,
  });

  const task3 = await createTestTask(prisma, {
    title: 'Task 3',
    description: 'Third task',
    status: 'TODO',
    priority: 'LOW',
    projectId: project2.id,
    createdById: users[1].id,
  });

  return {
    users,
    projects: [project1, project2],
    tasks: [task1, task2, task3],
  };
}

/**
 * Mock Socket.IO for testing real-time features
 */
export function createMockSocketIO(): any {
  return {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };
}

/**
 * Sleep utility for async test timing
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
export function generateRandomData(): {
  email: string;
  firstName: string;
  lastName: string;
  projectName: string;
  taskTitle: string;
} {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    email: `test${timestamp}${random}@example.com`,
    firstName: `TestUser${random}`,
    lastName: `Last${random}`,
    projectName: `Test Project ${random}`,
    taskTitle: `Test Task ${random}`,
  };
}

/**
 * Validate response structure
 */
export function validateApiResponse(response: any, expectedKeys: string[]): void {
  expect(response).toBeDefined();
  expectedKeys.forEach(key => {
    expect(response).toHaveProperty(key);
  });
}

/**
 * Database transaction helper for tests
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    return await callback(tx as PrismaClient);
  });
}

/**
 * Create test environment variables
 */
export function setupTestEnvironment(): void {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing';
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnvironment(): void {
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.JWT_EXPIRES_IN;
  delete process.env.REFRESH_TOKEN_EXPIRES_IN;
}