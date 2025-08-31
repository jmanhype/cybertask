import { PrismaClient } from '@prisma/client';
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
export declare function clearDatabase(prisma: PrismaClient): Promise<void>;
export declare function createTestUser(prisma: PrismaClient, userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'USER' | 'ADMIN';
}): Promise<TestUser>;
export declare function createTestUsers(prisma: PrismaClient, count?: number): Promise<TestUser[]>;
export declare function createTestProject(prisma: PrismaClient, projectData: {
    name: string;
    description: string;
    ownerId: string;
}): Promise<TestProject>;
export declare function createTestTask(prisma: PrismaClient, taskData: {
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
}): Promise<TestTask>;
export declare function addProjectMember(prisma: PrismaClient, projectId: string, userId: string, role?: 'MEMBER' | 'MANAGER'): Promise<void>;
export declare function createTaskDependency(prisma: PrismaClient, taskId: string, dependsOnId: string): Promise<void>;
export declare function createTaskComment(prisma: PrismaClient, taskId: string, authorId: string, content: string): Promise<any>;
export declare function generateTestToken(userId: string, email: string): string;
export declare function generateExpiredToken(userId: string, email: string): string;
export declare function createTestNotification(prisma: PrismaClient, data: {
    userId: string;
    type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'COMMENT_ADDED' | 'PROJECT_INVITATION';
    title: string;
    message: string;
    relatedId?: string;
}): Promise<any>;
export declare function setupCompleteTestData(prisma: PrismaClient): Promise<{
    users: TestUser[];
    projects: TestProject[];
    tasks: TestTask[];
}>;
export declare function createMockSocketIO(): any;
export declare function sleep(ms: number): Promise<void>;
export declare function generateRandomData(): {
    email: string;
    firstName: string;
    lastName: string;
    projectName: string;
    taskTitle: string;
};
export declare function validateApiResponse(response: any, expectedKeys: string[]): void;
export declare function withTransaction<T>(prisma: PrismaClient, callback: (tx: PrismaClient) => Promise<T>): Promise<T>;
export declare function setupTestEnvironment(): void;
export declare function cleanupTestEnvironment(): void;
//# sourceMappingURL=testHelpers.d.ts.map