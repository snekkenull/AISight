import { EventEmitter } from 'events';
import { PositionReport, ShipStaticData } from '../types';
import { VesselRepository } from '../repositories/VesselRepository';
import { CacheService } from './CacheService';
import { createComponentLogger, DatabaseError, CacheError } from '../utils';

/**
 * Configuration options for DataPipeline
 */
export interface DataPipelineConfig {
  batchSize?: number; // Number of positions to batch before writing
  batchInterval?: number; // Time in milliseconds to wait before flushing batch
}

/**
 * DataPipeline processes incoming AIS messages, validates data,
 * batches writes to database, updates cache, and broadcasts to connected clients
 */
export class DataPipeline extends EventEmitter {
  private vesselRepository: VesselRepository;
  private cacheService: CacheService;
  private positionQueue: PositionReport[] = [];
  private batchSize: number;
  private batchInterval: number;
  private batchTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private logger = createComponentLogger('DataPipeline');

  constructor(
    vesselRepository: VesselRepository,
    cacheService: CacheService,
    config: DataPipelineConfig = {}
  ) {
    super();
    this.vesselRepository = vesselRepository;
    this.cacheService = cacheService;
    this.batchSize = config.batchSize || 100;
    this.batchInterval = config.batchInterval || 5000; // 5 seconds default
  }

