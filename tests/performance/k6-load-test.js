import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const authSuccessRate = new Rate('auth_success_rate');
const taskCreationTime = new Trend('task_creation_time');
const apiErrors = new Counter('api_errors');

// Test configuration
export let options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 }, // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 }, // Stay at 10 users for 5 minutes
    { duration: '2m', target: 50 }, // Ramp up to 50 users over 2 minutes
    { duration: '10m', target: 50 }, // Stay at 50 users for 10 minutes
    { duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '2m', target: 0 }, // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'], // 95% of requests under 2s, 99% under 3s
    'http_req_failed': ['rate<0.1'], // Error rate should be less than 10%
    'auth_success_rate': ['rate>0.95'], // Auth success rate should be above 95%
    'task_creation_time': ['p(95)<1500'], // Task creation should be under 1.5s for 95% of requests
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api';

// Test data
const testUsers = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!', firstName: 'Load', lastName: 'Test1' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!', firstName: 'Load', lastName: 'Test2' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!', firstName: 'Load', lastName: 'Test3' },
  { email: 'loadtest4@example.com', password: 'LoadTest123!', firstName: 'Load', lastName: 'Test4' },
  { email: 'loadtest5@example.com', password: 'LoadTest123!', firstName: 'Load', lastName: 'Test5' },
];

const taskStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const taskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const taskTags = [
  ['frontend', 'react'],
  ['backend', 'api'],
  ['database', 'postgresql'],
  ['testing', 'qa'],
  ['bug', 'hotfix'],
  ['feature', 'enhancement'],
];

// Utility functions
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function getRandomTaskData() {
  return {
    title: `Load Test Task ${Math.random().toString(36).substring(7)}`,
    description: `This is a load test task created at ${new Date().toISOString()}`,
    status: taskStatuses[Math.floor(Math.random() * taskStatuses.length)],
    priority: taskPriorities[Math.floor(Math.random() * taskPriorities.length)],
    estimatedHours: Math.floor(Math.random() * 40) + 1,
    tags: taskTags[Math.floor(Math.random() * taskTags.length)],
    dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function authenticateUser(user) {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const authSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.tokens && body.data.tokens.accessToken;
      } catch (e) {
        return false;
      }
    },
  });

  authSuccessRate.add(authSuccess);

  if (!authSuccess) {
    apiErrors.add(1);
    console.error(`Authentication failed for ${user.email}: ${loginRes.status} ${loginRes.body}`);
    return null;
  }

  try {
    const responseBody = JSON.parse(loginRes.body);
    return {
      accessToken: responseBody.data.tokens.accessToken,
      refreshToken: responseBody.data.tokens.refreshToken,
      user: responseBody.data.user,
    };
  } catch (e) {
    console.error(`Failed to parse login response: ${e.message}`);
    return null;
  }
}

