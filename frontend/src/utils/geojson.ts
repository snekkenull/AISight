/**
 * GeoJSON Utility Functions
 *
 * This module provides utilities for converting vessel data to GeoJSON format
 * and validating GeoJSON structures according to RFC 7946.
 *
 * Requirements: 1.4, 5.2
 */

import type {
  VesselPosition,
  VesselWithPosition,
  VesselPositionFeature,
  VesselTrackFeature,
  GeoJSONPoint,
  GeoJSONLineString,
} from '../types';

/**
 * Converts a vessel position to a GeoJSON Point Feature
 *
 * @param position - The vessel position data
 * @param vessel - Optional vessel metadata for additional properties
 * @returns A GeoJSON Feature with Point geometry
 *
 * @example
 * const feature = vesselPositionToGeoJSON(position, vessel);
 * // Returns: { type: 'Feature', geometry: { type: 'Point', coordinates: [...] }, properties: {...} }
 */
export function vesselPositionToGeoJSON(
  position: VesselPosition,
  vessel?: VesselWithPosition
): VesselPositionFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [position.longitude, position.latitude], // GeoJSON uses [lon, lat]
    },
    properties: {
      mmsi: position.mmsi,
      name: vessel?.name,
      sog: position.sog,
      cog: position.cog,
      heading: position.true_heading,
      timestamp: position.timestamp,
      vesselType: vessel?.vessel_type || 0,
    },
  };
}

/**
 * Converts an array of vessel positions to a GeoJSON LineString Feature (track)
 *
 * @param positions - Array of vessel positions ordered by time
 * @param mmsi - The MMSI of the vessel
 * @returns A GeoJSON Feature with LineString geometry
 *
 * @example
 * const track = vesselTrackToGeoJSON(positions, '367719770');
 * // Returns: { type: 'Feature', geometry: { type: 'LineString', coordinates: [...] }, properties: {...} }
 */
export function vesselTrackToGeoJSON(
  positions: VesselPosition[],
  mmsi: string
): VesselTrackFeature {
  // Sort positions by timestamp to ensure correct order
  const sortedPositions = [...positions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const coordinates: [number, number][] = sortedPositions.map((pos) => [
    pos.longitude,
    pos.latitude,
  ]);

  const startTime =
    sortedPositions.length > 0 ? sortedPositions[0].timestamp : new Date().toISOString();
  const endTime =
    sortedPositions.length > 0
      ? sortedPositions[sortedPositions.length - 1].timestamp
      : new Date().toISOString();

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {
      mmsi,
      startTime,
      endTime,
    },
  };
}

/**
 * Validates if a value is a valid GeoJSON Point geometry
 *
 * @param geometry - The geometry object to validate
 * @returns True if the geometry is a valid GeoJSON Point
 */
export function isValidGeoJSONPoint(geometry: unknown): geometry is GeoJSONPoint {
  if (!geometry || typeof geometry !== 'object') {
    return false;
  }

  const geo = geometry as Partial<GeoJSONPoint>;

  // Check type
  if (geo.type !== 'Point') {
    return false;
  }

  // Check coordinates
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length !== 2) {
    return false;
  }

  const [lon, lat] = geo.coordinates;

  // Validate longitude and latitude ranges
  if (typeof lon !== 'number' || typeof lat !== 'number') {
    return false;
  }

  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    return false;
  }

  return true;
}

/**
 * Validates if a value is a valid GeoJSON LineString geometry
 *
 * @param geometry - The geometry object to validate
 * @returns True if the geometry is a valid GeoJSON LineString
 */
export function isValidGeoJSONLineString(geometry: unknown): geometry is GeoJSONLineString {
  if (!geometry || typeof geometry !== 'object') {
    return false;
  }

  const geo = geometry as Partial<GeoJSONLineString>;

  // Check type
  if (geo.type !== 'LineString') {
    return false;
  }

  // Check coordinates
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length < 2) {
    return false;
  }

  // Validate each coordinate pair
  for (const coord of geo.coordinates) {
    if (!Array.isArray(coord) || coord.length !== 2) {
      return false;
    }

    const [lon, lat] = coord;

    if (typeof lon !== 'number' || typeof lat !== 'number') {
      return false;
    }

    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if a value is a valid VesselPositionFeature
 *
 * @param feature - The feature object to validate
 * @returns True if the feature is a valid VesselPositionFeature
 */
export function isValidVesselPositionFeature(
  feature: unknown
): feature is VesselPositionFeature {
  if (!feature || typeof feature !== 'object') {
    return false;
  }

  const feat = feature as Partial<VesselPositionFeature>;

  // Check type
  if (feat.type !== 'Feature') {
    return false;
  }

  // Check geometry
  if (!isValidGeoJSONPoint(feat.geometry)) {
    return false;
  }

  // Check properties
  if (!feat.properties || typeof feat.properties !== 'object') {
    return false;
  }

  const props = feat.properties;

  // Validate required properties
  if (
    typeof props.mmsi !== 'string' ||
    typeof props.sog !== 'number' ||
    typeof props.cog !== 'number' ||
    typeof props.timestamp !== 'string' ||
    typeof props.vesselType !== 'number'
  ) {
    return false;
  }

  return true;
}

/**
 * Validates if a value is a valid VesselTrackFeature
 *
 * @param feature - The feature object to validate
 * @returns True if the feature is a valid VesselTrackFeature
 */
export function isValidVesselTrackFeature(feature: unknown): feature is VesselTrackFeature {
  if (!feature || typeof feature !== 'object') {
    return false;
  }

  const feat = feature as Partial<VesselTrackFeature>;

  // Check type
  if (feat.type !== 'Feature') {
    return false;
  }

  // Check geometry
  if (!isValidGeoJSONLineString(feat.geometry)) {
    return false;
  }

  // Check properties
  if (!feat.properties || typeof feat.properties !== 'object') {
    return false;
  }

  const props = feat.properties;

  // Validate required properties
  if (
    typeof props.mmsi !== 'string' ||
    typeof props.startTime !== 'string' ||
    typeof props.endTime !== 'string'
  ) {
    return false;
  }

  return true;
}
