/**
 * Filter Utilities - Pure functions for vessel filtering
 *
 * Provides testable pure functions for filtering vessels by various criteria.
 * All functions are side-effect free and can be easily tested.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import type { VesselWithPosition, BoundingBox } from '../types';

/**
 * Filter criteria interface
 */
export interface FilterCriteria {
  searchText?: string;
  boundingBox?: BoundingBox | null;
}

/**
 * Filter vessels by search text (name or MMSI)
 * 
 * @param vessels - Array of vessels to filter
 * @param searchText - Text to search for in vessel name or MMSI
 * @returns Filtered array of vessels matching the search text
 * 
 * Requirements: 2.1
 */
export function filterBySearchText(
  vessels: VesselWithPosition[],
  searchText: string
): VesselWithPosition[] {
  if (!searchText || searchText.trim() === '') {
    return vessels;
  }

  const searchLower = searchText.toLowerCase().trim();
  
  return vessels.filter((vessel) => {
    const nameMatch = vessel.name?.toLowerCase().includes(searchLower) ?? false;
    const mmsiMatch = vessel.mmsi.toLowerCase().includes(searchLower);
    return nameMatch || mmsiMatch;
  });
}

/**
 * Filter vessels by vessel type
 * 
 * @param vessels - Array of vessels to filter
 * @param vesselType - Vessel type code to filter by (null means no filter)
 * @returns Filtered array of vessels matching the vessel type
 * 
 * Requirements: 2.2
 */
export function filterByVesselType(
  vessels: VesselWithPosition[],
  vesselType: number | null
): VesselWithPosition[] {
  if (vesselType === null || vesselType === undefined) {
    return vessels;
  }

  return vessels.filter((vessel) => vessel.vessel_type === vesselType);
}

/**
 * Filter vessels by bounding box
 * 
 * @param vessels - Array of vessels to filter
 * @param boundingBox - Geographic bounding box (null means no filter)
 * @returns Filtered array of vessels within the bounding box
 * 
 * Requirements: 2.3
 */
export function filterByBoundingBox(
  vessels: VesselWithPosition[],
  boundingBox: BoundingBox | null
): VesselWithPosition[] {
  if (!boundingBox) {
    return vessels;
  }

  return vessels.filter((vessel) => {
    // Vessel must have a position to be filtered by bounding box
    if (!vessel.position) {
      return false;
    }

    const { latitude, longitude } = vessel.position;
    
    return (
      latitude >= boundingBox.minLat &&
      latitude <= boundingBox.maxLat &&
      longitude >= boundingBox.minLon &&
      longitude <= boundingBox.maxLon
    );
  });
}

/**
 * Filter vessels by multiple criteria using AND logic
 * 
 * Applies all provided filter criteria in sequence. A vessel must match
 * ALL criteria to be included in the result.
 * 
 * @param vessels - Array of vessels to filter
 * @param criteria - Filter criteria object
 * @returns Filtered array of vessels matching all criteria
 * 
 * Requirements: 2.1, 2.3, 2.4
 */
export function filterVessels(
  vessels: VesselWithPosition[],
  criteria: FilterCriteria
): VesselWithPosition[] {
  let filtered = vessels;

  // Apply search text filter
  if (criteria.searchText) {
    filtered = filterBySearchText(filtered, criteria.searchText);
  }

  // Apply bounding box filter
  if (criteria.boundingBox) {
    filtered = filterByBoundingBox(filtered, criteria.boundingBox);
  }

  return filtered;
}
