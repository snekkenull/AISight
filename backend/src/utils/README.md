# Error Handling and Logging

This directory contains the error handling and logging infrastructure for the Smart AIS MVP backend.

## Overview

The error handling and logging system provides:
- Structured logging with Winston
- Custom error classes for different error types
- Consistent error response format
- Comprehensive error tracking and debugging

## Components

### Logger (`logger.ts`)

The logger provides structured logging capabilities with different log levels and component-specific loggers.

#### Features

- **Structured JSON logging** in production
- **Human-readable console output** in development
- **Multiple log levels**: ERROR, WARN, INFO, DEBUG
- **Component-specific loggers** for better traceability
- **Automatic file rotation** in production (10MB max, 5 files)
- **Stack trace logging** for errors

#### Usage

```typescript
import { createComponentLogger } from '../utils';

const logger = createComponentLogger('MyComponent');

// Log messages at different levels
logger.info('Operation started', { userId: '123' });
logger.warn('Potential issue detected', { metric: 'high' });
logger.error('Operation failed', error, { operation: 'processData' });
logger.debug('Debug information', { state: 'processing' });

// Specialized logging methods
logger.logAISStreamError(error, { reconnectAttempt: 3 });
logger.logDatabaseError(error, 'upsertVessel');
logger.logInvalidMessage('PositionReport', data, 'Missing required field');
logger.logUnexpectedError(error, { context: 'additional info' });
```

#### Log Format

**Development (Console):**
```
2025-12-01 10:30:00.123 info [AISStreamManager] Connection established
2025-12-01 10:30:01.456 error [DataPipeline] Failed to process position
{
  "error": {
    "message": "Database connection failed",
    "stack": "..."
  }
}
```

**Production (JSON):**
```json
{
  "timestamp": "2025-12-01T10:30:00.123Z",
  "level": "error",
  "component": "DataPipeline",
  "message": "Failed to process position",
  "error": {
    "message": "Database connection failed",
    "stack": "..."
  }
}
```

#### Configuration

Set the log level via environment variable:
```bash
LOG_LEVEL=debug  # Options: error, warn, info, debug
NODE_ENV=production  # Enables file logging
```

### Error Classes (`errors.ts`)

Custom error classes provide structured error handling with consistent error codes and status codes.

#### Available Error Classes

1. **ApplicationError** - Base class for all application errors
2. **AISStreamError** - AISStream connection and API errors (503)
3. **DatabaseError** - Database connection and query errors (503)
4. **ValidationError** - Data validation errors (400)
5. **InvalidMessageError** - Invalid AIS message data (400)
6. **WebSocketError** - WebSocket connection errors (503)
7. **CacheError** - Cache service errors (503)
8. **NotFoundError** - Resource not found errors (404)
9. **AuthenticationError** - Authentication errors (401)
10. **ConfigurationError** - Configuration errors (500)

#### Usage

```typescript
import { DatabaseError, ValidationError, NotFoundError } from '../utils';

// Throw specific errors
throw new DatabaseError('Failed to connect to database', {
  host: 'localhost',
  port: 5432
});

throw new ValidationError('Invalid MMSI format', {
  mmsi: 'invalid',
  expected: '9 digits'
});

throw new NotFoundError('Vessel', '123456789');

// Convert errors to API responses
import { toErrorResponse } from '../utils';

try {
  // ... operation
} catch (error) {
  const response = toErrorResponse(error);
  res.status(error.statusCode || 500).json(response);
}
```

#### Error Response Format

All errors are converted to a consistent response format:

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to connect to database",
    "timestamp": "2025-12-01T10:30:00.123Z",
    "details": {
      "host": "localhost",
      "port": 5432
    }
  }
}
```

**Note:** The `details` field is only included in development mode.

## Integration with Components

### AISStreamManager

The AISStreamManager uses logging and error handling for:
- Connection errors and timeouts
- Authentication failures
- Message parsing errors
- Reconnection attempts

```typescript
// Validates: Requirements 10.1
this.logger.logAISStreamError(error, { reconnectAttempts: 3 });
```

### DataPipeline

The DataPipeline uses logging and error handling for:
- Invalid message data
- Database write failures
- Cache update failures
- Batch processing errors

```typescript
// Validates: Requirements 10.3
this.logger.logInvalidMessage('PositionReport', data, 'Validation failed');

// Validates: Requirements 10.2
this.logger.logDatabaseError(error, 'batchInsertPositions');
```

### VesselRepository

The VesselRepository uses error handling for:
- Database query failures
- Connection errors
- Constraint violations

```typescript
// Validates: Requirements 10.2
throw new DatabaseError('Failed to upsert vessel', {
  mmsi: vessel.mmsi,
  originalError: error.message
});
```

### CacheService

The CacheService uses error handling for:
- Redis connection errors
- Cache operation failures
- Geospatial query errors

```typescript
throw new CacheError('Failed to set vessel position', {
  mmsi,
  originalError: error.message
});
```

### API Middleware

The API middleware provides global error handling:
- Catches all unhandled errors
- Logs errors with request context
- Returns consistent error responses
- Includes stack traces in development

```typescript
// Validates: Requirements 10.1, 10.2, 10.3, 10.5
export function errorHandler(err, req, res, next) {
  logger.error('Request error', err, {
    method: req.method,
    path: req.path,
    query: req.query
  });
  
  const response = toErrorResponse(err);
  res.status(err.statusCode || 500).json(response);
}
```

## Requirements Validation

This error handling and logging system validates the following requirements:

- **Requirement 10.1**: AISStream errors are logged with timestamp and error details
- **Requirement 10.2**: Database failures are logged and the system attempts to reconnect
- **Requirement 10.3**: Invalid AIS messages are logged and processing continues
- **Requirement 10.5**: Unexpected errors are logged with full stack traces

## Best Practices

1. **Always use component-specific loggers** - Create a logger for each component
2. **Use appropriate error classes** - Choose the error class that best matches the error type
3. **Include context in errors** - Add relevant context to help with debugging
4. **Log at appropriate levels** - Use ERROR for failures, WARN for potential issues, INFO for important events, DEBUG for detailed information
5. **Never expose sensitive data** - Don't log passwords, API keys, or personal information
6. **Use structured logging** - Include context as objects, not in message strings
7. **Catch and handle errors** - Don't let errors crash the application

## Testing

The error handling and logging system is tested through:
- Unit tests for individual components
- Integration tests for API endpoints
- Error scenario testing

Example test:
```typescript
it('should log database errors', async () => {
  const mockError = new Error('Connection failed');
  jest.spyOn(pool, 'query').mockRejectedValue(mockError);
  
  await expect(repository.upsertVessel(vessel))
    .rejects.toThrow(DatabaseError);
});
```

## Monitoring

In production, logs can be:
- Collected by log aggregation services (e.g., ELK, Splunk)
- Monitored for error patterns
- Used for alerting on critical errors
- Analyzed for performance issues

## Future Enhancements

- Integration with external monitoring services (e.g., Sentry, DataDog)
- Custom log formatters for different environments
- Log sampling for high-volume events
- Distributed tracing support
- Performance metrics logging
