import request from 'supertest';
import { Pool } from 'pg';
import { Express } from 'express';
import { createApp } from './app';
import { CacheService } from '../services/CacheService';
import { VesselRepository } from '../repositories/VesselRepository';

describe('API Routes Integration Tests', () => {
  let app: Express;
  let pool: Pool;
  let cache: CacheService;
  let vesselRepo: VesselRepository;

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ais_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Create cache service
    cache = new CacheService(process.env.REDIS_URL || 'redis://localhost:6379');
    await cache.connect();

    // Create app
    app = createApp(pool, cache);

    // Create repository for test data setup
    vesselRepo = new VesselRepository(pool);
  });

  afterAll(async () => {
    await cache.disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM position_reports');
    await pool.query('DELETE FROM vessels');
    await cache.clearAll();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
      expect(response.body.services).toHaveProperty('aisStream');
    });

    it('should return data status information', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dataStatus');
      expect(response.body.dataStatus).toHaveProperty('totalVessels');
      expect(response.body.dataStatus).toHaveProperty('vesselsWithPosition');
      expect(response.body.dataStatus).toHaveProperty('vesselsWithRecentPosition');
      expect(response.body.dataStatus).toHaveProperty('lastPositionUpdate');
      expect(response.body.dataStatus).toHaveProperty('positionReportsLast24h');
      expect(typeof response.body.dataStatus.totalVessels).toBe('number');
      expect(typeof response.body.dataStatus.vesselsWithPosition).toBe('number');
      expect(typeof response.body.dataStatus.vesselsWithRecentPosition).toBe('number');
      expect(typeof response.body.dataStatus.positionReportsLast24h).toBe('number');
    });

    it('should return degraded status when AIS stream is disconnected', async () => {
      const response = await request(app).get('/api/health');

      // Since we don't pass aisStreamManager in tests, it should be 'not_configured'
      expect(response.body.services.aisStream).toBe('not_configured');
    });
  });

  describe('GET /api/vessels', () => {
    beforeEach(async () => {
      // Insert test vessels
      await vesselRepo.upsertVessel({
        mmsi: '123456789',
        name: 'Test Vessel 1',
        type: 70,
      });

      await vesselRepo.upsertVessel({
        mmsi: '987654321',
        name: 'Test Vessel 2',
        type: 80,
      });

      // Insert position reports
      await vesselRepo.batchInsertPositions([
        {
          mmsi: '123456789',
          timestamp: new Date(),
          latitude: 37.7749,
          longitude: -122.4194,
          sog: 12.5,
          cog: 285.0,
        },
        {
          mmsi: '987654321',
          timestamp: new Date(),
          latitude: 40.7128,
          longitude: -74.0060,
          sog: 8.3,
          cog: 180.0,
        },
      ]);
    });

    it('should return list of vessels', async () => {
      const response = await request(app).get('/api/vessels');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('vessels');
      expect(response.body).toHaveProperty('count');
      expect(response.body.vessels.length).toBeGreaterThan(0);
    });

    it('should filter vessels by type', async () => {
      const response = await request(app).get('/api/vessels?type=70');

      expect(response.status).toBe(200);
      expect(response.body.vessels).toHaveLength(1);
      expect(response.body.vessels[0].vesselType).toBe(70);
    });

    it('should filter vessels by name', async () => {
      const response = await request(app).get('/api/vessels?name=Test Vessel 1');

      expect(response.status).toBe(200);
      expect(response.body.vessels.length).toBeGreaterThan(0);
      expect(response.body.vessels[0].name).toContain('Test Vessel 1');
    });

    it('should return 400 for invalid type parameter', async () => {
      const response = await request(app).get('/api/vessels?type=invalid');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });

    it('should filter vessels by bounding box', async () => {
      const response = await request(app).get(
        '/api/vessels?minLat=37&maxLat=38&minLon=-123&maxLon=-122'
      );

      expect(response.status).toBe(200);
      expect(response.body.vessels.length).toBeGreaterThan(0);
    });

    it('should return 400 for incomplete bounding box', async () => {
      const response = await request(app).get('/api/vessels?minLat=37&maxLat=38');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });
  });

  describe('GET /api/vessels/:mmsi', () => {
    beforeEach(async () => {
      await vesselRepo.upsertVessel({
        mmsi: '123456789',
        name: 'Test Vessel',
        type: 70,
      });
    });

    it('should return vessel by MMSI', async () => {
      const response = await request(app).get('/api/vessels/123456789');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('vessel');
      expect(response.body.vessel.mmsi).toBe('123456789');
    });

    it('should return 404 for non-existent vessel', async () => {
      const response = await request(app).get('/api/vessels/999999999');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('VESSEL_NOT_FOUND');
    });

    it('should return 400 for invalid MMSI format', async () => {
      const response = await request(app).get('/api/vessels/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_MMSI');
    });
  });

  describe('GET /api/vessels/:mmsi/track', () => {
    beforeEach(async () => {
      await vesselRepo.upsertVessel({
        mmsi: '123456789',
        name: 'Test Vessel',
        type: 70,
      });

      // Insert position history
      const now = new Date();
      const positions: any[] = [];
      for (let i = 0; i < 5; i++) {
        positions.push({
          mmsi: '123456789',
          timestamp: new Date(now.getTime() - i * 3600000), // 1 hour intervals
          latitude: 37.7749 + i * 0.01,
          longitude: -122.4194 + i * 0.01,
          sog: 12.5,
          cog: 285.0,
        });
      }
      await vesselRepo.batchInsertPositions(positions);
    });

    it('should return vessel track', async () => {
      const response = await request(app).get('/api/vessels/123456789/track');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('track');
      expect(response.body.track.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('startTime');
      expect(response.body).toHaveProperty('endTime');
    });

    it('should filter track by time range', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 2 * 3600000).toISOString();
      const endTime = now.toISOString();

      const response = await request(app).get(
        `/api/vessels/123456789/track?startTime=${startTime}&endTime=${endTime}`
      );

      expect(response.status).toBe(200);
      expect(response.body.track.length).toBeGreaterThan(0);
    });

    it('should return 404 for vessel with no track data', async () => {
      await vesselRepo.upsertVessel({
        mmsi: '999999999',
        name: 'No Track Vessel',
        type: 70,
      });

      const response = await request(app).get('/api/vessels/999999999/track');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NO_DATA');
    });

    it('should return 400 for invalid time format', async () => {
      const response = await request(app).get(
        '/api/vessels/123456789/track?startTime=invalid'
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });

    it('should return 400 when startTime is after endTime', async () => {
      const now = new Date();
      const startTime = now.toISOString();
      const endTime = new Date(now.getTime() - 3600000).toISOString();

      const response = await request(app).get(
        `/api/vessels/123456789/track?startTime=${startTime}&endTime=${endTime}`
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });
  });

  describe('GET /api/search', () => {
    beforeEach(async () => {
      await vesselRepo.upsertVessel({
        mmsi: '123456789',
        name: 'Ocean Explorer',
        type: 70,
      });

      await vesselRepo.upsertVessel({
        mmsi: '987654321',
        name: 'Sea Voyager',
        type: 80,
      });
    });

    it('should search vessels by name', async () => {
      const response = await request(app).get('/api/search?q=Ocean');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].name).toContain('Ocean');
    });

    it('should search vessels by MMSI', async () => {
      const response = await request(app).get('/api/search?q=123456789');

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].mmsi).toBe('123456789');
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app).get('/api/search');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_PARAMETER');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app).get('/api/search?q=%20%20%20');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app).get('/api/search?q=vessel&limit=1');

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
