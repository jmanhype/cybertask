# CyberTask API Specification

## API Overview
CyberTask provides a comprehensive RESTful API with GraphQL support for complex queries. All APIs follow OpenAPI 3.0 specification and support JSON:API format for consistent resource representation.

## Base Configuration
- **Base URL**: `https://api.cybertask.com/v1`
- **Authentication**: Bearer Token (JWT)
- **Content Type**: `application/json`
- **Rate Limiting**: 1000 requests/hour per user, 10000/hour per organization
- **API Versioning**: URL path versioning (`/v1/`, `/v2/`)

## Authentication Flow

### OAuth 2.0 + JWT Authentication
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### OAuth Providers
```http
GET /auth/oauth/{provider}/authorize
POST /auth/oauth/{provider}/callback
```
Supported providers: `google`, `github`, `microsoft`

## Core API Endpoints

### User Management

#### Get User Profile
```http
GET /users/me
Authorization: Bearer {token}

Response:
{
  "data": {
    "id": "uuid",
    "type": "user",
    "attributes": {
      "email": "user@example.com",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://...",
      "timezone": "UTC",
      "locale": "en-US",
      "theme": "light",
      "email_verified": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    "relationships": {
      "organizations": {
        "data": [
          {"id": "uuid", "type": "organization"}
        ]
      },
      "roles": {
        "data": [
          {"id": "uuid", "type": "role"}
        ]
      }
    }
  }
}
```

#### Update User Profile
```http
PATCH /users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "data": {
    "type": "user",
    "attributes": {
      "first_name": "John",
      "last_name": "Smith",
      "timezone": "America/New_York",
      "theme": "dark"
    }
  }
}
```

### Organization Management

#### List Organizations
```http
GET /organizations
Authorization: Bearer {token}

Query Parameters:
- page[size]: Number of items per page (default: 20, max: 100)
- page[number]: Page number (default: 1)
- sort: Sort field (created_at, name, -created_at)
- filter[name]: Filter by organization name

Response:
{
  "data": [
    {
      "id": "uuid",
      "type": "organization",
      "attributes": {
        "name": "Acme Corp",
        "slug": "acme-corp",
        "description": "...",
        "avatar_url": "...",
        "subscription_tier": "pro",
        "created_at": "2025-01-01T00:00:00Z"
      },
      "relationships": {
        "members": {
          "links": {
            "related": "/organizations/{id}/members"
          }
        },
        "projects": {
          "links": {
            "related": "/organizations/{id}/projects"
          }
        }
      }
    }
  ],
  "meta": {
    "total_count": 50,
    "page_count": 3,
    "current_page": 1
  },
  "links": {
    "first": "/organizations?page[number]=1",
    "next": "/organizations?page[number]=2",
    "last": "/organizations?page[number]=3"
  }
}
```

#### Create Organization
```http
POST /organizations
Authorization: Bearer {token}

{
  "data": {
    "type": "organization",
    "attributes": {
      "name": "New Company",
      "slug": "new-company",
      "description": "Our awesome company"
    }
  }
}
```

### Project Management

#### List Projects
```http
GET /organizations/{org_id}/projects
Authorization: Bearer {token}

Query Parameters:
- filter[status]: active, archived, completed
- filter[team_id]: Filter by team
- filter[search]: Full-text search
- include: team,members,tasks_summary
- sort: name, created_at, -priority

Response:
{
  "data": [
    {
      "id": "uuid",
      "type": "project",
      "attributes": {
        "name": "Mobile App v2.0",
        "description": "Next generation mobile app",
        "status": "active",
        "priority": "high",
        "color": "#FF6B6B",
        "start_date": "2025-01-01",
        "end_date": "2025-06-01",
        "estimated_hours": 500,
        "actual_hours": 125,
        "progress_percentage": 25,
        "created_at": "2025-01-01T00:00:00Z"
      },
      "relationships": {
        "organization": {
          "data": {"id": "uuid", "type": "organization"}
        },
        "team": {
          "data": {"id": "uuid", "type": "team"}
        },
        "tasks": {
          "links": {
            "related": "/projects/{id}/tasks"
          },
          "meta": {
            "count": 45,
            "completed": 12,
            "in_progress": 8,
            "todo": 25
          }
        }
      }
    }
  ]
}
```

