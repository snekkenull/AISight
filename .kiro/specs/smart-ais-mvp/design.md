# Design Document

## Overview

The Smart AIS MVP is a lightweight, real-time vessel tracking web application that streams AIS data from the AISStream API and visualizes vessel positions on an interactive map. The system follows a clean three-tier architecture with clear separation between data access, business logic, and presentation layers. The design prioritizes simplicity, maintainability, and quick deployment while ensuring robust functionality.

### Key Design Principles

1. **Simplicity First**: Minimal dependencies, straightforward architecture
2. **Real-time Performance**: Sub-second updates for vessel positions
3. **Clean Code**: Clear separation of concerns, well-documented interfaces
4. **Container-Ready**: Docker-first deployment strategy
5. **GeoJSON Standard**: All geographic data uses GeoJSON format for interoperability

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Map Component│  │ Vessel List  │  │ Search/Filter│      │
│  │  (Leaflet)   │  │  Component   │  │  Component   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↕                  ↕                  ↕              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         WebSocket Client (Socket.io)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ WebSocket    │  │ REST API     │  │ AISStream    │      │
│  │ Server       │  │ Endpoints    │  │ Manager      │      │
│  │ (Socket.io)  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↕                  ↕                  ↕              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Data Pipeline & Business Logic                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Redis Cache  │  │ AISStream    │      │
│  │ (TimescaleDB)│  │              │  │ WebSocket    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Leaflet for map rendering
- Socket.io-client for WebSocket communication
- TailwindCSS for styling
- Vite for build tooling

**Backend:**
- Node.js 18+ with Express
- Socket.io for WebSocket server
- ws library for AISStream connection
- TypeScript for type safety

**Data Storage:**
- PostgreSQL 14+ with TimescaleDB extension for time-series data
- Redis 7+ for caching and real-time data

**DevOps:**
- Docker & Docker Compose
- Multi-stage builds for optimized images

## Components and Interfaces

### 1. AISStream Manager

**Responsibility:** Manages WebSocket connection to AISStream API, handles authentication, message parsing, and reconnection logic.

**Interface:**
```typescript
interface AISStreamManager {
  connect(): Promise<void>;
  disconnect(): void;
  updateSubscription(options: SubscriptionOptions): void;
  on(event: 'position' | 'staticData' | 'error', handler: Function): void;
  getStatistics(): ConnectionStatistics;
}

interface SubscriptionOptions {
  boundingBoxes: BoundingBox[];
  messageTypes?: string[];
  mmsiFilters?: string[];
}

interface BoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

interface ConnectionStatistics {
  isConnected: boolean;
  messagesReceived: number;
  messagesProcessed: number;
  errors: number;
  lastMessage: Date | null;
}
```

**Key Methods:**
- `connect()`: Establishes WebSocket connection and authenticates
- `handleMessage()`: Parses incoming AIS messages
- `scheduleReconnect()`: Implements exponential backoff reconnection

### 2. Data Pipeline

**Responsibility:** Processes incoming AIS messages, validates data, batches writes to database, updates cache, and broadcasts to connected clients.

**Interface:**
```typescript
interface DataPipeline {
  processPosition(position: PositionReport): Promise<void>;
  processStaticData(staticData: ShipStaticData): Promise<void>;
  start(): void;
  stop(): void;
}

interface PositionReport {
  mmsi: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  sog: number;
  cog: number;
  heading: number;
  navStatus: number;
}

interface ShipStaticData {
  mmsi: string;
  name: string;
  type: number;
  imo?: number;
  callSign?: string;
  dimensions: VesselDimensions;
  destination?: string;
  eta?: Date;
}
```

**Key Methods:**
- `processPosition()`: Validates and queues position updates
- `processBatch()`: Batch inserts positions to database
- `broadcastUpdate()`: Sends updates to WebSocket clients

### 3. Vessel Repository

**Responsibility:** Data access layer for vessel information and position history.

