import { DataPipeline } from './DataPipeline';
import { VesselRepository } from '../repositories/VesselRepository';
import { CacheService } from './CacheService';
import { PositionReport, ShipStaticData } from '../types';
import { Pool } from 'pg';

describe('DataPipeline', () => {
  let dataPipeline: DataPipeline;
  let vesselRepository: VesselRepository;
  let cacheService: CacheService;
  let pool: Pool;

  beforeAll(async () => {
    // Initialize database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://ais_user:ais_password@localhost:5432/ais',
    });

    vesselRepository = new VesselRepository(pool);
    cacheService = new CacheService(process.env.REDIS_URL || 'redis://localhost:6379');
    await cacheService.connect();
  });

  afterAll(async () => {
    await cacheService.disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clearAll();
    
    // Create new pipeline instance
    dataPipeline = new DataPipeline(vesselRepository, cacheService, {
      batchSize: 10,
      batchInterval: 1000,
    });
  });

  afterEach(async () => {
    await dataPipeline.stop();
  });

  describe('start and stop', () => {
    it('should start the pipeline', () => {
      dataPipeline.start();
      expect(dataPipeline.isActive()).toBe(true);
    });

    it('should stop the pipeline', async () => {
      dataPipeline.start();
      await dataPipeline.stop();
      expect(dataPipeline.isActive()).toBe(false);
    });

    it('should emit started event', (done) => {
      dataPipeline.on('started', () => {
        done();
      });
      dataPipeline.start();
    });

    it('should emit stopped event', (done) => {
      dataPipeline.on('stopped', () => {
        done();
      });
      dataPipeline.start();
      dataPipeline.stop();
    });
  });

  describe('processPosition', () => {
    it('should process valid position report', async () => {
      // First create the vessel record to satisfy foreign key constraint
      const staticData: ShipStaticData = {
        mmsi: '367719770',
        name: 'TEST VESSEL',
        type: 70,
      };
      await vesselRepository.upsertVessel(staticData);

      const position: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date('2025-12-01T10:30:00Z'),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
        true_heading: 290,
        navigational_status: 0,
      };

      dataPipeline.start();
      await dataPipeline.processPosition(position);
      
      // Stop pipeline to flush the batch
      await dataPipeline.stop();

      // Verify cache was updated after batch flush
      const cachedPosition = await cacheService.getVesselPosition(position.mmsi);
      expect(cachedPosition).not.toBeNull();
      expect(cachedPosition?.mmsi).toBe(position.mmsi);
      expect(cachedPosition?.latitude).toBe(position.latitude);
    });

    it('should emit vesselUpdate event for valid position', (done) => {
      // First create the vessel record to satisfy foreign key constraint
      const staticData: ShipStaticData = {
        mmsi: '367719771',
        name: 'TEST VESSEL 2',
        type: 70,
      };
      
      vesselRepository.upsertVessel(staticData).then(() => {
        const position: PositionReport = {
          mmsi: '367719771',
          timestamp: new Date(),
          latitude: 37.7749,
          longitude: -122.4194,
        };

        dataPipeline.on('vesselUpdate', (update) => {
          expect(update.type).toBe('position');
          expect(update.data.mmsi).toBe(position.mmsi);
          done();
        });

        dataPipeline.start();
        dataPipeline.processPosition(position);
      });
    });

    it('should reject position with invalid MMSI', async () => {
      const position: PositionReport = {
        mmsi: 'INVALID',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -122.4194,
      };

      let invalidDataEmitted = false;
      dataPipeline.on('invalidData', (data) => {
        invalidDataEmitted = true;
        expect(data.type).toBe('position');
      });

      dataPipeline.start();
      await dataPipeline.processPosition(position);

      expect(invalidDataEmitted).toBe(true);
    });

    it('should reject position with invalid latitude', async () => {
      const position: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date(),
        latitude: 91.0, // Invalid: > 90
        longitude: -122.4194,
      };

      let invalidDataEmitted = false;
      dataPipeline.on('invalidData', () => {
        invalidDataEmitted = true;
      });

      dataPipeline.start();
      await dataPipeline.processPosition(position);

      expect(invalidDataEmitted).toBe(true);
    });

    it('should reject position with invalid longitude', async () => {
      const position: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -181.0, // Invalid: < -180
      };

      let invalidDataEmitted = false;
      dataPipeline.on('invalidData', () => {
        invalidDataEmitted = true;
      });

      dataPipeline.start();
      await dataPipeline.processPosition(position);

      expect(invalidDataEmitted).toBe(true);
    });

    it('should reject position with future timestamp', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const position: PositionReport = {
        mmsi: '367719770',
        timestamp: futureDate,
        latitude: 37.7749,
        longitude: -122.4194,
      };

      let invalidDataEmitted = false;
      dataPipeline.on('invalidData', () => {
        invalidDataEmitted = true;
      });

      dataPipeline.start();
      await dataPipeline.processPosition(position);

      expect(invalidDataEmitted).toBe(true);
    });
  });

  describe('processStaticData', () => {
    it('should process valid static data', async () => {
      const staticData: ShipStaticData = {
        mmsi: '367719770',
        name: 'OCEAN EXPLORER',
        type: 70,
        imo: 1234567,
        callSign: 'WDD1234',
        dimensions: { a: 50, b: 10, c: 5, d: 5 },
        destination: 'SAN FRANCISCO',
        draught: 5.5,
      };

      dataPipeline.start();
      await dataPipeline.processStaticData(staticData);

      // Verify cache was updated
      const cachedMetadata = await cacheService.getVesselMetadata(staticData.mmsi);
      expect(cachedMetadata).not.toBeNull();
      expect(cachedMetadata?.name).toBe(staticData.name);
    });

    it('should emit vesselUpdate event for valid static data', (done) => {
      const staticData: ShipStaticData = {
        mmsi: '367719770',
        name: 'OCEAN EXPLORER',
        type: 70,
      };

      dataPipeline.on('vesselUpdate', (update) => {
        expect(update.type).toBe('staticData');
        expect(update.data.mmsi).toBe(staticData.mmsi);
        done();
      });

      dataPipeline.start();
      dataPipeline.processStaticData(staticData);
    });

    it('should reject static data with invalid MMSI', async () => {
      const staticData: ShipStaticData = {
        mmsi: 'INVALID',
        name: 'TEST VESSEL',
        type: 70,
      };

      let invalidDataEmitted = false;
      dataPipeline.on('invalidData', (data) => {
        invalidDataEmitted = true;
        expect(data.type).toBe('staticData');
      });

      dataPipeline.start();
      await dataPipeline.processStaticData(staticData);

      expect(invalidDataEmitted).toBe(true);
    });

    it('should reject static data with invalid vessel type', async () => {
      const staticData: ShipStaticData = {
        mmsi: '367719770',
        name: 'TEST VESSEL',
        type: 100, // Invalid: > 99
      };

      let invalidDataEmitted = false;
      dataPipeline.on('invalidData', () => {
        invalidDataEmitted = true;
      });

      dataPipeline.start();
      await dataPipeline.processStaticData(staticData);

      expect(invalidDataEmitted).toBe(true);
    });
  });

  describe('batch processing', () => {
    it('should queue positions for batch processing', async () => {
      dataPipeline.start();

      const position: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -122.4194,
      };

      await dataPipeline.processPosition(position);
      expect(dataPipeline.getQueueSize()).toBeGreaterThan(0);
    });

    it('should flush batch when size threshold reached', async () => {
      // First create the vessel records to satisfy foreign key constraint
      await vesselRepository.upsertVessel({
        mmsi: '367719772',
        name: 'TEST VESSEL 3',
        type: 70,
      });
      await vesselRepository.upsertVessel({
        mmsi: '367719773',
        name: 'TEST VESSEL 4',
        type: 70,
      });

      // Create vessels for the positions
      await vesselRepository.upsertVessel({
        mmsi: '367719772',
        name: 'Test Vessel 1',
        type: 70,
      });
      await vesselRepository.upsertVessel({
        mmsi: '367719773',
        name: 'Test Vessel 2',
        type: 70,
      });

      const pipeline = new DataPipeline(vesselRepository, cacheService, {
        batchSize: 2,
        batchInterval: 10000,
      });

      let batchProcessed = false;
      pipeline.on('batchProcessed', (data) => {
        batchProcessed = true;
        expect(data.count).toBe(2);
      });

      pipeline.start();

      const position1: PositionReport = {
        mmsi: '367719772',
        timestamp: new Date('2025-12-01T10:30:00Z'),
        latitude: 37.7749,
        longitude: -122.4194,
      };

      const position2: PositionReport = {
        mmsi: '367719773',
        timestamp: new Date('2025-12-01T10:31:00Z'),
        latitude: 37.8049,
        longitude: -122.4294,
      };

      await pipeline.processPosition(position1);
      await pipeline.processPosition(position2);

      // Wait a bit for batch to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(batchProcessed).toBe(true);
      await pipeline.stop();
    });

    it('should flush remaining positions on stop', async () => {
      // First create the vessel to satisfy foreign key constraint
      await vesselRepository.upsertVessel({
        mmsi: '367719770',
        name: 'Test Vessel',
        type: 70,
      });

      dataPipeline.start();

      const position: PositionReport = {
        mmsi: '367719770',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -122.4194,
      };

      await dataPipeline.processPosition(position);
      expect(dataPipeline.getQueueSize()).toBeGreaterThan(0);

      await dataPipeline.stop();
      expect(dataPipeline.getQueueSize()).toBe(0);
    });
  });
});
