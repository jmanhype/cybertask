import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

/**
 * Request Validation Middleware Factory
 * Validates request body, query, or params against Joi schema
 */
export const validateRequest = (
  schema: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // If validation errors exist, throw error
    if (errors.length > 0) {
      throw new AppError(
        `Validation failed: ${errors.join('; ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // User ID parameter
  userId: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  // Project ID parameter
  projectId: Joi.object({
    projectId: Joi.string().uuid().required(),
  }),

  // Task ID parameter
  taskId: Joi.object({
    taskId: Joi.string().uuid().required(),
  }),

  // Pagination query
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Search query
  search: Joi.object({
    q: Joi.string().min(2).max(100),
    status: Joi.string(),
    priority: Joi.string(),
    assignedTo: Joi.string().uuid(),
  }),
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    bio: Joi.string().max(500).allow(''),
    phone: Joi.string().pattern(/^[+]?[1-9]\d{1,14}$/).allow(''),
    timezone: Joi.string().max(50),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

// Project validation schemas
export const projectSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(1000).allow(''),
    status: Joi.string().valid('ACTIVE', 'COMPLETED', 'ARCHIVED').default('ACTIVE'),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    teamMembers: Joi.array().items(Joi.string().uuid()),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().max(1000).allow(''),
    status: Joi.string().valid('ACTIVE', 'COMPLETED', 'ARCHIVED'),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    teamMembers: Joi.array().items(Joi.string().uuid()),
  }),
};

// Task validation schemas
export const taskSchemas = {
  create: Joi.object({
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(2000).allow(''),
    status: Joi.string().valid('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE').default('TODO'),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
    projectId: Joi.string().uuid().required(),
    assignedTo: Joi.string().uuid(),
    dueDate: Joi.date().iso(),
    estimatedHours: Joi.number().min(0).max(1000),
    tags: Joi.array().items(Joi.string().max(50)),
    dependencies: Joi.array().items(Joi.string().uuid()),
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(200),
    description: Joi.string().max(2000).allow(''),
    status: Joi.string().valid('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    assignedTo: Joi.string().uuid().allow(null),
    dueDate: Joi.date().iso().allow(null),
    estimatedHours: Joi.number().min(0).max(1000).allow(null),
    actualHours: Joi.number().min(0).max(1000).allow(null),
    tags: Joi.array().items(Joi.string().max(50)),
    dependencies: Joi.array().items(Joi.string().uuid()),
  }),

  comment: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
  }),
};

export default validateRequest;