**Interface:**
```typescript
interface VesselRepository {
  upsertVessel(vessel: ShipStaticData): Promise<Vessel>;
  batchInsertPositions(positions: PositionReport[]): Promise<void>;
  queryVessels(criteria: VesselQuery): Promise<Vessel[]>;
  getVesselHistory(mmsi: string, startTime: Date, endTime: Date): Promise<PositionReport[]>;
  getLatestPositions(limit: number): Promise<VesselWithPosition[]>;
}

interface VesselQuery {
  mmsi?: string;
  name?: string;
  type?: number;
  bbox?: BoundingBox;
  speedMin?: number;
  speedMax?: number;
  limit?: number;
}
```

### 4. Cache Service

**Responsibility:** Manages Redis cache for fast access to recent vessel positions and metadata.

**Interface:**
```typescript
interface CacheService {
  setVesselPosition(mmsi: string, position: PositionReport): Promise<void>;
  getVesselPosition(mmsi: string): Promise<PositionReport | null>;
  setVesselMetadata(mmsi: string, metadata: ShipStaticData): Promise<void>;
  getVesselMetadata(mmsi: string): Promise<ShipStaticData | null>;
  getActiveVesselCount(): Promise<number>;
  getVesselsInBounds(bbox: BoundingBox): Promise<string[]>;
}
```

### 5. WebSocket Server

**Responsibility:** Manages WebSocket connections with frontend clients, handles subscriptions, and broadcasts vessel updates.

**Interface:**
```typescript
interface WebSocketServer {
  initialize(httpServer: Server): void;
  broadcastUpdate(type: string, data: any): void;
  broadcastToRegion(region: string, type: string, data: any): void;
  getConnectionCount(): number;
}
```

### 6. REST API

**Responsibility:** Provides HTTP endpoints for vessel queries, search, and historical data.

**Endpoints:**
```
GET  /api/vessels              - List vessels with filters
GET  /api/vessels/:mmsi        - Get vessel details
GET  /api/vessels/:mmsi/track  - Get vessel position history
GET  /api/search               - Search vessels by name or MMSI
GET  /api/health               - Health check endpoint
```

### 7. Frontend Components

**Map Component:**
- Renders Leaflet map with vessel markers
- Handles user interactions (pan, zoom, click)
- Displays vessel popups with details
- Renders vessel tracks as GeoJSON LineStrings

**Vessel List Component:**
- Displays list of active vessels
- Supports sorting and filtering
- Shows vessel status indicators

**Search Component:**
- Text search for vessel name/MMSI
- Filter by vessel type
- Bounding box selection

## Data Models

### Database Schema

**vessels table:**
```sql
CREATE TABLE vessels (
  mmsi VARCHAR(20) PRIMARY KEY,
  imo_number INTEGER,
  name VARCHAR(255),
  call_sign VARCHAR(50),
  vessel_type INTEGER,
  dimension_a INTEGER,
  dimension_b INTEGER,
  dimension_c INTEGER,
  dimension_d INTEGER,
  draught DECIMAL(4,1),
  destination VARCHAR(255),
  eta TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vessels_name ON vessels(name);
CREATE INDEX idx_vessels_type ON vessels(vessel_type);
```

**position_reports table (TimescaleDB hypertable):**
```sql
CREATE TABLE position_reports (
  id BIGSERIAL,
  mmsi VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  sog DECIMAL(4,1),
  cog DECIMAL(5,1),
  true_heading INTEGER,
  navigational_status INTEGER,
  rate_of_turn INTEGER,
  PRIMARY KEY (mmsi, timestamp)
);

SELECT create_hypertable('position_reports', 'timestamp');

CREATE INDEX idx_position_mmsi_time ON position_reports(mmsi, timestamp DESC);
CREATE INDEX idx_position_location ON position_reports 
  USING GIST (ll_to_earth(latitude, longitude));
```

### GeoJSON Formats

