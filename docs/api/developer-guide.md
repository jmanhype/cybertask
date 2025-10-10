# CyberTask API Developer Guide

Welcome to the CyberTask API! This comprehensive guide will help you integrate with our task and project management API quickly and efficiently.

## Table of Contents

- [Quick Start](#quick-start)
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Making Your First Request](#making-your-first-request)
- [Core Concepts](#core-concepts)
- [Common Use Cases](#common-use-cases)
- [SDKs and Libraries](#sdks-and-libraries)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Webhooks](#webhooks)
- [Testing](#testing)
- [Production Checklist](#production-checklist)
- [Support](#support)

## Quick Start

### 1. Get Your API Credentials

First, you'll need to create an account and obtain API credentials:

1. Register at [CyberTask](https://cybertask.com) or use the API registration endpoint
2. Your credentials will be your email and password for authentication
3. JWT tokens are generated upon login and used for subsequent requests

### 2. Make Your First API Call

Here's a simple example using curl:

```bash
# 1. Login to get access token
curl -X POST https://api.cybertask.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your-password"
  }'

# 2. Use the access token to get your tasks
curl -X GET https://api.cybertask.com/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 3. Create Your First Task

```bash
curl -X POST https://api.cybertask.com/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First API Task",
    "description": "Created via the CyberTask API",
    "priority": "MEDIUM",
    "projectId": "your-project-id"
  }'
```

## API Overview

### Base URLs

- **Production**: `https://api.cybertask.com`
- **Sandbox**: `https://sandbox-api.cybertask.com` *(coming soon)*
- **Development**: `http://localhost:3000/api`

### API Design Principles

- **RESTful**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON-first**: All requests and responses use JSON
- **Stateless**: Each request contains all necessary information
- **Consistent**: Standardized response formats and error codes
- **Secure**: HTTPS required, JWT authentication, rate limiting

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "meta": {
    // Pagination and metadata (for list endpoints)
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Authentication

CyberTask API uses JWT (JSON Web Token) authentication. See our [Authentication Guide](./authentication-guide.md) for detailed information.

### Quick Authentication Example

```javascript
// Login and store tokens
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your@email.com',
    password: 'your-password'
  })
});

const { accessToken, refreshToken } = loginResponse.data;

// Use access token for API calls
const tasksResponse = await fetch('/api/tasks', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## Making Your First Request

Let's walk through creating a complete workflow:

### Step 1: Create a Project

```javascript
const project = await fetch('/api/projects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My API Integration Project',
    description: 'Testing the CyberTask API integration',
    startDate: '2023-01-01T00:00:00.000Z',
    endDate: '2023-12-31T23:59:59.000Z'
  })
}).then(r => r.json());

console.log('Created project:', project.data.id);
```

### Step 2: Create Tasks

```javascript
const tasks = [
  {
    title: 'Setup API authentication',
    description: 'Implement JWT authentication flow',
    priority: 'HIGH',
    projectId: project.data.id
  },
  {
    title: 'Create task management UI',
    description: 'Build user interface for task operations',
    priority: 'MEDIUM',
    projectId: project.data.id
  },
  {
    title: 'Add real-time notifications',
    description: 'Implement WebSocket notifications',
    priority: 'LOW',
    projectId: project.data.id
  }
];

for (const taskData of tasks) {
  const task = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  }).then(r => r.json());
  
  console.log('Created task:', task.data.title);
}
```

### Step 3: Update Task Status

```javascript
// Get the first task
const tasksResponse = await fetch(`/api/projects/${project.data.id}/tasks`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(r => r.json());

const firstTask = tasksResponse.data[0];

// Update task to in progress
const updatedTask = await fetch(`/api/tasks/${firstTask.id}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'IN_PROGRESS',
    actualHours: 2.5
  })
}).then(r => r.json());

console.log('Task updated:', updatedTask.data.status);
```

### Step 4: Add Comments

```javascript
// Add a comment to the task
const comment = await fetch(`/api/tasks/${firstTask.id}/comments`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Started working on this task. Making good progress!'
  })
}).then(r => r.json());

console.log('Comment added:', comment.data.id);
```

## Core Concepts

### Users and Roles

CyberTask supports different user roles:

- **USER**: Basic user with access to assigned tasks and projects
- **MANAGER**: Can create projects and assign tasks to team members
- **ADMIN**: Full access to organization features
- **SUPER_ADMIN**: System-level administration

### Projects

Projects are containers for organizing related tasks. Key features:

- **Ownership**: Each project has an owner who can manage settings
- **Members**: Users can be added as project members
- **Status tracking**: Projects can be ACTIVE, COMPLETED, or ARCHIVED
- **Date management**: Optional start and end dates

### Tasks

Tasks are the core work items in CyberTask:

- **Status lifecycle**: TODO → IN_PROGRESS → IN_REVIEW → DONE
- **Priority levels**: LOW, MEDIUM, HIGH, CRITICAL
- **Assignment**: Tasks can be assigned to project members
- **Time tracking**: Estimated vs. actual hours
- **Dependencies**: Tasks can depend on other tasks
- **Comments**: Team communication on specific tasks

### Notifications

Real-time notifications keep users informed:

- **Task assignments**: When tasks are assigned to you
- **Status changes**: When task status is updated
- **Comments**: When someone comments on your tasks
- **Due dates**: Reminders for upcoming deadlines

## Common Use Cases

### 1. Project Management Dashboard

Build a dashboard showing project progress:

```javascript
class ProjectDashboard {
  constructor(projectId, accessToken) {
    this.projectId = projectId;
    this.accessToken = accessToken;
    this.baseURL = 'https://api.cybertask.com';
  }

  async getProjectOverview() {
    // Get project details
    const project = await this.apiCall(`/projects/${this.projectId}`);
    
    // Get all tasks for the project
    const tasks = await this.apiCall(`/projects/${this.projectId}/tasks`);
    
    // Get project members
    const members = await this.apiCall(`/projects/${this.projectId}/members`);
    
    // Calculate statistics
    const stats = this.calculateStats(tasks.data);
    
    return {
      project: project.data,
      tasks: tasks.data,
      members: members.data,
      stats
    };
  }

  calculateStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'DONE').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const overdue = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
    ).length;
    
    return {
      total,
      completed,
      inProgress,
      overdue,
      completionRate: total > 0 ? (completed / total * 100).toFixed(1) : 0
    };
  }

  async apiCall(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Usage
const dashboard = new ProjectDashboard('project-id', 'your-access-token');
const overview = await dashboard.getProjectOverview();
console.log(`Project completion: ${overview.stats.completionRate}%`);
```

### 2. Task Automation

Automate repetitive task operations:

```javascript
class TaskAutomation {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.cybertask.com';
  }

  async createTaskTemplate(templateData) {
    // Create multiple related tasks from a template
    const tasks = [];
    
    for (const task of templateData.tasks) {
      const createdTask = await this.apiCall('/tasks', 'POST', {
        ...task,
        projectId: templateData.projectId
      });
      tasks.push(createdTask.data);
    }

    // Create dependencies between tasks
    if (templateData.dependencies) {
      for (const dep of templateData.dependencies) {
        const dependentTask = tasks.find(t => t.title === dep.dependent);
        const dependsOnTask = tasks.find(t => t.title === dep.dependsOn);
        
        if (dependentTask && dependsOnTask) {
          await this.apiCall(`/tasks/${dependentTask.id}/dependencies`, 'POST', {
            dependsOnId: dependsOnTask.id
          });
        }
      }
    }

    return tasks;
  }

  async autoAssignTasks(projectId, assignmentRules) {
    const tasks = await this.apiCall(`/projects/${projectId}/tasks`);
    const unassignedTasks = tasks.data.filter(t => !t.assignedToId);

    for (const task of unassignedTasks) {
      const assignee = this.findBestAssignee(task, assignmentRules);
      if (assignee) {
        await this.apiCall(`/tasks/${task.id}`, 'PUT', {
          assignedToId: assignee.id
        });
      }
    }
  }

  findBestAssignee(task, rules) {
    // Implement assignment logic based on rules
    for (const rule of rules) {
      if (rule.condition(task)) {
        return rule.assignee;
      }
    }
    return null;
  }

  async apiCall(endpoint, method = 'GET', data = null) {
    const config = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    return response.json();
  }
}

// Usage
const automation = new TaskAutomation('your-access-token');

// Create a development sprint template
const sprintTemplate = {
  projectId: 'project-id',
  tasks: [
    {
      title: 'Sprint Planning',
      description: 'Plan sprint goals and tasks',
      priority: 'HIGH'
    },
    {
      title: 'UI Development',
      description: 'Implement user interface',
      priority: 'MEDIUM'
    },
    {
      title: 'API Integration',
      description: 'Connect frontend to API',
      priority: 'MEDIUM'
    },
    {
      title: 'Testing',
      description: 'Test all functionality',
      priority: 'HIGH'
    },
    {
      title: 'Sprint Review',
      description: 'Review sprint outcomes',
      priority: 'MEDIUM'
    }
  ],
  dependencies: [
    { dependent: 'UI Development', dependsOn: 'Sprint Planning' },
    { dependent: 'API Integration', dependsOn: 'UI Development' },
    { dependent: 'Testing', dependsOn: 'API Integration' },
    { dependent: 'Sprint Review', dependsOn: 'Testing' }
  ]
};

const sprintTasks = await automation.createTaskTemplate(sprintTemplate);
console.log(`Created ${sprintTasks.length} sprint tasks`);
```

### 3. Time Tracking Integration

Integrate time tracking with task management:

```javascript
class TimeTracker {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.cybertask.com';
    this.activeSessions = new Map();
  }

  startTracking(taskId) {
    if (this.activeSessions.has(taskId)) {
      throw new Error('Time tracking already active for this task');
    }

    const session = {
      taskId,
      startTime: new Date(),
      breaks: []
    };

    this.activeSessions.set(taskId, session);
    console.log(`Started tracking time for task ${taskId}`);
    
    return session;
  }

  async stopTracking(taskId) {
    const session = this.activeSessions.get(taskId);
    if (!session) {
      throw new Error('No active time tracking session for this task');
    }

    session.endTime = new Date();
    const totalMinutes = this.calculateTotalTime(session);
    const hours = totalMinutes / 60;

    // Update task with actual hours
    const task = await this.apiCall(`/tasks/${taskId}`, 'PUT', {
      actualHours: hours
    });

    this.activeSessions.delete(taskId);
    
    return {
      taskId,
      totalMinutes,
      totalHours: hours,
      task: task.data
    };
  }

  pauseTracking(taskId) {
    const session = this.activeSessions.get(taskId);
    if (!session) {
      throw new Error('No active session to pause');
    }

    session.breaks.push({
      start: new Date(),
      end: null
    });
  }

  resumeTracking(taskId) {
    const session = this.activeSessions.get(taskId);
    if (!session) {
      throw new Error('No session to resume');
    }

    const activeBreak = session.breaks.find(b => !b.end);
    if (activeBreak) {
      activeBreak.end = new Date();
    }
  }

  calculateTotalTime(session) {
    const totalTime = session.endTime - session.startTime;
    const breakTime = session.breaks.reduce((total, b) => {
      if (b.end) {
        return total + (b.end - b.start);
      }
      return total;
    }, 0);

    return Math.round((totalTime - breakTime) / 1000 / 60); // Convert to minutes
  }

  async getTimeReport(projectId, startDate, endDate) {
    const tasks = await this.apiCall(`/projects/${projectId}/tasks`);
    
    const report = {
      totalHours: 0,
      taskBreakdown: [],
      period: { startDate, endDate }
    };

    for (const task of tasks.data) {
      if (task.actualHours > 0) {
        report.totalHours += task.actualHours;
        report.taskBreakdown.push({
          taskId: task.id,
          title: task.title,
          hours: task.actualHours,
          assignee: task.assignedTo?.firstName + ' ' + task.assignedTo?.lastName
        });
      }
    }

    return report;
  }

  async apiCall(endpoint, method = 'GET', data = null) {
    const config = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    return response.json();
  }
}

// Usage
const timeTracker = new TimeTracker('your-access-token');

// Start tracking
timeTracker.startTracking('task-id');

// Simulate work and breaks
setTimeout(() => {
  timeTracker.pauseTracking('task-id'); // Break
  setTimeout(() => {
    timeTracker.resumeTracking('task-id'); // Resume work
    setTimeout(async () => {
      const result = await timeTracker.stopTracking('task-id');
      console.log(`Worked ${result.totalHours.toFixed(2)} hours on task`);
    }, 30000); // Work for 30 seconds
  }, 10000); // Break for 10 seconds
}, 60000); // Work for 1 minute
```

## SDKs and Libraries

### Official SDKs

We're working on official SDKs for popular languages:

- **JavaScript/Node.js**: Available on npm (coming soon)
- **Python**: Available on PyPI (coming soon)
- **PHP**: Available on Packagist (coming soon)
- **Ruby**: Available as a gem (coming soon)

### Community Libraries

Check our [GitHub organization](https://github.com/cybertask) for community-contributed libraries.

### Creating Your Own SDK

Here's a basic SDK structure you can use as a starting point:

```javascript
class CyberTaskSDK {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'https://api.cybertask.com';
    this.accessToken = options.accessToken;
    this.refreshToken = options.refreshToken;
  }

  // Authentication methods
  async login(email, password) { /* ... */ }
  async logout() { /* ... */ }
  async refreshAccessToken() { /* ... */ }

  // User methods
  async getProfile() { /* ... */ }
  async updateProfile(data) { /* ... */ }

  // Project methods
  async createProject(data) { /* ... */ }
  async getProjects(filters = {}) { /* ... */ }
  async getProject(id) { /* ... */ }
  async updateProject(id, data) { /* ... */ }
  async deleteProject(id) { /* ... */ }

  // Task methods
  async createTask(data) { /* ... */ }
  async getTasks(filters = {}) { /* ... */ }
  async getTask(id) { /* ... */ }
  async updateTask(id, data) { /* ... */ }
  async deleteTask(id) { /* ... */ }
  async addTaskComment(taskId, content) { /* ... */ }

  // Notification methods
  async getNotifications(filters = {}) { /* ... */ }
  async markNotificationAsRead(id) { /* ... */ }
  async markAllNotificationsAsRead() { /* ... */ }

  // Helper methods
  async apiCall(endpoint, options = {}) { /* ... */ }
  setAccessToken(token) { this.accessToken = token; }
  isAuthenticated() { return !!this.accessToken; }
}
```

## Rate Limiting

The CyberTask API implements rate limiting to ensure fair usage and system stability.

### Rate Limits

- **Authenticated requests**: 1000 requests per 15 minutes per user
- **Unauthenticated requests**: 100 requests per 15 minutes per IP address
- **Bulk operations**: Special limits may apply

### Rate Limit Headers

Every API response includes rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 900
```

### Handling Rate Limits

```javascript
class RateLimitHandler {
  constructor() {
    this.retryQueue = [];
    this.processing = false;
  }

  async makeRequest(url, options) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 
                          response.headers.get('X-RateLimit-Reset');
        
        if (retryAfter) {
          await this.waitAndRetry(url, options, retryAfter);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async waitAndRetry(url, options, retryAfter) {
    const waitTime = parseInt(retryAfter) * 1000;
    
    return new Promise((resolve) => {
      setTimeout(async () => {
        const response = await fetch(url, options);
        resolve(response);
      }, waitTime);
    });
  }

  // Implement exponential backoff
  async exponentialBackoff(fn, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts || error.status !== 429) {
          throw error;
        }
        
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "error": "BAD_REQUEST",
  "errors": [
    {
      "field": "title",
      "message": "Title is required",
      "value": null
    }
  ]
}
```

### Error Categories

1. **Client Errors (4xx)**:
   - `400 Bad Request`: Invalid request data
   - `401 Unauthorized`: Authentication required
   - `403 Forbidden`: Insufficient permissions
   - `404 Not Found`: Resource not found
   - `409 Conflict`: Resource already exists
   - `429 Too Many Requests`: Rate limit exceeded

2. **Server Errors (5xx)**:
   - `500 Internal Server Error`: Server-side error
   - `503 Service Unavailable`: Service temporarily down

### Error Handling Best Practices

```javascript
class APIErrorHandler {
  static async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 400:
          throw new ValidationError(errorData.message, errorData.errors);
        case 401:
          throw new AuthenticationError(errorData.message);
        case 403:
          throw new AuthorizationError(errorData.message);
        case 404:
          throw new NotFoundError(errorData.message);
        case 409:
          throw new ConflictError(errorData.message);
        case 429:
          throw new RateLimitError(errorData.message, response.headers);
        default:
          throw new APIError(errorData.message, response.status);
      }
    }
    
    return response.json();
  }
}

// Custom Error Classes
class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

class ValidationError extends APIError {
  constructor(message, errors) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class AuthenticationError extends APIError {
  constructor(message) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

// Usage
try {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });

  const result = await APIErrorHandler.handleResponse(response);
  console.log('Task created:', result.data);
  
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation errors:', error.errors);
  } else if (error instanceof AuthenticationError) {
    console.error('Please login again');
    // Redirect to login
  } else {
    console.error('API error:', error.message);
  }
}
```

## Webhooks

CyberTask supports webhooks for real-time notifications about events in your account.

### Webhook Events

- `task.created`: New task created
- `task.updated`: Task details updated
- `task.assigned`: Task assigned to user
- `task.completed`: Task marked as complete
- `project.created`: New project created
- `project.updated`: Project details updated
- `comment.created`: New comment added

### Setting Up Webhooks

Webhooks can be configured through the API (coming soon) or dashboard:

```javascript
// Create a webhook endpoint
const webhook = await fetch('/api/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://your-app.com/webhooks/cybertask',
    events: ['task.created', 'task.updated', 'task.completed'],
    secret: 'your-webhook-secret'
  })
});
```

### Webhook Payload Example

```json
{
  "event": "task.created",
  "timestamp": "2023-06-15T10:30:00.000Z",
  "data": {
    "task": {
      "id": "cld1234567890",
      "title": "New task created",
      "status": "TODO",
      "priority": "MEDIUM",
      "projectId": "cld0987654321",
      "createdBy": {
        "id": "cld5555555555",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }
}
```

### Webhook Verification

Always verify webhook authenticity:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Express.js webhook handler
app.post('/webhooks/cybertask', (req, res) => {
  const signature = req.headers['x-cybertask-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Process webhook event
  const { event, data } = req.body;
  
  switch (event) {
    case 'task.created':
      handleTaskCreated(data.task);
      break;
    case 'task.updated':
      handleTaskUpdated(data.task);
      break;
    // ... other events
  }
  
  res.status(200).send('OK');
});
```

## Testing

### Test Environment

Use the development server for testing:

```javascript
const testConfig = {
  baseURL: 'http://localhost:3000/api',
  testUser: {
    email: 'test@cybertask.com',
    password: 'testPassword123'
  }
};
```

### Unit Testing Example

```javascript
// Using Jest
const CyberTaskSDK = require('./cybertask-sdk');

describe('CyberTask API', () => {
  let sdk;
  let testProject;

  beforeAll(async () => {
    sdk = new CyberTaskSDK({
      baseURL: 'http://localhost:3000/api'
    });
    
    await sdk.login('test@cybertask.com', 'testPassword123');
  });

  beforeEach(async () => {
    // Create a test project for each test
    testProject = await sdk.createProject({
      name: 'Test Project',
      description: 'Used for testing'
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testProject) {
      await sdk.deleteProject(testProject.data.id);
    }
  });

  test('should create a task', async () => {
    const taskData = {
      title: 'Test Task',
      description: 'This is a test task',
      priority: 'MEDIUM',
      projectId: testProject.data.id
    };

    const task = await sdk.createTask(taskData);

    expect(task.success).toBe(true);
    expect(task.data.title).toBe(taskData.title);
    expect(task.data.status).toBe('TODO');
  });

  test('should update task status', async () => {
    // Create a task first
    const task = await sdk.createTask({
      title: 'Test Task',
      projectId: testProject.data.id
    });

    // Update the task
    const updatedTask = await sdk.updateTask(task.data.id, {
      status: 'IN_PROGRESS'
    });

    expect(updatedTask.data.status).toBe('IN_PROGRESS');
  });

  test('should handle validation errors', async () => {
    await expect(sdk.createTask({
      // Missing required fields
      description: 'Task without title'
    })).rejects.toThrow('Validation failed');
  });
});
```

### Integration Testing

```javascript
// Integration test example
describe('Task Workflow Integration', () => {
  test('complete task lifecycle', async () => {
    // 1. Create project
    const project = await sdk.createProject({
      name: 'Integration Test Project'
    });

    // 2. Create task
    const task = await sdk.createTask({
      title: 'Integration Test Task',
      projectId: project.data.id
    });

    // 3. Add comment
    const comment = await sdk.addTaskComment(task.data.id, 
      'Starting work on this task'
    );

    // 4. Update task status
    const updatedTask = await sdk.updateTask(task.data.id, {
      status: 'IN_PROGRESS'
    });

    // 5. Complete task
    const completedTask = await sdk.updateTask(task.data.id, {
      status: 'DONE',
      actualHours: 3.5
    });

    // Verify the workflow
    expect(completedTask.data.status).toBe('DONE');
    expect(completedTask.data.actualHours).toBe(3.5);

    // Clean up
    await sdk.deleteProject(project.data.id);
  });
});
```

## Production Checklist

Before going live with your CyberTask integration:

### Security
- [ ] Use HTTPS for all API calls
- [ ] Implement proper token storage (secure storage for mobile, httpOnly cookies for web)
- [ ] Validate SSL certificates
- [ ] Never log sensitive information (tokens, passwords)
- [ ] Implement proper CORS policies
- [ ] Use environment variables for configuration

### Error Handling
- [ ] Handle all HTTP status codes appropriately
- [ ] Implement retry logic for transient failures
- [ ] Log errors for monitoring
- [ ] Provide user-friendly error messages
- [ ] Handle network connectivity issues

### Performance
- [ ] Implement caching where appropriate
- [ ] Use pagination for large datasets
- [ ] Implement connection pooling
- [ ] Monitor API response times
- [ ] Optimize payload sizes

### Monitoring
- [ ] Set up logging for API calls
- [ ] Monitor rate limits and usage
- [ ] Track error rates
- [ ] Implement health checks
- [ ] Set up alerting for failures

### User Experience
- [ ] Implement loading states
- [ ] Handle offline scenarios
- [ ] Provide progress indicators
- [ ] Implement proper timeout handling
- [ ] Test on various devices/networks

### Testing
- [ ] Unit tests for SDK/integration code
- [ ] Integration tests for critical workflows
- [ ] Load testing for expected traffic
- [ ] Security testing
- [ ] User acceptance testing

## Support

### Documentation
- [API Reference](./api-reference.md): Complete endpoint documentation
- [Authentication Guide](./authentication-guide.md): Detailed auth implementation
- [Interactive API Explorer](./swagger-ui.html): Test endpoints directly

### Getting Help

1. **Documentation**: Check our comprehensive docs first
2. **Community Forum**: Connect with other developers
3. **GitHub Issues**: Report bugs and request features
4. **Email Support**: [support@cybertask.com](mailto:support@cybertask.com)
5. **Status Page**: Check API status at [status.cybertask.com](https://status.cybertask.com)

### Response Times
- **Community Forum**: Community-driven, varies
- **GitHub Issues**: 2-3 business days
- **Email Support**: 
  - General inquiries: 24-48 hours
  - Critical issues: 4-8 hours
  - Enterprise customers: 2 hours

### What to Include in Support Requests

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected vs actual behavior**
4. **Code samples** (remove sensitive data)
5. **Error messages** and status codes
6. **API request/response examples**
7. **Environment details** (SDK version, language, etc.)

### Enterprise Support

For enterprise customers, we offer:
- **Dedicated support channel**
- **Priority response times**
- **Custom integration assistance**
- **Training and onboarding**
- **SLA agreements**

Contact [enterprise@cybertask.com](mailto:enterprise@cybertask.com) for more information.

---

**Ready to build amazing task management experiences with CyberTask?**

Start with our [Interactive API Explorer](./swagger-ui.html) to test endpoints, then check out the [Authentication Guide](./authentication-guide.md) to implement secure access to your application.

Happy coding! 🚀