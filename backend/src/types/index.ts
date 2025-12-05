// Type definitions for Smart AIS MVP

export interface VesselDimensions {
  a: number; // Distance from reference point to bow
  b: number; // Distance from reference point to stern
  c: number; // Distance from reference point to port
  d: number; // Distance from reference point to starboard
}

export interface Vessel {
  mmsi: string;
  imoNumber?: number;
  name?: string;
  callSign?: string;
  vesselType?: number;
  dimensionA?: number;
  dimensionB?: number;
  dimensionC?: number;
  dimensionD?: number;
  draught?: number;
  destination?: string;
  eta?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PositionReport {
  mmsi: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  sog?: number; // Speed Over Ground
  cog?: number; // Course Over Ground
  true_heading?: number; // True heading
  navigational_status?: number; // Navigational status
  rate_of_turn?: number;
}

export interface VesselWithPosition extends Vessel {
  position?: PositionReport;
}

export interface BoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export interface VesselQuery {
  mmsi?: string;
  name?: string;
  type?: number;
  bbox?: BoundingBox;
  speedMin?: number;
  speedMax?: number;
  limit?: number;
  offset?: number;
  hasPosition?: boolean; // Filter by position availability
  maxPositionAgeHours?: number; // Filter by position age (in hours)
}

export interface ShipStaticData {
  mmsi: string;
  name?: string;
  type?: number;
  imo?: number;
  callSign?: string;
  dimensions?: VesselDimensions;
  destination?: string;
  eta?: Date;
  draught?: number;
}
