import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * 404 Not Found Handler Middleware
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  
  // Pass to error handler
  next(error);
};

export default notFoundHandler;