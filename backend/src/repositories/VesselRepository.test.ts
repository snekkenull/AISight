import { Pool } from 'pg';
import { VesselRepository } from './VesselRepository';
import { PositionReport, ShipStaticData } from '../types';

describe('VesselRepository', () => {
  let pool: Pool;
  let repository: VesselRepository;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://ais_user:ais_password@localhost:5432/ais',
    });
    repository = new VesselRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('upsertVessel', () => {
    it('should insert a new vessel', async () => {
      const vessel: ShipStaticData = {
        mmsi: '123456789',
        name: 'Test Vessel',
        type: 70,
        imo: 1234567,
        callSign: 'TEST1',
        dimensions: { a: 10, b: 20, c: 5, d: 5 },
        destination: 'TEST PORT',
        draught: 5.5,
      };

      const result = await repository.upsertVessel(vessel);

      expect(result.mmsi).toBe('123456789');
      expect(result.name).toBe('Test Vessel');
      expect(result.vesselType).toBe(70);
    });

    it('should update existing vessel on conflict', async () => {
      const vessel: ShipStaticData = {
        mmsi: '123456789',
        name: 'Updated Vessel',
        type: 80,
      };

      const result = await repository.upsertVessel(vessel);

      expect(result.mmsi).toBe('123456789');
      expect(result.name).toBe('Updated Vessel');
      expect(result.vesselType).toBe(80);
    });
  });

  describe('batchInsertPositions', () => {
    it('should insert multiple position reports', async () => {
      // Ensure vessel exists before inserting positions
      await repository.upsertVessel({
        mmsi: '123456789',
        name: 'Test Vessel',
        type: 70,
      });


      const positions: PositionReport[] = [
        {
          mmsi: '123456789',
          timestamp: new Date('2025-12-01T10:00:00Z'),
          latitude: 37.7749,
          longitude: -122.4194,
          sog: 12.5,
          cog: 285.0,
          true_heading: 290,
        },
        {
          mmsi: '123456789',
          timestamp: new Date('2025-12-01T10:05:00Z'),
          latitude: 37.7755,
          longitude: -122.4180,
          sog: 12.3,
          cog: 285.5,
          true_heading: 290,
        },
      ];

      await repository.batchInsertPositions(positions);

      const history = await repository.getVesselHistory(
        '123456789',
        new Date('2025-12-01T09:00:00Z'),
        new Date('2025-12-01T11:00:00Z')
      );

      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should prevent duplicate positions', async () => {
      // Ensure vessel exists before inserting positions
      await repository.upsertVessel({
        mmsi: '123456789',
        name: 'Test Vessel',
        type: 70,
      });

      const position: PositionReport = {
        mmsi: '123456789',
        timestamp: new Date('2025-12-01T10:00:00Z'),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
      };

      await repository.batchInsertPositions([position]);
      await repository.batchInsertPositions([position]); // Duplicate

      const count = await repository.countPositions(
        '123456789',
        new Date('2025-12-01T10:00:00Z')
      );

      expect(count).toBe(1);
    });
  });

  describe('queryVessels', () => {
    it('should filter vessels by MMSI', async () => {
      const results = await repository.queryVessels({ mmsi: '123456789' });

      expect(results.length).toBe(1);
      expect(results[0].mmsi).toBe('123456789');
    });

    it('should filter vessels by name', async () => {
      const results = await repository.queryVessels({ name: 'Updated' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Updated');
    });

    it('should filter vessels by type', async () => {
      const results = await repository.queryVessels({ type: 80 });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(vessel => {
        expect(vessel.vesselType).toBe(80);
      });
    });

    it('should filter vessels by bounding box', async () => {
      const results = await repository.queryVessels({
        bbox: {
          minLat: 37.0,
          maxLat: 38.0,
          minLon: -123.0,
          maxLon: -122.0,
        },
      });

      results.forEach(vessel => {
        if (vessel.position) {
          expect(vessel.position.latitude).toBeGreaterThanOrEqual(37.0);
          expect(vessel.position.latitude).toBeLessThanOrEqual(38.0);
          expect(vessel.position.longitude).toBeGreaterThanOrEqual(-123.0);
          expect(vessel.position.longitude).toBeLessThanOrEqual(-122.0);
        }
      });
    });
  });

  describe('getVesselByMMSI', () => {
    it('should return vessel by MMSI', async () => {
      const vessel = await repository.getVesselByMMSI('123456789');

      expect(vessel).not.toBeNull();
      expect(vessel?.mmsi).toBe('123456789');
    });

    it('should return null for non-existent vessel', async () => {
      const vessel = await repository.getVesselByMMSI('999999999');

      expect(vessel).toBeNull();
    });
  });

  describe('searchVessels', () => {
    it('should search vessels by name', async () => {
      const results = await repository.searchVessels('Updated');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Updated');
    });

    it('should search vessels by MMSI', async () => {
      const results = await repository.searchVessels('123456');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].mmsi).toContain('123456');
    });
  });

  describe('getVesselsInBounds', () => {
    it('should return vessels within bounding box', async () => {
      const results = await repository.getVesselsInBounds(
        37.0,
        38.0,
        -123.0,
        -122.0
      );

      results.forEach(vessel => {
        if (vessel.position) {
          expect(vessel.position.latitude).toBeGreaterThanOrEqual(37.0);
          expect(vessel.position.latitude).toBeLessThanOrEqual(38.0);
          expect(vessel.position.longitude).toBeGreaterThanOrEqual(-123.0);
          expect(vessel.position.longitude).toBeLessThanOrEqual(-122.0);
        }
      });
    });
  });

  describe('Position Statistics Methods', () => {
    describe('countVessels', () => {
      it('should return total count of vessels', async () => {
        const count = await repository.countVessels();

        expect(count).toBeGreaterThan(0);
        expect(typeof count).toBe('number');
      });
    });

    describe('countVesselsWithPosition', () => {
      it('should return count of vessels with position data', async () => {
        const count = await repository.countVesselsWithPosition();

        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });

      it('should return count less than or equal to total vessels', async () => {
        const totalVessels = await repository.countVessels();
        const vesselsWithPosition = await repository.countVesselsWithPosition();

        expect(vesselsWithPosition).toBeLessThanOrEqual(totalVessels);
      });
    });

    describe('countVesselsWithRecentPosition', () => {
      it('should return count of vessels with recent position data', async () => {
        const count = await repository.countVesselsWithRecentPosition(1);

        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });

      it('should return fewer vessels for shorter time thresholds', async () => {
        const count24h = await repository.countVesselsWithRecentPosition(24);
        const count1h = await repository.countVesselsWithRecentPosition(1);

        expect(count1h).toBeLessThanOrEqual(count24h);
      });
    });

    describe('getLatestPositionTimestamp', () => {
      it('should return the most recent position timestamp', async () => {
        const timestamp = await repository.getLatestPositionTimestamp();

        if (timestamp) {
          expect(timestamp).toBeInstanceOf(Date);
          expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
        }
      });
    });

    describe('countPositionReports', () => {
      it('should count position reports within time range', async () => {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

        const count = await repository.countPositionReports(startTime, endTime);

        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });

      it('should return 0 for future time range', async () => {
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

        const count = await repository.countPositionReports(startTime, endTime);

        expect(count).toBe(0);
      });

      it('should return more reports for longer time ranges', async () => {
        const endTime = new Date();
        const startTime1h = new Date(endTime.getTime() - 1 * 60 * 60 * 1000);
        const startTime24h = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

        const count1h = await repository.countPositionReports(startTime1h, endTime);
        const count24h = await repository.countPositionReports(startTime24h, endTime);

        expect(count24h).toBeGreaterThanOrEqual(count1h);
      });
    });
  });
});
