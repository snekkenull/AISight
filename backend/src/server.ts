import 'dotenv/config';
import http from 'http';
import { createApp } from './api/app';
import { createPool, closePool } from './db/connection';
import { VesselRepository } from './repositories/VesselRepository';
import {
  CacheService,
  AISStreamManager,
  DataPipeline,
  WebSocketServer,
  RegionalScheduler,
} from './services';
import { createComponentLogger, ConfigurationError } from './utils';

const logger = createComponentLogger('Server');

/**
 * Main server class that wires up all backend services
 * Validates: Requirements 2.1, 2.2, 6.4, 6.5
 */
class Server {
  private httpServer: http.Server | null = null;
  private pool: ReturnType<typeof createPool> | null = null;
  private cacheService: CacheService | null = null;
  private aisStreamManager: AISStreamManager | null = null;
  private dataPipeline: DataPipeline | null = null;
  private wsServer: WebSocketServer | null = null;
  private regionalScheduler: RegionalScheduler | null = null;
  private isShuttingDown = false;

  /**
   * Initialize all services and start the server
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting Smart AIS MVP Backend...');

      // Validate required environment variables
      this.validateEnvironment();

      // Initialize database connection with connection pooling
      logger.info('Initializing database connection...');
      this.pool = createPool();
      await this.testDatabaseConnection();
      logger.info('Database connection established');

      // Initialize Redis connection
      logger.info('Initializing Redis connection...');
      this.cacheService = new CacheService(process.env.REDIS_URL);
      await this.cacheService.connect();
      logger.info('Redis connection established');

      // Initialize repository
      const vesselRepository = new VesselRepository(this.pool);

      // Initialize AISStreamManager with API key
      logger.info('Initializing AISStream manager...');
      const apiKey = process.env.AISSTREAM_API_KEY!;
      this.aisStreamManager = new AISStreamManager(apiKey);

      // Initialize DataPipeline and connect to AISStreamManager events
      logger.info('Initializing data pipeline...');
      this.dataPipeline = new DataPipeline(vesselRepository, this.cacheService, {
        batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
        batchInterval: parseInt(process.env.BATCH_INTERVAL_MS || '5000', 10),
      });

      // Connect DataPipeline to AISStreamManager events
      this.aisStreamManager.on('position', (position) => {
        this.dataPipeline?.processPosition(position).catch((error) => {
          logger.error('Failed to process position', error);
        });
      });

      this.aisStreamManager.on('staticData', (staticData) => {
        this.dataPipeline?.processStaticData(staticData).catch((error) => {
          logger.error('Failed to process static data', error);
        });
      });

      this.aisStreamManager.on('error', (error) => {
        logger.logAISStreamError(error);
      });

      this.aisStreamManager.on('connected', () => {
        logger.info('AISStream connected successfully');
      });

      this.aisStreamManager.on('disconnected', (info) => {
        logger.warn('AISStream disconnected', info);
      });

      this.aisStreamManager.on('reconnecting', (info) => {
        logger.info('AISStream reconnecting...', info);
      });

      // Start data pipeline
      this.dataPipeline.start();
      logger.info('Data pipeline started');

      // Initialize Regional Scheduler for global coverage
      logger.info('Initializing regional scheduler...');
      const regionDurationMs = parseInt(
        process.env.REGION_DURATION_MS || String(4 * 60 * 60 * 1000),
        10
      ); // Default: 4 hours
      this.regionalScheduler = new RegionalScheduler({
        regionDurationMs,
        autoRotate: process.env.REGION_AUTO_ROTATE !== 'false',
      });

      // Connect regional scheduler to AISStreamManager
      this.regionalScheduler.on('regionChange', (region) => {
        logger.info('Switching AISStream subscription to region', {
          region: region.name,
          bounds: region.bounds,
        });

        // Update AISStreamManager subscription
        this.aisStreamManager?.updateSubscription({
          boundingBoxes: [region.bounds],
        });

        // Reconnect to apply new subscription
        this.reconnectAISStream();
      });

      this.regionalScheduler.on('cycleComplete', () => {
        logger.info('Completed full regional rotation cycle');
      });

      // Create Express application
      const app = createApp(
        this.pool,
        this.cacheService,
        this.aisStreamManager,
        this.regionalScheduler
      );

      // Create HTTP server
      const port = parseInt(process.env.PORT || '3000', 10);
      const host = process.env.HOST || '0.0.0.0';
      this.httpServer = http.createServer(app);

      // Initialize WebSocket server
      logger.info('Initializing WebSocket server...');
      this.wsServer = new WebSocketServer();
      this.wsServer.initialize(this.httpServer);

      // Connect DataPipeline to WebSocket server for broadcasting
      this.dataPipeline.on('vesselUpdate', (update) => {
        this.wsServer?.broadcastUpdate(update.type, update.data);
      });

      logger.info('WebSocket server initialized');

      // Start Express server
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(port, host, () => {
          logger.info(`Server listening on ${host}:${port}`);
          logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
          resolve();
        });

        this.httpServer!.on('error', (error) => {
          logger.error('Failed to start HTTP server', error);
          reject(error);
        });
      });

      // Use global coverage initially to collect vessels from everywhere
      // The regional scheduler will narrow down to specific regions after starting
      const globalBounds = { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 };
      logger.info('Using global coverage for initial AISStream connection');

      // Set initial subscription to global coverage before connecting
      this.aisStreamManager.updateSubscription({
        boundingBoxes: [globalBounds],
      });

      // Connect to AISStream with initial region
      logger.info('Connecting to AISStream...');
      await this.aisStreamManager.connect();
      logger.info('AISStream connection established');

      // Now start regional scheduler (skip initial emit since we already connected with initial region)
      this.regionalScheduler.start(true);
      logger.info('Regional scheduler started');

      logger.info('Smart AIS MVP Backend started successfully');
      logger.info(`Health check available at http://${host}:${port}/api/health`);

      // Setup graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      logger.logUnexpectedError(
        error instanceof Error ? error : new Error(String(error)),
        { phase: 'startup' }
      );
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Reconnect to AISStream with updated subscription
   * Used when regional scheduler changes the bounding box
   */
  private async reconnectAISStream(): Promise<void> {
    if (!this.aisStreamManager) {
      return;
    }

    try {
      logger.info('Reconnecting to AISStream with new subscription...');
      this.aisStreamManager.disconnect();

      // Small delay before reconnecting
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await this.aisStreamManager.connect();
      logger.info('AISStream reconnected successfully');
    } catch (error) {
      logger.error('Failed to reconnect to AISStream', error);
    }
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const required = ['AISSTREAM_API_KEY', 'DATABASE_URL', 'REDIS_URL'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new ConfigurationError(
        `Missing required environment variables: ${missing.join(', ')}`,
        { missing }
      );
    }
  }

