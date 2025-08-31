# CyberTask API Reference

A comprehensive REST API for task and project management built with Express, TypeScript, and Prisma.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Pagination](#pagination)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Users](#user-endpoints)
  - [Tasks](#task-endpoints)
  - [Projects](#project-endpoints)
  - [Notifications](#notification-endpoints)
- [Data Models](#data-models)
- [Status Codes](#status-codes)

## Overview

The CyberTask API provides a complete solution for managing tasks, projects, and team collaboration. It supports user authentication, real-time notifications, task dependencies, and role-based access control.

### Base URLs

- **Development:** `http://localhost:3000/api`
- **Production:** `https://api.cybertask.com`

### Content Type

All API requests and responses use `application/json` content type.

### API Versioning

The API is currently at version 1.0. Future versions will be available at `/api/v2`, `/api/v3`, etc.

## Authentication

### Bearer Token Authentication

Most endpoints require authentication using JWT Bearer tokens. Include your access token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Types

- **Access Token:** Short-lived token (1 hour) for API requests
- **Refresh Token:** Long-lived token (30 days) for obtaining new access tokens

### Authentication Flow

1. Register or login to obtain tokens
2. Use access token for API requests
3. Refresh access token when expired using refresh token
4. Logout to invalidate all tokens

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "value": null
    }
  ]
}
```

### Validation Errors

Validation errors return status code `400` with detailed field-level error information:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "value": "123"
    }
  ]
}
```

## Pagination

### Pagination Parameters

Most list endpoints support pagination:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Field to sort by
- `sortOrder` - Sort direction (`asc` or `desc`)

### Pagination Response

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Default:** 100 requests per 15 minutes per IP
- **Authenticated:** 1000 requests per 15 minutes per user

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "cld1234567890",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER",
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### POST /auth/login

Authenticate user credentials and return JWT tokens.

**Request:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "cld1234567890",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER",
      "lastLoginAt": "2023-01-01T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### POST /auth/refresh

Get a new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### POST /auth/logout

Invalidate user's refresh tokens.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### POST /auth/forgot-password

Send password reset email to user.

**Request:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### POST /auth/reset-password

Reset user password using reset token.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

### User Endpoints

#### GET /users/profile

Get current user's profile information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "cld1234567890",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Software developer passionate about productivity",
    "phone": "+1-555-0123",
    "timezone": "America/New_York",
    "role": "USER",
    "isActive": true,
    "emailVerified": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-06-15T10:30:00.000Z",
    "lastLoginAt": "2023-06-15T12:00:00.000Z"
  }
}
```

#### PUT /users/profile

Update current user's profile information.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Senior Software Developer passionate about task management",
  "phone": "+1-555-0123",
  "timezone": "America/New_York"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "cld1234567890",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Senior Software Developer passionate about task management",
    "phone": "+1-555-0123",
    "timezone": "America/New_York",
    "updatedAt": "2023-06-15T14:30:00.000Z"
  }
}
```

### Task Endpoints

#### GET /tasks

Retrieve all tasks for the authenticated user with optional filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional) - Filter by status: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`
- `priority` (optional) - Filter by priority: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `projectId` (optional) - Filter by project ID
- `assigneeId` (optional) - Filter by assignee ID
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `sortBy` (optional) - Sort field: `createdAt`, `updatedAt`, `dueDate`, `priority`, `title`
- `sortOrder` (optional) - Sort order: `asc`, `desc`

**Example Request:**
```http
GET /tasks?status=IN_PROGRESS&priority=HIGH&page=1&limit=10&sortBy=dueDate&sortOrder=asc
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [
    {
      "id": "cld1234567890",
      "title": "Implement user authentication",
      "description": "Add JWT-based authentication to the API",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "tags": ["auth", "security", "api"],
      "createdById": "cld0987654321",
      "createdBy": {
        "id": "cld0987654321",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "assignedToId": "cld1234567890",
      "assignedTo": {
        "id": "cld1234567890",
        "firstName": "John",
        "lastName": "Doe"
      },
      "projectId": "cld5678901234",
      "project": {
        "id": "cld5678901234",
        "name": "CyberTask API"
      },
      "estimatedHours": 8.5,
      "actualHours": 4.0,
      "dueDate": "2023-12-31T23:59:59.000Z",
      "createdAt": "2023-06-01T09:00:00.000Z",
      "updatedAt": "2023-06-15T14:30:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

#### POST /tasks

Create a new task.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "priority": "HIGH",
  "projectId": "cld5678901234",
  "assigneeId": "cld1234567890",
  "dueDate": "2023-12-31T23:59:59.000Z",
  "estimatedHours": 8.5,
  "tags": ["auth", "security", "api"]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "cld1234567890",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication to the API",
    "status": "TODO",
    "priority": "HIGH",
    "tags": ["auth", "security", "api"],
    "createdById": "cld0987654321",
    "assignedToId": "cld1234567890",
    "projectId": "cld5678901234",
    "estimatedHours": 8.5,
    "dueDate": "2023-12-31T23:59:59.000Z",
    "createdAt": "2023-06-15T15:00:00.000Z",
    "updatedAt": "2023-06-15T15:00:00.000Z"
  }
}
```

#### GET /tasks/{taskId}

Retrieve a specific task by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Task retrieved successfully",
  "data": {
    "id": "cld1234567890",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication to the API",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "tags": ["auth", "security", "api"],
    "createdBy": {
      "id": "cld0987654321",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "assignedTo": {
      "id": "cld1234567890",
      "firstName": "John",
      "lastName": "Doe"
    },
    "project": {
      "id": "cld5678901234",
      "name": "CyberTask API"
    },
    "comments": [
      {
        "id": "cld9876543210",
        "content": "Started working on this task",
        "author": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "createdAt": "2023-06-15T14:00:00.000Z"
      }
    ],
    "estimatedHours": 8.5,
    "actualHours": 4.0,
    "dueDate": "2023-12-31T23:59:59.000Z",
    "createdAt": "2023-06-01T09:00:00.000Z",
    "updatedAt": "2023-06-15T14:30:00.000Z"
  }
}
```

#### PUT /tasks/{taskId}

Update an existing task.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Implement user authentication (Updated)",
  "status": "IN_REVIEW",
  "priority": "CRITICAL",
  "actualHours": 7.5,
  "tags": ["auth", "security", "api", "jwt"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": "cld1234567890",
    "title": "Implement user authentication (Updated)",
    "status": "IN_REVIEW",
    "priority": "CRITICAL",
    "actualHours": 7.5,
    "tags": ["auth", "security", "api", "jwt"],
    "updatedAt": "2023-06-15T16:00:00.000Z"
  }
}
```

#### DELETE /tasks/{taskId}

Delete a task permanently.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

#### GET /tasks/{taskId}/comments

Retrieve all comments for a specific task.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Comments retrieved successfully",
  "data": [
    {
      "id": "cld9876543210",
      "content": "Started working on this task. Authentication flow is more complex than expected.",
      "taskId": "cld1234567890",
      "authorId": "cld1234567890",
      "author": {
        "id": "cld1234567890",
        "firstName": "John",
        "lastName": "Doe"
      },
      "createdAt": "2023-06-15T14:00:00.000Z",
      "updatedAt": "2023-06-15T14:00:00.000Z"
    }
  ]
}
```

