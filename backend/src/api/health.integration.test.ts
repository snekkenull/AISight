import request from 'supertest';
import { Pool } from 'pg';
import { Express } from 'express';
import { createApp } from './app';
import { CacheService } from '../services/CacheService';
import { VesselRepository } from '../repositories/VesselRepository';

/**
 * Integration test for health endpoint with data status
 * Validates: Requirements 3.1, 3.2, 3.3
 */
describe('Health Endpoint Integration Tests', () => {
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

    // Create app without AIS stream manager (simulating not configured)
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
  });

  describe('GET /api/health - Basic Structure', () => {
    it('should return all required top-level fields', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('dataStatus');
    });

    it('should return all required service status fields', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
      expect(response.body.services).toHaveProperty('aisStream');
      
      // Validate service status values
      expect(['connected', 'disconnected', 'unknown']).toContain(response.body.services.database);
      expect(['connected', 'disconnected', 'unknown']).toContain(response.body.services.redis);
      expect(['connected', 'disconnected', 'not_configured']).toContain(response.body.services.aisStream);
    });

    it('should return all required data status fields', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.dataStatus).toHaveProperty('totalVessels');
      expect(response.body.dataStatus).toHaveProperty('vesselsWithPosition');
      expect(response.body.dataStatus).toHaveProperty('vesselsWithRecentPosition');
      expect(response.body.dataStatus).toHaveProperty('lastPositionUpdate');
      expect(response.body.dataStatus).toHaveProperty('positionReportsLast24h');
    });
  });

  describe('GET /api/health - Data Status Accuracy', () => {
    it('should report zero vessels when database is empty', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.dataStatus.totalVessels).toBe(0);
      expect(response.body.dataStatus.vesselsWithPosition).toBe(0);
      expect(response.body.dataStatus.vesselsWithRecentPosition).toBe(0);
      expect(response.body.dataStatus.lastPositionUpdate).toBeNull();
      expect(response.body.dataStatus.positionReportsLast24h).toBe(0);
    });

    it('should report correct vessel counts with position data', async () => {
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

      // Insert position for only one vessel
      await vesselRepo.batchInsertPositions([
        {
          mmsi: '123456789',
          timestamp: new Date(),
          latitude: 37.7749,
          longitude: -122.4194,
          sog: 12.5,
          cog: 285.0,
        },
      ]);

      const response = await request(app).get('/api/health');

      expect(response.body.dataStatus.totalVessels).toBe(2);
      expect(response.body.dataStatus.vesselsWithPosition).toBe(1);
      expect(response.body.dataStatus.vesselsWithRecentPosition).toBe(1);
      expect(response.body.dataStatus.lastPositionUpdate).not.toBeNull();
      expect(response.body.dataStatus.positionReportsLast24h).toBe(1);
    });

    it('should distinguish between recent and stale positions', async () => {
      // Insert vessel
      await vesselRepo.upsertVessel({
        mmsi: '123456789',
        name: 'Test Vessel',
        type: 70,
      });

      // Insert old position (2 hours ago)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await vesselRepo.batchInsertPositions([
        {
          mmsi: '123456789',
          timestamp: twoHoursAgo,
          latitude: 37.7749,
          longitude: -122.4194,
          sog: 12.5,
          cog: 285.0,
        },
      ]);

      const response = await request(app).get('/api/health');

      expect(response.body.dataStatus.totalVessels).toBe(1);
      expect(response.body.dataStatus.vesselsWithPosition).toBe(1);
      expect(response.body.dataStatus.vesselsWithRecentPosition).toBe(0); // > 1 hour old
      expect(response.body.dataStatus.lastPositionUpdate).not.toBeNull();
    });

    it('should report correct position reports count in last 24h', async () => {
      // Insert vessel
      await vesselRepo.upsertVessel({
        mmsi: '123456789',
        name: 'Test Vessel',
        type: 70,
      });

      // Insert multiple positions within 24h
      const now = new Date();
      const positions = [];
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

      const response = await request(app).get('/api/health');

      expect(response.body.dataStatus.positionReportsLast24h).toBe(5);
    });
  });

  describe('GET /api/health - Status Logic', () => {
    it('should return healthy status when all services are connected', async () => {
      const response = await request(app).get('/api/health');

      // Database and Redis should be connected in test environment
      if (
        response.body.services.database === 'connected' &&
        response.body.services.redis === 'connected'
      ) {
        // Status should be healthy or degraded (if AIS stream is not configured)
        expect(['healthy', 'degraded']).toContain(response.body.status);
      }
    });

    it('should return not_configured for AIS stream when not provided', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.services.aisStream).toBe('not_configured');
    });
  });

  describe('GET /api/health - Timestamp Format', () => {
    it('should return ISO 8601 formatted timestamp', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return ISO 8601 formatted lastPositionUpdate when available', async () => {
      // Insert vessel with position
      await vesselRepo.upsertVessel({
        mmsi: '123456789',
        name: 'Test Vessel',
        type: 70,
      });

      await vesselRepo.batchInsertPositions([
        {
          mmsi: '123456789',
          timestamp: new Date(),
          latitude: 37.7749,
          longitude: -122.4194,
          sog: 12.5,
          cog: 285.0,
        },
      ]);

      const response = await request(app).get('/api/health');

      if (response.body.dataStatus.lastPositionUpdate) {
        expect(response.body.dataStatus.lastPositionUpdate).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );
      }
    });
  });
});
