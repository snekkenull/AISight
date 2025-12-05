-- Migration: Optimize latest vessel positions for fast bounding box queries
-- Run this on existing databases to improve query performance
-- This is safe to run multiple times (idempotent)

-- Create a table to store only the latest position per vessel
CREATE TABLE IF NOT EXISTS vessel_latest_positions (
  mmsi VARCHAR(20) PRIMARY KEY REFERENCES vessels(mmsi) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  sog DECIMAL(4,1),
  cog DECIMAL(5,1),
  true_heading INTEGER,
  navigational_status INTEGER
);

-- Create spatial indexes for fast bounding box queries
CREATE INDEX IF NOT EXISTS idx_latest_pos_lat ON vessel_latest_positions(latitude);
CREATE INDEX IF NOT EXISTS idx_latest_pos_lon ON vessel_latest_positions(longitude);
CREATE INDEX IF NOT EXISTS idx_latest_pos_lat_lon ON vessel_latest_positions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_latest_pos_timestamp ON vessel_latest_positions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_latest_pos_bbox ON vessel_latest_positions(latitude, longitude, mmsi);

-- Function to upsert latest position
CREATE OR REPLACE FUNCTION upsert_latest_position(
  p_mmsi VARCHAR(20),
  p_timestamp TIMESTAMP,
  p_latitude DECIMAL(9,6),
  p_longitude DECIMAL(10,6),
  p_sog DECIMAL(4,1),
  p_cog DECIMAL(5,1),
  p_true_heading INTEGER,
  p_navigational_status INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO vessel_latest_positions (
    mmsi, timestamp, latitude, longitude, sog, cog, true_heading, navigational_status
  ) VALUES (
    p_mmsi, p_timestamp, p_latitude, p_longitude, p_sog, p_cog, p_true_heading, p_navigational_status
  )
  ON CONFLICT (mmsi) DO UPDATE SET
    timestamp = EXCLUDED.timestamp,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    sog = EXCLUDED.sog,
    cog = EXCLUDED.cog,
    true_heading = EXCLUDED.true_heading,
    navigational_status = EXCLUDED.navigational_status
  WHERE EXCLUDED.timestamp > vessel_latest_positions.timestamp;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically update latest position
CREATE OR REPLACE FUNCTION update_latest_position_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM upsert_latest_position(
    NEW.mmsi,
    NEW.timestamp,
    NEW.latitude,
    NEW.longitude,
    NEW.sog,
    NEW.cog,
    NEW.true_heading,
    NEW.navigational_status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to ensure clean state)
DROP TRIGGER IF EXISTS trg_update_latest_position ON position_reports;
CREATE TRIGGER trg_update_latest_position
  AFTER INSERT ON position_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_latest_position_trigger();

-- Populate with existing data (one-time migration)
INSERT INTO vessel_latest_positions (mmsi, timestamp, latitude, longitude, sog, cog, true_heading, navigational_status)
SELECT DISTINCT ON (mmsi)
  mmsi, timestamp, latitude, longitude, sog, cog, true_heading, navigational_status
FROM position_reports
ORDER BY mmsi, timestamp DESC
ON CONFLICT (mmsi) DO UPDATE SET
  timestamp = EXCLUDED.timestamp,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  sog = EXCLUDED.sog,
  cog = EXCLUDED.cog,
  true_heading = EXCLUDED.true_heading,
  navigational_status = EXCLUDED.navigational_status
WHERE EXCLUDED.timestamp > vessel_latest_positions.timestamp;

-- Update the view to use the optimized table
CREATE OR REPLACE VIEW latest_vessel_positions AS
SELECT 
  v.mmsi,
  v.name,
  v.vessel_type,
  v.call_sign,
  lp.timestamp,
  lp.latitude,
  lp.longitude,
  lp.sog,
  lp.cog,
  lp.true_heading,
  lp.navigational_status
FROM vessels v
LEFT JOIN vessel_latest_positions lp ON v.mmsi = lp.mmsi;

-- Grant permissions
GRANT ALL PRIVILEGES ON vessel_latest_positions TO ais_user;
GRANT EXECUTE ON FUNCTION upsert_latest_position TO ais_user;

-- Analyze the new table for query optimizer
ANALYZE vessel_latest_positions;
