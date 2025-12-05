# Services

This directory contains service classes that provide business logic and external integrations.

## CacheService

The `CacheService` class manages Redis cache for vessel positions and metadata, providing fast access to recent vessel data and geospatial queries.

### Features

- **Position Caching**: Store and retrieve vessel positions with 60-second TTL
- **Metadata Caching**: Store and retrieve vessel metadata with 1-hour TTL
- **Geospatial Queries**: Find vessels within bounding boxes using Redis geospatial commands
- **Active Vessel Tracking**: Track count of vessels with recent position updates

### Usage

```typescript
import { CacheService } from './services';

// Initialize cache service
const cacheService = new CacheService();
await cacheService.connect();

// Store vessel position
await cacheService.setVesselPosition(mmsi, positionReport);

// Retrieve vessel position
const position = await cacheService.getVesselPosition(mmsi);

// Store vessel metadata
await cacheService.setVesselMetadata(mmsi, shipStaticData);

// Get active vessel count
const count = await cacheService.getActiveVesselCount();

// Find vessels in bounding box
const vessels = await cacheService.getVesselsInBounds(bbox);

// Cleanup
await cacheService.disconnect();
```

### Configuration

The service uses the following environment variables:

- `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379`)

### TTL Values

- Position data: 60 seconds
- Metadata: 3600 seconds (1 hour)

### Redis Keys

- Position: `vessel:position:{mmsi}`
- Metadata: `vessel:metadata:{mmsi}`
- Geospatial index: `vessels:geo`
- Active vessels set: `vessels:active`
