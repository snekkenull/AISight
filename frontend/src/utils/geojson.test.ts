/**
 * GeoJSON Utility Tests
 *
 * Unit tests for GeoJSON conversion and validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  vesselPositionToGeoJSON,
  vesselTrackToGeoJSON,
  isValidGeoJSONPoint,
  isValidGeoJSONLineString,
  isValidVesselPositionFeature,
  isValidVesselTrackFeature,
} from './geojson';
import type { VesselPosition, VesselWithPosition } from '../types';

describe('vesselPositionToGeoJSON', () => {
  it('should convert vessel position to GeoJSON Point Feature', () => {
    const position: VesselPosition = {
      mmsi: '367719770',
      timestamp: '2025-12-01T10:30:00Z',
      latitude: 37.7749,
      longitude: -122.4194,
      sog: 12.5,
      cog: 285.0,
      true_heading: 290,
      navigational_status: 0,
    };

    const vessel: VesselWithPosition = {
      mmsi: '367719770',
      name: 'OCEAN EXPLORER',
      vessel_type: 70,
      call_sign: 'WDD1234',
    };

    const feature = vesselPositionToGeoJSON(position, vessel);

    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    expect(feature.geometry.coordinates).toEqual([-122.4194, 37.7749]); // [lon, lat]
    expect(feature.properties.mmsi).toBe('367719770');
    expect(feature.properties.name).toBe('OCEAN EXPLORER');
    expect(feature.properties.sog).toBe(12.5);
    expect(feature.properties.cog).toBe(285.0);
    expect(feature.properties.heading).toBe(290);
    expect(feature.properties.timestamp).toBe('2025-12-01T10:30:00Z');
    expect(feature.properties.vesselType).toBe(70);
  });

  it('should handle position without vessel metadata', () => {
    const position: VesselPosition = {
      mmsi: '123456789',
      timestamp: '2025-12-01T11:00:00Z',
      latitude: 40.7128,
      longitude: -74.006,
      sog: 8.0,
      cog: 180.0,
    };

    const feature = vesselPositionToGeoJSON(position);

    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    expect(feature.geometry.coordinates).toEqual([-74.006, 40.7128]);
    expect(feature.properties.mmsi).toBe('123456789');
    expect(feature.properties.name).toBeUndefined();
    expect(feature.properties.vesselType).toBe(0);
  });

  it('should handle position with missing optional fields', () => {
    const position: VesselPosition = {
      mmsi: '987654321',
      timestamp: '2025-12-01T12:00:00Z',
      latitude: 51.5074,
      longitude: -0.1278,
      sog: 0.0,
      cog: 0.0,
    };

    const feature = vesselPositionToGeoJSON(position);

    expect(feature.properties.heading).toBeUndefined();
    expect(feature.properties.sog).toBe(0.0);
  });
});

describe('vesselTrackToGeoJSON', () => {
  it('should convert vessel positions to GeoJSON LineString Feature', () => {
    const positions: VesselPosition[] = [
      {
        mmsi: '367719770',
        timestamp: '2025-12-01T10:00:00Z',
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
      },
      {
        mmsi: '367719770',
        timestamp: '2025-12-01T10:15:00Z',
        latitude: 37.7755,
        longitude: -122.418,
        sog: 12.3,
        cog: 285.0,
      },
      {
        mmsi: '367719770',
        timestamp: '2025-12-01T10:30:00Z',
        latitude: 37.7762,
        longitude: -122.4165,
        sog: 12.7,
        cog: 285.0,
      },
    ];

    const track = vesselTrackToGeoJSON(positions, '367719770');

    expect(track.type).toBe('Feature');
    expect(track.geometry.type).toBe('LineString');
    expect(track.geometry.coordinates).toHaveLength(3);
    expect(track.geometry.coordinates[0]).toEqual([-122.4194, 37.7749]);
    expect(track.geometry.coordinates[1]).toEqual([-122.418, 37.7755]);
    expect(track.geometry.coordinates[2]).toEqual([-122.4165, 37.7762]);
    expect(track.properties.mmsi).toBe('367719770');
    expect(track.properties.startTime).toBe('2025-12-01T10:00:00Z');
    expect(track.properties.endTime).toBe('2025-12-01T10:30:00Z');
  });

  it('should sort positions by timestamp', () => {
    const positions: VesselPosition[] = [
      {
        mmsi: '123456789',
        timestamp: '2025-12-01T10:30:00Z',
        latitude: 37.7762,
        longitude: -122.4165,
        sog: 12.7,
        cog: 285.0,
      },
      {
        mmsi: '123456789',
        timestamp: '2025-12-01T10:00:00Z',
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
      },
      {
        mmsi: '123456789',
        timestamp: '2025-12-01T10:15:00Z',
        latitude: 37.7755,
        longitude: -122.418,
        sog: 12.3,
        cog: 285.0,
      },
    ];

    const track = vesselTrackToGeoJSON(positions, '123456789');

    // Should be sorted by time
    expect(track.geometry.coordinates[0]).toEqual([-122.4194, 37.7749]);
    expect(track.geometry.coordinates[1]).toEqual([-122.418, 37.7755]);
    expect(track.geometry.coordinates[2]).toEqual([-122.4165, 37.7762]);
    expect(track.properties.startTime).toBe('2025-12-01T10:00:00Z');
    expect(track.properties.endTime).toBe('2025-12-01T10:30:00Z');
  });

  it('should handle empty position array', () => {
    const track = vesselTrackToGeoJSON([], '999999999');

    expect(track.type).toBe('Feature');
    expect(track.geometry.type).toBe('LineString');
    expect(track.geometry.coordinates).toHaveLength(0);
    expect(track.properties.mmsi).toBe('999999999');
  });

  it('should handle single position', () => {
    const positions: VesselPosition[] = [
      {
        mmsi: '111111111',
        timestamp: '2025-12-01T10:00:00Z',
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 12.5,
        cog: 285.0,
      },
    ];

    const track = vesselTrackToGeoJSON(positions, '111111111');

    expect(track.geometry.coordinates).toHaveLength(1);
    expect(track.properties.startTime).toBe(track.properties.endTime);
  });
});

describe('isValidGeoJSONPoint', () => {
  it('should validate correct GeoJSON Point', () => {
    const point = {
      type: 'Point' as const,
      coordinates: [-122.4194, 37.7749],
    };

    expect(isValidGeoJSONPoint(point)).toBe(true);
  });

  it('should reject invalid type', () => {
    const point = {
      type: 'LineString',
      coordinates: [-122.4194, 37.7749],
    };

    expect(isValidGeoJSONPoint(point)).toBe(false);
  });

  it('should reject missing coordinates', () => {
    const point = {
      type: 'Point' as const,
    };

    expect(isValidGeoJSONPoint(point)).toBe(false);
  });

  it('should reject invalid coordinate count', () => {
    const point = {
      type: 'Point' as const,
      coordinates: [-122.4194],
    };

    expect(isValidGeoJSONPoint(point)).toBe(false);
  });

  it('should reject out-of-range longitude', () => {
    const point = {
      type: 'Point' as const,
      coordinates: [-200, 37.7749],
    };

    expect(isValidGeoJSONPoint(point)).toBe(false);
  });

  it('should reject out-of-range latitude', () => {
    const point = {
      type: 'Point' as const,
      coordinates: [-122.4194, 100],
    };

    expect(isValidGeoJSONPoint(point)).toBe(false);
  });

  it('should reject non-numeric coordinates', () => {
    const point = {
      type: 'Point' as const,
      coordinates: ['invalid', 37.7749],
    };

    expect(isValidGeoJSONPoint(point)).toBe(false);
  });

  it('should reject null or undefined', () => {
    expect(isValidGeoJSONPoint(null)).toBe(false);
    expect(isValidGeoJSONPoint(undefined)).toBe(false);
  });
});

describe('isValidGeoJSONLineString', () => {
  it('should validate correct GeoJSON LineString', () => {
    const lineString = {
      type: 'LineString' as const,
      coordinates: [
        [-122.4194, 37.7749],
        [-122.418, 37.7755],
        [-122.4165, 37.7762],
      ],
    };

    expect(isValidGeoJSONLineString(lineString)).toBe(true);
  });

  it('should validate LineString with minimum 2 points', () => {
    const lineString = {
      type: 'LineString' as const,
      coordinates: [
        [-122.4194, 37.7749],
        [-122.418, 37.7755],
      ],
    };

    expect(isValidGeoJSONLineString(lineString)).toBe(true);
  });

  it('should reject invalid type', () => {
    const lineString = {
      type: 'Point',
      coordinates: [
        [-122.4194, 37.7749],
        [-122.418, 37.7755],
      ],
    };

    expect(isValidGeoJSONLineString(lineString)).toBe(false);
  });

  it('should reject LineString with less than 2 points', () => {
    const lineString = {
      type: 'LineString' as const,
      coordinates: [[-122.4194, 37.7749]],
    };

    expect(isValidGeoJSONLineString(lineString)).toBe(false);
  });

  it('should reject invalid coordinate in array', () => {
    const lineString = {
      type: 'LineString' as const,
      coordinates: [
        [-122.4194, 37.7749],
        [-200, 37.7755], // Invalid longitude
      ],
    };

    expect(isValidGeoJSONLineString(lineString)).toBe(false);
  });

  it('should reject coordinate with wrong length', () => {
    const lineString = {
      type: 'LineString' as const,
      coordinates: [
        [-122.4194, 37.7749],
        [-122.418], // Missing latitude
      ],
    };

    expect(isValidGeoJSONLineString(lineString)).toBe(false);
  });
});

describe('isValidVesselPositionFeature', () => {
  it('should validate correct VesselPositionFeature', () => {
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [-122.4194, 37.7749] as [number, number],
      },
      properties: {
        mmsi: '367719770',
        name: 'OCEAN EXPLORER',
        sog: 12.5,
        cog: 285.0,
        heading: 290,
        timestamp: '2025-12-01T10:30:00Z',
        vesselType: 70,
      },
    };

    expect(isValidVesselPositionFeature(feature)).toBe(true);
  });

  it('should reject feature with invalid geometry', () => {
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [-200, 37.7749], // Invalid longitude
      },
      properties: {
        mmsi: '367719770',
        sog: 12.5,
        cog: 285.0,
        timestamp: '2025-12-01T10:30:00Z',
        vesselType: 70,
      },
    };

    expect(isValidVesselPositionFeature(feature)).toBe(false);
  });

  it('should reject feature with missing required properties', () => {
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [-122.4194, 37.7749] as [number, number],
      },
      properties: {
        mmsi: '367719770',
        // Missing sog, cog, timestamp, vesselType
      },
    };

    expect(isValidVesselPositionFeature(feature)).toBe(false);
  });

  it('should reject feature with wrong property types', () => {
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [-122.4194, 37.7749] as [number, number],
      },
      properties: {
        mmsi: 367719770, // Should be string
        sog: 12.5,
        cog: 285.0,
        timestamp: '2025-12-01T10:30:00Z',
        vesselType: 70,
      },
    };

    expect(isValidVesselPositionFeature(feature)).toBe(false);
  });
});

describe('isValidVesselTrackFeature', () => {
  it('should validate correct VesselTrackFeature', () => {
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-122.4194, 37.7749],
          [-122.418, 37.7755],
        ] as [number, number][],
      },
      properties: {
        mmsi: '367719770',
        startTime: '2025-12-01T10:00:00Z',
        endTime: '2025-12-01T10:30:00Z',
      },
    };

    expect(isValidVesselTrackFeature(feature)).toBe(true);
  });

  it('should reject feature with invalid geometry', () => {
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [[-122.4194, 37.7749]], // Less than 2 points
      },
      properties: {
        mmsi: '367719770',
        startTime: '2025-12-01T10:00:00Z',
        endTime: '2025-12-01T10:30:00Z',
      },
    };

    expect(isValidVesselTrackFeature(feature)).toBe(false);
  });

  it('should reject feature with missing required properties', () => {
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-122.4194, 37.7749],
          [-122.418, 37.7755],
        ] as [number, number][],
      },
      properties: {
        mmsi: '367719770',
        // Missing startTime and endTime
      },
    };

    expect(isValidVesselTrackFeature(feature)).toBe(false);
  });
});
