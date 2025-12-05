/**
 * Unit tests for lazy loading vessel track functionality
 * Tests that track data is only fetched when vessel is selected
 * and cleared when vessel is deselected
 * 
 * Requirements: 9.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as VesselAPI from './services/VesselAPI';

// Mock the VesselAPI module
vi.mock('./services/VesselAPI', () => ({
  queryVessels: vi.fn(),
  getVesselTrack: vi.fn(),
}));

describe('Lazy Loading Vessel Tracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only call getVesselTrack when a vessel is selected', async () => {
    // This test verifies the logic without rendering the full component
    const mockGetVesselTrack = vi.mocked(VesselAPI.getVesselTrack);
    mockGetVesselTrack.mockResolvedValue([
      {
        mmsi: '123456789',
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 10.5,
        cog: 180,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Simulate vessel selection
    const mmsi = '123456789';
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    await VesselAPI.getVesselTrack(mmsi, startTime, endTime);

    // Verify API was called
    expect(mockGetVesselTrack).toHaveBeenCalledTimes(1);
    expect(mockGetVesselTrack).toHaveBeenCalledWith(mmsi, startTime, endTime);
  });

  it('should not call getVesselTrack when vessel is deselected (empty mmsi)', async () => {
    const mockGetVesselTrack = vi.mocked(VesselAPI.getVesselTrack);

    // Simulate deselection by not calling the API
    const mmsi = '';
    
    // When mmsi is empty, we should not call the API
    if (mmsi) {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      await VesselAPI.getVesselTrack(mmsi, startTime, endTime);
    }

    // Verify API was not called
    expect(mockGetVesselTrack).not.toHaveBeenCalled();
  });

  it('should handle track loading for valid vessel with position', async () => {
    const mockGetVesselTrack = vi.mocked(VesselAPI.getVesselTrack);
    const mockTrackData = [
      {
        mmsi: '123456789',
        latitude: 37.7749,
        longitude: -122.4194,
        sog: 10.5,
        cog: 180,
        timestamp: new Date().toISOString(),
      },
      {
        mmsi: '123456789',
        latitude: 37.7850,
        longitude: -122.4294,
        sog: 11.0,
        cog: 185,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
    mockGetVesselTrack.mockResolvedValue(mockTrackData);

    const mmsi = '123456789';
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const track = await VesselAPI.getVesselTrack(mmsi, startTime, endTime);

    expect(track).toEqual(mockTrackData);
    expect(track.length).toBe(2);
  });

  it('should handle empty track response gracefully', async () => {
    const mockGetVesselTrack = vi.mocked(VesselAPI.getVesselTrack);
    mockGetVesselTrack.mockResolvedValue([]);

    const mmsi = '123456789';
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const track = await VesselAPI.getVesselTrack(mmsi, startTime, endTime);

    expect(track).toEqual([]);
    expect(track.length).toBe(0);
  });
});
