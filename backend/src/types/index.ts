// Type definitions for CyberTask Backend
import { Request } from 'express';
import { User } from '@prisma/client';

// Extended Express Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

// JWT Payload structure
export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// Refresh Token Payload
export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

// API Response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

// Validation Error structure
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// User Registration Request
export interface RegisterUserRequest {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  password: string;
  confirmPassword: string;
}

// User Login Request
export interface LoginUserRequest {
  email: string;
  password: string;
}

// User Update Request
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  username?: string;
}

// Task Creation Request
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  projectId?: string;
  tags?: string[];
  dueDate?: string;
  estimatedHours?: number;
}

// Task Update Request
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  projectId?: string;
  tags?: string[];
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
}

// Project Creation Request
export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  startDate?: string;
  endDate?: string;
}

// Project Update Request
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
}

// Team Creation Request
export interface CreateTeamRequest {
  name: string;
  description?: string;
  color?: string;
}

// Team Update Request
export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  color?: string;
}

// Comment Creation Request
export interface CreateCommentRequest {
  content: string;
  taskId: string;
}

// Filter and Pagination Options
export interface FilterOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// Task Filter Options
export interface TaskFilterOptions extends FilterOptions {
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  projectId?: string;
  creatorId?: string;
  tags?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
}

// Project Filter Options
export interface ProjectFilterOptions extends FilterOptions {
  status?: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  creatorId?: string;
}

// Socket.IO Event Types
export interface SocketEvents {
  // Task events
  'task:created': (task: any) => void;
  'task:updated': (task: any) => void;
  'task:deleted': (taskId: string) => void;
  'task:assigned': (task: any) => void;
  
  // Comment events
  'comment:created': (comment: any) => void;
  
  // Project events
  'project:created': (project: any) => void;
  'project:updated': (project: any) => void;
  
  // User events
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  
  // Notification events
  'notification:new': (notification: any) => void;
}

// Claude Flow AI Task Suggestion
export interface AITaskSuggestion {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedHours?: number;
  tags?: string[];
  confidence: number; // 0-1 scale
  reasoning: string;
}

// Claude Flow Integration Request
export interface AIGenerateTasksRequest {
  projectId?: string;
  context: string;
  count?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

// Environment Variables Type
export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  CLAUDE_FLOW_API_KEY?: string;
  CLAUDE_FLOW_ENDPOINT?: string;
  LOG_LEVEL: string;
  BCRYPT_ROUNDS: number;
}

// Error Types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public errors: ValidationError[];

  constructor(message: string, errors: ValidationError[] = []) {
    super(message, 400);
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}