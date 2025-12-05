/**
 * Example: Integrating WebSocketServer with DataPipeline
 * 
 * This file demonstrates how to wire up the WebSocketServer
 * to receive vessel updates from the DataPipeline and broadcast
 * them to connected clients.
 */

import { createServer } from 'http';
import express from 'express';
import { WebSocketServer } from './WebSocketServer';
import { DataPipeline } from './DataPipeline';
import { VesselRepository } from '../repositories/VesselRepository';
import { CacheService } from './CacheService';

// Example setup function
export function setupWebSocketIntegration(
  dataPipeline: DataPipeline,
  httpServer: ReturnType<typeof createServer>
): WebSocketServer {
  // Create and initialize WebSocket server
  const wsServer = new WebSocketServer();
  wsServer.initialize(httpServer);

  // Listen for vessel updates from DataPipeline
  dataPipeline.on('vesselUpdate', (update: { type: 'position' | 'staticData'; data: any }) => {
    // Broadcast to all connected clients
    wsServer.broadcastUpdate(update.type, update.data);
  });

  // Listen for errors
  dataPipeline.on('error', (error: Error) => {
    console.error('DataPipeline error:', error);
  });

  // Listen for invalid data
  dataPipeline.on('invalidData', (data: any) => {
    console.warn('Invalid data received:', data);
  });

  console.log('WebSocket server integrated with DataPipeline');
  
  return wsServer;
}

// Example usage in server.ts:
/*
import { createServer } from 'http';
import express from 'express';
import { setupWebSocketIntegration } from './services/WebSocketServer.example';
import { DataPipeline } from './services/DataPipeline';
import { VesselRepository } from './repositories/VesselRepository';
import { CacheService } from './services/CacheService';

const app = express();
const httpServer = createServer(app);

// Initialize services
const vesselRepository = new VesselRepository(pool);
const cacheService = new CacheService(redisClient);
const dataPipeline = new DataPipeline(vesselRepository, cacheService);

// Set up WebSocket integration
const wsServer = setupWebSocketIntegration(dataPipeline, httpServer);

// Start the pipeline
dataPipeline.start();

// Start the server
httpServer.listen(3000, () => {
  console.log('Server listening on port 3000');
  console.log(`WebSocket clients connected: ${wsServer.getConnectionCount()}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await dataPipeline.stop();
  await wsServer.close();
  process.exit(0);
});
*/