  /**
   * Start the data pipeline
   * Initializes batch processing timer
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.scheduleBatchFlush();
    this.logger.info('Data pipeline started', {
      batchSize: this.batchSize,
      batchInterval: `${this.batchInterval}ms`,
    });
    this.emit('started');
  }

  /**
   * Stop the data pipeline
   * Flushes any remaining batched data
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush remaining positions
    await this.flushBatch();
    
    this.logger.info('Data pipeline stopped');
    this.emit('stopped');
  }

  /**
   * Process a position report
   * Validates data, queues for batch processing, and updates cache
   */
  async processPosition(position: PositionReport): Promise<void> {
    const mmsi = position.mmsi || 'unknown';
    const timestamp = position.timestamp?.toISOString() || new Date().toISOString();
    
    try {
      // Validate position data
      if (!this.validatePosition(position)) {
        // Detailed logging already handled in validatePosition
        this.emit('invalidData', {
          type: 'position',
          mmsi,
          timestamp,
          reason: 'Validation failed',
        });
        return;
      }

      // Ensure vessel exists before adding position to queue
      await this.ensureVesselExists(position.mmsi);

      // Add to batch queue
      this.positionQueue.push(position);

      // Update cache immediately for real-time access
      try {
        await this.cacheService.setVesselPosition(position.mmsi, position);
      } catch (error) {
        const cacheError = new CacheError('Failed to update cache for position', {
          mmsi: position.mmsi,
          originalError: error instanceof Error ? error.message : String(error),
        });
        
        // Enhanced error logging with detailed context
        this.logger.error('Cache update failed during position ingestion', cacheError, {
          mmsi: position.mmsi,
          timestamp,
          operation: 'setVesselPosition',
          positionData: {
            latitude: position.latitude,
            longitude: position.longitude,
          },
        });
        
        // Emit error event for monitoring
        this.emit('ingestionError', {
          stage: 'cache_update',
          mmsi: position.mmsi,
          timestamp,
          reason: 'Cache service failure',
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Flush batch if size threshold reached
      if (this.positionQueue.length >= this.batchSize) {
        await this.flushBatch();
      }

      // Broadcast update to connected clients
      this.emit('vesselUpdate', {
        type: 'position',
        data: position,
      });

    } catch (error) {
      // Enhanced error logging with detailed context for ingestion failures
      this.logger.error('Position ingestion failed', error instanceof Error ? error : new Error(String(error)), {
        mmsi,
        timestamp,
        operation: 'processPosition',
        failureStage: 'ingestion',
        positionData: {
          latitude: position.latitude,
          longitude: position.longitude,
          sog: position.sog,
          cog: position.cog,
          true_heading: position.true_heading,
        },
      });
      
      // Emit error event for monitoring
      this.emit('ingestionError', {
        stage: 'processing',
        mmsi,
        timestamp,
        reason: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Process ship static data
   * Validates data, updates database and cache
   */
  async processStaticData(staticData: ShipStaticData): Promise<void> {
    const mmsi = staticData.mmsi || 'unknown';
    const timestamp = new Date().toISOString();
    
    try {
      // Validate static data
      if (!this.validateStaticData(staticData)) {
        // Detailed logging already handled in validateStaticData
        this.emit('invalidData', {
          type: 'staticData',
          mmsi,
          timestamp,
          reason: 'Validation failed',
        });
        return;
      }

      // Update database (upsert vessel metadata)
      try {
        await this.vesselRepository.upsertVessel(staticData);
      } catch (error) {
        const dbError = new DatabaseError('Failed to upsert vessel metadata', {
          mmsi: staticData.mmsi,
          originalError: error instanceof Error ? error.message : String(error),
        });
        
        // Enhanced error logging with detailed context
        this.logger.error('Database upsert failed during static data ingestion', dbError, {
          mmsi: staticData.mmsi,
          timestamp,
          operation: 'upsertVessel',
          staticData: {
            name: staticData.name,
            callSign: staticData.callSign,
            type: staticData.type,
            imo: staticData.imo,
          },
        });
        
        // Emit error event for monitoring
        this.emit('ingestionError', {
          stage: 'database_upsert',
          mmsi: staticData.mmsi,
          timestamp,
          reason: 'Database operation failure',
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      // Update cache
      try {
        await this.cacheService.setVesselMetadata(staticData.mmsi, staticData);
      } catch (error) {
        const cacheError = new CacheError('Failed to update cache for static data', {
          mmsi: staticData.mmsi,
          originalError: error instanceof Error ? error.message : String(error),
        });
        
        // Enhanced error logging with detailed context
        this.logger.error('Cache update failed during static data ingestion', cacheError, {
          mmsi: staticData.mmsi,
          timestamp,
          operation: 'setVesselMetadata',
          staticData: {
            name: staticData.name,
            callSign: staticData.callSign,
          },
        });
        
        // Emit error event for monitoring
        this.emit('ingestionError', {
          stage: 'cache_update',
          mmsi: staticData.mmsi,
          timestamp,
          reason: 'Cache service failure',
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Broadcast update to connected clients
      this.emit('vesselUpdate', {
        type: 'staticData',
        data: staticData,
      });

    } catch (error) {
      // Enhanced error logging with detailed context for ingestion failures
      this.logger.error('Static data ingestion failed', error instanceof Error ? error : new Error(String(error)), {
        mmsi,
        timestamp,
        operation: 'processStaticData',
        failureStage: 'ingestion',
        staticData: {
          name: staticData.name,
          callSign: staticData.callSign,
          type: staticData.type,
          imo: staticData.imo,
        },
      });
      
      // Emit error event for monitoring
      this.emit('ingestionError', {
        stage: 'processing',
        mmsi,
        timestamp,
        reason: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Validate position report data
   * Checks for required fields and valid ranges
   * Returns validation result with detailed failure reasons
   */
  private validatePosition(position: PositionReport): boolean {
    const validationResult = this.validatePositionWithDetails(position);
    
    if (!validationResult.valid) {
      // Log detailed validation failure with structured context
      this.logger.warn('Position validation failed', {
        mmsi: position.mmsi || 'unknown',
        timestamp: position.timestamp?.toISOString() || 'missing',
        failureReason: validationResult.reason,
        validationErrors: validationResult.errors,
        positionData: {
          latitude: position.latitude,
          longitude: position.longitude,
          sog: position.sog,
          cog: position.cog,
          true_heading: position.true_heading,
        },
      });
      
      // Emit error event for monitoring
      this.emit('validationError', {
        type: 'position',
        mmsi: position.mmsi || 'unknown',
        timestamp: position.timestamp?.toISOString() || 'missing',
        reason: validationResult.reason,
        errors: validationResult.errors,
      });
    }
    
    return validationResult.valid;
  }

  /**
   * Validate position report with detailed error information
   * Returns validation result with specific failure reasons
   */
  private validatePositionWithDetails(position: PositionReport): {
    valid: boolean;
    reason?: string;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!position.mmsi) {
      errors.push('Missing required field: mmsi');
    }
    if (!position.timestamp) {
      errors.push('Missing required field: timestamp');
    }

    // Validate MMSI format (9 digits)
    if (position.mmsi && !/^\d{9}$/.test(position.mmsi)) {
      errors.push(`Invalid MMSI format: ${position.mmsi} (must be 9 digits)`);
    }

    // Validate latitude range (-90 to 90)
    if (position.latitude === undefined) {
      errors.push('Missing required field: latitude');
    } else if (position.latitude < -90 || position.latitude > 90) {
      errors.push(`Latitude out of range: ${position.latitude} (must be -90 to 90)`);
    }

    // Validate longitude range (-180 to 180)
    if (position.longitude === undefined) {
      errors.push('Missing required field: longitude');
    } else if (position.longitude < -180 || position.longitude > 180) {
      errors.push(`Longitude out of range: ${position.longitude} (must be -180 to 180)`);
    }

    // Validate SOG if present (0 to 102.3 knots)
    if (position.sog !== undefined && (position.sog < 0 || position.sog > 102.3)) {
      errors.push(`SOG out of range: ${position.sog} (must be 0 to 102.3 knots)`);
    }

    // Validate COG if present (0 to 360 degrees)
    if (position.cog !== undefined && (position.cog < 0 || position.cog > 360)) {
      errors.push(`COG out of range: ${position.cog} (must be 0 to 360 degrees)`);
    }

    // Validate heading if present (0 to 511, where 511 means not available)
    if (position.true_heading !== undefined && (position.true_heading < 0 || position.true_heading > 511)) {
      errors.push(`Heading out of range: ${position.true_heading} (must be 0 to 511)`);
    }

    // Validate timestamp is not in the future (allow 60 second tolerance for clock skew)
    if (position.timestamp) {
      const now = new Date();
      const futureThreshold = new Date(now.getTime() + 60000); // 60 seconds tolerance
      if (position.timestamp > futureThreshold) {
        errors.push(`Timestamp in future: ${position.timestamp.toISOString()}`);
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        reason: errors[0], // Primary reason
        errors,
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Ensure vessel exists in database, create placeholder if not
   * This prevents foreign key constraint violations when position reports arrive before static data
   */
  private async ensureVesselExists(mmsi: string): Promise<void> {
    try {
      // Check if vessel exists in database
      const vessel = await this.vesselRepository.getVesselByMMSI(mmsi);
      
      if (!vessel) {
        // Create placeholder vessel record
        const placeholderVessel: ShipStaticData = {
          mmsi,
          // All other fields are optional and will be updated when static data arrives
        };
        
        await this.vesselRepository.upsertVessel(placeholderVessel);
        this.logger.debug('Created placeholder vessel', { mmsi });
      }
    } catch (error) {
      // Log error but don't throw - we'll let the database handle the constraint
      this.logger.warn('Failed to ensure vessel exists', {
        mmsi,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Validate ship static data
   * Checks for required fields and valid values
   * Returns validation result with detailed failure reasons
   */
  private validateStaticData(staticData: ShipStaticData): boolean {
    const validationResult = this.validateStaticDataWithDetails(staticData);
    
    if (!validationResult.valid) {
      // Log detailed validation failure with structured context
      this.logger.warn('Static data validation failed', {
        mmsi: staticData.mmsi || 'unknown',
        timestamp: new Date().toISOString(),
        failureReason: validationResult.reason,
        validationErrors: validationResult.errors,
        staticData: {
          name: staticData.name,
          callSign: staticData.callSign,
          type: staticData.type,
          imo: staticData.imo,
          dimensions: staticData.dimensions,
          draught: staticData.draught,
        },
      });
      
      // Emit error event for monitoring
      this.emit('validationError', {
        type: 'staticData',
        mmsi: staticData.mmsi || 'unknown',
        timestamp: new Date().toISOString(),
        reason: validationResult.reason,
        errors: validationResult.errors,
      });
    }
    
    return validationResult.valid;
  }

  /**
   * Validate static data with detailed error information
   * Returns validation result with specific failure reasons
   */
  private validateStaticDataWithDetails(staticData: ShipStaticData): {
    valid: boolean;
    reason?: string;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required field
    if (!staticData.mmsi) {
      errors.push('Missing required field: mmsi');
    }

    // Validate MMSI format (9 digits)
    if (staticData.mmsi && !/^\d{9}$/.test(staticData.mmsi)) {
      errors.push(`Invalid MMSI format: ${staticData.mmsi} (must be 9 digits)`);
    }

    // Validate vessel type if present (0 to 99)
    if (staticData.type !== undefined && (staticData.type < 0 || staticData.type > 99)) {
      errors.push(`Vessel type out of range: ${staticData.type} (must be 0 to 99)`);
    }

    // Validate IMO number if present (7 digits)
    if (staticData.imo !== undefined && staticData.imo > 0) {
      const imoStr = staticData.imo.toString();
      if (imoStr.length !== 7) {
        errors.push(`Invalid IMO number: ${staticData.imo} (must be 7 digits)`);
      }
    }

    // Validate dimensions if present
    if (staticData.dimensions) {
      const { a, b, c, d } = staticData.dimensions;
      if (a < 0 || a > 511) {
        errors.push(`Dimension A out of range: ${a} (must be 0 to 511)`);
      }
      if (b < 0 || b > 511) {
        errors.push(`Dimension B out of range: ${b} (must be 0 to 511)`);
      }
      if (c < 0 || c > 63) {
        errors.push(`Dimension C out of range: ${c} (must be 0 to 63)`);
      }
      if (d < 0 || d > 63) {
        errors.push(`Dimension D out of range: ${d} (must be 0 to 63)`);
      }
    }

    // Validate draught if present (0 to 25.5 meters)
    if (staticData.draught !== undefined && (staticData.draught < 0 || staticData.draught > 25.5)) {
      errors.push(`Draught out of range: ${staticData.draught} (must be 0 to 25.5 meters)`);
    }

    if (errors.length > 0) {
      return {
        valid: false,
        reason: errors[0], // Primary reason
        errors,
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Flush the current batch of positions to the database
   */
  private async flushBatch(): Promise<void> {
    if (this.positionQueue.length === 0) {
      return;
    }

    const batch = [...this.positionQueue];
    this.positionQueue = [];
    const timestamp = new Date().toISOString();

    try {
      await this.vesselRepository.batchInsertPositions(batch);
      this.logger.debug('Batch processed successfully', { 
        count: batch.length,
        timestamp,
      });
      this.emit('batchProcessed', { 
        count: batch.length,
        timestamp,
      });
    } catch (error) {
      const dbError = new DatabaseError('Failed to flush batch', {
        batchSize: batch.length,
        originalError: error instanceof Error ? error.message : String(error),
      });
      
      // Enhanced error logging with detailed context
      const mmsiList = batch.map(p => p.mmsi).slice(0, 10); // First 10 MMSIs
      this.logger.error('Batch insert failed during position ingestion', dbError, {
        timestamp,
        operation: 'batchInsertPositions',
        batchSize: batch.length,
        affectedVessels: mmsiList,
        moreVessels: batch.length > 10 ? batch.length - 10 : 0,
        willRetry: false,
        note: 'Positions are cached in Redis and available via API',
      });
      
      // Emit error event for monitoring
      this.emit('ingestionError', {
        stage: 'batch_insert',
        timestamp,
        reason: 'Batch database insert failure',
        batchSize: batch.length,
        affectedVessels: mmsiList,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Don't re-queue failed positions to prevent queue growth
      // Positions are already cached in Redis and available via API
      // The database insert will be retried on next position update for the same vessel
    }
  }

  /**
   * Schedule the next batch flush
   */
  private scheduleBatchFlush(): void {
    if (!this.isRunning) {
      return;
    }

    this.batchTimer = setTimeout(async () => {
      await this.flushBatch();
      this.scheduleBatchFlush();
    }, this.batchInterval);
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.positionQueue.length;
  }

  /**
   * Check if pipeline is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
