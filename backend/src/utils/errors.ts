/**
 * Custom error classes for Smart AIS MVP
 * Provides structured error handling across the application
 */

/**
 * Base application error class
 */
export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * AISStream connection and API errors
 * Validates: Requirements 10.1
 */
export class AISStreamError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AISSTREAM_ERROR', 503, true, context);
  }
}

/**
 * Database connection and query errors
 * Validates: Requirements 10.2
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 503, true, context);
  }
}

/**
 * Data validation errors
 * Validates: Requirements 10.3
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
  }
}

/**
 * Invalid AIS message data errors
 * Validates: Requirements 10.3
 */
export class InvalidMessageError extends ApplicationError {
  constructor(message: string, messageType: string, data?: any) {
    super(message, 'INVALID_MESSAGE', 400, true, {
      messageType,
      data: JSON.stringify(data),
    });
  }
}

/**
 * WebSocket connection errors
 */
export class WebSocketError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'WEBSOCKET_ERROR', 503, true, context);
  }
}

/**
 * Cache service errors
 */
export class CacheError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CACHE_ERROR', 503, true, context);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, true, { resource, identifier });
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401, true);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', 500, false, context);
  }
}

/**
 * Error response format for API responses
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

/**
 * Convert an error to a standardized error response
 */
export function toErrorResponse(error: Error | ApplicationError): ErrorResponse {
  const isApplicationError = error instanceof ApplicationError;

  return {
    error: {
      code: isApplicationError ? error.code : 'INTERNAL_ERROR',
      message: error.message,
      timestamp: isApplicationError ? error.timestamp.toISOString() : new Date().toISOString(),
      ...(isApplicationError &&
        error.context &&
        process.env.NODE_ENV === 'development' && {
          details: error.context,
        }),
    },
  };
}

/**
 * Check if an error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof ApplicationError) {
    return error.isOperational;
  }
  return false;
}
