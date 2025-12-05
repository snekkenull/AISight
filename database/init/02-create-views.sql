-- Create view for latest vessel positions
CREATE OR REPLACE VIEW latest_vessel_positions AS
SELECT DISTINCT ON (p.mmsi)
  v.mmsi,
  v.name,
  v.vessel_type,
  v.call_sign,
  p.timestamp,
  p.latitude,
  p.longitude,
  p.sog,
  p.cog,
  p.true_heading,
  p.navigational_status
FROM vessels v
LEFT JOIN position_reports p ON v.mmsi = p.mmsi
ORDER BY p.mmsi, p.timestamp DESC;

-- Create view for active vessels (updated in last hour)
CREATE OR REPLACE VIEW active_vessels AS
SELECT *
FROM latest_vessel_positions
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Grant permissions on views
GRANT SELECT ON latest_vessel_positions TO ais_user;
GRANT SELECT ON active_vessels TO ais_user;
