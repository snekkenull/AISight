-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create vessels table
CREATE TABLE IF NOT EXISTS vessels (
  mmsi VARCHAR(20) PRIMARY KEY,
  imo_number INTEGER,
  name VARCHAR(255),
  call_sign VARCHAR(50),
  vessel_type INTEGER,
  dimension_a INTEGER,
  dimension_b INTEGER,
  dimension_c INTEGER,
  dimension_d INTEGER,
  draught DECIMAL(4,1),
  destination VARCHAR(255),
  eta TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for vessels table
CREATE INDEX IF NOT EXISTS idx_vessels_name ON vessels(name);
CREATE INDEX IF NOT EXISTS idx_vessels_type ON vessels(vessel_type);
CREATE INDEX IF NOT EXISTS idx_vessels_imo ON vessels(imo_number);

-- Create position_reports table
CREATE TABLE IF NOT EXISTS position_reports (
  id BIGSERIAL,
  mmsi VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  sog DECIMAL(4,1),
  cog DECIMAL(5,1),
  true_heading INTEGER,
  navigational_status INTEGER,
  rate_of_turn INTEGER,
  PRIMARY KEY (mmsi, timestamp)
);

-- Convert position_reports to TimescaleDB hypertable
SELECT create_hypertable('position_reports', 'timestamp', if_not_exists => TRUE);

-- Create indexes for position_reports table
CREATE INDEX IF NOT EXISTS idx_position_mmsi_time ON position_reports(mmsi, timestamp DESC);

-- Create spatial indexes for geographic queries (using simple lat/lon indexes)
CREATE INDEX IF NOT EXISTS idx_position_latitude ON position_reports(latitude);
CREATE INDEX IF NOT EXISTS idx_position_longitude ON position_reports(longitude);

-- Create foreign key constraint
ALTER TABLE position_reports 
  ADD CONSTRAINT fk_position_vessel 
  FOREIGN KEY (mmsi) 
  REFERENCES vessels(mmsi) 
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for vessels table
CREATE TRIGGER update_vessels_updated_at 
  BEFORE UPDATE ON vessels 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ais_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ais_user;
