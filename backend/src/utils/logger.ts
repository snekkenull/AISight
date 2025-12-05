import winston from 'winston';

/**
 * Log levels for the application
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Structured log format interface
 */
export interface LogContext {
  component?: string;
  error?: {
    code?: string;
    message?: string;
    stack?: string;
  };
  context?: Record<string, any>;
  [key: string]: any;
}

/**
 * Custom log format for structured JSON logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Console format for development (human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, component, ...meta }) => {
    const componentStr = component ? `[${component}]` : '';
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level} ${componentStr} ${message}${metaStr}`;
  })
);

/**
 * Create Winston logger instance
 */
const createLogger = (): winston.Logger => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
      format: isDevelopment ? consoleFormat : logFormat,
    }),
  ];

  // Add file transports in production
  if (!isDevelopment) {
    transports.push(
      // Error log file
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
      // Combined log file
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false,
  });
};

/**
 * Logger instance
 */
const logger = createLogger();

/**
 * Logger class with structured logging methods
 */
export class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  /**
   * Log error message with stack trace
   * Validates: Requirements 10.1, 10.5
   */
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    const logData: LogContext = {
      component: this.component,
      message,
    };

    if (error instanceof Error) {
      logData.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    } else if (error) {
      logData.error = {
        message: String(error),
      };
    }

    if (context) {
      logData.context = context;
    }

    logger.error(logData);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    logger.warn({
      component: this.component,
      message,
      ...(context && { context }),
    });
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    logger.info({
      component: this.component,
      message,
      ...(context && { context }),
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    logger.debug({
      component: this.component,
      message,
      ...(context && { context }),
    });
  }

  /**
   * Log AISStream error with timestamp and details
   * Validates: Requirements 10.1
   */
  logAISStreamError(error: Error, details?: Record<string, any>): void {
    this.error('AISStream API error', error, {
      timestamp: new Date().toISOString(),
      errorDetails: details,
    });
  }

  /**
   * Log database error and attempt reconnection
   * Validates: Requirements 10.2
   */
  logDatabaseError(error: Error, operation?: string): void {
    this.error('Database operation failed', error, {
      timestamp: new Date().toISOString(),
      operation,
      willRetry: true,
    });
  }

  /**
   * Log invalid message data and continue processing
   * Validates: Requirements 10.3
   */
  logInvalidMessage(messageType: string, data: any, reason: string): void {
    this.warn('Invalid AIS message received', {
      timestamp: new Date().toISOString(),
      messageType,
      reason,
      data: JSON.stringify(data),
    });
  }

  /**
   * Log unexpected error with full stack trace
   * Validates: Requirements 10.5
   */
  logUnexpectedError(error: Error, context?: Record<string, any>): void {
    this.error('Unexpected error occurred', error, {
      timestamp: new Date().toISOString(),
      stackTrace: error.stack,
      ...context,
    });
  }
}

/**
 * Create a logger instance for a component
 */
export function createComponentLogger(component: string): Logger {
  return new Logger(component);
}

/**
 * Export the base Winston logger for advanced use cases
 */
export { logger as baseLogger };
