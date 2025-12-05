import { createClient, RedisClientType } from 'redis';
import { PositionReport, ShipStaticData, BoundingBox } from '../types';
import { createComponentLogger, CacheError } from '../utils';

/**
 * CacheService manages Redis cache for vessel positions and metadata
 * Provides fast access to recent vessel data and geospatial queries
 */
export class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private logger = createComponentLogger('CacheService');

  // TTL values in seconds
  private readonly POSITION_TTL = 60; // 60 seconds for positions
  private readonly METADATA_TTL = 3600; // 1 hour for metadata

  // Redis key prefixes
  private readonly POSITION_PREFIX = 'vessel:position:';
  private readonly METADATA_PREFIX = 'vessel:metadata:';
  private readonly GEO_KEY = 'vessels:geo';
  private readonly ACTIVE_VESSELS_KEY = 'vessels:active';

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => {
      const cacheError = new CacheError('Redis client error', {
        originalError: err.message,
      });
      this.logger.error('Redis client error', cacheError);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      this.logger.warn('Redis client disconnected');
      this.isConnected = false;
    });
  }

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis server
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis client is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Set vessel position in cache with TTL
   * Also updates geospatial index for proximity queries
   */
  async setVesselPosition(mmsi: string, position: PositionReport): Promise<void> {
    const key = `${this.POSITION_PREFIX}${mmsi}`;
    
    try {
      // Store position data as JSON
      const positionData = JSON.stringify({
        mmsi: position.mmsi,
        timestamp: position.timestamp.toISOString(),
        latitude: position.latitude,
        longitude: position.longitude,
        sog: position.sog,
        cog: position.cog,
        true_heading: position.true_heading,
        navigational_status: position.navigational_status,
        rate_of_turn: position.rate_of_turn,
      });

      // Use pipeline for atomic operations
      const pipeline = this.client.multi();
      
      // Store position with TTL
      pipeline.set(key, positionData, { EX: this.POSITION_TTL });
      
      // Add to geospatial index
      pipeline.geoAdd(this.GEO_KEY, {
        longitude: position.longitude,
        latitude: position.latitude,
        member: mmsi,
      });
      
      // Add to active vessels set with TTL
      pipeline.sAdd(this.ACTIVE_VESSELS_KEY, mmsi);
      pipeline.expire(this.ACTIVE_VESSELS_KEY, this.POSITION_TTL);
      
      await pipeline.exec();
    } catch (error) {
      const cacheError = new CacheError('Failed to set vessel position', {
        mmsi,
        originalError: error instanceof Error ? error.message : String(error),
      });
      this.logger.error('Failed to set vessel position', cacheError);
      throw cacheError;
    }
  }

  /**
   * Get vessel position from cache
   */
  async getVesselPosition(mmsi: string): Promise<PositionReport | null> {
    const key = `${this.POSITION_PREFIX}${mmsi}`;
    const data = await this.client.get(key);
    
    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data);
    return {
      mmsi: parsed.mmsi,
      timestamp: new Date(parsed.timestamp),
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      sog: parsed.sog,
      cog: parsed.cog,
      true_heading: parsed.true_heading,
      navigational_status: parsed.navigational_status,
      rate_of_turn: parsed.rate_of_turn,
    };
  }

  /**
   * Set vessel metadata in cache with TTL
   */
  async setVesselMetadata(mmsi: string, metadata: ShipStaticData): Promise<void> {
    const key = `${this.METADATA_PREFIX}${mmsi}`;
    
    const metadataData = JSON.stringify({
      mmsi: metadata.mmsi,
      name: metadata.name,
      type: metadata.type,
      imo: metadata.imo,
      callSign: metadata.callSign,
      dimensions: metadata.dimensions,
      destination: metadata.destination,
      eta: metadata.eta?.toISOString(),
      draught: metadata.draught,
    });

    await this.client.set(key, metadataData, { EX: this.METADATA_TTL });
  }

  /**
   * Get vessel metadata from cache
   */
  async getVesselMetadata(mmsi: string): Promise<ShipStaticData | null> {
    const key = `${this.METADATA_PREFIX}${mmsi}`;
    const data = await this.client.get(key);
    
    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data);
    return {
      mmsi: parsed.mmsi,
      name: parsed.name,
      type: parsed.type,
      imo: parsed.imo,
      callSign: parsed.callSign,
      dimensions: parsed.dimensions,
      destination: parsed.destination,
      eta: parsed.eta ? new Date(parsed.eta) : undefined,
      draught: parsed.draught,
    };
  }

  /**
   * Get count of active vessels (vessels with recent position updates)
   */
  async getActiveVesselCount(): Promise<number> {
    return await this.client.sCard(this.ACTIVE_VESSELS_KEY);
  }

  /**
   * Get vessels within a bounding box using Redis geospatial commands
   * Returns array of MMSIs
   */
  async getVesselsInBounds(bbox: BoundingBox): Promise<string[]> {
    // Calculate center point and search radius
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLon = (bbox.minLon + bbox.maxLon) / 2;
    
    // Calculate approximate radius in meters
    // This is a simplified calculation; for production, use proper geodesic distance
    const latDiff = bbox.maxLat - bbox.minLat;
    const lonDiff = bbox.maxLon - bbox.minLon;
    const radiusKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // ~111 km per degree
    const radiusMeters = radiusKm * 1000;

    // Search for vessels within radius
    const results = await this.client.geoSearch(
      this.GEO_KEY,
      { longitude: centerLon, latitude: centerLat },
      { radius: radiusMeters, unit: 'm' }
    );

    if (!results || results.length === 0) {
      return [];
    }

    // Filter results to exact bounding box
    // Redis geoSearch returns circular area, we need rectangular
    const vesselsInBounds: string[] = [];
    
    for (const mmsi of results) {
      
      // Get position to verify it's within exact bounding box
      const position = await this.getVesselPosition(mmsi);
      if (position) {
        if (
          position.latitude >= bbox.minLat &&
          position.latitude <= bbox.maxLat &&
          position.longitude >= bbox.minLon &&
          position.longitude <= bbox.maxLon
        ) {
          vesselsInBounds.push(mmsi);
        }
      }
    }

    return vesselsInBounds;
  }

  /**
   * Clear all cache data (useful for testing)
   */
  async clearAll(): Promise<void> {
    await this.client.flushDb();
  }

  /**
   * Remove vessel from cache
   */
  async removeVessel(mmsi: string): Promise<void> {
    const pipeline = this.client.multi();
    
    pipeline.del(`${this.POSITION_PREFIX}${mmsi}`);
    pipeline.del(`${this.METADATA_PREFIX}${mmsi}`);
    pipeline.zRem(this.GEO_KEY, mmsi);
    pipeline.sRem(this.ACTIVE_VESSELS_KEY, mmsi);
    
    await pipeline.exec();
  }
}
