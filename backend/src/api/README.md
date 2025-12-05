# Smart AIS MVP REST API

This directory contains the REST API implementation for the Smart AIS MVP backend service.

## Structure

- `app.ts` - Express application factory
- `routes.ts` - API route handlers
- `middleware.ts` - Error handling and request logging middleware
- `index.ts` - Module exports
- `routes.test.ts` - Integration tests for API endpoints

## API Endpoints

### Health Check

**GET /api/health**

Returns the health status of the backend service and its dependencies.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### List Vessels

**GET /api/vessels**

List vessels with optional filters.

**Query Parameters:**
- `mmsi` - Filter by MMSI
- `name` - Filter by vessel name (partial match)
- `type` - Filter by vessel type
- `minLat`, `maxLat`, `minLon`, `maxLon` - Bounding box filter
- `speedMin`, `speedMax` - Speed range filter (knots)
- `limit` - Maximum number of results (default: 1000, max: 10000)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "vessels": [
    {
      "mmsi": "367719770",
      "name": "OCEAN EXPLORER",
      "vesselType": 70,
      "position": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "sog": 12.5,
        "cog": 285.0,
        "timestamp": "2025-12-01T10:30:00Z"
      }
    }
  ],
  "count": 1,
  "timestamp": "2025-12-01T10:30:00Z"
}
```

### Get Vessel Details

**GET /api/vessels/:mmsi**

Get detailed information about a specific vessel by MMSI.

**Response:**
```json
{
  "vessel": {
    "mmsi": "367719770",
    "name": "OCEAN EXPLORER",
    "vesselType": 70,
    "imoNumber": 1234567,
    "callSign": "WDD1234"
  },
  "position": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "sog": 12.5,
    "cog": 285.0,
    "timestamp": "2025-12-01T10:30:00Z"
  },
  "timestamp": "2025-12-01T10:30:00Z"
}
```

### Get Vessel Track

**GET /api/vessels/:mmsi/track**

Get position history for a vessel.

**Query Parameters:**
- `startTime` - ISO 8601 timestamp (default: 24 hours ago)
- `endTime` - ISO 8601 timestamp (default: now)

**Response:**
```json
{
  "mmsi": "367719770",
  "startTime": "2025-11-30T10:30:00Z",
  "endTime": "2025-12-01T10:30:00Z",
  "track": [
    {
      "timestamp": "2025-11-30T10:30:00Z",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "sog": 12.5,
      "cog": 285.0
    }
  ],
  "count": 1,
  "timestamp": "2025-12-01T10:30:00Z"
}
```

### Search Vessels

**GET /api/search**

Search vessels by name or MMSI.

**Query Parameters:**
- `q` - Search query (required)
- `limit` - Maximum number of results (default: 100, max: 1000)

**Response:**
```json
{
  "query": "ocean",
  "results": [
    {
      "mmsi": "367719770",
      "name": "OCEAN EXPLORER",
      "vesselType": 70,
      "position": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "timestamp": "2025-12-01T10:30:00Z"
      }
    }
  ],
  "count": 1,
  "timestamp": "2025-12-01T10:30:00Z"
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2025-12-01T10:30:00Z"
  }
}
```

### Error Codes

- `INVALID_PARAMETER` - Invalid query parameter
- `INVALID_MMSI` - Invalid MMSI format
- `MISSING_PARAMETER` - Required parameter missing
- `VESSEL_NOT_FOUND` - Vessel not found
- `NO_DATA` - No data available
- `NOT_FOUND` - Route not found
- `INTERNAL_ERROR` - Internal server error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable

## Validation

### MMSI Format
- Must be exactly 9 digits
- Example: `367719770`

### Coordinates
- Latitude: -90 to 90
- Longitude: -180 to 180

### Time Format
- ISO 8601 format
- Example: `2025-12-01T10:30:00Z`

## Testing

Run integration tests:
```bash
npm test -- routes.test.ts
```

## Usage Example

```typescript
import { createApp } from './api/app';
import { Pool } from 'pg';
import { CacheService } from './services/CacheService';

const pool = new Pool({ /* config */ });
const cache = new CacheService();
await cache.connect();

const app = createApp(pool, cache);
app.listen(3000, () => {
  console.log('API server listening on port 3000');
});
```
