/**
 * Position Data Utility Functions
 *
 * This file contains utility functions for handling vessel position data,
 * including age calculation, status classification, and safe position access.
 */

import { VesselWithPosition } from '../types';
import { POSITION_AGE_CONFIG } from '../config';

/**
 * Position data status classification based on age
 */
export enum PositionDataStatus {
  ACTIVE = 'active',           // < 1 hour
  STALE = 'stale',             // 1-24 hours
  VERY_STALE = 'very_stale',   // 24 hours - 7 days
  NO_DATA = 'no_data'          // > 7 days or missing
}

/**
 * Vessel position status with metadata
 */
export interface VesselPositionStatus {
  vessel: VesselWithPosition;
  status: PositionDataStatus;
  ageHours: number | null;
  lastUpdate: Date | null;
}

/**
 * Calculate the age of position data in hours
 * 
 * @param timestamp - The timestamp of the position data
 * @returns Age in hours
 */
export function getPositionAge(timestamp: Date): number {
  const now = new Date();
  const ageMs = now.getTime() - timestamp.getTime();
  return ageMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Classify position data status based on age
 * 
 * Uses configurable thresholds from POSITION_AGE_CONFIG to determine status.
 * 
 * @param vessel - The vessel with position data
 * @returns Position data status classification
 */
export function classifyPositionStatus(vessel: VesselWithPosition): PositionDataStatus {
  if (!vessel.position || !vessel.position.timestamp) {
    return PositionDataStatus.NO_DATA;
  }
  
  const ageHours = getPositionAge(new Date(vessel.position.timestamp));
  
  if (ageHours > POSITION_AGE_CONFIG.noDataThresholdHours) {
    return PositionDataStatus.NO_DATA;
  } else if (ageHours > POSITION_AGE_CONFIG.veryStaleThresholdHours) {
    return PositionDataStatus.VERY_STALE;
  } else if (ageHours > POSITION_AGE_CONFIG.staleThresholdHours) {
    return PositionDataStatus.STALE;
  } else {
    return PositionDataStatus.ACTIVE;
  }
}

/**
 * Get vessel position status with metadata
 * 
 * @param vessel - The vessel to analyze
 * @returns Complete position status information
 */
export function getVesselPositionStatus(vessel: VesselWithPosition): VesselPositionStatus {
  const status = classifyPositionStatus(vessel);
  
  let ageHours: number | null = null;
  let lastUpdate: Date | null = null;
  
  if (vessel.position?.timestamp) {
    lastUpdate = new Date(vessel.position.timestamp);
    ageHours = getPositionAge(lastUpdate);
  }
  
  return {
    vessel,
    status,
    ageHours,
    lastUpdate,
  };
}

/**
 * Format position age in human-readable format
 * 
 * @param timestamp - The timestamp of the position data
 * @returns Human-readable age string (e.g., "5m ago", "2h ago", "3d ago")
 */
export function formatPositionAge(timestamp: Date): string {
  const ageHours = getPositionAge(timestamp);
  
  if (ageHours < 1) {
    const minutes = Math.floor(ageHours * 60);
    return `${minutes}m ago`;
  } else if (ageHours < 24) {
    const hours = Math.floor(ageHours);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(ageHours / 24);
    return `${days}d ago`;
  }
}

/**
 * Safely get vessel position coordinates
 * 
 * @param vessel - The vessel to get position from
 * @returns Position coordinates or null if unavailable
 */
export function getVesselPosition(vessel: VesselWithPosition): { lat: number; lon: number } | null {
  if (!vessel.position || 
      vessel.position.latitude === undefined || 
      vessel.position.longitude === undefined) {
    return null;
  }
  
  return {
    lat: vessel.position.latitude,
    lon: vessel.position.longitude,
  };
}

/**
 * Check if vessel has valid position data
 * 
 * @param vessel - The vessel to check
 * @returns True if vessel has valid position coordinates
 */
export function hasValidPosition(vessel: VesselWithPosition): boolean {
  return getVesselPosition(vessel) !== null;
}

/**
 * Check if vessel has recent position data (< 1 hour)
 * 
 * @param vessel - The vessel to check
 * @returns True if vessel has recent position data
 */
export function hasRecentPosition(vessel: VesselWithPosition): boolean {
  const status = classifyPositionStatus(vessel);
  return status === PositionDataStatus.ACTIVE;
}

/**
 * Filter vessels that have valid position data
 * 
 * @param vessels - Array of vessels to filter
 * @returns Array of vessels with valid positions
 */
export function filterVesselsWithPosition(vessels: VesselWithPosition[]): VesselWithPosition[] {
  return vessels.filter(hasValidPosition);
}

/**
 * Sort vessels by position data recency
 * Vessels with most recent positions first, vessels without positions last
 * 
 * @param vessels - Array of vessels to sort
 * @returns Sorted array of vessels
 */
export function sortByPositionRecency(vessels: VesselWithPosition[]): VesselWithPosition[] {
  return [...vessels].sort((a, b) => {
    const aHasPosition = hasValidPosition(a);
    const bHasPosition = hasValidPosition(b);
    
    // Vessels without positions go to the end
    if (!aHasPosition && !bHasPosition) return 0;
    if (!aHasPosition) return 1;
    if (!bHasPosition) return -1;
    
    // Both have positions, sort by timestamp (most recent first)
    const aTimestamp = new Date(a.position!.timestamp).getTime();
    const bTimestamp = new Date(b.position!.timestamp).getTime();
    
    return bTimestamp - aTimestamp;
  });
}