#### Create Project
```http
POST /organizations/{org_id}/projects
Authorization: Bearer {token}

{
  "data": {
    "type": "project",
    "attributes": {
      "name": "New Project",
      "description": "Project description",
      "priority": "medium",
      "color": "#4ECDC4",
      "start_date": "2025-02-01",
      "end_date": "2025-08-01",
      "estimated_hours": 300
    },
    "relationships": {
      "team": {
        "data": {"id": "team_uuid", "type": "team"}
      }
    }
  }
}
```

### Task Management

#### List Tasks
```http
GET /projects/{project_id}/tasks
Authorization: Bearer {token}

Query Parameters:
- filter[status]: todo, in_progress, review, done, blocked
- filter[priority]: low, medium, high, urgent
- filter[assigned_to]: User ID
- filter[due_date][gte]: Tasks due after date
- filter[due_date][lte]: Tasks due before date
- filter[labels]: Comma-separated labels
- filter[search]: Full-text search
- include: assignee,project,comments,dependencies
- sort: priority, due_date, created_at, -ai_priority_score

Response:
{
  "data": [
    {
      "id": "uuid",
      "type": "task",
      "attributes": {
        "title": "Implement user authentication",
        "description": "Create JWT-based authentication system",
        "status": "in_progress",
        "priority": "high",
        "difficulty_score": 7,
        "story_points": 8,
        "due_date": "2025-02-15T23:59:59Z",
        "estimated_hours": 16,
        "actual_hours": 6.5,
        "labels": ["backend", "auth", "security"],
        "category": "development",
        "ai_priority_score": 0.85,
        "ai_complexity_score": 0.72,
        "created_at": "2025-01-15T10:00:00Z",
        "updated_at": "2025-01-20T15:30:00Z"
      },
      "relationships": {
        "project": {
          "data": {"id": "uuid", "type": "project"}
        },
        "assignee": {
          "data": {"id": "uuid", "type": "user"}
        },
        "parent_task": {
          "data": {"id": "uuid", "type": "task"}
        },
        "subtasks": {
          "data": [
            {"id": "uuid", "type": "task"}
          ]
        },
        "dependencies": {
          "data": [
            {"id": "uuid", "type": "task"}
          ]
        }
      }
    }
  ]
}
```

#### Create Task
```http
POST /projects/{project_id}/tasks
Authorization: Bearer {token}

{
  "data": {
    "type": "task",
    "attributes": {
      "title": "Design user dashboard",
      "description": "Create wireframes and mockups for user dashboard",
      "priority": "medium",
      "difficulty_score": 5,
      "story_points": 3,
      "due_date": "2025-02-20T23:59:59Z",
      "estimated_hours": 8,
      "labels": ["design", "ui", "dashboard"],
      "category": "design"
    },
    "relationships": {
      "assignee": {
        "data": {"id": "user_uuid", "type": "user"}
      },
      "parent_task": {
        "data": {"id": "parent_uuid", "type": "task"}
      }
    }
  }
}
```

#### Update Task Status
```http
PATCH /tasks/{task_id}/status
Authorization: Bearer {token}

{
  "data": {
    "type": "task",
    "attributes": {
      "status": "done",
      "actual_hours": 12.5
    }
  }
}
```

### AI-Enhanced Endpoints

