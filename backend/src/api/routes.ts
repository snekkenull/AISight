import { Router, Request, Response, NextFunction } from 'express';
import { VesselRepository } from '../repositories/VesselRepository';
import { CacheService } from '../services/CacheService';
import { RegionalScheduler } from '../services/RegionalScheduler';
import { Pool } from 'pg';

/**
 * Create API routes for vessel tracking
 */
export function createApiRoutes(
  pool: Pool,
  cache: CacheService,
  aisStreamManager?: any,
  regionalScheduler?: RegionalScheduler
): Router {
  const router = Router();
  const vesselRepo = new VesselRepository(pool);

  /**
   * GET /api/vessels
   * List vessels with optional filters
   * Query parameters:
   * - mmsi: Filter by MMSI
   * - name: Filter by vessel name (partial match)
   * - type: Filter by vessel type
   * - minLat, maxLat, minLon, maxLon: Bounding box filter
   * - speedMin, speedMax: Speed range filter
   * - hasPosition: Filter by position availability (true/false)
   * - maxPositionAgeHours: Filter by position age (in hours)
   * - limit: Maximum number of results (default: 1000)
   * - offset: Pagination offset (default: 0)
   * Validates: Requirements 4.3
   */
  router.get('/vessels', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        mmsi,
        name,
        type,
        minLat,
        maxLat,
        minLon,
        maxLon,
        speedMin,
        speedMax,
        hasPosition,
        maxPositionAgeHours,
        limit,
        offset,
      } = req.query;

      // Build query criteria
      const criteria: any = {};

      if (mmsi) {
        criteria.mmsi = String(mmsi);
      }

      if (name) {
        criteria.name = String(name);
      }

      if (type) {
        const vesselType = parseInt(String(type), 10);
        if (isNaN(vesselType)) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid vessel type parameter',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        criteria.type = vesselType;
      }

      // Bounding box validation
      if (minLat || maxLat || minLon || maxLon) {
        if (!minLat || !maxLat || !minLon || !maxLon) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Bounding box requires all four parameters: minLat, maxLat, minLon, maxLon',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        const bbox = {
          minLat: parseFloat(String(minLat)),
          maxLat: parseFloat(String(maxLat)),
          minLon: parseFloat(String(minLon)),
          maxLon: parseFloat(String(maxLon)),
        };

        // Validate coordinate ranges
        if (
          isNaN(bbox.minLat) || isNaN(bbox.maxLat) ||
          isNaN(bbox.minLon) || isNaN(bbox.maxLon) ||
          bbox.minLat < -90 || bbox.maxLat > 90 ||
          bbox.minLon < -180 || bbox.maxLon > 180 ||
          bbox.minLat >= bbox.maxLat ||
          bbox.minLon >= bbox.maxLon
        ) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid bounding box coordinates',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        criteria.bbox = bbox;
        
        // Bounding box queries should only return vessels with positions in bounds
        // Automatically set hasPosition to true when bbox is specified
        if (criteria.hasPosition === undefined) {
          criteria.hasPosition = true;
        }
      }

      // Speed range validation
      if (speedMin) {
        const min = parseFloat(String(speedMin));
        if (isNaN(min) || min < 0) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid speedMin parameter',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        criteria.speedMin = min;
      }

      if (speedMax) {
        const max = parseFloat(String(speedMax));
        if (isNaN(max) || max < 0) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid speedMax parameter',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        criteria.speedMax = max;
      }

      // Position availability filter
      if (hasPosition !== undefined) {
        const hasPositionStr = String(hasPosition).toLowerCase();
        if (hasPositionStr === 'true') {
          criteria.hasPosition = true;
        } else if (hasPositionStr === 'false') {
          criteria.hasPosition = false;
        } else {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'hasPosition must be "true" or "false"',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      }

      // Position age filter
      if (maxPositionAgeHours) {
        const ageHours = parseFloat(String(maxPositionAgeHours));
        if (isNaN(ageHours) || ageHours < 0) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'maxPositionAgeHours must be a non-negative number',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        criteria.maxPositionAgeHours = ageHours;
      }

      // Pagination validation
      if (limit) {
        const limitNum = parseInt(String(limit), 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 10000) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Limit must be between 1 and 10000',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        criteria.limit = limitNum;
      }

      if (offset) {
        const offsetNum = parseInt(String(offset), 10);
        if (isNaN(offsetNum) || offsetNum < 0) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Offset must be non-negative',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        criteria.offset = offsetNum;
      }

      const vessels = await vesselRepo.queryVessels(criteria);

      res.json({
        vessels,
        count: vessels.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vessels/:mmsi
   * Get vessel details by MMSI
   * If vessel not found in database, subscribes to AISStream for that vessel
   */
  router.get('/vessels/:mmsi', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mmsi } = req.params;

      // Validate MMSI format (9 digits)
      if (!/^\d{9}$/.test(mmsi)) {
        res.status(400).json({
          error: {
            code: 'INVALID_MMSI',
            message: 'MMSI must be a 9-digit number',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Get vessel with latest position from database
      const vesselWithPosition = await vesselRepo.getVesselWithPositionByMMSI(mmsi);

      if (!vesselWithPosition) {
        // Vessel not in database - indicate it's not available
        // AISStream is a passive streaming service, so we can't request specific vessels on-demand
        // The vessel will be added to the database when AISStream broadcasts its data
        res.status(404).json({
          error: {
            code: 'VESSEL_NOT_FOUND',
            message: `Vessel with MMSI ${mmsi} not found in database. The vessel may not be currently transmitting or is outside the monitored area.`,
            timestamp: new Date().toISOString(),
          },
          tracking: aisStreamManager?.isConnectionActive() || false,
        });
        return;
      }

      // Try to get latest position from cache (may be more recent than database)
      let position = vesselWithPosition.position || null;
      if (cache.isReady()) {
        const cachedPosition = await cache.getVesselPosition(mmsi);
        if (cachedPosition) {
          // Use cached position if it's more recent
          if (!position || (cachedPosition.timestamp && new Date(cachedPosition.timestamp) > new Date(position.timestamp))) {
            position = cachedPosition;
          }
        }
      }

      // Extract vessel data without position for response
      const { position: _, ...vessel } = vesselWithPosition;

      res.json({
        vessel,
        position,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vessels/imo/:imo
   * Get vessel details by IMO number
   */
  router.get('/vessels/imo/:imo', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { imo } = req.params;

      // Validate IMO format (7 digits, optionally prefixed with "IMO")
      const imoNumber = imo.replace(/^IMO\s*/i, '');
      if (!/^\d{7}$/.test(imoNumber)) {
        res.status(400).json({
          error: {
            code: 'INVALID_IMO',
            message: 'IMO number must be a 7-digit number (optionally prefixed with "IMO")',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Get vessel with latest position from database
      const vesselWithPosition = await vesselRepo.getVesselWithPositionByIMO(imoNumber);

      if (!vesselWithPosition) {
        res.status(404).json({
          error: {
            code: 'VESSEL_NOT_FOUND',
            message: `Vessel with IMO ${imoNumber} not found in database`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Try to get latest position from cache (may be more recent than database)
      let position = vesselWithPosition.position || null;
      if (cache.isReady()) {
        const cachedPosition = await cache.getVesselPosition(vesselWithPosition.mmsi);
        if (cachedPosition) {
          // Use cached position if it's more recent
          if (!position || (cachedPosition.timestamp && new Date(cachedPosition.timestamp) > new Date(position.timestamp))) {
            position = cachedPosition;
          }
        }
      }

      // Extract vessel data without position for response
      const { position: _, ...vessel } = vesselWithPosition;

      res.json({
        vessel,
        position,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/vessels/:mmsi/track
   * Get vessel position history
   * Query parameters:
   * - startTime: ISO 8601 timestamp (default: 24 hours ago)
   * - endTime: ISO 8601 timestamp (default: now)
   */
  router.get('/vessels/:mmsi/track', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mmsi } = req.params;
      const { startTime, endTime } = req.query;

      // Validate MMSI format
      if (!/^\d{9}$/.test(mmsi)) {
        res.status(400).json({
          error: {
            code: 'INVALID_MMSI',
            message: 'MMSI must be a 9-digit number',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Parse time range
      let start: Date;
      let end: Date;

      if (startTime) {
        start = new Date(String(startTime));
        if (isNaN(start.getTime())) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid startTime format. Use ISO 8601 format.',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      } else {
        // Default: 24 hours ago
        start = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      if (endTime) {
        end = new Date(String(endTime));
        if (isNaN(end.getTime())) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid endTime format. Use ISO 8601 format.',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      } else {
        // Default: now
        end = new Date();
      }

      // Validate time range
      if (start >= end) {
        res.status(400).json({
          error: {
            code: 'INVALID_PARAMETER',
            message: 'startTime must be before endTime',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const track = await vesselRepo.getVesselHistory(mmsi, start, end);

      if (track.length === 0) {
        res.status(404).json({
          error: {
            code: 'NO_DATA',
            message: 'No position data available for the specified time range',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        mmsi,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        track,
        count: track.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/search
   * Search vessels by name or MMSI
   * Query parameters:
   * - q: Search query (required)
   * - limit: Maximum number of results (default: 100)
   */
  router.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q, limit } = req.query;

      if (!q || String(q).trim().length === 0) {
        const code = !q ? 'MISSING_PARAMETER' : 'INVALID_PARAMETER';
        const message = !q 
          ? 'Search query parameter "q" is required'
          : 'Search query cannot be empty';
        
        res.status(400).json({
          error: {
            code,
            message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const searchTerm = String(q).trim();

      let searchLimit = 100;
      if (limit) {
        const limitNum = parseInt(String(limit), 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Limit must be between 1 and 1000',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        searchLimit = limitNum;
      }

      const results = await vesselRepo.searchVessels(searchTerm, searchLimit);

      res.json({
        query: searchTerm,
        results,
        count: results.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/health
   * Health check endpoint
   * Validates: Requirements 3.1, 3.2, 3.3
   */
  router.get('/health', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'unknown',
          redis: 'unknown',
          aisStream: 'not_configured',
        },
        dataStatus: {
          totalVessels: 0,
          vesselsWithPosition: 0,
          vesselsWithRecentPosition: 0,
          lastPositionUpdate: null,
          positionReportsLast24h: 0,
        },
      };

      // Check database connection
      try {
        await pool.query('SELECT 1');
        health.services.database = 'connected';
      } catch (error) {
        health.services.database = 'disconnected';
        health.status = 'unhealthy';
      }

      // Check Redis connection
      if (cache.isReady()) {
        health.services.redis = 'connected';
      } else {
        health.services.redis = 'disconnected';
        health.status = 'degraded';
      }

      // Check AIS stream connection status
      if (aisStreamManager) {
        const isConnected = aisStreamManager.isConnectionActive();
        health.services.aisStream = isConnected ? 'connected' : 'disconnected';
        
        if (!isConnected && health.status === 'healthy') {
          health.status = 'degraded';
        }
      }

      // Gather position data statistics (only if database is connected)
      if (health.services.database === 'connected') {
        try {
          // Get total vessel count
          health.dataStatus.totalVessels = await vesselRepo.countVessels();
          
          // Get vessels with position data
          health.dataStatus.vesselsWithPosition = await vesselRepo.countVesselsWithPosition();
          
          // Get vessels with recent position data (< 1 hour)
          health.dataStatus.vesselsWithRecentPosition = await vesselRepo.countVesselsWithRecentPosition(1);
          
          // Get timestamp of most recent position update
          const latestTimestamp = await vesselRepo.getLatestPositionTimestamp();
          health.dataStatus.lastPositionUpdate = latestTimestamp ? latestTimestamp.toISOString() : null;
          
          // Count position reports in last 24 hours
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          health.dataStatus.positionReportsLast24h = await vesselRepo.countPositionReports(yesterday, now);
        } catch (error) {
          // Log error but don't fail health check
          console.error('Failed to gather data statistics:', error);
        }
      }

      // Determine overall health status based on data pipeline state
      if (health.services.database === 'disconnected') {
        health.status = 'unhealthy';
      } else if (
        health.services.redis === 'disconnected' || 
        health.services.aisStream === 'disconnected'
      ) {
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/scheduler/status
   * Get regional scheduler status
   */
  router.get(
    '/scheduler/status',
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!regionalScheduler) {
          res.status(503).json({
            error: {
              code: 'SCHEDULER_NOT_AVAILABLE',
              message: 'Regional scheduler is not configured',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        const status = regionalScheduler.getStatus();
        const regions = regionalScheduler.getRegions();

        res.json({
          ...status,
          regions: regions.map((r) => ({
            id: r.id,
            name: r.name,
            bounds: r.bounds,
            priority: r.priority,
          })),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/scheduler/focus
   * Focus scheduler on a specific location (for on-demand vessel updates)
   * Body: { latitude: number, longitude: number }
   */
  router.post(
    '/scheduler/focus',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!regionalScheduler) {
          res.status(503).json({
            error: {
              code: 'SCHEDULER_NOT_AVAILABLE',
              message: 'Regional scheduler is not configured',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        const { latitude, longitude } = req.body;

        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          res.status(400).json({
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        const region = regionalScheduler.focusOnLocation(latitude, longitude);

        if (region) {
          res.json({
            success: true,
            message: `Focused on region: ${region.name}`,
            region: {
              id: region.id,
              name: region.name,
              bounds: region.bounds,
            },
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(404).json({
            error: {
              code: 'REGION_NOT_FOUND',
              message: 'No region found for the specified location',
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/scheduler/rotate
   * Manually rotate to the next region
   */
  router.post(
    '/scheduler/rotate',
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!regionalScheduler) {
          res.status(503).json({
            error: {
              code: 'SCHEDULER_NOT_AVAILABLE',
              message: 'Regional scheduler is not configured',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        regionalScheduler.rotateNow();
        const status = regionalScheduler.getStatus();

        res.json({
          success: true,
          message: `Rotated to region: ${status.currentRegion?.name}`,
          currentRegion: status.currentRegion,
          nextRegion: status.nextRegion,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
