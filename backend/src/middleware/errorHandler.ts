import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ValidationError } from 'joi';
import { logger } from '../config/logger';
import { config } from '../config/environment';

/**
 * Custom Application Error Class
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database Error Handler
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = (error.meta?.target as string[])?.join(', ') || 'field';
      return new AppError(
        `${field} already exists`,
        409,
        'DUPLICATE_ENTRY'
      );
    
    case 'P2025':
      // Record not found
      return new AppError(
        'Record not found',
        404,
        'RECORD_NOT_FOUND'
      );
    
    case 'P2003':
      // Foreign key constraint violation
      return new AppError(
        'Referenced record not found',
        400,
        'FOREIGN_KEY_CONSTRAINT'
      );
    
    case 'P2014':
      // Required relation missing
      return new AppError(
        'Required relation missing',
        400,
        'REQUIRED_RELATION_MISSING'
      );
    
    default:
      logger.error('Unhandled Prisma error:', error);
      return new AppError(
        'Database operation failed',
        500,
        'DATABASE_ERROR'
      );
  }
};

/**
 * Validation Error Handler
 */
const handleValidationError = (error: ValidationError): AppError => {
  const message = error.details.map(detail => detail.message).join(', ');
  return new AppError(
    `Validation error: ${message}`,
    400,
    'VALIDATION_ERROR'
  );
};

/**
 * JWT Error Handler
 */
const handleJWTError = (error: any): AppError => {
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }
  return new AppError('Authentication failed', 401, 'AUTH_ERROR');
};

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let err = error;

  // Log the error
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle different error types
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    err = handlePrismaError(error);
  } else if (error.name === 'ValidationError') {
    err = handleValidationError(error);
  } else if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    err = handleJWTError(error);
  } else if (error.name === 'CastError') {
    err = new AppError('Invalid ID format', 400, 'INVALID_ID');
  } else if (error.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(error.keyValue)[0];
    err = new AppError(
      `${field} already exists`,
      409,
      'DUPLICATE_ENTRY'
    );
  }

  // Default to AppError if not already one
  if (!(err instanceof AppError)) {
    err = new AppError(
      config.NODE_ENV === 'production' 
        ? 'Internal server error'
        : error.message,
      error.statusCode || 500,
      'INTERNAL_ERROR'
    );
  }

  // Send error response
  const response: any = {
    success: false,
    message: err.message,
    error: err.errorCode || 'UNKNOWN_ERROR',
  };

  // Include stack trace in development
  if (config.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = {
      originalError: error.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
    };
  }

  res.status(err.statusCode).json(response);
};

/**
 * Async Error Handler Wrapper
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found Handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};