#### Analyze Task with AI
```http
POST /ai/analyze-task
Authorization: Bearer {token}

{
  "task_id": "uuid",
  "analysis_types": ["priority", "complexity", "time_estimation"],
  "context": {
    "project_history": true,
    "team_velocity": true,
    "similar_tasks": true
  }
}

Response:
{
  "data": {
    "id": "analysis_uuid",
    "type": "ai_analysis",
    "attributes": {
      "priority_score": 0.85,
      "complexity_score": 0.72,
      "estimated_hours": 14.5,
      "confidence": 0.89,
      "insights": [
        "Similar tasks took 20% longer than estimated",
        "High dependency complexity detected",
        "Recommended to break into 3 subtasks"
      ],
      "recommendations": [
        {
          "type": "breakdown",
          "description": "Consider splitting into smaller tasks",
          "priority": "high"
        },
        {
          "type": "assignment",
          "description": "Assign to senior developer",
          "priority": "medium"
        }
      ]
    }
  }
}
```

#### Natural Language Task Creation
```http
POST /ai/natural-language/create-task
Authorization: Bearer {token}

{
  "project_id": "uuid",
  "description": "We need to add a feature that lets users export their data to CSV format, it should be available in the settings page and include all task data with filtering options",
  "context": {
    "existing_features": ["data_import", "pdf_export"],
    "tech_stack": ["react", "node.js", "postgresql"]
  }
}

Response:
{
  "data": {
    "type": "task",
    "attributes": {
      "title": "Implement CSV data export feature",
      "description": "Add CSV export functionality to settings page with filtering options for task data",
      "priority": "medium",
      "estimated_hours": 12,
      "labels": ["feature", "export", "csv"],
      "category": "development",
      "ai_generated": true
    },
    "suggested_subtasks": [
      {
        "title": "Design export UI in settings page",
        "estimated_hours": 3,
        "category": "design"
      },
      {
        "title": "Implement backend CSV export API",
        "estimated_hours": 6,
        "category": "backend"
      },
      {
        "title": "Add filtering options for export",
        "estimated_hours": 3,
        "category": "backend"
      }
    ]
  }
}
```

### Search and Filtering

#### Global Search
```http
GET /search
Authorization: Bearer {token}

Query Parameters:
- q: Search query
- type: tasks, projects, users (comma-separated)
- organization_id: Limit to organization
- limit: Results per type (default: 10)

Response:
{
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "type": "task",
        "attributes": {
          "title": "...",
          "highlight": {
            "title": "Implement <mark>authentication</mark>",
            "description": "JWT-based <mark>authentication</mark> system"
          }
        }
      }
    ],
    "projects": [...],
    "users": [...]
  },
  "meta": {
    "total_results": 15,
    "search_time_ms": 23
  }
}
```

### File Attachments

#### Upload Attachment
```http
POST /tasks/{task_id}/attachments
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary data]
description: "Screenshot of bug"

Response:
{
  "data": {
    "id": "uuid",
    "type": "attachment",
    "attributes": {
      "filename": "bug-screenshot.png",
      "original_filename": "Screenshot 2025-01-20.png",
      "mime_type": "image/png",
      "file_size": 245760,
      "file_url": "https://files.cybertask.com/attachments/...",
      "thumbnail_url": "https://files.cybertask.com/thumbnails/...",
      "uploaded_at": "2025-01-20T10:30:00Z"
    }
  }
}
```

### Real-time Updates (WebSocket)

#### Connection
```javascript
// WebSocket connection
const ws = new WebSocket('wss://api.cybertask.com/ws?token=jwt_token');

// Subscribe to updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: [
    'tasks.project.uuid',
    'notifications.user.uuid'
  ]
}));

// Receive updates
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // {
  //   type: 'task.updated',
  //   data: { task object },
  //   timestamp: '2025-01-20T10:30:00Z'
  // }
};
```

## GraphQL API

### GraphQL Endpoint
```http
POST /graphql
Authorization: Bearer {token}
Content-Type: application/json
```

### Example Queries

