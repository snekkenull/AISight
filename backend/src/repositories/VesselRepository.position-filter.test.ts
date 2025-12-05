import { Pool } from 'pg';
import { VesselRepository } from './VesselRepository';
import { ShipStaticData, PositionReport } from '../types';

describe('VesselRepository - Position Filtering', () => {
  let pool: Pool;
  let repository: VesselRepository;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ais_test',
      user: process.env.DB_USER || 'ais_user',
      password: process.env.DB_PASSWORD || 'ais_password',
    });

    repository = new VesselRepository(pool);

    // Clean up test data
    await pool.query('DELETE FROM position_reports');
    await pool.query('DELETE FROM vessels');

    // Insert test vessels
    const vessel1: ShipStaticData = {
      mmsi: '111111111',
      name: 'Test Vessel With Position',
      type: 70,
    };

    const vessel2: ShipStaticData = {
      mmsi: '222222222',
      name: 'Test Vessel Without Position',
      type: 70,
    };

    await repository.upsertVessel(vessel1);
    await repository.upsertVessel(vessel2);

    // Insert position for vessel1 only
    const position: PositionReport = {
      mmsi: '111111111',
      timestamp: new Date(),
      latitude: 37.7749,
      longitude: -122.4194,
      sog: 12.5,
      cog: 285.0,
    };

    await pool.query(
      `INSERT INTO position_reports (mmsi, timestamp, latitude, longitude, sog, cog)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [position.mmsi, position.timestamp, position.latitude, position.longitude, position.sog, position.cog]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM position_reports');
    await pool.query('DELETE FROM vessels');
    await pool.end();
  });

  describe('hasPosition filter', () => {
    it('should return only vessels with position data when hasPosition=true', async () => {
      const results = await repository.queryVessels({ hasPosition: true });

      expect(results.length).toBe(1);
      expect(results[0].mmsi).toBe('111111111');
      expect(results[0].position).toBeDefined();
    });

    it('should return only vessels without position data when hasPosition=false', async () => {
      const results = await repository.queryVessels({ hasPosition: false });

      expect(results.length).toBe(1);
      expect(results[0].mmsi).toBe('222222222');
      expect(results[0].position).toBeUndefined();
    });

    it('should return all vessels when hasPosition is not specified', async () => {
      const results = await repository.queryVessels({});

      expect(results.length).toBe(2);
    });
  });

  describe('maxPositionAgeHours filter', () => {
    it('should return vessels with recent position data', async () => {
      const results = await repository.queryVessels({ maxPositionAgeHours: 1 });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].mmsi).toBe('111111111');
    });

    it('should return empty array for very short time window', async () => {
      // Insert an old position
      await pool.query(
        `INSERT INTO position_reports (mmsi, timestamp, latitude, longitude)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (mmsi, timestamp) DO NOTHING`,
        ['111111111', new Date(Date.now() - 48 * 60 * 60 * 1000), 37.0, -122.0]
      );

      const results = await repository.queryVessels({ maxPositionAgeHours: 0.001 });

      // Should return empty or very few results
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('bounding box with position filter', () => {
    it('should automatically filter to vessels with positions when bbox is specified', async () => {
      const results = await repository.queryVessels({
        bbox: {
          minLat: 37.0,
          maxLat: 38.0,
          minLon: -123.0,
          maxLon: -122.0,
        },
      });

      // Should only return vessel with position in bounds
      expect(results.length).toBe(1);
      expect(results[0].mmsi).toBe('111111111');
      expect(results[0].position).toBeDefined();
    });

    it('should return empty array when no vessels in bounding box', async () => {
      const results = await repository.queryVessels({
        bbox: {
          minLat: 40.0,
          maxLat: 41.0,
          minLon: -75.0,
          maxLon: -74.0,
        },
      });

      expect(results.length).toBe(0);
    });
  });
});
