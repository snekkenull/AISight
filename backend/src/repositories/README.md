# Vessel Repository

The VesselRepository provides data access methods for vessel information and position reports.

## Features

- **Vessel Management**: Upsert vessel metadata by MMSI
- **Position Tracking**: Batch insert position reports with duplicate prevention
- **Querying**: Filter vessels by MMSI, name, type, bounding box, and speed
- **Search**: Search vessels by name or MMSI
- **History**: Retrieve vessel position history within time ranges

## Usage

```typescript
import { Pool } from 'pg';
import { VesselRepository } from './repositories';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const repository = new VesselRepository(pool);

// Upsert vessel metadata
await repository.upsertVessel({
  mmsi: '123456789',
  name: 'Test Vessel',
  type: 70,
});

// Batch insert positions
await repository.batchInsertPositions([
  {
    mmsi: '123456789',
    timestamp: new Date(),
    latitude: 37.7749,
    longitude: -122.4194,
    sog: 12.5,
    cog: 285.0,
  },
]);

// Query vessels
const vessels = await repository.queryVessels({
  type: 70,
  bbox: {
    minLat: 37.0,
    maxLat: 38.0,
    minLon: -123.0,
    maxLon: -122.0,
  },
  limit: 100,
});
```

## Database Schema

The repository works with two main tables:

- **vessels**: Stores vessel metadata (MMSI, name, type, dimensions, etc.)
- **position_reports**: TimescaleDB hypertable storing position history

Both tables are created by the initialization scripts in `database/init/`.