#### POST /tasks/{taskId}/comments

Add a new comment to a task.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "content": "Authentication implementation is now complete. Ready for code review."
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "cld5432167890",
    "content": "Authentication implementation is now complete. Ready for code review.",
    "taskId": "cld1234567890",
    "authorId": "cld1234567890",
    "author": {
      "id": "cld1234567890",
      "firstName": "John",
      "lastName": "Doe"
    },
    "createdAt": "2023-06-15T17:00:00.000Z",
    "updatedAt": "2023-06-15T17:00:00.000Z"
  }
}
```

### Project Endpoints

#### GET /projects

Retrieve all projects for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional) - Filter by status: `ACTIVE`, `COMPLETED`, `ARCHIVED`
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": [
    {
      "id": "cld5678901234",
      "name": "CyberTask API",
      "description": "Backend API for the CyberTask application",
      "status": "ACTIVE",
      "priority": "HIGH",
      "ownerId": "cld0987654321",
      "owner": {
        "id": "cld0987654321",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "startDate": "2023-06-01T00:00:00.000Z",
      "endDate": "2023-12-31T23:59:59.000Z",
      "createdAt": "2023-05-15T09:00:00.000Z",
      "updatedAt": "2023-06-15T16:30:00.000Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### POST /projects

Create a new project.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "CyberTask Mobile App",
  "description": "Mobile application for task management",
  "startDate": "2023-07-01T00:00:00.000Z",
  "endDate": "2024-06-30T23:59:59.000Z"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": "cld6789012345",
    "name": "CyberTask Mobile App",
    "description": "Mobile application for task management",
    "status": "ACTIVE",
    "priority": "MEDIUM",
    "ownerId": "cld1234567890",
    "owner": {
      "id": "cld1234567890",
      "firstName": "John",
      "lastName": "Doe"
    },
    "startDate": "2023-07-01T00:00:00.000Z",
    "endDate": "2024-06-30T23:59:59.000Z",
    "createdAt": "2023-06-15T18:00:00.000Z",
    "updatedAt": "2023-06-15T18:00:00.000Z"
  }
}
```