  /**
   * Test database connection
   */
  private async testDatabaseConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      const result = await this.pool.query('SELECT NOW()');
      logger.debug('Database connection test successful', {
        timestamp: result.rows[0].now,
      });
    } catch (error) {
      logger.logDatabaseError(
        error instanceof Error ? error : new Error(String(error)),
        'connection test'
      );
      throw error;
    }
  }

  /**
   * Setup graceful shutdown handlers
   * Validates: Requirements 6.5
   */
  private setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          logger.warn('Shutdown already in progress, forcing exit...');
          process.exit(1);
        }

        logger.info(`Received ${signal}, starting graceful shutdown...`);
        this.isShuttingDown = true;

        await this.shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.logUnexpectedError(error, { type: 'uncaughtException' });
      this.shutdown().then(() => process.exit(1));
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.logUnexpectedError(
        reason instanceof Error ? reason : new Error(String(reason)),
        { type: 'unhandledRejection', promise: String(promise) }
      );
      this.shutdown().then(() => process.exit(1));
    });
  }

  /**
   * Gracefully shutdown all services
   */
  private async shutdown(): Promise<void> {
    logger.info('Shutting down services...');

    try {
      // Stop accepting new connections
      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer!.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Stop regional scheduler
      if (this.regionalScheduler) {
        this.regionalScheduler.stop();
        logger.info('Regional scheduler stopped');
      }

      // Disconnect from AISStream
      if (this.aisStreamManager) {
        this.aisStreamManager.disconnect();
        logger.info('AISStream disconnected');
      }

      // Stop data pipeline (flushes remaining batches)
      if (this.dataPipeline) {
        await this.dataPipeline.stop();
        logger.info('Data pipeline stopped');
      }

      // Close WebSocket server
      if (this.wsServer) {
        await this.wsServer.close();
        logger.info('WebSocket server closed');
      }

      // Disconnect from Redis
      if (this.cacheService) {
        await this.cacheService.disconnect();
        logger.info('Redis disconnected');
      }

      // Close database connection pool
      if (this.pool) {
        await closePool();
        logger.info('Database connection pool closed');
      }

      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown', error);
      throw error;
    }
  }
}

/**
 * Start the server
 */
const server = new Server();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
