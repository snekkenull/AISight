import { Pool } from 'pg';
import {
  Vessel,
  PositionReport,
  VesselQuery,
  VesselWithPosition,
  ShipStaticData,
} from '../types';
import { createComponentLogger, DatabaseError } from '../utils';

export class VesselRepository {
  private logger = createComponentLogger('VesselRepository');

  constructor(private pool: Pool) {}

  /**
   * Upsert vessel metadata by MMSI
   * If vessel exists, update metadata; otherwise insert new vessel
   */
  async upsertVessel(vessel: ShipStaticData): Promise<Vessel> {
    const query = `
      INSERT INTO vessels (
        mmsi, imo_number, name, call_sign, vessel_type,
        dimension_a, dimension_b, dimension_c, dimension_d,
        draught, destination, eta
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (mmsi) 
      DO UPDATE SET
        imo_number = COALESCE(EXCLUDED.imo_number, vessels.imo_number),
        name = COALESCE(EXCLUDED.name, vessels.name),
        call_sign = COALESCE(EXCLUDED.call_sign, vessels.call_sign),
        vessel_type = COALESCE(EXCLUDED.vessel_type, vessels.vessel_type),
        dimension_a = COALESCE(EXCLUDED.dimension_a, vessels.dimension_a),
        dimension_b = COALESCE(EXCLUDED.dimension_b, vessels.dimension_b),
        dimension_c = COALESCE(EXCLUDED.dimension_c, vessels.dimension_c),
        dimension_d = COALESCE(EXCLUDED.dimension_d, vessels.dimension_d),
        draught = COALESCE(EXCLUDED.draught, vessels.draught),
        destination = COALESCE(EXCLUDED.destination, vessels.destination),
        eta = COALESCE(EXCLUDED.eta, vessels.eta),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      vessel.mmsi,
      vessel.imo || null,
      vessel.name || null,
      vessel.callSign || null,
      vessel.type || null,
      vessel.dimensions?.a || null,
      vessel.dimensions?.b || null,
      vessel.dimensions?.c || null,
      vessel.dimensions?.d || null,
      vessel.draught || null,
      vessel.destination || null,
      vessel.eta || null,
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToVessel(result.rows[0]);
    } catch (error) {
      const dbError = new DatabaseError('Failed to upsert vessel', {
        mmsi: vessel.mmsi,
        originalError: error instanceof Error ? error.message : String(error),
      });
      this.logger.logDatabaseError(dbError, 'upsertVessel');
      throw dbError;
    }
  }

  /**
   * Batch insert position reports
   * Uses ON CONFLICT to prevent duplicate entries based on (mmsi, timestamp)
   * Pre-filters positions for vessels that exist to prevent foreign key violations
   * Compatible with TimescaleDB hypertables
   */
  async batchInsertPositions(positions: PositionReport[]): Promise<void> {
    if (positions.length === 0) {
      return;
    }

    // PostgreSQL has a parameter limit of ~65535
    // With 9 parameters per position, max batch size is ~1000 for safety
    const MAX_BATCH_SIZE = 1000;

    // If batch is too large, split it into smaller chunks
    if (positions.length > MAX_BATCH_SIZE) {
      this.logger.info('Batch size exceeds maximum, splitting into chunks', {
        totalPositions: positions.length,
        maxBatchSize: MAX_BATCH_SIZE,
        chunks: Math.ceil(positions.length / MAX_BATCH_SIZE),
      });

      for (let i = 0; i < positions.length; i += MAX_BATCH_SIZE) {
        const chunk = positions.slice(i, i + MAX_BATCH_SIZE);
        await this.batchInsertPositions(chunk);
      }
      return;
    }

    // First, get the list of existing vessel MMSIs to filter positions
    const uniqueMMSIs = [...new Set(positions.map((p) => p.mmsi))];

    let existingMMSIs: Set<string>;
    try {
      const existingVesselsQuery = `SELECT mmsi FROM vessels WHERE mmsi = ANY($1)`;
      const existingResult = await this.pool.query(existingVesselsQuery, [uniqueMMSIs]);
      existingMMSIs = new Set(existingResult.rows.map((r: { mmsi: string }) => r.mmsi));
    } catch (error) {
      this.logger.error('Failed to query existing vessels', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    // Filter positions to only include those with existing vessels
    const validPositions = positions.filter((p) => existingMMSIs.has(p.mmsi));

    if (validPositions.length === 0) {
      this.logger.debug('No valid positions to insert (all vessels missing)', {
        totalPositions: positions.length,
        uniqueMMSIs: uniqueMMSIs.length,
      });
      return;
    }

    // Build values array for batch insert with proper $N placeholders
    const values: any[] = [];
    const placeholders: string[] = [];

    validPositions.forEach((pos, index) => {
      const offset = index * 9;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      );
      values.push(
        pos.mmsi,
        pos.timestamp,
        pos.latitude,
        pos.longitude,
        pos.sog ?? null,
        pos.cog ?? null,
        pos.true_heading ?? null,
        pos.navigational_status ?? null,
        pos.rate_of_turn ?? null
      );
    });

    // Direct INSERT compatible with TimescaleDB hypertables
    const query = `
      INSERT INTO position_reports (
        mmsi, timestamp, latitude, longitude, sog, cog, 
        true_heading, navigational_status, rate_of_turn
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (mmsi, timestamp) DO NOTHING;
    `;

    try {
      const result = await this.pool.query(query, values);

      const inserted = result.rowCount || 0;
      const skipped = positions.length - validPositions.length;

      if (inserted > 0) {
        this.logger.debug('Batch insert successful', {
          inserted,
          skippedMissingVessel: skipped,
          total: positions.length,
        });

        // Manually update vessel_latest_positions table
        // (needed when database doesn't support triggers)
        await this.updateLatestPositions(validPositions);
      }
    } catch (error) {
      console.error('Raw database error:', error);

      const dbError = new DatabaseError('Failed to batch insert positions', {
        batchSize: validPositions.length,
        parameterCount: values.length,
        originalError: error instanceof Error ? error.message : String(error),
        errorCode: (error as any)?.code,
        errorDetail: (error as any)?.detail,
      });
      this.logger.logDatabaseError(dbError, 'batchInsertPositions');
      throw dbError;
    }
  }

  /**
   * Update vessel_latest_positions table with new positions
   * This is needed when the database doesn't support triggers
   */
  private async updateLatestPositions(positions: PositionReport[]): Promise<void> {
    if (positions.length === 0) return;

    // Group positions by MMSI and keep only the latest for each vessel
    const latestByMMSI = new Map<string, PositionReport>();
    for (const pos of positions) {
      const existing = latestByMMSI.get(pos.mmsi);
      if (!existing || new Date(pos.timestamp) > new Date(existing.timestamp)) {
        latestByMMSI.set(pos.mmsi, pos);
      }
    }

    const latestPositions = Array.from(latestByMMSI.values());
    
    // Build batch upsert query
    const values: any[] = [];
    const placeholders: string[] = [];

    latestPositions.forEach((pos, index) => {
      const offset = index * 8;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      );
      values.push(
        pos.mmsi,
        pos.timestamp,
        pos.latitude,
        pos.longitude,
        pos.sog ?? null,
        pos.cog ?? null,
        pos.true_heading ?? null,
        pos.navigational_status ?? null
      );
    });

    const query = `
      INSERT INTO vessel_latest_positions (
        mmsi, timestamp, latitude, longitude, sog, cog, true_heading, navigational_status
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (mmsi) DO UPDATE SET
        timestamp = EXCLUDED.timestamp,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        sog = EXCLUDED.sog,
        cog = EXCLUDED.cog,
        true_heading = EXCLUDED.true_heading,
        navigational_status = EXCLUDED.navigational_status
      WHERE EXCLUDED.timestamp > vessel_latest_positions.timestamp;
    `;

    try {
      await this.pool.query(query, values);
    } catch (error) {
      // Log but don't throw - this is a best-effort optimization
      this.logger.error('Failed to update latest positions', error instanceof Error ? error : new Error(String(error)));
    }
  }


  /**
   * Query vessels with various filters
   * Uses latest_vessel_positions view to ensure only current positions are considered
   * This prevents historical positions from appearing when filtering by bounding box
   * Validates: Requirements 4.3
   */
  async queryVessels(criteria: VesselQuery): Promise<VesselWithPosition[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (criteria.mmsi) {
      conditions.push(`v.mmsi = $${paramIndex++}`);
      values.push(criteria.mmsi);
    }

    if (criteria.name) {
      conditions.push(`v.name ILIKE $${paramIndex++}`);
      values.push(`%${criteria.name}%`);
    }

    if (criteria.type !== undefined) {
      conditions.push(`v.vessel_type = $${paramIndex++}`);
      values.push(criteria.type);
    }

    if (criteria.hasPosition !== undefined) {
      if (criteria.hasPosition) {
        conditions.push(`lp.timestamp IS NOT NULL`);
      } else {
        conditions.push(`lp.timestamp IS NULL`);
      }
    }

    if (criteria.maxPositionAgeHours !== undefined) {
      conditions.push(`lp.timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour' * $${paramIndex++}`);
      values.push(criteria.maxPositionAgeHours);
    }

    if (criteria.bbox) {
      conditions.push(`
        lp.latitude BETWEEN $${paramIndex++} AND $${paramIndex++}
        AND lp.longitude BETWEEN $${paramIndex++} AND $${paramIndex++}
      `);
      values.push(
        criteria.bbox.minLat,
        criteria.bbox.maxLat,
        criteria.bbox.minLon,
        criteria.bbox.maxLon
      );
    }

    if (criteria.speedMin !== undefined) {
      conditions.push(`lp.sog >= $${paramIndex++}`);
      values.push(criteria.speedMin);
    }

    if (criteria.speedMax !== undefined) {
      conditions.push(`lp.sog <= $${paramIndex++}`);
      values.push(criteria.speedMax);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = criteria.limit || 1000;
    const offset = criteria.offset || 0;

    // Use latest_vessel_positions view to get only current positions
    // This view already uses DISTINCT ON to get the latest position per vessel
    // After running the migration, this view will use the optimized vessel_latest_positions table
    const query = `
      SELECT 
        v.mmsi, v.imo_number, v.name, v.call_sign, v.vessel_type,
        v.dimension_a, v.dimension_b, v.dimension_c, v.dimension_d,
        v.draught, v.destination, v.eta, v.created_at, v.updated_at,
        lp.timestamp, lp.latitude, lp.longitude, lp.sog, lp.cog,
        lp.true_heading, lp.navigational_status, NULL as rate_of_turn
      FROM vessels v
      LEFT JOIN latest_vessel_positions lp ON v.mmsi = lp.mmsi
      ${whereClause}
      ORDER BY lp.timestamp DESC NULLS LAST
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRowToVesselWithPosition(row));
  }

  async getVesselByMMSI(mmsi: string): Promise<Vessel | null> {
    const query = `SELECT * FROM vessels WHERE mmsi = $1;`;
    const result = await this.pool.query(query, [mmsi]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToVessel(result.rows[0]);
  }

  /**
   * Get vessel with latest position by MMSI
   * Uses the latest_vessel_positions view for efficient lookup
   */
  async getVesselWithPositionByMMSI(mmsi: string): Promise<VesselWithPosition | null> {
    const query = `
      SELECT 
        v.mmsi, v.imo_number, v.name, v.call_sign, v.vessel_type,
        v.dimension_a, v.dimension_b, v.dimension_c, v.dimension_d,
        v.draught, v.destination, v.eta, v.created_at, v.updated_at,
        lp.timestamp, lp.latitude, lp.longitude, lp.sog, lp.cog,
        lp.true_heading, lp.navigational_status, NULL as rate_of_turn
      FROM vessels v
      LEFT JOIN latest_vessel_positions lp ON v.mmsi = lp.mmsi
      WHERE v.mmsi = $1;
    `;
    const result = await this.pool.query(query, [mmsi]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToVesselWithPosition(result.rows[0]);
  }

  async getVesselHistory(mmsi: string, startTime: Date, endTime: Date): Promise<PositionReport[]> {
    const query = `
      SELECT mmsi, timestamp, latitude, longitude, sog, cog,
        true_heading, navigational_status, rate_of_turn
      FROM position_reports
      WHERE mmsi = $1 AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp ASC;
    `;
    const result = await this.pool.query(query, [mmsi, startTime, endTime]);
    return result.rows.map((row) => this.mapRowToPositionReport(row));
  }

  async getLatestPositions(limit: number = 1000): Promise<VesselWithPosition[]> {
    const query = `
      SELECT v.mmsi, v.imo_number, v.name, v.call_sign, v.vessel_type,
        v.dimension_a, v.dimension_b, v.dimension_c, v.dimension_d,
        v.draught, v.destination, v.eta, v.created_at, v.updated_at,
        p.timestamp, p.latitude, p.longitude, p.sog, p.cog,
        p.true_heading, p.navigational_status, p.rate_of_turn
      FROM latest_vessel_positions p
      JOIN vessels v ON p.mmsi = v.mmsi
      ORDER BY p.timestamp DESC
      LIMIT $1;
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows.map((row) => this.mapRowToVesselWithPosition(row));
  }

  async searchVessels(searchTerm: string, limit: number = 100): Promise<VesselWithPosition[]> {
    // Search by name, MMSI, or IMO number
    // Use latest_vessel_positions view for efficient position lookup
    // Prioritize exact MMSI matches, then partial matches
    // Order by position recency to show active vessels first
    const isExactMMSI = /^\d{9}$/.test(searchTerm.trim());
    
    const query = `
      SELECT 
        v.mmsi, v.imo_number, v.name, v.call_sign, v.vessel_type,
        v.dimension_a, v.dimension_b, v.dimension_c, v.dimension_d,
        v.draught, v.destination, v.eta, v.created_at, v.updated_at,
        lp.timestamp, lp.latitude, lp.longitude, lp.sog, lp.cog,
        lp.true_heading, lp.navigational_status, NULL as rate_of_turn
      FROM vessels v
      LEFT JOIN latest_vessel_positions lp ON v.mmsi = lp.mmsi
      WHERE 
        ${isExactMMSI ? 'v.mmsi = $1' : 'v.name ILIKE $1 OR v.mmsi LIKE $2 OR v.imo_number LIKE $3'}
      ORDER BY 
        -- Prioritize exact MMSI matches
        CASE WHEN v.mmsi = $${isExactMMSI ? '1' : '4'} THEN 0 ELSE 1 END,
        -- Then prioritize vessels with recent positions
        lp.timestamp DESC NULLS LAST
      LIMIT $${isExactMMSI ? '2' : '5'};
    `;
    
    let result;
    if (isExactMMSI) {
      // Exact MMSI search - use exact match
      result = await this.pool.query(query, [searchTerm.trim(), limit]);
    } else {
      // Partial search - use ILIKE for name, LIKE for MMSI/IMO
      result = await this.pool.query(query, [
        `%${searchTerm}%`, 
        `%${searchTerm}%`, 
        `%${searchTerm}%`,
        searchTerm.trim(),
        limit
      ]);
    }
    
    return result.rows.map((row) => this.mapRowToVesselWithPosition(row));
  }

  /**
   * Get vessel by IMO number
   */
  async getVesselByIMO(imoNumber: string): Promise<Vessel | null> {
    const query = `SELECT * FROM vessels WHERE imo_number = $1;`;
    const result = await this.pool.query(query, [imoNumber]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToVessel(result.rows[0]);
  }

  /**
   * Get vessel with latest position by IMO number
   * Uses the latest_vessel_positions view for efficient lookup
   */
  async getVesselWithPositionByIMO(imoNumber: string): Promise<VesselWithPosition | null> {
    const query = `
      SELECT 
        v.mmsi, v.imo_number, v.name, v.call_sign, v.vessel_type,
        v.dimension_a, v.dimension_b, v.dimension_c, v.dimension_d,
        v.draught, v.destination, v.eta, v.created_at, v.updated_at,
        lp.timestamp, lp.latitude, lp.longitude, lp.sog, lp.cog,
        lp.true_heading, lp.navigational_status, NULL as rate_of_turn
      FROM vessels v
      LEFT JOIN latest_vessel_positions lp ON v.mmsi = lp.mmsi
      WHERE v.imo_number = $1;
    `;
    const result = await this.pool.query(query, [imoNumber]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToVesselWithPosition(result.rows[0]);
  }

  async getVesselsInBounds(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    limit: number = 1000
  ): Promise<VesselWithPosition[]> {
    return this.queryVessels({
      bbox: { minLat, maxLat, minLon, maxLon },
      limit,
    });
  }

  async countPositions(mmsi: string, timestamp: Date): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM position_reports WHERE mmsi = $1 AND timestamp = $2;`;
    const result = await this.pool.query(query, [mmsi, timestamp]);
    return parseInt(result.rows[0].count, 10);
  }

  async countVessels(): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM vessels;`;
    try {
      const result = await this.pool.query(query);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      const dbError = new DatabaseError('Failed to count vessels', {
        originalError: error instanceof Error ? error.message : String(error),
      });
      this.logger.logDatabaseError(dbError, 'countVessels');
      throw dbError;
    }
  }

  async countVesselsWithPosition(): Promise<number> {
    const query = `SELECT COUNT(DISTINCT mmsi) as count FROM position_reports;`;
    try {
      const result = await this.pool.query(query);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      const dbError = new DatabaseError('Failed to count vessels with position', {
        originalError: error instanceof Error ? error.message : String(error),
      });
      this.logger.logDatabaseError(dbError, 'countVesselsWithPosition');
      throw dbError;
    }
  }

  async countVesselsWithRecentPosition(thresholdHours: number): Promise<number> {
    const query = `SELECT COUNT(DISTINCT mmsi) as count FROM position_reports WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour' * $1;`;
    try {
      const result = await this.pool.query(query, [thresholdHours]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      const dbError = new DatabaseError('Failed to count vessels with recent position', {
        thresholdHours,
        originalError: error instanceof Error ? error.message : String(error),
      });
      this.logger.logDatabaseError(dbError, 'countVesselsWithRecentPosition');
      throw dbError;
    }
  }

  async getLatestPositionTimestamp(): Promise<Date | null> {
    const query = `SELECT MAX(timestamp) as latest_timestamp FROM position_reports;`;
    try {
      const result = await this.pool.query(query);
      return result.rows[0].latest_timestamp || null;
    } catch (error) {
      const dbError = new DatabaseError('Failed to get latest position timestamp', {
        originalError: error instanceof Error ? error.message : String(error),
      });
      this.logger.logDatabaseError(dbError, 'getLatestPositionTimestamp');
      throw dbError;
    }
  }

  async countPositionReports(startTime: Date, endTime: Date): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM position_reports WHERE timestamp BETWEEN $1 AND $2;`;
    try {
      const result = await this.pool.query(query, [startTime, endTime]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      const dbError = new DatabaseError('Failed to count position reports', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        originalError: error instanceof Error ? error.message : String(error),
      });
      this.logger.logDatabaseError(dbError, 'countPositionReports');
      throw dbError;
    }
  }

  private mapRowToVessel(row: any): Vessel {
    return {
      mmsi: row.mmsi,
      imoNumber: row.imo_number,
      name: row.name,
      callSign: row.call_sign,
      vesselType: row.vessel_type,
      dimensionA: row.dimension_a,
      dimensionB: row.dimension_b,
      dimensionC: row.dimension_c,
      dimensionD: row.dimension_d,
      draught: row.draught ? parseFloat(row.draught) : undefined,
      destination: row.destination,
      eta: row.eta,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToPositionReport(row: any): PositionReport {
    return {
      mmsi: row.mmsi,
      timestamp: row.timestamp,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      sog: row.sog ? parseFloat(row.sog) : undefined,
      cog: row.cog ? parseFloat(row.cog) : undefined,
      true_heading: row.true_heading,
      navigational_status: row.navigational_status,
      rate_of_turn: row.rate_of_turn,
    };
  }

  private mapRowToVesselWithPosition(row: any): VesselWithPosition {
    const vessel: VesselWithPosition = this.mapRowToVessel(row);
    if (row.timestamp) {
      vessel.position = this.mapRowToPositionReport(row);
    }
    return vessel;
  }
}
