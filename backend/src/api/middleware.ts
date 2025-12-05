import { Request, Response, NextFunction } from 'express';
import { createComponentLogger, ApplicationError, toErrorResponse } from '../utils';

const logger = createComponentLogger('Middleware');

/**
 * Global error handling middleware
 * Catches all errors and returns consistent error responses
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with full context
  logger.error('Request error', err, {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    ip: req.ip,
  });

  // Determine status code
  const statusCode = err instanceof ApplicationError ? err.statusCode : 500;

  // Convert to error response format
  const errorResponse = toErrorResponse(err);

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.error.details = {
      ...errorResponse.error.details,
      stack: err.stack,
    };
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Handles requests to undefined routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Request logging middleware
 * Logs all incoming requests
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    // Log as info for successful requests, warn for client errors, error for server errors
    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', undefined, logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}

/**
 * CORS configuration middleware
 * Allows cross-origin requests from frontend
 */
export function corsConfig() {
  return {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
}
