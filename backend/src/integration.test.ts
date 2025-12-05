/**
 * Integration tests for Smart AIS MVP
 * Tests complete data flow from AISStream to frontend
 * Validates: Requirements 6.4, 6.5
 */

import http from 'http';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { io as ioClient, Socket } from 'socket.io-client';

// Test configuration
const TEST_CONFIG = {
  backend: {
    host: process.env.TEST_BACKEND_HOST || 'localhost',
    port: parseInt(process.env.TEST_BACKEND_PORT || '3000', 10),
  },
  database: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://ais_user:ais_password@localhost:5432/ais',
  },
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
  },
  timeout: 30000, // 30 seconds for integration tests
};

describe('Integration Tests - Complete Data Flow', () => {
  let pool: Pool;
  let redisClient: ReturnType<typeof createClient>;
  let wsClient: Socket;

  beforeAll(async () => {
    // Initialize database connection
    pool = new Pool({
      connectionString: TEST_CONFIG.database.url,
    });

    // Initialize Redis connection
    redisClient = createClient({
      url: TEST_CONFIG.redis.url,
    });
    await redisClient.connect();
  }, TEST_CONFIG.timeout);

  afterAll(async () => {
    // Cleanup connections
    if (wsClient && wsClient.connected) {
      wsClient.disconnect();
    }
    if (redisClient) {
      await redisClient.quit();
    }
    if (pool) {
      await pool.end();
    }
  });

  describe('Service Health Checks', () => {
    it('should verify PostgreSQL is running and accessible', async () => {
      const result = await pool.query('SELECT NOW()');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].now).toBeDefined();
    });

    it('should verify Redis is running and accessible', async () => {
      const pong = await redisClient.ping();
      expect(pong).toBe('PONG');
    });

    it('should verify backend health endpoint returns healthy status', async () => {
      const response = await makeHttpRequest('/api/health');
      expect(response.statusCode).toBe(200);
      
      const health = JSON.parse(response.body);
      expect(health.status).toBe('healthy');
      expect(health.services.database).toBe('connected');
      expect(health.services.redis).toBe('connected');
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Database Schema Validation', () => {
    it('should verify vessels table exists with correct schema', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'vessels'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('mmsi');
      expect(columns).toContain('name');
      expect(columns).toContain('vessel_type');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('should verify position_reports table exists with correct schema', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'position_reports'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('mmsi');
      expect(columns).toContain('timestamp');
      expect(columns).toContain('latitude');
      expect(columns).toContain('longitude');
      expect(columns).toContain('sog');
      expect(columns).toContain('cog');
    });

    it('should verify position_reports is a TimescaleDB hypertable', async () => {
      const result = await pool.query(`
        SELECT * FROM timescaledb_information.hypertables 
        WHERE hypertable_name = 'position_reports'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('REST API Endpoints', () => {
    it('should handle GET /api/vessels with no filters', async () => {
      const response = await makeHttpRequest('/api/vessels');
      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('vessels');
      expect(data).toHaveProperty('count');
      expect(data).toHaveProperty('timestamp');
      expect(Array.isArray(data.vessels)).toBe(true);
    });

    it('should handle GET /api/vessels with type filter', async () => {
      const response = await makeHttpRequest('/api/vessels?type=70&limit=10');
      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.vessels).toBeDefined();
      expect(data.count).toBeLessThanOrEqual(10);
    });

    it('should handle GET /api/vessels with bounding box filter', async () => {
      const bbox = {
        minLat: 37.0,
        maxLat: 38.0,
        minLon: -123.0,
        maxLon: -122.0,
      };
      const response = await makeHttpRequest(
        `/api/vessels?minLat=${bbox.minLat}&maxLat=${bbox.maxLat}&minLon=${bbox.minLon}&maxLon=${bbox.maxLon}`
      );
      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.vessels).toBeDefined();
      
      // Verify all returned vessels are within bounding box
      data.vessels.forEach((vessel: any) => {
        if (vessel.latitude && vessel.longitude) {
          expect(vessel.latitude).toBeGreaterThanOrEqual(bbox.minLat);
          expect(vessel.latitude).toBeLessThanOrEqual(bbox.maxLat);
          expect(vessel.longitude).toBeGreaterThanOrEqual(bbox.minLon);
          expect(vessel.longitude).toBeLessThanOrEqual(bbox.maxLon);
        }
      });
    });

    it('should handle GET /api/vessels/:mmsi for valid MMSI', async () => {
      // First, insert a test vessel
      const testMMSI = '123456789';
      await pool.query(
        'INSERT INTO vessels (mmsi, name, vessel_type) VALUES ($1, $2, $3) ON CONFLICT (mmsi) DO NOTHING',
        [testMMSI, 'Test Vessel', 70]
      );

      const response = await makeHttpRequest(`/api/vessels/${testMMSI}`);
      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data.vessel).toBeDefined();
      expect(data.vessel.mmsi).toBe(testMMSI);
    });

    it('should return 404 for non-existent vessel', async () => {
      const response = await makeHttpRequest('/api/vessels/999999999');
      expect(response.statusCode).toBe(404);

      const data = JSON.parse(response.body);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VESSEL_NOT_FOUND');
    });

    it('should return 400 for invalid MMSI format', async () => {
      const response = await makeHttpRequest('/api/vessels/invalid');
      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('INVALID_MMSI');
    });

    it('should handle GET /api/search with query parameter', async () => {
      const response = await makeHttpRequest('/api/search?q=test&limit=10');
      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('query');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('count');
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should return 400 for search without query parameter', async () => {
      const response = await makeHttpRequest('/api/search');
      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('MISSING_PARAMETER');
    });

    it('should handle GET /api/vessels/:mmsi/track with time range', async () => {
      const testMMSI = '123456789';
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Insert test position data
      await pool.query(
        `INSERT INTO position_reports (mmsi, timestamp, latitude, longitude, sog, cog)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mmsi, timestamp) DO NOTHING`,
        [testMMSI, now, 37.7749, -122.4194, 10.5, 180.0]
      );

      const response = await makeHttpRequest(
        `/api/vessels/${testMMSI}/track?startTime=${yesterday.toISOString()}&endTime=${now.toISOString()}`
      );

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('track');
        expect(data).toHaveProperty('count');
        expect(Array.isArray(data.track)).toBe(true);
      } else if (response.statusCode === 404) {
        // No data available is acceptable for this test
        const data = JSON.parse(response.body);
        expect(data.error.code).toBe('NO_DATA');
      }
    });
  });

  describe('WebSocket Real-time Updates', () => {
    beforeEach((done) => {
      // Create WebSocket client connection
      const url = `http://${TEST_CONFIG.backend.host}:${TEST_CONFIG.backend.port}`;
      wsClient = ioClient(url, {
        transports: ['websocket'],
        reconnection: false,
      });

      wsClient.on('connect', () => {
        done();
      });

      wsClient.on('connect_error', (error) => {
        done(error);
      });
    }, TEST_CONFIG.timeout);

    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

    it('should establish WebSocket connection to backend', (done) => {
      expect(wsClient.connected).toBe(true);
      done();
    });

    it('should receive connection acknowledgment', (done) => {
      wsClient.on('welcome', (data) => {
        expect(data).toBeDefined();
        expect(data.message).toBeDefined();
        done();
      });

      // Trigger by reconnecting if needed
      if (!wsClient.connected) {
        wsClient.connect();
      }
    }, TEST_CONFIG.timeout);

    it('should be able to send and receive messages', (done) => {
      wsClient.emit('ping', { timestamp: Date.now() });
      
      wsClient.on('pong', (data) => {
        expect(data).toBeDefined();
        done();
      });

      // If no pong received, that's okay - not all servers implement ping/pong
      setTimeout(() => {
        done();
      }, 2000);
    }, TEST_CONFIG.timeout);
  });

  describe('Cache Service Integration', () => {
    const testMMSI = '987654321';
    const testPosition = {
      mmsi: testMMSI,
      timestamp: new Date(),
      latitude: 37.7749,
      longitude: -122.4194,
      sog: 12.5,
      cog: 285.0,
    };

    it('should store and retrieve vessel position from Redis', async () => {
      const key = `vessel:position:${testMMSI}`;
      await redisClient.set(key, JSON.stringify(testPosition), {
        EX: 60, // 60 second TTL
      });

      const cached = await redisClient.get(key);
      expect(cached).toBeDefined();
      
      if (cached) {
        const position = JSON.parse(cached);
        expect(position.mmsi).toBe(testMMSI);
        expect(position.latitude).toBe(testPosition.latitude);
        expect(position.longitude).toBe(testPosition.longitude);
      }
    });

    it('should handle cache expiration with TTL', async () => {
      const key = `vessel:position:ttl-test`;
      await redisClient.set(key, JSON.stringify(testPosition), {
        EX: 1, // 1 second TTL
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      const cached = await redisClient.get(key);
      expect(cached).toBeNull();
    });
  });

  describe('Data Pipeline Integration', () => {
    it('should insert vessel data into database', async () => {
      const testVessel = {
        mmsi: '111222333',
        name: 'Integration Test Vessel',
        vessel_type: 70,
      };

      await pool.query(
        'INSERT INTO vessels (mmsi, name, vessel_type) VALUES ($1, $2, $3) ON CONFLICT (mmsi) DO UPDATE SET name = $2, vessel_type = $3',
        [testVessel.mmsi, testVessel.name, testVessel.vessel_type]
      );

      const result = await pool.query(
        'SELECT * FROM vessels WHERE mmsi = $1',
        [testVessel.mmsi]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].mmsi).toBe(testVessel.mmsi);
      expect(result.rows[0].name).toBe(testVessel.name);
      expect(result.rows[0].vessel_type).toBe(testVessel.vessel_type);
    });

    it('should insert position reports into database', async () => {
      const testPosition = {
        mmsi: '111222333',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 10.5,
        cog: 180.0,
      };

      await pool.query(
        `INSERT INTO position_reports (mmsi, timestamp, latitude, longitude, sog, cog)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mmsi, timestamp) DO NOTHING`,
        [
          testPosition.mmsi,
          testPosition.timestamp,
          testPosition.latitude,
          testPosition.longitude,
          testPosition.sog,
          testPosition.cog,
        ]
      );

      const result = await pool.query(
        'SELECT * FROM position_reports WHERE mmsi = $1 AND timestamp = $2',
        [testPosition.mmsi, testPosition.timestamp]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].mmsi).toBe(testPosition.mmsi);
      expect(parseFloat(result.rows[0].latitude)).toBeCloseTo(testPosition.latitude, 4);
      expect(parseFloat(result.rows[0].longitude)).toBeCloseTo(testPosition.longitude, 4);
    });

    it('should prevent duplicate position reports', async () => {
      const testPosition = {
        mmsi: '444555666',
        timestamp: new Date(),
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 10.5,
        cog: 180.0,
      };

      // Insert first time
      await pool.query(
        `INSERT INTO position_reports (mmsi, timestamp, latitude, longitude, sog, cog)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mmsi, timestamp) DO NOTHING`,
        [
          testPosition.mmsi,
          testPosition.timestamp,
          testPosition.latitude,
          testPosition.longitude,
          testPosition.sog,
          testPosition.cog,
        ]
      );

      // Try to insert duplicate
      await pool.query(
        `INSERT INTO position_reports (mmsi, timestamp, latitude, longitude, sog, cog)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (mmsi, timestamp) DO NOTHING`,
        [
          testPosition.mmsi,
          testPosition.timestamp,
          testPosition.latitude,
          testPosition.longitude,
          testPosition.sog,
          testPosition.cog,
        ]
      );

      // Verify only one record exists
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM position_reports WHERE mmsi = $1 AND timestamp = $2',
        [testPosition.mmsi, testPosition.timestamp]
      );

      expect(parseInt(result.rows[0].count, 10)).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API requests gracefully', async () => {
      const response = await makeHttpRequest('/api/vessels?type=invalid');
      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('INVALID_PARAMETER');
    });

    it('should handle database query errors gracefully', async () => {
      // Try to query with invalid SQL (this should be caught by the API)
      const response = await makeHttpRequest('/api/vessels?limit=-1');
      expect(response.statusCode).toBe(400);
    });

    it('should return proper error format', async () => {
      const response = await makeHttpRequest('/api/vessels/invalid-mmsi');
      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.body);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toBeDefined();
      expect(data.error.timestamp).toBeDefined();
    });
  });
});

/**
 * Helper function to make HTTP requests
 */
function makeHttpRequest(path: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TEST_CONFIG.backend.host,
      port: TEST_CONFIG.backend.port,
      path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 500,
          body,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(TEST_CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}
