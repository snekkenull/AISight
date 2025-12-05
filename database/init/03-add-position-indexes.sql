-- Add indexes for efficient timestamp queries on position_reports table
-- These indexes support the position statistics queries

-- Index for timestamp-based queries (recent position lookups)
-- This supports queries like "WHERE timestamp > NOW() - INTERVAL '1 hour'"
CREATE INDEX IF NOT EXISTS idx_position_timestamp ON position_reports(timestamp DESC);

-- Composite index for MMSI and timestamp (already exists but ensuring it's optimal)
-- This supports queries that filter by both MMSI and timestamp
-- Note: idx_position_mmsi_time already exists in 01-create-schema.sql

-- Index for counting distinct MMSIs with recent positions
-- This is a covering index that can satisfy COUNT(DISTINCT mmsi) queries efficiently
CREATE INDEX IF NOT EXISTS idx_position_mmsi_timestamp ON position_reports(mmsi, timestamp DESC);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ais_user;