#### Fetch Project with Tasks and Team
```graphql
query GetProjectDetails($projectId: ID!) {
  project(id: $projectId) {
    id
    name
    description
    status
    progress {
      totalTasks
      completedTasks
      percentage
    }
    team {
      id
      name
      members {
        id
        name
        avatar
        role
      }
    }
    tasks(first: 50, orderBy: { priority: DESC, dueDate: ASC }) {
      edges {
        node {
          id
          title
          status
          priority
          assignee {
            id
            name
            avatar
          }
          dueDate
          aiInsights {
            priorityScore
            complexityScore
            recommendations
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

#### Create Task with Dependencies
```graphql
mutation CreateTaskWithDependencies($input: CreateTaskInput!) {
  createTask(input: $input) {
    task {
      id
      title
      status
      dependencies {
        id
        title
        status
      }
    }
    errors {
      field
      message
    }
  }
}

# Variables
{
  "input": {
    "projectId": "uuid",
    "title": "New feature implementation",
    "description": "Detailed description",
    "priority": "HIGH",
    "assigneeId": "uuid",
    "dueDate": "2025-02-15T23:59:59Z",
    "dependencyIds": ["uuid1", "uuid2"]
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "errors": [
    {
      "id": "unique-error-id",
      "status": "400",
      "code": "INVALID_PARAMETER",
      "title": "Invalid parameter",
      "detail": "The 'priority' field must be one of: low, medium, high, urgent",
      "source": {
        "pointer": "/data/attributes/priority"
      },
      "meta": {
        "timestamp": "2025-01-20T10:30:00Z",
        "request_id": "req_123456"
      }
    }
  ]
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` (401)
- `INSUFFICIENT_PERMISSIONS` (403)
- `RESOURCE_NOT_FOUND` (404)
- `VALIDATION_ERROR` (422)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_SERVER_ERROR` (500)

## Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643723400
X-RateLimit-Retry-After: 3600
```

### Rate Limit Response
```json
{
  "errors": [
    {
      "status": "429",
      "code": "RATE_LIMIT_EXCEEDED",
      "title": "Rate limit exceeded",
      "detail": "You have exceeded the rate limit of 1000 requests per hour",
      "meta": {
        "retry_after": 3600
      }
    }
  ]
}
```

## Webhooks

### Webhook Configuration
```http
POST /webhooks
Authorization: Bearer {token}

{
  "data": {
    "type": "webhook",
    "attributes": {
      "url": "https://your-app.com/webhooks/cybertask",
      "events": [
        "task.created",
        "task.updated",
        "task.completed",
        "project.updated"
      ],
      "secret": "your-webhook-secret",
      "active": true
    }
  }
}
```

### Webhook Payload
```json
{
  "id": "webhook-event-id",
  "type": "task.completed",
  "data": {
    "id": "task-uuid",
    "type": "task",
    "attributes": {
      "title": "Task title",
      "status": "done",
      "completed_at": "2025-01-20T10:30:00Z"
    }
  },
  "timestamp": "2025-01-20T10:30:00Z",
  "signature": "sha256=abc123..."
}
```

## API Versioning

### Version Support
- **v1**: Current stable version
- **v2**: Beta features (opt-in)
- **Deprecation**: 12 months notice for breaking changes

### Version Selection
```http
# URL versioning (preferred)
GET /v1/tasks

# Header versioning
GET /tasks
Accept: application/vnd.cybertask.v1+json

# Query parameter
GET /tasks?version=v1
```

## SDK and Client Libraries

### Official SDKs
- **JavaScript/TypeScript**: `@cybertask/js-sdk`
- **Python**: `cybertask-python`
- **Go**: `github.com/cybertask/go-sdk`
- **PHP**: `cybertask/php-sdk`

### Example Usage (JavaScript)
```javascript
import { CyberTaskAPI } from '@cybertask/js-sdk';

const api = new CyberTaskAPI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.cybertask.com/v1'
});

// Create a task
const task = await api.tasks.create({
  projectId: 'project-uuid',
  title: 'New task',
  priority: 'high'
});

// Subscribe to real-time updates
api.subscribe('tasks.project.uuid', (update) => {
  console.log('Task updated:', update);
});
```