**Vessel Position (Point):**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "properties": {
    "mmsi": "367719770",
    "name": "OCEAN EXPLORER",
    "sog": 12.5,
    "cog": 285.0,
    "heading": 290,
    "timestamp": "2025-12-01T10:30:00Z",
    "vesselType": 70
  }
}
```

**Vessel Track (LineString):**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-122.4194, 37.7749],
      [-122.4180, 37.7755],
      [-122.4165, 37.7762]
    ]
  },
  "properties": {
    "mmsi": "367719770",
    "startTime": "2025-12-01T10:00:00Z",
    "endTime": "2025-12-01T10:30:00Z"
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Position update latency

*For any* Position Report received from AISStream, the vessel marker on the map should be updated within 2 seconds of receipt.

**Validates: Requirements 1.2**

### Property 2: Vessel popup completeness

*For any* vessel marker clicked by a user, the displayed popup should contain MMSI, name, speed, course, and last update time.

**Validates: Requirements 1.3**

### Property 3: GeoJSON format compliance for positions

*For any* vessel position rendered on the map, the geographic data structure should be valid GeoJSON Point format.

**Validates: Requirements 1.4**

### Property 4: Vessel type visual distinction

*For any* set of vessels with different types displayed on the map, each vessel type should have a distinct visual indicator.

**Validates: Requirements 1.5**

### Property 5: Authentication message timing

*For any* WebSocket connection establishment to AISStream, an authentication message containing the API key should be sent within 3 seconds.

**Validates: Requirements 2.2**

### Property 6: Reconnection with exponential backoff

*For any* WebSocket connection loss, the system should attempt to reconnect with exponential backoff for up to 5 attempts.

**Validates: Requirements 2.3**

### Property 7: Position Report parsing completeness

*For any* valid Position Report message received, the parser should extract latitude, longitude, SOG, COG, MMSI, and timestamp.

**Validates: Requirements 2.4**

### Property 8: Ship Static Data parsing completeness

*For any* valid Ship Static Data message received, the parser should extract vessel name, type, dimensions, and destination.

**Validates: Requirements 2.5**

### Property 9: Position data storage completeness

*For any* Position Report processed by the Data Pipeline, the stored record should contain MMSI, timestamp, latitude, longitude, SOG, and COG.

**Validates: Requirements 3.1**

### Property 10: Vessel metadata upsert by MMSI

*For any* Ship Static Data processed by the Data Pipeline, the system should either insert a new vessel record or update an existing record based on MMSI.

**Validates: Requirements 3.2**

### Property 11: Duplicate position prevention

*For any* two Position Reports with identical MMSI and timestamp, only one should be stored in the database.

**Validates: Requirements 3.5**

### Property 12: Search result correctness

*For any* search query by vessel name or MMSI, all returned vessels should match the search criteria.

**Validates: Requirements 4.1**

### Property 13: Vessel type filter correctness

*For any* vessel type filter applied, all returned vessels should have that vessel type.

**Validates: Requirements 4.2**

### Property 14: Bounding box filter correctness

*For any* bounding box defined on the map, all returned vessels should have positions within that geographic area.

**Validates: Requirements 4.3**

### Property 15: Search result field completeness

*For any* vessel in search results, the result should include MMSI, name, current position, and last update time.

**Validates: Requirements 4.4**

### Property 16: Vessel track display

*For any* vessel selected by a user, if position history exists for the last 24 hours, the system should display the track as a line on the map.

**Validates: Requirements 5.1**

### Property 17: GeoJSON LineString format for tracks

*For any* vessel track rendered on the map, the geographic data structure should be valid GeoJSON LineString format.

**Validates: Requirements 5.2**

### Property 18: Track timestamp annotations

*For any* vessel track displayed, timestamps should be shown at regular intervals along the track.

**Validates: Requirements 5.3**

### Property 19: Track time range update correctness

*For any* time range adjustment by the user, the updated track should contain only positions within the new time range.

**Validates: Requirements 5.4**

### Property 20: Real-time map updates

*For any* vessel position update received via WebSocket, the map display should update without requiring a page refresh.

**Validates: Requirements 9.2**

### Property 21: Connection status indicator accuracy

*For any* active WebSocket connection, the connection status indicator should display "Connected".

**Validates: Requirements 9.3**

### Property 22: Disconnection status and reconnection

*For any* WebSocket connection loss, the connection status indicator should display "Disconnected" and the system should attempt reconnection.

**Validates: Requirements 9.4**

### Property 23: AISStream error logging

*For any* error returned by the AISStream API, the system should log the error with timestamp and error details.

**Validates: Requirements 10.1**

### Property 24: Database failure handling

*For any* database connection failure, the system should display an error message to the user and attempt to reconnect.

**Validates: Requirements 10.2**

### Property 25: Invalid message handling

*For any* invalid AIS message data received, the system should log the invalid data and continue processing subsequent messages without crashing.

**Validates: Requirements 10.3**

### Property 26: Unexpected error logging

*For any* unexpected error that occurs, the system should log the full error stack trace for debugging purposes.

**Validates: Requirements 10.5**

## Error Handling

### Error Categories

**1. Network Errors**
- AISStream WebSocket connection failures
- Frontend-Backend WebSocket disconnections
- HTTP request timeouts

**Strategy:**
- Implement exponential backoff for reconnections
- Display user-friendly error messages
- Log all network errors with context
- Maintain connection state indicators

**2. Data Validation Errors**
- Invalid AIS message format
- Missing required fields
- Out-of-range coordinate values

**Strategy:**
- Validate all incoming data against schemas
- Log invalid data for debugging
- Continue processing valid messages
- Never crash on invalid input

**3. Database Errors**
- Connection failures
- Query timeouts
- Constraint violations

**Strategy:**
- Implement connection pooling with health checks
- Retry failed queries with backoff
- Display error messages to users
- Gracefully degrade functionality

**4. Application Errors**
- Unexpected exceptions
- Memory issues
- Configuration errors

**Strategy:**
- Catch all unhandled exceptions
- Log full stack traces
- Implement graceful shutdown
- Provide clear error messages

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}
```