function createProject(authToken) {
  const projectData = {
    name: `Load Test Project ${Math.random().toString(36).substring(7)}`,
    description: 'Project created during load testing',
  };

  const response = http.post(`${BASE_URL}/projects`, JSON.stringify(projectData), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  const success = check(response, {
    'project creation status is 201': (r) => r.status === 201,
  });

  if (!success) {
    apiErrors.add(1);
    return null;
  }

  try {
    const responseBody = JSON.parse(response.body);
    return responseBody.data.project;
  } catch (e) {
    return null;
  }
}

// Main test function
export default function () {
  const user = getRandomUser();
  
  group('Authentication Flow', () => {
    const authData = authenticateUser(user);
    
    if (!authData) {
      fail('Authentication failed - aborting test iteration');
      return;
    }

    const { accessToken, refreshToken } = authData;

    group('Project Management', () => {
      // Get user's projects
      const projectsRes = http.get(`${BASE_URL}/projects`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      check(projectsRes, {
        'get projects status is 200': (r) => r.status === 200,
      });

      let projectId;
      
      // Create a new project for this test iteration
      const newProject = createProject(accessToken);
      if (newProject) {
        projectId = newProject.id;
      } else {
        // Try to use an existing project if creation failed
        try {
          const projects = JSON.parse(projectsRes.body);
          if (projects.data && projects.data.projects && projects.data.projects.length > 0) {
            projectId = projects.data.projects[0].id;
          }
        } catch (e) {
          console.error('Failed to get project ID');
        }
      }

      if (!projectId) {
        console.error('No project available for task creation');
        return;
      }

      group('Task Management', () => {
        // Create multiple tasks
        for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
          const taskData = { ...getRandomTaskData(), projectId };
          
          const startTime = new Date();
          const createTaskRes = http.post(`${BASE_URL}/tasks`, JSON.stringify(taskData), {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          const endTime = new Date();
          
          taskCreationTime.add(endTime - startTime);

          const taskCreated = check(createTaskRes, {
            'task creation status is 201': (r) => r.status === 201,
          });

          if (!taskCreated) {
            apiErrors.add(1);
            continue;
          }

          let taskId;
          try {
            const responseBody = JSON.parse(createTaskRes.body);
            taskId = responseBody.data.task.id;
          } catch (e) {
            continue;
          }

          // Update task status randomly
          if (Math.random() > 0.5 && taskId) {
            const updateData = {
              status: taskStatuses[Math.floor(Math.random() * taskStatuses.length)],
              actualHours: Math.floor(Math.random() * 10) + 1,
            };

            const updateRes = http.put(`${BASE_URL}/tasks/${taskId}`, JSON.stringify(updateData), {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            check(updateRes, {
              'task update status is 200': (r) => r.status === 200,
            });
          }

          // Get task details
          if (taskId) {
            const getTaskRes = http.get(`${BASE_URL}/tasks/${taskId}`, {
              headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            check(getTaskRes, {
              'get task status is 200': (r) => r.status === 200,
            });
          }
        }

        // Get all tasks with various filters
        const filterTests = [
          '',
          '?status=TODO',
          '?priority=HIGH',
          '?assignedTo=me',
          `?projectId=${projectId}`,
          '?page=1&limit=10',
          '?search=load test',
        ];

        filterTests.forEach(filter => {
          const tasksRes = http.get(`${BASE_URL}/tasks${filter}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });

          check(tasksRes, {
            [`get tasks with filter "${filter}" status is 200`]: (r) => r.status === 200,
          });
        });
      });

      group('User Management', () => {
        // Get current user profile
        const profileRes = http.get(`${BASE_URL}/users/profile`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        check(profileRes, {
          'get user profile status is 200': (r) => r.status === 200,
        });

        // Update user profile
        const updateProfileData = {
          firstName: user.firstName,
          lastName: `${user.lastName} Updated`,
        };

        const updateProfileRes = http.put(`${BASE_URL}/users/profile`, JSON.stringify(updateProfileData), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        check(updateProfileRes, {
          'update user profile status is 200': (r) => r.status === 200,
        });
      });

      group('Token Refresh', () => {
        // Test token refresh functionality
        const refreshRes = http.post(`${BASE_URL}/auth/refresh`, JSON.stringify({
          refreshToken: refreshToken,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });

        check(refreshRes, {
          'token refresh status is 200': (r) => r.status === 200,
          'token refresh returns new tokens': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.data && body.data.tokens && body.data.tokens.accessToken;
            } catch (e) {
              return false;
            }
          },
        });
      });
    });
  });

  // Add some realistic thinking time
  sleep(Math.random() * 2 + 1); // Sleep between 1-3 seconds
}

// Setup function - runs once before all tests
export function setup() {
  console.log('Starting CyberTask Load Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Users: ${testUsers.length}`);
  
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`API health check failed: ${healthRes.status}`);
  }
  
  console.log('API health check passed');
  return { baseUrl: BASE_URL };
}

// Teardown function - runs once after all tests
export function teardown(data) {
  console.log('Load test completed');
  console.log('Cleaning up test data...');
  
  // In a real scenario, you might want to clean up test data here
  // For now, we'll just log the completion
  console.log('Teardown completed');
}

// Handle summary - custom reporting
export function handleSummary(data) {
  const summary = {
    testRun: {
      timestamp: new Date().toISOString(),
      duration: data.metrics.iteration_duration.values.avg,
      totalIterations: data.metrics.iterations.values.count,
      totalRequests: data.metrics.http_reqs.values.count,
    },
    performance: {
      avgResponseTime: data.metrics.http_req_duration.values.avg,
      p95ResponseTime: data.metrics.http_req_duration.values['p(95)'],
      p99ResponseTime: data.metrics.http_req_duration.values['p(99)'],
      maxResponseTime: data.metrics.http_req_duration.values.max,
      minResponseTime: data.metrics.http_req_duration.values.min,
    },
    reliability: {
      successRate: (1 - data.metrics.http_req_failed.values.rate) * 100,
      errorRate: data.metrics.http_req_failed.values.rate * 100,
      totalErrors: data.metrics.api_errors ? data.metrics.api_errors.values.count : 0,
    },
    authentication: {
      authSuccessRate: data.metrics.auth_success_rate ? data.metrics.auth_success_rate.values.rate * 100 : 0,
    },
    taskManagement: {
      avgTaskCreationTime: data.metrics.task_creation_time ? data.metrics.task_creation_time.values.avg : 0,
      p95TaskCreationTime: data.metrics.task_creation_time ? data.metrics.task_creation_time.values['p(95)'] : 0,
    },
    thresholdsPassed: {
      responseTime: data.metrics.http_req_duration.values['p(95)'] < 2000,
      errorRate: data.metrics.http_req_failed.values.rate < 0.1,
      authSuccess: data.metrics.auth_success_rate ? data.metrics.auth_success_rate.values.rate > 0.95 : false,
      taskCreation: data.metrics.task_creation_time ? data.metrics.task_creation_time.values['p(95)'] < 1500 : false,
    },
  };

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'load-test-results.json': JSON.stringify(summary, null, 2),
  };
}