#### GET /projects/{projectId}

Retrieve a specific project by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Project retrieved successfully",
  "data": {
    "id": "cld5678901234",
    "name": "CyberTask API",
    "description": "Backend API for the CyberTask application",
    "status": "ACTIVE",
    "priority": "HIGH",
    "owner": {
      "id": "cld0987654321",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "members": [
      {
        "id": "cld1111111111",
        "userId": "cld1234567890",
        "user": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "joinedAt": "2023-06-01T09:00:00.000Z"
      }
    ],
    "tasks": [
      {
        "id": "cld1234567890",
        "title": "Implement user authentication",
        "status": "IN_PROGRESS",
        "priority": "HIGH"
      }
    ],
    "startDate": "2023-06-01T00:00:00.000Z",
    "endDate": "2023-12-31T23:59:59.000Z",
    "createdAt": "2023-05-15T09:00:00.000Z",
    "updatedAt": "2023-06-15T16:30:00.000Z"
  }
}
```

#### PUT /projects/{projectId}

Update an existing project.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "CyberTask API v2",
  "description": "Enhanced backend API with real-time features",
  "status": "ACTIVE",
  "endDate": "2024-03-31T23:59:59.000Z"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": "cld5678901234",
    "name": "CyberTask API v2",
    "description": "Enhanced backend API with real-time features",
    "status": "ACTIVE",
    "endDate": "2024-03-31T23:59:59.000Z",
    "updatedAt": "2023-06-15T19:00:00.000Z"
  }
}
```

#### DELETE /projects/{projectId}

Delete a project permanently.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

#### GET /projects/{projectId}/members

Retrieve all members of a project.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Project members retrieved successfully",
  "data": [
    {
      "id": "cld1111111111",
      "userId": "cld1234567890",
      "user": {
        "id": "cld1234567890",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
      },
      "projectId": "cld5678901234",
      "joinedAt": "2023-06-01T09:00:00.000Z"
    }
  ]
}
```

#### POST /projects/{projectId}/members

Add a user to a project.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "userId": "cld2222222222"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Member added successfully",
  "data": {
    "id": "cld3333333333",
    "userId": "cld2222222222",
    "user": {
      "id": "cld2222222222",
      "firstName": "Alice",
      "lastName": "Johnson",
      "email": "alice.johnson@example.com"
    },
    "projectId": "cld5678901234",
    "joinedAt": "2023-06-15T19:30:00.000Z"
  }
}
```

#### GET /projects/{projectId}/tasks

