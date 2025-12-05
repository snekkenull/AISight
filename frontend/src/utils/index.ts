/**
 * Utility Functions
 *
 * This file contains shared utility functions for the Smart AIS MVP frontend.
 */

// Export GeoJSON utilities
export {
  vesselPositionToGeoJSON,
  vesselTrackToGeoJSON,
  isValidGeoJSONPoint,
  isValidGeoJSONLineString,
  isValidVesselPositionFeature,
  isValidVesselTrackFeature,
} from './geojson';

// Export filter utilities
export {
  filterBySearchText,
  filterByBoundingBox,
  filterVessels,
  type FilterCriteria,
} from './filterUtils';

// Export position utilities
export {
  PositionDataStatus,
  getPositionAge,
  classifyPositionStatus,
  getVesselPositionStatus,
  formatPositionAge,
  getVesselPosition,
  hasValidPosition,
  hasRecentPosition,
  filterVesselsWithPosition,
  sortByPositionRecency,
  type VesselPositionStatus,
} from './positionUtils';

// Export formatter utilities
export { formatRelativeTime, highlightMatch, formatSpeed, formatCourse } from './formatters';

// Export navigation utilities
export {
  NavigationalStatus,
  getNavStatusInfo,
  decodeRateOfTurn,
  getRotIndicator,
  classifyVesselBehavior,
  getFleetStatusSummary,
  type NavStatusInfo,
  type RateOfTurnInfo,
  type VesselBehavior,
  type VesselBehaviorInfo,
  type FleetStatusSummary,
} from './navigationUtils';
