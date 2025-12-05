# Server Implementation Summary

## Overview
The `server.ts` file is the main entry point for the Smart AIS MVP backend. It wires up all backend services and manages their lifecycle.

## Implementation Details

### Services Initialized (in order)

1. **Database Connection (PostgreSQL with TimescaleDB)**
   - Uses connection pooling for efficient resource management
   - Tests connection on startup
   - Configured via `DATABASE_URL` environment variable

2. **Redis Cache Service**
   - Provides fast access to recent vessel positions and metadata
   - Configured via `REDIS_URL` environment variable

3. **Vessel Repository**
   - Data access layer for vessel information and position history
   - Uses the database connection pool

4. **AISStream Manager**
   - Manages WebSocket connection to AISStream API
   - Handles authentication, message parsing, and reconnection logic
   - Configured via `AISSTREAM_API_KEY` environment variable

5. **Data Pipeline**
   - Processes incoming AIS messages
   - Validates data, batches writes to database
   - Updates cache and broadcasts to connected clients
   - Configurable batch size and interval

6. **WebSocket Server**
   - Manages WebSocket connections with frontend clients
   - Broadcasts real-time vessel updates
   - Attached to the HTTP server

7. **Express Application**
   - REST API endpoints for vessel queries
   - Health check endpoint at `/api/health`

## Event Flow

```
AISStream API
    ↓ (WebSocket messages)
AISStreamManager
    ↓ (position/staticData events)
DataPipeline
    ├→ VesselRepository (database writes)
    ├→ CacheService (cache updates)
    └→ WebSocketServer (broadcasts to clients)
```

## Graceful Shutdown

The server implements comprehensive graceful shutdown handling:

1. **Signal Handlers**: Responds to SIGTERM and SIGINT
2. **Shutdown Sequence**:
   - Stop accepting new HTTP connections
   - Disconnect from AISStream
   - Stop data pipeline (flushes remaining batches)
   - Close WebSocket server
   - Disconnect from Redis
   - Close database connection pool

3. **Error Handlers**:
   - Uncaught exceptions
   - Unhandled promise rejections

## Environment Variables

Required:
- `AISSTREAM_API_KEY`: API key for AISStream service
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

Optional:
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (development/production)
- `BATCH_SIZE`: Data pipeline batch size (default: 100)
- `BATCH_INTERVAL_MS`: Data pipeline batch interval (default: 5000)

## Startup Sequence

1. Load environment variables from `.env` file
2. Validate required environment variables
3. Initialize database connection and test connectivity
4. Initialize Redis connection
5. Initialize AISStream manager
6. Initialize data pipeline
7. Connect event handlers between services
8. Start data pipeline
9. Create Express application
10. Create HTTP server
11. Initialize WebSocket server
12. Start HTTP server
13. Connect to AISStream
14. Setup graceful shutdown handlers

## Error Handling

- All errors are logged with structured logging
- Database errors trigger reconnection attempts
- AISStream errors trigger exponential backoff reconnection
- Invalid messages are logged but don't crash the system
- Startup errors cause graceful shutdown and exit

## Testing

Basic tests are provided in `server.test.ts` to verify:
- Environment variable validation
- Error types are correctly defined

## Requirements Validated

- **Requirement 2.1**: WebSocket connection to AISStream established
- **Requirement 2.2**: Authentication message sent within 3 seconds
- **Requirement 6.4**: All services start correctly via docker-compose
- **Requirement 6.5**: Graceful shutdown handling implemented
