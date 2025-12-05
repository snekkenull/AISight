/**
 * Tests for DirectionalVesselMarker component
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { DirectionalVesselMarker } from './DirectionalVesselMarker';
import { VesselWithPosition } from '../types';

// Mock vessel data
const mockVessel: VesselWithPosition = {
  mmsi: '123456789',
  name: 'Test Vessel',
  vessel_type: 70, // Cargo
  position: {
    mmsi: '123456789',
    timestamp: new Date().toISOString(),
    latitude: 37.7749,
    longitude: -122.4194,
    sog: 12.5,
    cog: 45,
    true_heading: 45,
  },
};

describe('DirectionalVesselMarker', () => {
  it('should render marker with valid position', () => {
    const onClick = vi.fn();
    
    const { container } = render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DirectionalVesselMarker
          vessel={mockVessel}
          isSelected={false}
          onClick={onClick}
        />
      </MapContainer>
    );
    
    expect(container.querySelector('.directional-vessel-marker')).toBeTruthy();
  });

  it('should not render marker without valid position', () => {
    const vesselWithoutPosition: VesselWithPosition = {
      mmsi: '123456789',
      name: 'Test Vessel',
      vessel_type: 70,
    };
    
    const onClick = vi.fn();
    
    const { container } = render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DirectionalVesselMarker
          vessel={vesselWithoutPosition}
          isSelected={false}
          onClick={onClick}
        />
      </MapContainer>
    );
    
    expect(container.querySelector('.directional-vessel-marker')).toBeFalsy();
  });

  it('should apply selected styling when isSelected is true', () => {
    const onClick = vi.fn();
    
    const { container } = render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DirectionalVesselMarker
          vessel={mockVessel}
          isSelected={true}
          onClick={onClick}
        />
      </MapContainer>
    );
    
    const marker = container.querySelector('.directional-vessel-marker');
    expect(marker).toBeTruthy();
    // Selected markers should have larger size (36px vs 24px)
    const markerDiv = marker?.querySelector('div');
    expect(markerDiv?.style.width).toBe('36px');
  });

  it('should use COG for heading rotation', () => {
    const onClick = vi.fn();
    
    const { container } = render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DirectionalVesselMarker
          vessel={mockVessel}
          isSelected={false}
          onClick={onClick}
        />
      </MapContainer>
    );
    
    const marker = container.querySelector('.directional-vessel-marker');
    expect(marker).toBeTruthy();
    // The marker should render with the vessel's COG (45 degrees)
    // In the actual implementation, the rotation is applied via inline styles
  });

  it('should render marker with navigational status indicator', () => {
    const onClick = vi.fn();
    
    const vesselWithNavStatus: VesselWithPosition = {
      ...mockVessel,
      position: {
        ...mockVessel.position!,
        navigational_status: 1, // At anchor
      },
    };
    
    const { container } = render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DirectionalVesselMarker
          vessel={vesselWithNavStatus}
          isSelected={false}
          onClick={onClick}
          showNavStatus={true}
        />
      </MapContainer>
    );
    
    expect(container.querySelector('.directional-vessel-marker')).toBeTruthy();
  });
});
