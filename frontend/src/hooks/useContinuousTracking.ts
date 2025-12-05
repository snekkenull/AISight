/**
 * useContinuousTracking Hook
 *
 * Provides continuous real-time tracking for multiple vessels.
 * When enabled, it periodically fetches each vessel's latest position
 * and focuses the regional scheduler on the vessel's small area.
 *
 * Features:
 * - Support for tracking multiple vessels simultaneously
 * - Periodic position updates (default: 30 minutes)
 * - Focuses on a small bounding box around each vessel for efficient updates
 * - Automatic cleanup on unmount or when tracking is stopped
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePersistedState } from './usePersistedState';
import { VesselAPI } from '../services';
import type { VesselWithPosition } from '../types';

export interface TrackedVesselInfo {
  mmsi: string;
  name?: string;
  startedAt: number;
  lastUpdate?: number;
  position?: { lat: number; lon: number };
}

export interface ContinuousTrackingOptions {
  /** Update interval in milliseconds (default: 30 minutes) */
  updateInterval?: number;
  /** Callback when vessel position is updated */
  onPositionUpdate?: (vessel: VesselWithPosition) => void;
  /** Callback when tracking starts */
  onTrackingStart?: (mmsi: string) => void;
  /** Callback when tracking stops */
  onTrackingStop?: (mmsi: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface ContinuousTrackingState {
  /** MMSI of the currently active tracked vessel (for UI indication) */
  trackedVesselMmsi: string | null;
  /** List of all tracked vessels */
  trackedVessels: TrackedVesselInfo[];
  /** Whether any tracking is currently active */
  isTracking: boolean;
  /** Whether an update is in progress */
  isUpdating: boolean;
  /** Last update timestamp */
  lastUpdateTime: Date | null;
  /** Error message if any */
  error: string | null;
}

export interface ContinuousTrackingActions {
  /** Start tracking a vessel */
  startTracking: (
    mmsi: string,
    initialPosition?: { lat: number; lon: number },
    name?: string
  ) => void;
  /** Stop tracking a specific vessel */
  stopTracking: (mmsi?: string) => void;
  /** Stop tracking all vessels */
  stopAllTracking: () => void;
  /** Toggle tracking for a vessel */
  toggleTracking: (
    mmsi: string,
    initialPosition?: { lat: number; lon: number },
    name?: string
  ) => void;
  /** Check if a vessel is being tracked */
  isVesselTracked: (mmsi: string) => boolean;
  /** Force an immediate update for all tracked vessels */
  forceUpdate: () => Promise<void>;
}

// Default: 30 minutes
const DEFAULT_UPDATE_INTERVAL = 30 * 60 * 1000;

// Small bounding box size around vessel (in degrees, ~5.5km at equator)
const TRACKING_BBOX_SIZE = 0.05;

export function useContinuousTracking(
  options: ContinuousTrackingOptions = {}
): ContinuousTrackingState & ContinuousTrackingActions {
  const {
    updateInterval = DEFAULT_UPDATE_INTERVAL,
    onPositionUpdate,
    onTrackingStart,
    onTrackingStop,
    onError: _onError, // Reserved for future error handling
  } = options;

  // Persist tracked vessels across sessions
  const [trackedVessels, setTrackedVessels] = usePersistedState<TrackedVesselInfo[]>(
    'tracked-vessels-v1',
    []
  );

  const [state, setState] = useState<Omit<ContinuousTrackingState, 'trackedVessels'>>({
    trackedVesselMmsi: trackedVessels.length > 0 ? trackedVessels[0].mmsi : null,
    isTracking: trackedVessels.length > 0,
    isUpdating: false,
    lastUpdateTime: null,
    error: null,
  });

  // Refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackedVesselsRef = useRef<TrackedVesselInfo[]>(trackedVessels);

  // Keep ref in sync with state
  useEffect(() => {
    trackedVesselsRef.current = trackedVessels;
  }, [trackedVessels]);

  // Fetch vessels in a small area around the position
  const fetchVesselsInArea = useCallback(
    async (
      mmsi: string,
      position: { lat: number; lon: number }
    ): Promise<VesselWithPosition | null> => {
      try {
        // Create a small bounding box around the vessel's position
        const bbox = {
          minLat: position.lat - TRACKING_BBOX_SIZE,
          maxLat: position.lat + TRACKING_BBOX_SIZE,
          minLon: position.lon - TRACKING_BBOX_SIZE,
          maxLon: position.lon + TRACKING_BBOX_SIZE,
        };

        // Query vessels in the small area
        const vessels = await VesselAPI.queryVessels({
          bbox,
          limit: 100,
        });

        // Find our tracked vessel in the results
        const trackedVessel = vessels.find((v) => v.mmsi === mmsi);

        if (trackedVessel) {
          return trackedVessel;
        } else {
          // Vessel not found in area, try direct lookup
          return await VesselAPI.getVesselByMMSI(mmsi);
        }
      } catch (error) {
        console.error(`Failed to fetch vessel ${mmsi}:`, error);
        return null;
      }
    },
    []
  );

  // Fetch vessel by MMSI directly
  const fetchVesselDirect = useCallback(async (mmsi: string): Promise<VesselWithPosition | null> => {
    try {
      return await VesselAPI.getVesselByMMSI(mmsi);
    } catch (error) {
      console.error(`Failed to fetch vessel ${mmsi}:`, error);
      return null;
    }
  }, []);

  // Focus scheduler on vessel's small region
  const focusOnVessel = useCallback(async (position: { lat: number; lon: number }) => {
    try {
      await VesselAPI.focusSchedulerOnLocation(position.lat, position.lon);
    } catch (error) {
      console.warn('Failed to focus scheduler on vessel location:', error);
    }
  }, []);

  // Update all tracked vessels
  const updateAllTrackedVessels = useCallback(async () => {
    const vessels = trackedVesselsRef.current;
    if (vessels.length === 0) return;

    setState((prev) => ({ ...prev, isUpdating: true, error: null }));

    for (const tracked of vessels) {
      let vessel: VesselWithPosition | null = null;

      if (tracked.position) {
        await focusOnVessel(tracked.position);
        vessel = await fetchVesselsInArea(tracked.mmsi, tracked.position);
      } else {
        vessel = await fetchVesselDirect(tracked.mmsi);
      }

      if (vessel) {
        // Update tracked vessel info with new position
        setTrackedVessels((prev) =>
          prev.map((t) =>
            t.mmsi === tracked.mmsi
              ? {
                  ...t,
                  lastUpdate: Date.now(),
                  position: vessel?.position
                    ? { lat: vessel.position.latitude, lon: vessel.position.longitude }
                    : t.position,
                  name: vessel?.name || t.name,
                }
              : t
          )
        );

        onPositionUpdate?.(vessel);
      }
    }

    setState((prev) => ({
      ...prev,
      isUpdating: false,
      lastUpdateTime: new Date(),
    }));
  }, [fetchVesselsInArea, fetchVesselDirect, focusOnVessel, onPositionUpdate, setTrackedVessels]);

  // Start tracking a vessel
  const startTracking = useCallback(
    (mmsi: string, initialPosition?: { lat: number; lon: number }, name?: string) => {
      // Check if already tracking this vessel
      if (trackedVesselsRef.current.some((t) => t.mmsi === mmsi)) {
        return;
      }

      const newTracked: TrackedVesselInfo = {
        mmsi,
        name,
        startedAt: Date.now(),
        position: initialPosition,
      };

      setTrackedVessels((prev) => [...prev, newTracked]);

      setState((prev) => ({
        ...prev,
        trackedVesselMmsi: mmsi,
        isTracking: true,
      }));

      onTrackingStart?.(mmsi);

      // Focus scheduler on vessel's region if we have position
      if (initialPosition) {
        focusOnVessel(initialPosition);
      }

      // Perform initial fetch
      const doInitialFetch = async () => {
        let vessel: VesselWithPosition | null = null;

        if (initialPosition) {
          vessel = await fetchVesselsInArea(mmsi, initialPosition);
        } else {
          vessel = await fetchVesselDirect(mmsi);
        }

        if (vessel) {
          // Update tracked vessel with fetched data
          setTrackedVessels((prev) =>
            prev.map((t) =>
              t.mmsi === mmsi
                ? {
                    ...t,
                    lastUpdate: Date.now(),
                    position: vessel?.position
                      ? { lat: vessel.position.latitude, lon: vessel.position.longitude }
                      : t.position,
                    name: vessel?.name || t.name,
                  }
                : t
            )
          );

          onPositionUpdate?.(vessel);
        }
      };

      doInitialFetch();
    },
    [
      fetchVesselsInArea,
      fetchVesselDirect,
      focusOnVessel,
      onPositionUpdate,
      onTrackingStart,
      setTrackedVessels,
    ]
  );

  // Stop tracking a specific vessel
  const stopTracking = useCallback(
    (mmsi?: string) => {
      const targetMmsi = mmsi || state.trackedVesselMmsi;
      if (!targetMmsi) return;

      setTrackedVessels((prev) => prev.filter((t) => t.mmsi !== targetMmsi));

      // Update state
      const remaining = trackedVesselsRef.current.filter((t) => t.mmsi !== targetMmsi);
      setState((prev) => ({
        ...prev,
        trackedVesselMmsi: remaining.length > 0 ? remaining[0].mmsi : null,
        isTracking: remaining.length > 0,
      }));

      onTrackingStop?.(targetMmsi);
    },
    [state.trackedVesselMmsi, onTrackingStop, setTrackedVessels]
  );

  // Stop tracking all vessels
  const stopAllTracking = useCallback(() => {
    const vessels = trackedVesselsRef.current;

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTrackedVessels([]);

    setState({
      trackedVesselMmsi: null,
      isTracking: false,
      isUpdating: false,
      lastUpdateTime: null,
      error: null,
    });

    // Notify for each stopped vessel
    vessels.forEach((t) => onTrackingStop?.(t.mmsi));
  }, [onTrackingStop, setTrackedVessels]);

  // Toggle tracking for a vessel
  const toggleTracking = useCallback(
    (mmsi: string, initialPosition?: { lat: number; lon: number }, name?: string) => {
      const isCurrentlyTracked = trackedVesselsRef.current.some((t) => t.mmsi === mmsi);

      if (isCurrentlyTracked) {
        stopTracking(mmsi);
      } else {
        startTracking(mmsi, initialPosition, name);
      }
    },
    [startTracking, stopTracking]
  );

  // Check if a vessel is being tracked
  const isVesselTracked = useCallback(
    (mmsi: string) => {
      return trackedVessels.some((t) => t.mmsi === mmsi);
    },
    [trackedVessels]
  );

  // Force an immediate update
  const forceUpdate = useCallback(async () => {
    await updateAllTrackedVessels();
  }, [updateAllTrackedVessels]);

  // Set up periodic updates for all tracked vessels
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up interval if there are tracked vessels
    if (trackedVessels.length > 0) {
      intervalRef.current = setInterval(() => {
        updateAllTrackedVessels();
      }, updateInterval);
    }

    // Update state
    setState((prev) => ({
      ...prev,
      trackedVesselMmsi: trackedVessels.length > 0 ? trackedVessels[0].mmsi : null,
      isTracking: trackedVessels.length > 0,
    }));

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trackedVessels.length, updateInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    trackedVessels,
    startTracking,
    stopTracking,
    stopAllTracking,
    toggleTracking,
    isVesselTracked,
    forceUpdate,
  };
}
