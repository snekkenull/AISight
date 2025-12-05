import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { PositionReport, ShipStaticData, VesselDimensions } from '../types';
import { createComponentLogger, AISStreamError } from '../utils';

/**
 * Subscription options for AISStream API
 */
export interface SubscriptionOptions {
  boundingBoxes?: BoundingBox[];
  messageTypes?: string[];
  mmsiFilters?: string[];
}

interface BoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

/**
 * Connection statistics for monitoring
 */
export interface ConnectionStatistics {
  isConnected: boolean;
  messagesReceived: number;
  messagesProcessed: number;
  errors: number;
  lastMessage: Date | null;
  reconnectAttempts: number;
}

/**
 * AISStream message types
 */
interface AISStreamMessage {
  MessageType: string;
  Message?: {
    PositionReport?: AISPositionReport;
    ShipStaticData?: AISShipStaticData;
  };
  MetaData?: {
    MMSI?: number;
    ShipName?: string;
    time_utc?: string;
  };
}

interface AISPositionReport {
  Latitude?: number;
  Longitude?: number;
  Sog?: number;
  Cog?: number;
  TrueHeading?: number;
  NavigationalStatus?: number;
  RateOfTurn?: number;
  UserID?: number;
}

interface AISShipStaticData {
  Name?: string;
  Type?: number;
  ImoNumber?: number;
  CallSign?: string;
  Dimension?: {
    A?: number;
    B?: number;
    C?: number;
    D?: number;
  };
  Destination?: string;
  Eta?: {
    Month?: number;
    Day?: number;
    Hour?: number;
    Minute?: number;
  };
  Draught?: number;
  UserID?: number;
}

/**
 * AISStreamManager manages WebSocket connection to AISStream API
 * Handles authentication, message parsing, and reconnection logic
 */