Retrieve all tasks for a specific project.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional) - Filter by task status

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Project tasks retrieved successfully",
  "data": [
    {
      "id": "cld1234567890",
      "title": "Implement user authentication",
      "description": "Add JWT-based authentication to the API",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "assignedTo": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "dueDate": "2023-12-31T23:59:59.000Z",
      "createdAt": "2023-06-01T09:00:00.000Z"
    }
  ]
}
```

### Notification Endpoints

#### GET /notifications

Retrieve all notifications for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `isRead` (optional) - Filter by read status (true/false)
- `type` (optional) - Filter by notification type
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": "cld4444444444",
      "type": "task_assigned",
      "title": "New Task Assignment",
      "message": "You have been assigned to task: Implement user authentication",
      "data": {
        "taskId": "cld1234567890",
        "taskTitle": "Implement user authentication",
        "assignedBy": "Jane Smith"
      },
      "isRead": false,
      "readAt": null,
      "userId": "cld1234567890",
      "createdAt": "2023-06-15T15:00:00.000Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

#### POST /notifications/{notificationId}/read

Mark a specific notification as read.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### POST /notifications/mark-all-read

Mark all user notifications as read.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

## Data Models

### User

```json
{
  "id": "string (cuid)",
  "email": "string (email format)",
  "firstName": "string (nullable)",
  "lastName": "string (nullable)",
  "bio": "string (nullable)",
  "phone": "string (nullable)",
  "timezone": "string (nullable)",
  "role": "enum (USER, MANAGER, ADMIN, SUPER_ADMIN)",
  "isActive": "boolean",
  "emailVerified": "boolean",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)",
  "lastLoginAt": "string (ISO datetime, nullable)"
}
```

### Task

```json
{
  "id": "string (cuid)",
  "title": "string",
  "description": "string (nullable)",
  "status": "enum (TODO, IN_PROGRESS, IN_REVIEW, DONE)",
  "priority": "enum (LOW, MEDIUM, HIGH, CRITICAL)",
  "tags": "array of strings (nullable)",
  "createdById": "string (user ID)",
  "createdBy": "User object",
  "assignedToId": "string (user ID, nullable)",
  "assignedTo": "User object (nullable)",
  "projectId": "string (project ID)",
  "project": "Project object",
  "estimatedHours": "number (float, nullable)",
  "actualHours": "number (float, nullable)",
  "dueDate": "string (ISO datetime, nullable)",
  "completedAt": "string (ISO datetime, nullable)",
  "archivedAt": "string (ISO datetime, nullable)",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)",
  "comments": "array of TaskComment objects"
}
```

### Project

```json
{
  "id": "string (cuid)",
  "name": "string",
  "description": "string (nullable)",
  "status": "enum (ACTIVE, COMPLETED, ARCHIVED)",
  "priority": "enum (LOW, MEDIUM, HIGH, CRITICAL)",
  "ownerId": "string (user ID)",
  "owner": "User object",
  "startDate": "string (ISO datetime, nullable)",
  "endDate": "string (ISO datetime, nullable)",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)",
  "tasks": "array of Task objects",
  "members": "array of ProjectMember objects"
}
```

### TaskComment

```json
{
  "id": "string (cuid)",
  "content": "string",
  "taskId": "string (task ID)",
  "authorId": "string (user ID)",
  "author": "User object",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)"
}
```

### Notification

```json
{
  "id": "string (cuid)",
  "type": "string",
  "title": "string",
  "message": "string",
  "data": "object (nullable)",
  "isRead": "boolean",
  "readAt": "string (ISO datetime, nullable)",
  "userId": "string (user ID)",
  "createdAt": "string (ISO datetime)"
}
```

## Status Codes

### Success Codes

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **204 No Content** - Request successful, no content returned

### Client Error Codes

- **400 Bad Request** - Invalid request data or validation error
- **401 Unauthorized** - Authentication required or invalid credentials
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource already exists or conflict
- **422 Unprocessable Entity** - Valid request but cannot be processed
- **429 Too Many Requests** - Rate limit exceeded

### Server Error Codes

- **500 Internal Server Error** - Server-side error
- **503 Service Unavailable** - Server temporarily unavailable

## Best Practices

### API Usage

1. **Always include proper Authorization headers** for protected endpoints
2. **Handle rate limiting** by checking response headers and implementing backoff
3. **Use pagination** for list endpoints to avoid large responses
4. **Validate input data** on the client side before sending requests
5. **Check response status codes** and handle errors appropriately

### Security

1. **Store tokens securely** - Use secure storage for refresh tokens
2. **Implement token refresh** - Refresh access tokens before expiration
3. **Use HTTPS** - Always use secure connections in production
4. **Validate SSL certificates** - Ensure proper certificate validation
5. **Never log sensitive data** - Avoid logging tokens or passwords

### Performance

1. **Use appropriate pagination** - Request only needed data
2. **Filter results** - Use query parameters to reduce response size
3. **Cache responses** - Cache static or rarely changing data
4. **Implement retry logic** - Handle temporary failures gracefully
5. **Monitor API usage** - Track performance and optimize as needed

---

For additional support or questions, please contact our development team at [support@cybertask.com](mailto:support@cybertask.com).