import request from 'supertest';
import { Pool } from 'pg';
import express, { Express } from 'express';
import { createApiRoutes } from './routes';
import { CacheService } from '../services/CacheService';
import { VesselRepository } from '../repositories/VesselRepository';
import { ShipStaticData } from '../types';

describe('API Routes - Position Filtering', () => {
  let app: Express;
  let pool: Pool;
  let cache: CacheService;
  let repository: VesselRepository;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ais_test',
      user: process.env.DB_USER || 'ais_user',
      password: process.env.DB_PASSWORD || 'ais_password',
    });

    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    cache = new CacheService(`redis://${redisHost}:${redisPort}`);

    repository = new VesselRepository(pool);

    app = express();
    app.use(express.json());
    app.use('/api', createApiRoutes(pool, cache));

    // Clean up test data
    await pool.query('DELETE FROM position_reports');
    await pool.query('DELETE FROM vessels');

    // Insert test vessels
    const vessel1: ShipStaticData = {
      mmsi: '111111111',
      name: 'Vessel With Position',
      type: 70,
    };

    const vessel2: ShipStaticData = {
      mmsi: '222222222',
      name: 'Vessel Without Position',
      type: 70,
    };

    await repository.upsertVessel(vessel1);
    await repository.upsertVessel(vessel2);

    // Insert position for vessel1 only
    await pool.query(
      `INSERT INTO position_reports (mmsi, timestamp, latitude, longitude, sog, cog)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['111111111', new Date(), 37.7749, -122.4194, 12.5, 285.0]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM position_reports');
    await pool.query('DELETE FROM vessels');
    await pool.end();
    cache.disconnect();
  });

  describe('GET /api/vessels with hasPosition filter', () => {
    it('should return only vessels with position data when hasPosition=true', async () => {
      const response = await request(app)
        .get('/api/vessels?hasPosition=true')
        .expect(200);

      expect(response.body.vessels).toBeDefined();
      expect(response.body.vessels.length).toBe(1);
      expect(response.body.vessels[0].mmsi).toBe('111111111');
    });

    it('should return only vessels without position data when hasPosition=false', async () => {
      const response = await request(app)
        .get('/api/vessels?hasPosition=false')
        .expect(200);

      expect(response.body.vessels).toBeDefined();
      expect(response.body.vessels.length).toBe(1);
      expect(response.body.vessels[0].mmsi).toBe('222222222');
    });

    it('should return 400 for invalid hasPosition value', async () => {
      const response = await request(app)
        .get('/api/vessels?hasPosition=invalid')
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });
  });

  describe('GET /api/vessels with maxPositionAgeHours filter', () => {
    it('should return vessels with recent position data', async () => {
      const response = await request(app)
        .get('/api/vessels?maxPositionAgeHours=1')
        .expect(200);

      expect(response.body.vessels).toBeDefined();
      expect(response.body.vessels.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 for negative maxPositionAgeHours', async () => {
      const response = await request(app)
        .get('/api/vessels?maxPositionAgeHours=-1')
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });

    it('should return 400 for invalid maxPositionAgeHours', async () => {
      const response = await request(app)
        .get('/api/vessels?maxPositionAgeHours=invalid')
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });
  });

  describe('GET /api/vessels with bounding box', () => {
    it('should automatically filter to vessels with positions', async () => {
      const response = await request(app)
        .get('/api/vessels?minLat=37&maxLat=38&minLon=-123&maxLon=-122')
        .expect(200);

      expect(response.body.vessels).toBeDefined();
      // Should only return vessel with position in bounds
      expect(response.body.vessels.length).toBe(1);
      expect(response.body.vessels[0].mmsi).toBe('111111111');
    });

    it('should return empty array when no vessels in bounding box', async () => {
      const response = await request(app)
        .get('/api/vessels?minLat=40&maxLat=41&minLon=-75&maxLon=-74')
        .expect(200);

      expect(response.body.vessels).toBeDefined();
      expect(response.body.vessels.length).toBe(0);
    });
  });

  describe('GET /api/vessels with combined filters', () => {
    it('should support combining hasPosition with other filters', async () => {
      const response = await request(app)
        .get('/api/vessels?hasPosition=true&type=70')
        .expect(200);

      expect(response.body.vessels).toBeDefined();
      expect(response.body.vessels.length).toBe(1);
      expect(response.body.vessels[0].mmsi).toBe('111111111');
    });

    it('should support combining maxPositionAgeHours with bounding box', async () => {
      const response = await request(app)
        .get('/api/vessels?maxPositionAgeHours=1&minLat=37&maxLat=38&minLon=-123&maxLon=-122')
        .expect(200);

      expect(response.body.vessels).toBeDefined();
      expect(response.body.vessels.length).toBeGreaterThanOrEqual(1);
    });
  });
});