export class AISStreamManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private wsUrl: string = 'wss://stream.aisstream.io/v0/stream';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private authenticationSent: boolean = false;
  private connectionStartTime: Date | null = null;

  // Statistics
  private stats: ConnectionStatistics = {
    isConnected: false,
    messagesReceived: 0,
    messagesProcessed: 0,
    errors: 0,
    lastMessage: null,
    reconnectAttempts: 0,
  };

  // Subscription configuration
  private subscriptionOptions: SubscriptionOptions = {
    messageTypes: ['PositionReport', 'ShipStaticData'],
  };

  private logger = createComponentLogger('AISStreamManager');

  constructor(apiKey: string, wsUrl?: string) {
    super();
    this.apiKey = apiKey;
    if (wsUrl) {
      this.wsUrl = wsUrl;
    }
  }

  /**
   * Connect to AISStream WebSocket API
   * Establishes connection and sends authentication message
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionStartTime = new Date();
        this.ws = new WebSocket(this.wsUrl);

        // Connection opened
        this.ws.on('open', () => {
          this.isConnected = true;
          this.stats.isConnected = true;
          this.reconnectAttempts = 0;
          this.authenticationSent = false;

          // Send authentication message within 3 seconds
          this.sendAuthentication();
          
          this.emit('connected');
          resolve();
        });

        // Message received
        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        // Connection closed
        this.ws.on('close', (code: number, reason: Buffer) => {
          this.isConnected = false;
          this.stats.isConnected = false;
          this.authenticationSent = false;
          
          this.emit('disconnected', { code, reason: reason.toString() });
          
          // Attempt reconnection with exponential backoff
          this.scheduleReconnect();
        });

        // Error occurred
        this.ws.on('error', (error: Error) => {
          this.stats.errors++;
          const aisError = new AISStreamError('WebSocket error occurred', {
            originalError: error.message,
            isConnected: this.isConnected,
          });
          this.logger.logAISStreamError(aisError, {
            reconnectAttempts: this.reconnectAttempts,
          });
          this.emit('error', aisError);
          
          if (!this.isConnected) {
            reject(aisError);
          }
        });

        // Set connection timeout (3 seconds as per requirements)
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            const timeoutError = new AISStreamError(
              'Connection timeout: Failed to connect within 3 seconds'
            );
            this.logger.logAISStreamError(timeoutError);
            reject(timeoutError);
            this.ws?.terminate();
          }
        }, 3000);

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send authentication message to AISStream
   * Must be sent within 3 seconds of connection establishment
   */
  private sendAuthentication(): void {
    if (!this.ws || !this.isConnected || this.authenticationSent) {
      return;
    }

    // Convert bounding boxes to AISStream format: [[lat1, lon1], [lat2, lon2]]
    let boundingBoxes: number[][][] = [
      // Default: Global coverage
      [
        [-90, -180],
        [90, 180],
      ],
    ];

    if (this.subscriptionOptions.boundingBoxes && this.subscriptionOptions.boundingBoxes.length > 0) {
      boundingBoxes = this.subscriptionOptions.boundingBoxes.map((bbox) => [
        [bbox.minLat, bbox.minLon],
        [bbox.maxLat, bbox.maxLon],
      ]);
    }

    const authMessage = {
      APIKey: this.apiKey,
      BoundingBoxes: boundingBoxes,
      FilterMessageTypes: this.subscriptionOptions.messageTypes || ['PositionReport', 'ShipStaticData'],
    };

    try {
      this.ws.send(JSON.stringify(authMessage));
      this.authenticationSent = true;
      this.logger.info('Authentication message sent');
      
      // Verify authentication was sent within 3 seconds
      if (this.connectionStartTime) {
        const authTime = new Date().getTime() - this.connectionStartTime.getTime();
        if (authTime > 3000) {
          this.logger.warn('Authentication sent late', {
            authTime: `${authTime}ms`,
            requirement: '<3000ms',
          });
          this.emit('warning', `Authentication sent after ${authTime}ms (requirement: <3000ms)`);
        }
      }
    } catch (error) {
      this.stats.errors++;
      const authError = new AISStreamError(
        'Failed to send authentication',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
      this.logger.logAISStreamError(authError);
      this.emit('error', authError);
    }
  }

  /**
   * Handle incoming WebSocket messages
   * Parses and emits appropriate events
   */
  private handleMessage(data: WebSocket.Data): void {
    this.stats.messagesReceived++;
    this.stats.lastMessage = new Date();

    try {
      const message: AISStreamMessage = JSON.parse(data.toString());

      // Parse Position Report messages
      if (message.MessageType === 'PositionReport' && message.Message?.PositionReport) {
        const positionReport = this.parsePositionReport(message);
        if (positionReport) {
          this.stats.messagesProcessed++;
          this.emit('position', positionReport);
        }
      }

      // Parse Ship Static Data messages
      if (message.MessageType === 'ShipStaticData' && message.Message?.ShipStaticData) {
        const staticData = this.parseShipStaticData(message);
        if (staticData) {
          this.stats.messagesProcessed++;
          this.emit('staticData', staticData);
        }
      }

    } catch (error) {
      this.stats.errors++;
      this.logger.logInvalidMessage('Unknown', data.toString(), 
        error instanceof Error ? error.message : String(error)
      );
      this.emit('error', new Error(`Failed to parse message: ${error}`));
    }
  }

  /**
   * Parse Position Report message
   * Extracts: latitude, longitude, SOG, COG, MMSI, timestamp
   */
  private parsePositionReport(message: AISStreamMessage): PositionReport | null {
    try {
      const pr = message.Message?.PositionReport;
      const metadata = message.MetaData;

      if (!pr || !metadata) {
        return null;
      }

      // Extract MMSI from UserID or MetaData
      const mmsi = (pr.UserID || metadata.MMSI)?.toString();
      if (!mmsi) {
        return null;
      }

      // Validate required fields
      if (pr.Latitude === undefined || pr.Longitude === undefined) {
        return null;
      }

      // Parse timestamp
      const timestamp = metadata.time_utc ? new Date(metadata.time_utc) : new Date();

      return {
        mmsi,
        timestamp,
        latitude: pr.Latitude,
        longitude: pr.Longitude,
        sog: pr.Sog,
        cog: pr.Cog,
        true_heading: pr.TrueHeading,
        navigational_status: pr.NavigationalStatus,
        rate_of_turn: pr.RateOfTurn,
      };
    } catch (error) {
      this.logger.logInvalidMessage('PositionReport', message, 
        error instanceof Error ? error.message : String(error)
      );
      this.emit('error', new Error(`Failed to parse Position Report: ${error}`));
      return null;
    }
  }

  /**
   * Parse Ship Static Data message
   * Extracts: vessel name, type, dimensions, destination
   */
  private parseShipStaticData(message: AISStreamMessage): ShipStaticData | null {
    try {
      const ssd = message.Message?.ShipStaticData;
      const metadata = message.MetaData;

      if (!ssd || !metadata) {
        return null;
      }

      // Extract MMSI from UserID or MetaData
      const mmsi = (ssd.UserID || metadata.MMSI)?.toString();
      if (!mmsi) {
        return null;
      }

      // Parse dimensions
      let dimensions: VesselDimensions | undefined;
      if (ssd.Dimension) {
        dimensions = {
          a: ssd.Dimension.A || 0,
          b: ssd.Dimension.B || 0,
          c: ssd.Dimension.C || 0,
          d: ssd.Dimension.D || 0,
        };
      }

      // Parse ETA if available
      let eta: Date | undefined;
      if (ssd.Eta && ssd.Eta.Month && ssd.Eta.Day) {
        const currentYear = new Date().getFullYear();
        eta = new Date(
          currentYear,
          ssd.Eta.Month - 1,
          ssd.Eta.Day,
          ssd.Eta.Hour || 0,
          ssd.Eta.Minute || 0
        );
      }

      return {
        mmsi,
        name: ssd.Name || metadata.ShipName,
        type: ssd.Type,
        imo: ssd.ImoNumber,
        callSign: ssd.CallSign,
        dimensions,
        destination: ssd.Destination,
        eta,
        draught: ssd.Draught,
      };
    } catch (error) {
      this.logger.logInvalidMessage('ShipStaticData', message, 
        error instanceof Error ? error.message : String(error)
      );
      this.emit('error', new Error(`Failed to parse Ship Static Data: ${error}`));
      return null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   * Attempts up to 5 reconnections
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const maxAttemptsError = new AISStreamError(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
      this.logger.logAISStreamError(maxAttemptsError, {
        maxAttempts: this.maxReconnectAttempts,
      });
      this.emit('error', maxAttemptsError);
      return;
    }

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Calculate exponential backoff delay: 2^attempt * 1000ms
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;
    this.stats.reconnectAttempts = this.reconnectAttempts;

    this.logger.info('Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      delay: `${delay}ms`,
    });
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        const reconnectError = new AISStreamError(
          `Reconnection attempt ${this.reconnectAttempts} failed`,
          { originalError: error instanceof Error ? error.message : String(error) }
        );
        this.logger.logAISStreamError(reconnectError);
        this.emit('error', reconnectError);
      });
    }, delay);
  }

  /**
   * Disconnect from AISStream
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.stats.isConnected = false;
    this.authenticationSent = false;
  }

  /**
   * Update subscription options
   * Note: Requires reconnection to take effect
   */
  updateSubscription(options: SubscriptionOptions): void {
    this.subscriptionOptions = {
      ...this.subscriptionOptions,
      ...options,
    };
  }

  /**
   * Get connection statistics
   */
  getStatistics(): ConnectionStatistics {
    return { ...this.stats };
  }

  /**
   * Check if currently connected
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }
}
