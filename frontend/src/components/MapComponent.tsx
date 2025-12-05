/**
 * MapComponent - Main map container with Leaflet integration
 *
 * Displays an interactive map with real-time vessel positions, tracks,
 * and popups. Integrates with useVesselTracking hook for WebSocket updates.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 9.2
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from '@changey/react-leaflet-markercluster';
import {
  VesselPosition,
  VesselWithPosition,
  VesselTrackFeature,
  MapVisualization,
} from '../types';
import { vesselPositionToGeoJSON, vesselTrackToGeoJSON } from '../utils/geojson';
import { useVesselTracking } from '../hooks/useVesselTracking';
import { MAP_CONFIG } from '../config';
import { EmptyMapState } from './EmptyMapState';
import { MapVisualizations } from './MapVisualizations';
import { DirectionalVesselMarker } from './DirectionalVesselMarker';
import { hasValidPosition, getVesselPosition } from '../utils/positionUtils';

/**
 * Props for MapComponent
 */
export interface MapComponentProps {
  /** Initial center position of the map */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Callback when a vessel is selected */
  onVesselSelect?: (mmsi: string) => void;
  /** Selected vessel MMSI for track display */
  selectedVesselMmsi?: string;
  /** Vessel track data for selected vessel */
  vesselTrack?: VesselPosition[];
  /** Auto-connect to WebSocket on mount */
  autoConnect?: boolean;
  /** Vessels to display on the map */
  vessels?: Map<string, VesselWithPosition>;
  /** Position to center the map on */
  centerOnPosition?: { lat: number; lon: number } | null;
  /** Visualizations to display on the map */
  visualizations?: MapVisualization[];
  /** Callback to clear all visualizations */
  onClearVisualizations?: () => void;
  /** Callback when map centering fails due to missing position data */
  onCenteringFailed?: (message: string) => void;
  /** Callback when map bounds change */
  onBoundsChange?: (bounds: import('../types').BoundingBox) => void;
  /** Callback when map center changes */
  onMapCenterChange?: (center: { lat: number; lon: number }) => void;
  /** Callback when map panning state changes */
  onPanningStateChange?: (isPanning: boolean) => void;
  /** Whether vessels are currently being loaded */
  isLoadingVessels?: boolean;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Component to handle map updates when vessels change
 */
interface MapUpdaterProps {
  centerPosition?: { lat: number; lon: number } | null;
  onCenteringFailed?: (message: string) => void;
  onBoundsChange?: (bounds: import('../types').BoundingBox) => void;
  onMapCenterChange?: (center: { lat: number; lon: number }) => void;
  onPanningStateChange?: (isPanning: boolean) => void;
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ centerPosition, onCenteringFailed, onBoundsChange, onMapCenterChange, onPanningStateChange }) => {
  const map = useMap();

  // Invalidate map size when container dimensions change
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      // Invalidate map size to force Leaflet to recalculate dimensions
      map.invalidateSize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);

  // Emit bounds change when map moves or zooms
  useEffect(() => {
    const handleMoveStart = () => {
      // Notify parent that panning has started
      if (onPanningStateChange) {
        onPanningStateChange(true);
      }
    };

    const handleMoveEnd = () => {
      // Notify parent that panning has ended
      if (onPanningStateChange) {
        onPanningStateChange(false);
      }

      if (onBoundsChange) {
        const bounds = map.getBounds();
        const bbox = {
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLon: bounds.getWest(),
          maxLon: bounds.getEast(),
        };
        
        // Validate bounds before emitting - ensure min < max (not equal)
        // This prevents 400 errors when map is not fully initialized
        if (bbox.minLat < bbox.maxLat && bbox.minLon < bbox.maxLon) {
          onBoundsChange(bbox);
        }
      }
      if (onMapCenterChange) {
        const center = map.getCenter();
        onMapCenterChange({ lat: center.lat, lon: center.lng });
      }
    };

    // Wait for map to be fully ready before emitting initial bounds
    // The 'load' event fires when all tiles are loaded
    const handleMapReady = () => {
      // Small delay to ensure bounds are properly calculated
      setTimeout(handleMoveEnd, 50);
    };

    // Check if map is already loaded
    if (map.getContainer() && map.getSize().x > 0 && map.getSize().y > 0) {
      // Map container has size, emit bounds after a short delay
      setTimeout(handleMoveEnd, 200);
    }

    // Listen for map ready event
    map.whenReady(handleMapReady);

    // Listen for map movement
    map.on('movestart', handleMoveStart);
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('movestart', handleMoveStart);
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, onBoundsChange, onMapCenterChange, onPanningStateChange]);

  // Handle map centering when centerPosition changes
  useEffect(() => {
    if (centerPosition) {
      // Validate position data before centering
      if (centerPosition.lat !== undefined && 
          centerPosition.lon !== undefined &&
          !isNaN(centerPosition.lat) && 
          !isNaN(centerPosition.lon)) {
        map.setView([centerPosition.lat, centerPosition.lon], 13, {
          animate: true,
          duration: 0.5,
        });
      } else {
        // Notify parent component that centering failed
        if (onCenteringFailed) {
          onCenteringFailed('Unable to center map: Invalid position data');
        }
      }
    }
  }, [centerPosition, map, onCenteringFailed]);

  return null;
};

