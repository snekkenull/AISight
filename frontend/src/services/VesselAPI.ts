/**
 * Vessel API Service
 *
 * Handles HTTP requests to the backend vessel API
 */

import { API_CONFIG } from '../config';
import type { VesselWithPosition, VesselQuery, VesselPosition } from '../types';

/**
 * Search vessels by name or MMSI
 */
export async function searchVessels(
  query: string,
  limit: number = 100
): Promise<VesselWithPosition[]> {
  const response = await fetch(
    `${API_CONFIG.baseUrl}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Query vessels with filters
 */
export async function queryVessels(
  criteria: VesselQuery
): Promise<VesselWithPosition[]> {
  const params = new URLSearchParams();

  if (criteria.mmsi) {
    params.append('mmsi', criteria.mmsi);
  }

  if (criteria.name) {
    params.append('name', criteria.name);
  }

  if (criteria.type !== undefined) {
    params.append('type', criteria.type.toString());
  }

  if (criteria.bbox) {
    params.append('minLat', criteria.bbox.minLat.toString());
    params.append('maxLat', criteria.bbox.maxLat.toString());
    params.append('minLon', criteria.bbox.minLon.toString());
    params.append('maxLon', criteria.bbox.maxLon.toString());
  }

  if (criteria.speedMin !== undefined) {
    params.append('speedMin', criteria.speedMin.toString());
  }

  if (criteria.speedMax !== undefined) {
    params.append('speedMax', criteria.speedMax.toString());
  }

  if (criteria.limit) {
    params.append('limit', criteria.limit.toString());
  }

  if (criteria.offset) {
    params.append('offset', criteria.offset.toString());
  }

  const response = await fetch(
    `${API_CONFIG.baseUrl}/api/vessels?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.vessels || [];
}

/**
 * Get vessel by MMSI
 */
export async function getVesselByMMSI(
  mmsi: string
): Promise<VesselWithPosition | null> {
  const response = await fetch(
    `${API_CONFIG.baseUrl}/api/vessels/${mmsi}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch vessel: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Combine vessel and position data
  const vessel: VesselWithPosition = {
    ...data.vessel,
    position: data.position,
  };

  return vessel;
}

/**
 * Get vessel by IMO number
 */
export async function getVesselByIMO(
  imo: string
): Promise<VesselWithPosition | null> {
  // Clean IMO number (remove "IMO" prefix if present)
  const imoNumber = imo.replace(/^IMO\s*/i, '');
  
  const response = await fetch(
    `${API_CONFIG.baseUrl}/api/vessels/imo/${imoNumber}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch vessel: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Combine vessel and position data
  const vessel: VesselWithPosition = {
    ...data.vessel,
    position: data.position,
  };

  return vessel;
}

/**
 * Get vessel track history
 */
export async function getVesselTrack(
  mmsi: string,
  startTime?: Date,
  endTime?: Date
): Promise<VesselPosition[]> {
  const params = new URLSearchParams();

  if (startTime) {
    params.append('startTime', startTime.toISOString());
  }

  if (endTime) {
    params.append('endTime', endTime.toISOString());
  }

  const response = await fetch(
    `${API_CONFIG.baseUrl}/api/vessels/${mmsi}/track?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch vessel track: ${response.statusText}`);
  }

  const data = await response.json();
  return data.track || [];
}


/**
 * Scheduler status response
 */
export interface SchedulerStatus {
  isRunning: boolean;
  currentRegion: {
    id: string;
    name: string;
    bounds: {
      minLat: number;
      maxLat: number;
      minLon: number;
      maxLon: number;
    };
    priority: number;
  } | null;
  nextRegion: {
    id: string;
    name: string;
  } | null;
  nextRotationTime: string | null;
  cycleProgress: number;
  regionsCompleted: number;
  totalRegions: number;
  regions: Array<{
    id: string;
    name: string;
    bounds: {
      minLat: number;
      maxLat: number;
      minLon: number;
      maxLon: number;
    };
    priority: number;
  }>;
}

/**
 * Get regional scheduler status
 */
export async function getSchedulerStatus(): Promise<SchedulerStatus | null> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/scheduler/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 503) {
      return null; // Scheduler not available
    }

    if (!response.ok) {
      throw new Error(`Failed to get scheduler status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    return null;
  }
}

/**
 * Focus scheduler on a specific location
 * Used when searching for a vessel to get fresh data for that area
 */
export async function focusSchedulerOnLocation(
  latitude: number,
  longitude: number
): Promise<{ success: boolean; region?: { id: string; name: string } }> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/scheduler/focus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json();
    return { success: true, region: data.region };
  } catch (error) {
    console.error('Error focusing scheduler:', error);
    return { success: false };
  }
}

/**
 * Health status response
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected' | 'unknown';
    redis: 'connected' | 'disconnected' | 'unknown';
    aisStream: 'connected' | 'disconnected' | 'not_configured';
  };
  dataStatus: {
    totalVessels: number;
    vesselsWithPosition: number;
    vesselsWithRecentPosition: number;
    lastPositionUpdate: string | null;
    positionReportsLast24h: number;
  };
}

/**
 * Get system health status including data statistics
 */
export async function getHealthStatus(): Promise<HealthStatus | null> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching health status:', error);
    return null;
  }
}
