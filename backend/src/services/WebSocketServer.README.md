# WebSocket Server

The WebSocketServer manages real-time communication with frontend clients, handling connections, subscriptions, and broadcasting vessel updates.

## Features

- **Connection Management**: Tracks connected clients and their subscriptions
- **Regional Subscriptions**: Allows clients to subscribe to specific geographic regions
- **Broadcast Updates**: Sends vessel position and static data updates to clients
- **Regional Broadcasting**: Filters updates based on client subscriptions

## Usage

### Initialization

```typescript
import { createServer } from 'http';
import express from 'express';
import { WebSocketServer } from './services/WebSocketServer';

const app = express();
const httpServer = createServer(app);
const wsServer = new WebSocketServer();

// Initialize WebSocket server
wsServer.initialize(httpServer);

httpServer.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

### Integration with DataPipeline

```typescript
import { DataPipeline } from './services/DataPipeline';
import { WebSocketServer } from './services/WebSocketServer';

// Create instances
const dataPipeline = new DataPipeline(vesselRepository, cacheService);
const wsServer = new WebSocketServer();

// Initialize WebSocket server
wsServer.initialize(httpServer);

// Listen for vessel updates from DataPipeline
dataPipeline.on('vesselUpdate', (update) => {
  // Broadcast to all connected clients
  wsServer.broadcastUpdate(update.type, update.data);
});

// Start the pipeline
dataPipeline.start();
```

## Client Events

### Incoming Events (from client)

- **subscribe**: Client subscribes to specific regions
  ```typescript
  socket.emit('subscribe', {
    regions: [
      { minLat: 37.0, maxLat: 38.0, minLon: -123.0, maxLon: -122.0 }
    ]
  });
  ```

- **unsubscribe**: Client unsubscribes from all regions
  ```typescript
  socket.emit('unsubscribe');
  ```

### Outgoing Events (to client)

- **connected**: Sent when client connects
  ```typescript
  {
    clientId: "socket-id",
    timestamp: "2025-12-01T10:30:00Z"
  }
  ```

- **subscribed**: Confirmation of subscription
  ```typescript
  {
    regions: [...],
    timestamp: "2025-12-01T10:30:00Z"
  }
  ```

- **vesselUpdate**: Vessel position or static data update
  ```typescript
  {
    type: "position" | "staticData",
    data: { ... },
    timestamp: "2025-12-01T10:30:00Z"
  }
  ```

## Methods

### `initialize(httpServer: HTTPServer): void`
Initializes the WebSocket server and attaches it to an HTTP server.

### `broadcastUpdate(type, data): void`
Broadcasts a vessel update to all connected clients.

### `broadcastToRegion(region, type, data): void`
Broadcasts a vessel update to clients subscribed to a specific region.

### `getConnectionCount(): number`
Returns the number of currently connected clients.

### `close(): Promise<void>`
Gracefully closes the WebSocket server and disconnects all clients.

## Configuration

The WebSocket server uses the following environment variables:

- `FRONTEND_URL`: Allowed origin for CORS (defaults to '*' for development)

## Regional Broadcasting

Clients can subscribe to specific geographic regions to receive only relevant updates:

1. Client sends a `subscribe` event with bounding boxes
2. Server stores the subscription for that client
3. When position updates arrive, server checks if position is within any subscribed region
4. Only matching updates are sent to the client

This reduces bandwidth and improves performance for clients monitoring specific areas.