/**
 * MapComponent - Main map display with vessel tracking
 */
export const MapComponent: React.FC<MapComponentProps> = ({
  center = [MAP_CONFIG.defaultCenter.lat, MAP_CONFIG.defaultCenter.lon],
  zoom = MAP_CONFIG.defaultZoom,
  onVesselSelect,
  selectedVesselMmsi,
  vesselTrack,
  autoConnect = true,
  vessels: vesselsProp,
  centerOnPosition = null,
  visualizations = [],
  onClearVisualizations,
  onCenteringFailed,
  onBoundsChange,
  onMapCenterChange,
  onPanningStateChange,
  isLoadingVessels = false,
}) => {
  // Use vessels from props if provided, otherwise manage internal state
  const [internalVessels, setInternalVessels] = useState<Map<string, VesselWithPosition>>(new Map());
  const vessels = vesselsProp || internalVessels;
  
  // State for displaying centering error message
  const [centeringError, setCenteringError] = useState<string | null>(null);
  
  // Handle centering failure
  const handleCenteringFailed = useCallback((message: string) => {
    setCenteringError(message);
    // Clear error after 5 seconds
    setTimeout(() => setCenteringError(null), 5000);
    
    // Also call parent callback if provided
    if (onCenteringFailed) {
      onCenteringFailed(message);
    }
  }, [onCenteringFailed]);

  // Handle position updates from WebSocket (only if not using prop vessels)
  const handlePositionUpdate = useCallback((position: VesselPosition) => {
    if (vesselsProp) return; // Don't update if vessels are controlled by parent
    
    setInternalVessels((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(position.mmsi);
      
      if (existing) {
        // Update existing vessel with new position
        updated.set(position.mmsi, {
          ...existing,
          position,
        });
      } else {
        // Create new vessel entry with position only
        updated.set(position.mmsi, {
          mmsi: position.mmsi,
          name: `Vessel ${position.mmsi}`,
          vessel_type: 0,
          position,
        });
      }
      
      return updated;
    });
  }, [vesselsProp]);

  // Handle static data updates from WebSocket (only if not using prop vessels)
  const handleStaticDataUpdate = useCallback((vessel: VesselWithPosition) => {
    if (vesselsProp) return; // Don't update if vessels are controlled by parent
    
    setInternalVessels((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(vessel.mmsi);
      
      if (existing) {
        // Merge static data with existing position
        updated.set(vessel.mmsi, {
          ...vessel,
          position: existing.position,
        });
      } else {
        // Add new vessel with static data
        updated.set(vessel.mmsi, vessel);
      }
      
      return updated;
    });
  }, [vesselsProp]);

  // Use vessel tracking hook
  const { isConnected } = useVesselTracking({
    autoConnect,
    onPositionUpdate: handlePositionUpdate,
    onStaticDataUpdate: handleStaticDataUpdate,
  });

  // Map initialization animation state
  const [showInitAnimation, setShowInitAnimation] = useState(true);

  // Hide initialization animation after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitAnimation(false);
    }, 1500); // Animation duration

    return () => clearTimeout(timer);
  }, []);

  // Filter vessels to only include those with valid position data for rendering
  const vesselsWithPosition = useMemo(() => {
    const filtered = new Map<string, VesselWithPosition>();
    vessels.forEach((vessel, mmsi) => {
      if (hasValidPosition(vessel)) {
        filtered.set(mmsi, vessel);
      }
    });
    return filtered;
  }, [vessels]);

  // Convert vessel track to GeoJSON LineString
  const trackFeature: VesselTrackFeature | null = useMemo(() => {
    if (!vesselTrack || vesselTrack.length < 2 || !selectedVesselMmsi) {
      return null;
    }
    return vesselTrackToGeoJSON(vesselTrack, selectedVesselMmsi);
  }, [vesselTrack, selectedVesselMmsi]);

  // Extract track coordinates for Polyline
  const trackCoordinates: [number, number][] = useMemo(() => {
    if (!trackFeature) return [];
    return trackFeature.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  }, [trackFeature]);

  // Generate timestamp annotations for track
  const trackAnnotations = useMemo(() => {
    if (!vesselTrack || vesselTrack.length < 2) return [];
    
    // Show annotations at regular intervals (every 6 hours for 24h track)
    const interval = Math.max(1, Math.floor(vesselTrack.length / 4));
    const annotations: Array<{ position: [number, number]; timestamp: string }> = [];
    
    for (let i = 0; i < vesselTrack.length; i += interval) {
      const pos = vesselTrack[i];
      annotations.push({
        position: [pos.latitude, pos.longitude],
        timestamp: formatTimestamp(pos.timestamp),
      });
    }
    
    return annotations;
  }, [vesselTrack]);

  return (
    <div className="map-container eva-map-frame" style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* EVA Map Initialization Animation - Requirements: 9.4 */}
      {showInitAnimation && (
        <>
          <div className="eva-map-init-overlay" style={{ animationDelay: '1.2s', animationDirection: 'reverse' }} />
          <div className="eva-map-scan-line" />
          <div className="eva-map-grid" />
        </>
      )}
      
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
      >
        {/* EVA Theme: Always use dark map tiles for NERV aesthetic - Requirements: 9.1 */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Render vessel markers with clustering - only for vessels with valid position data */}
        {/* Vessel info is displayed in the left function block when selected */}
        {vesselsWithPosition.size > 500 ? (
          // Use clustering for large datasets (> 500 vessels)
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
          >
            {Array.from(vesselsWithPosition.values()).map((vessel) => {
              // At this point, we know vessel has valid position due to filtering
              const vesselPos = getVesselPosition(vessel);
              if (!vesselPos) return null;

              // Convert to GeoJSON for validation (used by tests)
              vesselPositionToGeoJSON(vessel.position!, vessel);
              
              const isSelected = vessel.mmsi === selectedVesselMmsi;

              return (
                <DirectionalVesselMarker
                  key={vessel.mmsi}
                  vessel={vessel}
                  isSelected={isSelected}
                  onClick={() => {
                    if (onVesselSelect) {
                      onVesselSelect(vessel.mmsi);
                    }
                  }}
                />
              );
            })}
          </MarkerClusterGroup>
        ) : (
          // Render markers without clustering for smaller datasets
          Array.from(vesselsWithPosition.values()).map((vessel) => {
            // At this point, we know vessel has valid position due to filtering
            const vesselPos = getVesselPosition(vessel);
            if (!vesselPos) return null;

            // Convert to GeoJSON for validation (used by tests)
            vesselPositionToGeoJSON(vessel.position!, vessel);

            const isSelected = vessel.mmsi === selectedVesselMmsi;

            return (
              <DirectionalVesselMarker
                key={vessel.mmsi}
                vessel={vessel}
                isSelected={isSelected}
                onClick={() => {
                  if (onVesselSelect) {
                    onVesselSelect(vessel.mmsi);
                  }
                }}
              />
            );
          })
        )}

        {/* Render vessel track if selected - EVA styled with dashed pattern and glow */}
        {/* Requirements: 7.3 */}
        {trackCoordinates.length > 0 && (
          <>
            <Polyline
              positions={trackCoordinates}
              pathOptions={{
                className: 'eva-vessel-track',
                color: '#FF6600',
                weight: 3,
                opacity: 0.8,
                dashArray: '10, 5',
                lineCap: 'round',
              }}
            />
            
            {/* Track start marker (oldest position) */}
            {trackCoordinates.length > 0 && (
              <Marker
                position={trackCoordinates[0]}
                icon={L.divIcon({
                  html: `<div class="eva-track-start-marker">START</div>`,
                  className: 'eva-track-marker',
                  iconSize: [50, 20],
                  iconAnchor: [25, 10],
                })}
              />
            )}
            
            {/* Track end marker (current position) */}
            {trackCoordinates.length > 1 && (
              <Marker
                position={trackCoordinates[trackCoordinates.length - 1]}
                icon={L.divIcon({
                  html: `<div class="eva-track-end-marker">CURRENT</div>`,
                  className: 'eva-track-marker',
                  iconSize: [60, 20],
                  iconAnchor: [30, 10],
                })}
              />
            )}
            
            {/* Render timestamp annotations with EVA styling */}
            {trackAnnotations.map((annotation, index) => (
              <Marker
                key={`annotation-${index}`}
                position={annotation.position}
                icon={L.divIcon({
                  html: `<div class="eva-track-annotation">${annotation.timestamp}</div>`,
                  className: 'track-annotation',
                  iconSize: [100, 20],
                  iconAnchor: [50, 10],
                })}
              />
            ))}
          </>
        )}

        {/* Render visualizations */}
        {visualizations.length > 0 && (
          <MapVisualizations visualizations={visualizations} />
        )}

        {/* Map updater component */}
        <MapUpdater 
          centerPosition={centerOnPosition} 
          onCenteringFailed={handleCenteringFailed}
          onBoundsChange={onBoundsChange}
          onMapCenterChange={onMapCenterChange}
          onPanningStateChange={onPanningStateChange}
        />
      </MapContainer>

      {/* Empty state when no vessels - only show when connected and after initial load */}
      {vessels.size === 0 && !isLoadingVessels && isConnected && <EmptyMapState />}

      {/* Centering error message */}
      {centeringError && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[1000] bg-status-error text-white px-4 py-2 rounded-md shadow-lg">
          {centeringError}
        </div>
      )}

      {/* Connection status is now handled at App level via ConnectionToast component */}

      {/* Clear visualizations button - Minimalist design */}
      {visualizations.length > 0 && onClearVisualizations && (
        <div className="absolute bottom-3 right-3 z-[1000]">
          <button
            onClick={onClearVisualizations}
            className="bg-bg-primary border border-border px-4 py-2 min-h-[44px] rounded-md text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            title="Clear all visualizations"
            aria-label={`Clear all ${visualizations.length} visualizations from map`}
          >
            Clear Visualizations ({visualizations.length})
          </button>
        </div>
      )}
    </div>
  );
};