### Logging Strategy

**Log Levels:**
- ERROR: System errors requiring attention
- WARN: Potential issues or degraded functionality
- INFO: Important system events
- DEBUG: Detailed diagnostic information

**Log Format:**
```json
{
  "timestamp": "2025-12-01T10:30:00Z",
  "level": "ERROR",
  "component": "AISStreamManager",
  "message": "WebSocket connection failed",
  "error": {
    "code": "ECONNREFUSED",
    "stack": "..."
  },
  "context": {
    "reconnectAttempt": 3
  }
}
```

## Testing Strategy

### Unit Testing

**Framework:** Jest with TypeScript support

**Coverage Target:** 80% minimum

**Focus Areas:**
- Data parsing functions (AIS message parsers)
- Validation logic (coordinate validation, MMSI format)
- Business logic (filtering, searching)
- Utility functions (GeoJSON conversion, date handling)

**Example Unit Tests:**
```typescript
describe('PositionReportParser', () => {
  it('should parse valid Position Report message', () => {
    const message = createValidPositionReport();
    const result = parsePositionReport(message);
    expect(result).toHaveProperty('mmsi');
    expect(result).toHaveProperty('latitude');
    expect(result).toHaveProperty('longitude');
  });

  it('should handle missing optional fields', () => {
    const message = createPositionReportWithoutHeading();
    const result = parsePositionReport(message);
    expect(result.heading).toBeNull();
  });
});
```

### Property-Based Testing

**Framework:** fast-check (JavaScript property-based testing library)

**Configuration:** Minimum 100 iterations per property test

**Property Test Tagging:** Each property-based test must include a comment with the format:
```typescript
// Feature: smart-ais-mvp, Property X: [property description]
```

