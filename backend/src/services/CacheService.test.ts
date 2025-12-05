import { CacheService } from './CacheService';
import { PositionReport, ShipStaticData, BoundingBox } from '../types';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    // Use test Redis instance
    cacheService = new CacheService(process.env.REDIS_URL || 'redis://localhost:6379');
    await cacheService.connect();
  });

  afterAll(async () => {
    await cacheService.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clearAll();
  });

  describe('setVesselPosition and getVesselPosition', () => {
    it('should store and retrieve vessel position', async () => {
      const position: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date('2025-12-01T10:30:00Z'),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
        true_heading: 290,
        navigational_status: 0,
        rate_of_turn: 0,
      };

      await cacheService.setVesselPosition(position.mmsi, position);
      const retrieved = await cacheService.getVesselPosition(position.mmsi);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.mmsi).toBe(position.mmsi);
      expect(retrieved?.latitude).toBe(position.latitude);
      expect(retrieved?.longitude).toBe(position.longitude);
      expect(retrieved?.sog).toBe(position.sog);
      expect(retrieved?.cog).toBe(position.cog);
    });

    it('should return null for non-existent vessel', async () => {
      const retrieved = await cacheService.getVesselPosition('999999999');
      expect(retrieved).toBeNull();
    });
  });

  describe('setVesselMetadata and getVesselMetadata', () => {
    it('should store and retrieve vessel metadata', async () => {
      const metadata: ShipStaticData = {
        mmsi: '367719770',
        name: 'OCEAN EXPLORER',
        type: 70,
        imo: 1234567,
        callSign: 'WDD1234',
        dimensions: { a: 50, b: 10, c: 5, d: 5 },
        destination: 'SAN FRANCISCO',
        draught: 5.5,
      };

      await cacheService.setVesselMetadata(metadata.mmsi, metadata);
      const retrieved = await cacheService.getVesselMetadata(metadata.mmsi);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.mmsi).toBe(metadata.mmsi);
      expect(retrieved?.name).toBe(metadata.name);
      expect(retrieved?.type).toBe(metadata.type);
      expect(retrieved?.destination).toBe(metadata.destination);
    });

    it('should return null for non-existent vessel metadata', async () => {
      const retrieved = await cacheService.getVesselMetadata('999999999');
      expect(retrieved).toBeNull();
    });
  });

  describe('getActiveVesselCount', () => {
    it('should return count of active vessels', async () => {
      const position1: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
      };

      const position2: PositionReport = {
        mmsi: '367719771',
        timestamp: new Date(),
        latitude: 37.8049,
        longitude: -122.4294,
        sog: 10.0,
        cog: 180.0,
      };

      await cacheService.setVesselPosition(position1.mmsi, position1);
      await cacheService.setVesselPosition(position2.mmsi, position2);

      const count = await cacheService.getActiveVesselCount();
      expect(count).toBe(2);
    });

    it('should return 0 when no active vessels', async () => {
      const count = await cacheService.getActiveVesselCount();
      expect(count).toBe(0);
    });
  });

  describe('getVesselsInBounds', () => {
    it('should return vessels within bounding box', async () => {
      // San Francisco Bay Area
      const position1: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
      };

      // Outside the bounding box
      const position2: PositionReport = {
        mmsi: '367719771',
        timestamp: new Date(),
        latitude: 40.7128,
        longitude: -74.0060,
        sog: 10.0,
        cog: 180.0,
      };

      await cacheService.setVesselPosition(position1.mmsi, position1);
      await cacheService.setVesselPosition(position2.mmsi, position2);

      const bbox: BoundingBox = {
        minLat: 37.7,
        minLon: -122.5,
        maxLat: 37.8,
        maxLon: -122.4,
      };

      const vessels = await cacheService.getVesselsInBounds(bbox);
      expect(vessels).toContain('367719770');
      expect(vessels).not.toContain('367719771');
    });

    it('should return empty array when no vessels in bounds', async () => {
      const bbox: BoundingBox = {
        minLat: 50.0,
        minLon: -130.0,
        maxLat: 51.0,
        maxLon: -129.0,
      };

      const vessels = await cacheService.getVesselsInBounds(bbox);
      expect(vessels).toEqual([]);
    });
  });

  describe('removeVessel', () => {
    it('should remove vessel from cache', async () => {
      const position: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
      };

      const metadata: ShipStaticData = {
        mmsi: '367719770',
        name: 'OCEAN EXPLORER',
        type: 70,
      };

      await cacheService.setVesselPosition(position.mmsi, position);
      await cacheService.setVesselMetadata(metadata.mmsi, metadata);

      await cacheService.removeVessel(position.mmsi);

      const retrievedPosition = await cacheService.getVesselPosition(position.mmsi);
      const retrievedMetadata = await cacheService.getVesselMetadata(metadata.mmsi);

      expect(retrievedPosition).toBeNull();
      expect(retrievedMetadata).toBeNull();
    });
  });
});
