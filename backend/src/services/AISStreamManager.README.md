# AISStreamManager

The `AISStreamManager` class manages the WebSocket connection to the AISStream API, handling authentication, message parsing, and automatic reconnection with exponential backoff.

## Features

- **WebSocket Connection Management**: Establishes and maintains connection to AISStream API
- **Authentication**: Automatically sends authentication message within 3 seconds of connection
- **Message Parsing**: Parses Position Report and Ship Static Data messages
- **Reconnection Logic**: Implements exponential backoff (up to 5 attempts)
- **Event Emitters**: Emits events for position updates, static data, errors, and connection status
- **Connection Statistics**: Tracks messages received, processed, errors, and connection status

## Usage

```typescript
import { AISStreamManager } from './services';

// Create manager instance
const manager = new AISStreamManager(process.env.AISSTREAM_API_KEY!);

// Listen for position updates
manager.on('position', (position: PositionReport) => {
  console.log('Position update:', position);
});

// Listen for vessel metadata
manager.on('staticData', (data: ShipStaticData) => {
  console.log('Static data:', data);
});

// Listen for errors
manager.on('error', (error: Error) => {
  console.error('AISStream error:', error);
});

// Listen for connection events
manager.on('connected', () => {
  console.log('Connected to AISStream');
});

manager.on('disconnected', ({ code, reason }) => {
  console.log('Disconnected:', code, reason);
});

manager.on('reconnecting', ({ attempt, delay }) => {
  console.log(`Reconnecting (attempt ${attempt}) in ${delay}ms`);
});

// Connect to AISStream
await manager.connect();

// Get statistics
const stats = manager.getStatistics();
console.log('Statistics:', stats);

// Update subscription (requires reconnection)
manager.updateSubscription({
  boundingBoxes: [
    {
      minLat: 37.0,
      minLon: -123.0,
      maxLat: 38.0,
      maxLon: -122.0,
    },
  ],
});

// Disconnect when done
manager.disconnect();
```

## Events

- `position`: Emitted when a Position Report is received and parsed
- `staticData`: Emitted when Ship Static Data is received and parsed
- `error`: Emitted when an error occurs
- `connected`: Emitted when connection is established
- `disconnected`: Emitted when connection is lost
- `reconnecting`: Emitted when attempting to reconnect
- `warning`: Emitted for non-critical issues

## Requirements Validation

This implementation satisfies the following requirements:

- **2.1**: Establishes WebSocket connection to wss://stream.aisstream.io/v0/stream within 3 seconds
- **2.2**: Sends authentication message containing API key within 3 seconds
- **2.3**: Implements reconnection with exponential backoff up to 5 attempts
- **2.4**: Parses Position Report messages and extracts latitude, longitude, SOG, COG, MMSI, and timestamp
- **2.5**: Parses Ship Static Data messages and extracts vessel name, type, dimensions, and destination

## Connection Statistics

The `getStatistics()` method returns:

```typescript
{
  isConnected: boolean;
  messagesReceived: number;
  messagesProcessed: number;
  errors: number;
  lastMessage: Date | null;
  reconnectAttempts: number;
}
```

## Reconnection Behavior

When the connection is lost, the manager automatically attempts to reconnect with exponential backoff:

- Attempt 1: 1 second delay (2^0 * 1000ms)
- Attempt 2: 2 seconds delay (2^1 * 1000ms)
- Attempt 3: 4 seconds delay (2^2 * 1000ms)
- Attempt 4: 8 seconds delay (2^3 * 1000ms)
- Attempt 5: 16 seconds delay (2^4 * 1000ms)

After 5 failed attempts, an error event is emitted and reconnection stops.
