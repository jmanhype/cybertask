"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDatabase = clearDatabase;
exports.createTestUser = createTestUser;
exports.createTestUsers = createTestUsers;
exports.createTestProject = createTestProject;
exports.createTestTask = createTestTask;
exports.addProjectMember = addProjectMember;
exports.createTaskDependency = createTaskDependency;
exports.createTaskComment = createTaskComment;
exports.generateTestToken = generateTestToken;
exports.generateExpiredToken = generateExpiredToken;
exports.createTestNotification = createTestNotification;
exports.setupCompleteTestData = setupCompleteTestData;
exports.createMockSocketIO = createMockSocketIO;
exports.sleep = sleep;
exports.generateRandomData = generateRandomData;
exports.validateApiResponse = validateApiResponse;
exports.withTransaction = withTransaction;
exports.setupTestEnvironment = setupTestEnvironment;
exports.cleanupTestEnvironment = cleanupTestEnvironment;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function clearDatabase(prisma) {
    await prisma.taskComment.deleteMany({});
    await prisma.taskDependency.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.projectMember.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
}
async function createTestUser(prisma, userData) {
    const hashedPassword = await bcryptjs_1.default.hash(userData.password, 12);
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
        password: userData.password,
    };
}
async function createTestUsers(prisma, count = 3) {
    const users = [];
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
async function createTestProject(prisma, projectData) {
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
async function createTestTask(prisma, taskData) {
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
async function addProjectMember(prisma, projectId, userId, role = 'MEMBER') {
    await prisma.projectMember.create({
        data: {
            projectId,
            userId,
            role,
        },
    });
}
async function createTaskDependency(prisma, taskId, dependsOnId) {
    await prisma.taskDependency.create({
        data: {
            taskId,
            dependsOnId,
        },
    });
}
async function createTaskComment(prisma, taskId, authorId, content) {
    return await prisma.taskComment.create({
        data: {
            taskId,
            authorId,
            content,
        },
    });
}
function generateTestToken(userId, email) {
    return jsonwebtoken_1.default.sign({ userId, email }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
}
function generateExpiredToken(userId, email) {
    return jsonwebtoken_1.default.sign({ userId, email }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '-1h' });
}
async function createTestNotification(prisma, data) {
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
async function setupCompleteTestData(prisma) {
    const users = await createTestUsers(prisma, 3);
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
    await addProjectMember(prisma, project1.id, users[1].id, 'MEMBER');
    await addProjectMember(prisma, project1.id, users[2].id, 'MEMBER');
    await addProjectMember(prisma, project2.id, users[0].id, 'MEMBER');
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
function createMockSocketIO() {
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
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function generateRandomData() {
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
function validateApiResponse(response, expectedKeys) {
    expect(response).toBeDefined();
    expectedKeys.forEach(key => {
        expect(response).toHaveProperty(key);
    });
}
async function withTransaction(prisma, callback) {
    return await prisma.$transaction(async (tx) => {
        return await callback(tx);
    });
}
function setupTestEnvironment() {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
}
function cleanupTestEnvironment() {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.REFRESH_TOKEN_EXPIRES_IN;
}
//# sourceMappingURL=testHelpers.js.map