**Focus Areas:**
- Message parsing across all valid AIS message variations
- GeoJSON format validation for all coordinate ranges
- Search and filter correctness across random inputs
- Deduplication logic with various duplicate scenarios

**Example Property Tests:**
```typescript
import fc from 'fast-check';

// Feature: smart-ais-mvp, Property 7: Position Report parsing completeness
describe('Property: Position Report parsing completeness', () => {
  it('should extract all required fields from any valid Position Report', () => {
    fc.assert(
      fc.property(
        fc.record({
          UserID: fc.integer({ min: 100000000, max: 999999999 }),
          Latitude: fc.double({ min: -90, max: 90 }),
          Longitude: fc.double({ min: -180, max: 180 }),
          Sog: fc.double({ min: 0, max: 102.3 }),
          Cog: fc.double({ min: 0, max: 360 }),
          TrueHeading: fc.integer({ min: 0, max: 511 })
        }),
        (positionReport) => {
          const result = parsePositionReport(positionReport);
          expect(result.mmsi).toBeDefined();
          expect(result.latitude).toBeDefined();
          expect(result.longitude).toBeDefined();
          expect(result.sog).toBeDefined();
          expect(result.cog).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: smart-ais-mvp, Property 11: Duplicate position prevention
describe('Property: Duplicate position prevention', () => {
  it('should store only one record for duplicate MMSI and timestamp', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          mmsi: fc.stringOf(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 }),
          timestamp: fc.date(),
          latitude: fc.double({ min: -90, max: 90 }),
          longitude: fc.double({ min: -180, max: 180 })
        }),
        async (position) => {
          await repository.insertPosition(position);
          await repository.insertPosition(position); // Duplicate
          const count = await repository.countPositions(position.mmsi, position.timestamp);
          expect(count).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: smart-ais-mvp, Property 14: Bounding box filter correctness
describe('Property: Bounding box filter correctness', () => {
  it('should return only vessels within the bounding box', () => {
    fc.assert(
      fc.property(
        fc.record({
          minLat: fc.double({ min: -90, max: 89 }),
          minLon: fc.double({ min: -180, max: 179 }),
          maxLat: fc.double({ min: -89, max: 90 }),
          maxLon: fc.double({ min: -179, max: 180 })
        }).filter(bbox => bbox.minLat < bbox.maxLat && bbox.minLon < bbox.maxLon),
        fc.array(fc.record({
          mmsi: fc.string(),
          latitude: fc.double({ min: -90, max: 90 }),
          longitude: fc.double({ min: -180, max: 180 })
        })),
        (bbox, vessels) => {
          const filtered = filterVesselsByBoundingBox(vessels, bbox);
          filtered.forEach(vessel => {
            expect(vessel.latitude).toBeGreaterThanOrEqual(bbox.minLat);
            expect(vessel.latitude).toBeLessThanOrEqual(bbox.maxLat);
            expect(vessel.longitude).toBeGreaterThanOrEqual(bbox.minLon);
            expect(vessel.longitude).toBeLessThanOrEqual(bbox.maxLon);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Framework:** Supertest for API testing, Socket.io-client for WebSocket testing

**Focus Areas:**
- REST API endpoints (request/response validation)
- WebSocket message flow (connection, subscription, updates)
- Database operations (CRUD operations, queries)
- End-to-end data flow (AISStream → Database → Frontend)

**Example Integration Tests:**
```typescript
describe('Vessel API Integration', () => {
  it('should return vessel list with filters', async () => {
    const response = await request(app)
      .get('/api/vessels')
      .query({ type: 70, limit: 10 })
      .expect(200);
    
    expect(response.body).toHaveProperty('vessels');
    expect(response.body.vessels).toHaveLength(10);
    response.body.vessels.forEach(v => {
      expect(v.vessel_type).toBe(70);
    });
  });
});

