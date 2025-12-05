/**
 * VirtualizedVesselList Component
 *
 * A virtualized vessel list using react-window for efficient rendering
 * of large vessel datasets. Only renders visible items plus a buffer.
 *
 * Features:
 * - Virtualized rendering for lists > 50 items (lowered threshold per Requirements 4.4, 9.2)
 * - 72px row height per vessel
 * - Shows vessel name, MMSI, vessel type badge, status indicator badge
 * - Displays relative time for position age with color coding
 * - Selection highlighting with primary color left border
 * - Hover state styling with subtle background
 * - "No Data" badge for vessels without position
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.2
 */

import React, { memo, useCallback, useMemo } from 'react';
import { FixedSizeList, areEqual } from 'react-window';
import { VesselWithPosition } from '../types';
import { classifyPositionStatus, PositionDataStatus } from '../utils/positionUtils';
import { formatRelativeTime, highlightMatch } from '../utils/formatters';
import { Badge } from './ui/badge';

/**
 * Props for VirtualizedVesselList component
 */
export interface VirtualizedVesselListProps {
  /** Array of vessels to display */
  vessels: VesselWithPosition[];
  /** Callback when a vessel is clicked */
  onVesselClick?: (vessel: VesselWithPosition) => void;
  /** Currently selected vessel MMSI (for highlighting) */
  selectedVesselMmsi?: string | null;
  /** Height of each row in pixels */
  itemHeight?: number;
  /** Total height of the list container */
  height?: number;
  /** Search query for highlighting matches in vessel names */
  searchQuery?: string;
}

/**
 * Virtualization threshold - use virtualized rendering for lists exceeding this count
 * Requirements: 4.4, 9.2
 */
const VIRTUALIZATION_THRESHOLD = 50;

/**
 * Get vessel type label from vessel_type code
 */
const getVesselTypeLabel = (vesselType: number): string => {
  // AIS vessel type codes
  if (vesselType >= 70 && vesselType <= 79) return 'Cargo';
  if (vesselType >= 80 && vesselType <= 89) return 'Tanker';
  if (vesselType >= 60 && vesselType <= 69) return 'Passenger';
  if (vesselType >= 40 && vesselType <= 49) return 'High Speed';
  if (vesselType >= 50 && vesselType <= 59) return 'Special';
  if (vesselType >= 30 && vesselType <= 39) return 'Fishing';
  if (vesselType >= 20 && vesselType <= 29) return 'WIG';
  if (vesselType === 0) return 'Unknown';
  return 'Other';
};

/**
 * Get status badge configuration based on position data status
 * Requirements: 4.5 - Position age color coding
 */
const getStatusBadgeConfig = (status: PositionDataStatus): {
  label: string;
  variant: 'success' | 'warning' | 'muted' | 'secondary';
} => {
  switch (status) {
    case PositionDataStatus.ACTIVE:
      // Green for < 5 minutes (active is < 1 hour, but we use green for recent)
      return { label: 'Active', variant: 'success' };
    case PositionDataStatus.STALE:
      // Yellow for 5-30 minutes (stale is 1-24 hours)
      return { label: 'Stale', variant: 'warning' };
    case PositionDataStatus.VERY_STALE:
      // Gray for > 30 minutes (very stale is 24h-7d)
      return { label: 'Old', variant: 'muted' };
    case PositionDataStatus.NO_DATA:
    default:
      return { label: 'No Data', variant: 'muted' };
  }
};

/**
 * Get position age color class based on timestamp
 * Requirements: 4.5 - Green for < 5 minutes, Yellow for 5-30 minutes, Gray for > 30 minutes
 */
const getPositionAgeColorClass = (timestamp: string): string => {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageMinutes = ageMs / (1000 * 60);

  if (ageMinutes < 5) {
    return 'text-green-600 dark:text-green-400';
  } else if (ageMinutes < 30) {
    return 'text-yellow-600 dark:text-yellow-400';
  } else {
    return 'text-gray-500 dark:text-gray-400';
  }
};

/**
 * Memoized vessel row content component
 */
