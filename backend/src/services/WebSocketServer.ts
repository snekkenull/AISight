import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { BoundingBox, PositionReport, ShipStaticData } from '../types';

/**
 * Client subscription information
 */
interface ClientSubscription {
  regions?: BoundingBox[];
}

/**
 * WebSocket server for real-time vessel updates
 * Manages client connections, subscriptions, and broadcasts vessel data
 */
export class WebSocketServer {
  private io: SocketIOServer | null = null;
  private clients: Map<string, ClientSubscription> = new Map();

  /**
   * Initialize the WebSocket server
   * @param httpServer - HTTP server instance to attach Socket.io to
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  /**
   * Set up Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) {
      throw new Error('WebSocket server not initialized');
    }

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);

      socket.on('subscribe', (data: { regions?: BoundingBox[] }) => {
        this.handleSubscription(socket, data);
      });

      socket.on('unsubscribe', () => {
        this.handleUnsubscribe(socket);
      });

      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      socket.on('error', (error: Error) => {
        console.error(`Socket error for client ${socket.id}:`, error);
      });
    });
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    console.log(`Client connected: ${socket.id}`);
    
    // Initialize client subscription
    this.clients.set(socket.id, {});

    // Send connection acknowledgment
    socket.emit('connected', {
      clientId: socket.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client subscription to regions
   */
  private handleSubscription(socket: Socket, data: { regions?: BoundingBox[] }): void {
    const subscription = this.clients.get(socket.id);
    
    if (subscription) {
      subscription.regions = data.regions;
      this.clients.set(socket.id, subscription);
      
      socket.emit('subscribed', {
        regions: data.regions,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`Client ${socket.id} subscribed to ${data.regions?.length || 0} regions`);
    }
  }

  /**
   * Handle client unsubscribe
   */
  private handleUnsubscribe(socket: Socket): void {
    const subscription = this.clients.get(socket.id);
    
    if (subscription) {
      subscription.regions = undefined;
      this.clients.set(socket.id, subscription);
      
      socket.emit('unsubscribed', {
        timestamp: new Date().toISOString(),
      });
      
      console.log(`Client ${socket.id} unsubscribed from all regions`);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket): void {
    console.log(`Client disconnected: ${socket.id}`);
    this.clients.delete(socket.id);
  }

  /**
   * Broadcast vessel update to all connected clients
   * @param type - Type of update ('position' or 'staticData')
   * @param data - Vessel data to broadcast
   */
  broadcastUpdate(type: 'position' | 'staticData', data: PositionReport | ShipStaticData): void {
    if (!this.io) {
      console.warn('WebSocket server not initialized, cannot broadcast');
      return;
    }

    // Broadcast to all clients
    this.io.emit('vesselUpdate', {
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast vessel update to clients subscribed to specific regions
   * @param region - Geographic region identifier
   * @param type - Type of update ('position' or 'staticData')
   * @param data - Vessel data to broadcast
   */
  broadcastToRegion(
    region: string,
    type: 'position' | 'staticData',
    data: PositionReport | ShipStaticData
  ): void {
    if (!this.io) {
      console.warn('WebSocket server not initialized, cannot broadcast to region');
      return;
    }

    // For position reports, check if vessel is within subscribed regions
    if (type === 'position' && 'latitude' in data && 'longitude' in data) {
      const position = data as PositionReport;
      
      // Iterate through all clients and check their subscriptions
      this.clients.forEach((subscription, clientId) => {
        if (subscription.regions && subscription.regions.length > 0) {
          // Check if position is within any of the client's subscribed regions
          const isInRegion = subscription.regions.some((bbox) =>
            this.isPositionInBoundingBox(position, bbox)
          );

          if (isInRegion) {
            this.io?.to(clientId).emit('vesselUpdate', {
              type,
              data,
              timestamp: new Date().toISOString(),
            });
          }
        }
      });
    } else {
      // For static data or if no position info, broadcast to all clients in the region room
      this.io.to(region).emit('vesselUpdate', {
        type,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check if a position is within a bounding box
   */
  private isPositionInBoundingBox(position: PositionReport, bbox: BoundingBox): boolean {
    return (
      position.latitude >= bbox.minLat &&
      position.latitude <= bbox.maxLat &&
      position.longitude >= bbox.minLon &&
      position.longitude <= bbox.maxLon
    );
  }

  /**
   * Get the number of connected clients
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Get the Socket.io server instance
   */
  getServer(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Close the WebSocket server
   */
  async close(): Promise<void> {
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io?.close(() => {
          console.log('WebSocket server closed');
          resolve();
        });
      });
      this.io = null;
      this.clients.clear();
    }
  }
}
