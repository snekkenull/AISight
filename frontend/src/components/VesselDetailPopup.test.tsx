/**
 * VesselDetailPopup Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { VesselDetailPopup } from './VesselDetailPopup';
import { VesselWithPosition } from '../types';

describe('VesselDetailPopup', () => {
  const mockVessel: VesselWithPosition = {
    mmsi: '123456789',
    name: 'Test Vessel',
    vessel_type: 70,
    position: {
      mmsi: '123456789',
      timestamp: new Date().toISOString(),
      latitude: 37.7749,
      longitude: -122.4194,
      sog: 12.5,
      cog: 180.0,
    },
  };

  const mockCallbacks = {
    onClose: vi.fn(),
    onCenterMap: vi.fn(),
    onShowTrack: vi.fn(),
  };

  it('renders vessel details correctly', () => {
    render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <VesselDetailPopup vessel={mockVessel} {...mockCallbacks} />
      </MapContainer>
    );

    // Check that vessel name is displayed
    expect(screen.getByText('Test Vessel')).toBeDefined();
    
    // Check that MMSI is displayed
    expect(screen.getByText(/123456789/)).toBeDefined();
    
    // Check that action buttons are present
    expect(screen.getByText('Center')).toBeDefined();
    expect(screen.getByText('Track')).toBeDefined();
  });

  it('renders null when vessel is null', () => {
    const { container } = render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <VesselDetailPopup vessel={null} {...mockCallbacks} />
      </MapContainer>
    );
    // When vessel is null, the popup should not render
    expect(container.querySelector('.leaflet-popup')).toBeFalsy();
  });

  it('displays N/A for missing position data', () => {
    const vesselWithoutPosition: VesselWithPosition = {
      mmsi: '987654321',
      name: 'No Position Vessel',
      vessel_type: 0,
    };

    render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <VesselDetailPopup vessel={vesselWithoutPosition} {...mockCallbacks} />
      </MapContainer>
    );

    // Check that N/A is displayed for position fields
    const naElements = screen.getAllByText(/N\/A/);
    expect(naElements.length).toBeGreaterThan(0);
  });

  it('disables action buttons when no position data', () => {
    const vesselWithoutPosition: VesselWithPosition = {
      mmsi: '987654321',
      name: 'No Position Vessel',
      vessel_type: 0,
    };

    render(
      <MapContainer center={[37.7749, -122.4194]} zoom={10}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <VesselDetailPopup vessel={vesselWithoutPosition} {...mockCallbacks} />
      </MapContainer>
    );

    const centerButton = screen.getByText('Center').closest('button');
    const trackButton = screen.getByText('Track').closest('button');

    expect(centerButton?.disabled).toBe(true);
    expect(trackButton?.disabled).toBe(true);
  });
});