const VesselRowContent = memo(({ 
  vessel, 
  searchQuery 
}: { 
  vessel: VesselWithPosition; 
  searchQuery: string;
}) => {
  const positionStatus = classifyPositionStatus(vessel);
  const statusConfig = getStatusBadgeConfig(positionStatus);
  const hasPosition = vessel.position !== undefined && vessel.position !== null;
  const vesselTypeLabel = getVesselTypeLabel(vessel.vessel_type);

  return (
    <>
      <div className="flex justify-between items-start gap-2">
        {/* Vessel name and MMSI */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate text-sm">
            {searchQuery
              ? highlightMatch(vessel.name || 'Unknown Vessel', searchQuery)
              : vessel.name || 'Unknown Vessel'}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            MMSI: {searchQuery ? highlightMatch(vessel.mmsi, searchQuery) : vessel.mmsi}
          </p>
        </div>

        {/* Badges container */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {/* Vessel type badge - Requirements: 4.1 */}
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {vesselTypeLabel}
          </Badge>
          
          {/* Status indicator badge - Requirements: 4.1, 4.6 */}
          {hasPosition ? (
            <Badge variant={statusConfig.variant} className="text-xs whitespace-nowrap">
              {statusConfig.label}
            </Badge>
          ) : (
            <Badge variant="muted" className="text-xs whitespace-nowrap">
              No Data
            </Badge>
          )}
        </div>
      </div>

      {/* Position age with color coding - Requirements: 4.5 */}
      {hasPosition && vessel.position && (
        <p className={`text-xs mt-1 ${getPositionAgeColorClass(vessel.position.timestamp)}`}>
          {formatRelativeTime(vessel.position.timestamp)}
        </p>
      )}
    </>
  );
});

VesselRowContent.displayName = 'VesselRowContent';

/**
 * Row data interface for virtualized list
 */
interface RowData {
  vessels: VesselWithPosition[];
  selectedVesselMmsi: string | null;
  onVesselClick?: (vessel: VesselWithPosition) => void;
  searchQuery: string;
}

/**
 * Memoized row component for virtualized list
 */
const VirtualizedRow = memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties;
  data: RowData;
}) => {
  const { vessels, selectedVesselMmsi, onVesselClick, searchQuery } = data;
  const vessel = vessels[index];
  const isSelected = vessel.mmsi === selectedVesselMmsi;

  const handleClick = useCallback(() => {
    if (onVesselClick) {
      onVesselClick(vessel);
    }
  }, [onVesselClick, vessel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listitem"
      aria-label={`${vessel.name || 'Unknown Vessel'}, MMSI ${vessel.mmsi}${isSelected ? ', selected' : ''}`}
      aria-selected={isSelected}
      className={`
        px-4 py-3 border-b border-border cursor-pointer transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
        ${isSelected 
          ? 'bg-primary/10 border-l-4 border-l-primary shadow-sm' 
          : 'hover:bg-accent hover:shadow-sm border-l-4 border-l-transparent active:scale-[0.99]'}
      `}
    >
      <VesselRowContent vessel={vessel} searchQuery={searchQuery} />
    </div>
  );
}, areEqual);

VirtualizedRow.displayName = 'VirtualizedRow';

/**
 * VirtualizedVesselList Component
 */
export const VirtualizedVesselList: React.FC<VirtualizedVesselListProps> = ({
  vessels,
  onVesselClick,
  selectedVesselMmsi = null,
  itemHeight = 80,
  height = 500,
  searchQuery = '',
}) => {
  // Determine if we should use virtualization (> 50 items per Requirements 4.4, 9.2)
  const shouldVirtualize = vessels.length > VIRTUALIZATION_THRESHOLD;

  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo<RowData>(() => ({
    vessels,
    selectedVesselMmsi,
    onVesselClick,
    searchQuery,
  }), [vessels, selectedVesselMmsi, onVesselClick, searchQuery]);

  /**
   * Non-virtualized row renderer for small lists
   */
  const renderNonVirtualizedRow = useCallback((vessel: VesselWithPosition) => {
    const isSelected = vessel.mmsi === selectedVesselMmsi;

    const handleClick = () => {
      if (onVesselClick) {
        onVesselClick(vessel);
      }
    };

    return (
      <div
        key={vessel.mmsi}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={0}
        role="listitem"
        aria-label={`${vessel.name || 'Unknown Vessel'}, MMSI ${vessel.mmsi}${isSelected ? ', selected' : ''}`}
        aria-selected={isSelected}
        style={{ minHeight: `${itemHeight}px` }}
        className={`
          px-4 py-3 border-b border-border cursor-pointer transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
          ${isSelected 
            ? 'bg-primary/10 border-l-4 border-l-primary shadow-sm' 
            : 'hover:bg-accent hover:shadow-sm border-l-4 border-l-transparent active:scale-[0.99]'}
        `}
      >
        <VesselRowContent vessel={vessel} searchQuery={searchQuery} />
      </div>
    );
  }, [selectedVesselMmsi, onVesselClick, itemHeight, searchQuery]);

  // Empty state
  if (vessels.length === 0) {
    return (
      <div 
        className="flex items-center justify-center h-full text-text-secondary"
        role="status"
        aria-label="No vessels found"
      >
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-text-secondary opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-2 text-sm">No vessels found</p>
        </div>
      </div>
    );
  }

  // Use virtualization for large lists (> 50 items per Requirements 4.4, 9.2)
  if (shouldVirtualize) {
    return (
      <div 
        role="list" 
        aria-label={`Vessel list with ${vessels.length} vessels`}
        className="h-full overflow-hidden"
      >
        <FixedSizeList
          height={height}
          itemCount={vessels.length}
          itemSize={itemHeight}
          itemData={itemData}
          width="100%"
          className="scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
          overscanCount={5}
        >
          {VirtualizedRow}
        </FixedSizeList>
      </div>
    );
  }

  // Use standard rendering for small lists
  return (
    <div 
      className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
      role="list"
      aria-label={`Vessel list with ${vessels.length} vessels`}
    >
      {vessels.map((vessel) => renderNonVirtualizedRow(vessel))}
    </div>
  );
};