describe('WebSocket Integration', () => {
  it('should receive vessel updates via WebSocket', (done) => {
    const client = io('http://localhost:3000');
    
    client.on('connect', () => {
      client.on('vesselUpdate', (data) => {
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('data');
        client.disconnect();
        done();
      });
    });
  });
});
```

### End-to-End Testing

**Framework:** Playwright for browser automation

**Focus Areas:**
- Map rendering and interaction
- Real-time vessel updates
- Search and filter functionality
- Vessel track visualization

## Performance Considerations

### Optimization Strategies

**1. Database Optimization**
- Use TimescaleDB for efficient time-series queries
- Implement spatial indexing for geographic queries
- Create continuous aggregates for common queries
- Use connection pooling

**2. Caching Strategy**
- Cache recent vessel positions in Redis (60 second TTL)
- Cache vessel metadata in Redis (1 hour TTL)
- Use Redis geospatial commands for proximity queries
- Implement cache-aside pattern

**3. Frontend Optimization**
- Implement vessel marker clustering for high-density areas
- Use virtual scrolling for vessel lists
- Debounce search input
- Lazy load vessel tracks on demand

**4. WebSocket Optimization**
- Batch position updates (100ms intervals)
- Implement regional subscriptions to reduce data volume
- Use binary protocols for large data transfers
- Compress WebSocket messages

### Performance Targets

- Map initial load: < 2 seconds
- Vessel position update latency: < 2 seconds
- Search response time: < 1 second
- Database query time: < 500ms for 1000 vessels
- WebSocket message throughput: 300 messages/second

## Deployment Architecture

### Docker Configuration

**Multi-stage Build Strategy:**
- Build stage: Compile TypeScript, install dependencies
- Production stage: Copy only necessary files, use minimal base image

**Services:**
1. **Frontend Container**
   - Nginx serving static React build
   - Port 80 exposed

2. **Backend Container**
   - Node.js application
   - Port 3000 exposed
   - Health check endpoint

3. **PostgreSQL Container**
   - TimescaleDB image
   - Persistent volume for data
   - Initialization scripts

4. **Redis Container**
   - Redis 7 Alpine image
   - Persistent volume for AOF

### Environment Variables

```bash
# Backend
AISSTREAM_API_KEY=<api_key>
DATABASE_URL=postgresql://user:pass@postgres:5432/ais
REDIS_URL=redis://redis:6379
NODE_ENV=production
PORT=3000

# Frontend
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

### Health Checks

**Backend Health Endpoint:**
```typescript
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2025-12-01T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "aisstream": "connected"
  }
}
```

## Security Considerations

### API Key Management
- Store AISStream API key in environment variables
- Never expose API key to frontend
- Rotate API keys periodically

### Input Validation
- Validate all user inputs (search queries, filters)
- Sanitize MMSI and vessel name inputs
- Validate coordinate ranges
- Prevent SQL injection with parameterized queries

### Rate Limiting
- Implement rate limiting on API endpoints
- Limit WebSocket connections per IP
- Throttle search requests

### CORS Configuration
- Configure CORS for frontend domain only
- Restrict WebSocket origins
- Use secure WebSocket (wss) in production

## Monitoring and Observability

### Metrics to Track
- WebSocket connection count
- Messages received per second
- Database query latency
- Cache hit rate
- Error rate by type
- Active vessel count

### Logging
- Structured JSON logging
- Log levels: ERROR, WARN, INFO, DEBUG
- Include correlation IDs for request tracing
- Rotate logs daily

### Alerting
- Alert on WebSocket disconnections
- Alert on database connection failures
- Alert on high error rates
- Alert on memory/CPU thresholds

## Future Enhancements

### Phase 2 Features
- User authentication and authorization
- Custom bounding box subscriptions
- Vessel alerts and notifications
- Historical playback of vessel movements
- Export vessel data (CSV, GeoJSON)

### Phase 3 Features
- AI-powered anomaly detection
- Predictive ETA calculations
- Fleet management dashboard
- Mobile application
- Multi-language support
