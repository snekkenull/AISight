/**
 * DirectionalVesselMarker - Vessel marker with directional arrow
 *
 * Displays vessel markers as directional arrows that rotate based on vessel heading (COG).
 * Includes color coding by vessel type/navigational status and scale increase when selected.
 * Shows ROT (Rate of Turn) indicator and navigational status icons.
 *
 * Requirements: 7.5
 */

import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { VesselWithPosition } from '../types';
import { getVesselPosition } from '../utils/positionUtils';
import { getNavStatusInfo, decodeRateOfTurn, NavigationalStatus } from '../utils/navigationUtils';

/**
 * Props for DirectionalVesselMarker
 */
export interface DirectionalVesselMarkerProps {
  /** Vessel data with position */
  vessel: VesselWithPosition;
  /** Whether this vessel is currently selected */
  isSelected: boolean;
  /** Callback when marker is clicked */
  onClick: () => void;
  /** Whether to show navigational status indicator */
  showNavStatus?: boolean;
  /** Whether to show ROT indicator */
  showRotIndicator?: boolean;
}

/**
 * Vessel type to color mapping - EVA Theme
 * Based on AIS vessel type codes with EVA color palette
 * Requirements: 7.1
 */
const VESSEL_TYPE_COLORS: Record<number, string> = {
  0: '#B0B0B0',   // Unknown/default - EVA secondary text
  30: '#00FF41',  // Fishing - EVA terminal green
  31: '#FF6600',  // Towing - EVA orange
  32: '#FF6600',  // Towing (large) - EVA orange
  33: '#9400D3',  // Dredging - EVA purple
  34: '#9400D3',  // Diving ops - EVA purple
  35: '#DC143C',  // Military ops - EVA red
  36: '#00D4FF',  // Sailing - EVA cyan
  37: '#00D4FF',  // Pleasure craft - EVA cyan
  40: '#FF6600',  // High speed craft - EVA orange
  50: '#00D4FF',  // Pilot vessel - EVA cyan
  51: '#DC143C',  // Search and rescue - EVA red
  52: '#FF6600',  // Tug - EVA orange
  53: '#9400D3',  // Port tender - EVA purple
  54: '#00FF41',  // Anti-pollution - EVA green
  55: '#DC143C',  // Law enforcement - EVA red
  58: '#9400D3',  // Medical transport - EVA purple
  59: '#B0B0B0',  // Non-combatant - EVA secondary text
  60: '#00D4FF',  // Passenger - EVA cyan
  70: '#FF6600',  // Cargo - EVA orange
  80: '#DC143C',  // Tanker - EVA red
  90: '#B0B0B0',  // Other - EVA secondary text
};

/**
 * Get color for vessel based on navigational status (priority) or vessel type
 * EVA Theme colors
 * Requirements: 7.1
 */
function getVesselColor(vesselType: number, navStatus?: number): string {
  // Priority colors for critical navigational statuses - EVA palette
  if (navStatus !== undefined && navStatus !== null) {
    switch (navStatus) {
      case NavigationalStatus.NOT_UNDER_COMMAND:
      case NavigationalStatus.AGROUND:
      case NavigationalStatus.AIS_SART:
        return '#DC143C'; // EVA red for critical
      case NavigationalStatus.RESTRICTED_MANEUVERABILITY:
      case NavigationalStatus.CONSTRAINED_BY_DRAUGHT:
        return '#FF6600'; // EVA orange for warning
      case NavigationalStatus.AT_ANCHOR:
        return '#00D4FF'; // EVA cyan for anchored
      case NavigationalStatus.MOORED:
        return '#B0B0B0'; // EVA secondary text for moored
      case NavigationalStatus.ENGAGED_IN_FISHING:
        return '#00FF41'; // EVA green for fishing
    }
  }
  
  // Fall back to vessel type color
  return VESSEL_TYPE_COLORS[vesselType] || VESSEL_TYPE_COLORS[0];
}

/**
 * Create a directional arrow icon for a vessel with EVA styling
 * The arrow rotates based on vessel heading (COG)
 * Uses angular/geometric shapes (triangles) with EVA color palette
 * Includes optional navigational status indicator and ROT arrow
 * Requirements: 7.1, 7.4
 */
function createDirectionalIcon(
  vesselType: number,
  heading: number,
  isSelected: boolean,
  navStatus?: number,
  rot?: number,
  showNavStatus: boolean = true,
  showRotIndicator: boolean = true
): L.DivIcon {
  const color = getVesselColor(vesselType, navStatus);
  const size = isSelected ? 36 : 24;
  const strokeWidth = isSelected ? 2.5 : 1.5;

  // Get navigational status info for icon overlay
  const navInfo = getNavStatusInfo(navStatus);
  const rotInfo = decodeRateOfTurn(rot);
  
  // Determine if we should show status indicator (only for notable statuses)
  const showStatusIcon = showNavStatus && navStatus !== undefined && navStatus !== null && 
    [NavigationalStatus.AT_ANCHOR, NavigationalStatus.MOORED, NavigationalStatus.NOT_UNDER_COMMAND,
     NavigationalStatus.AGROUND, NavigationalStatus.ENGAGED_IN_FISHING, NavigationalStatus.AIS_SART,
     NavigationalStatus.RESTRICTED_MANEUVERABILITY].includes(navStatus);

  // Create angular EVA-style arrow that points upward (0 degrees)
  // Sharp, geometric triangle with angular edges
  const arrowSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="eva-glow-${vesselType}-${isSelected}">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path 
        d="M12 1 L22 21 L12 17 L2 21 Z" 
        fill="${color}" 
        stroke="${isSelected ? '#FF6600' : '#0a0a0a'}" 
        stroke-width="${strokeWidth}"
        stroke-linejoin="miter"
        filter="${isSelected ? `url(#eva-glow-${vesselType}-${isSelected})` : 'none'}"
      />
      ${isSelected ? `
        <path 
          d="M12 1 L22 21 L12 17 L2 21 Z" 
          fill="none" 
          stroke="#FF6600" 
          stroke-width="1"
          stroke-linejoin="miter"
          opacity="0.6"
        />
      ` : ''}
    </svg>
  `;

  // ROT indicator (small curved arrow showing turn direction) - EVA styled
  let rotIndicator = '';
  if (showRotIndicator && rotInfo.direction !== 'unknown' && rotInfo.intensity !== 'none') {
    const rotColor = rotInfo.intensity === 'sharp' ? '#DC143C' : 
                     rotInfo.intensity === 'moderate' ? '#FF6600' : '#00FF41';
    const rotArrow = rotInfo.direction === 'right' ? '↻' : '↺';
    rotIndicator = `
      <div style="
        position: absolute;
        top: -4px;
        ${rotInfo.direction === 'right' ? 'right: -4px' : 'left: -4px'};
        font-size: 10px;
        color: ${rotColor};
        text-shadow: 0 0 4px ${rotColor}, 0 0 2px #0a0a0a;
        font-weight: bold;
      ">${rotArrow}</div>
    `;
  }

  // Status icon overlay (bottom right corner) - EVA styled with angular shape
  let statusOverlay = '';
  if (showStatusIcon) {
    statusOverlay = `
      <div style="
        position: absolute;
        bottom: -2px;
        right: -2px;
        font-size: 10px;
        background: #0a0a0a;
        border: 1px solid #FF6600;
        clip-path: polygon(0 0, 100% 0, 100% 80%, 80% 100%, 0 100%);
        width: 14px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 4px rgba(255, 102, 0, 0.5);
      ">${navInfo.icon}</div>
    `;
  }

  // Selection animations - targeting brackets and pulsing ring
  // Requirements: 7.2
  const selectionAnimations = isSelected ? `
    <div class="eva-marker-pulse-ring"></div>
    <div class="eva-marker-brackets">
      <div class="eva-marker-bracket top-left"></div>
      <div class="eva-marker-bracket top-right"></div>
      <div class="eva-marker-bracket bottom-left"></div>
      <div class="eva-marker-bracket bottom-right"></div>
    </div>
  ` : '';

  // Use a wrapper div to isolate the transform and prevent position shifting
  // EVA styling with glow effects
  // IMPORTANT: Don't use position: relative on the wrapper as it can cause
  // pixel shifts during map panning. Let Leaflet handle positioning via iconAnchor.
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      will-change: transform;
    ">
      ${selectionAnimations}
      <div style="
        width: ${size}px;
        height: ${size}px;
        transform: rotate(${heading}deg);
        transform-origin: center center;
        transition: transform 0.3s ease;
        filter: ${isSelected ? `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 4px #FF6600)` : `drop-shadow(0 0 3px ${color})`};
      ">
        ${arrowSvg}
      </div>
      ${rotIndicator}
      ${statusOverlay}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'directional-vessel-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/**
 * DirectionalVesselMarker component
 * Renders a vessel marker with directional arrow that rotates based on heading
 * Includes navigational status indicator and ROT (Rate of Turn) visualization
 * Note: Vessel info is displayed in the left function block, not in a popup
 */
export const DirectionalVesselMarker = React.memo(({
  vessel,
  isSelected,
  onClick,
  showNavStatus = true,
  showRotIndicator = true,
}: DirectionalVesselMarkerProps) => {
  const vesselPos = getVesselPosition(vessel);

  // Don't render if no valid position
  if (!vesselPos) {
    return null;
  }

  const position: [number, number] = [vesselPos.lat, vesselPos.lon];

  // Use COG (Course Over Ground) for heading, fallback to true_heading if available
  const heading = vessel.position?.cog ?? vessel.position?.true_heading ?? 0;
  
  // Get navigational status and rate of turn
  const navStatus = vessel.position?.navigational_status;
  const rot = vessel.position?.rate_of_turn;

  // Create the directional icon with nav status and ROT indicators
  const icon = useMemo(
    () => createDirectionalIcon(
      vessel.vessel_type, 
      heading, 
      isSelected,
      navStatus,
      rot,
      showNavStatus,
      showRotIndicator
    ),
    [vessel.vessel_type, heading, isSelected, navStatus, rot, showNavStatus, showRotIndicator]
  );

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Return true if props are equal (component should NOT re-render)

  // Check selection state
  if (prevProps.isSelected !== nextProps.isSelected) return false;

  // Check vessel identity
  if (prevProps.vessel.mmsi !== nextProps.vessel.mmsi) return false;
  
  // Check display options
  if (prevProps.showNavStatus !== nextProps.showNavStatus) return false;
  if (prevProps.showRotIndicator !== nextProps.showRotIndicator) return false;

  // Check position and heading changes
  const prevPos = prevProps.vessel.position;
  const nextPos = nextProps.vessel.position;

  if (!prevPos && !nextPos) return true;
  if (!prevPos || !nextPos) return false;

  return (
    prevPos.latitude === nextPos.latitude &&
    prevPos.longitude === nextPos.longitude &&
    prevPos.cog === nextPos.cog &&
    prevPos.true_heading === nextPos.true_heading &&
    prevPos.sog === nextPos.sog &&
    prevPos.navigational_status === nextPos.navigational_status &&
    prevPos.rate_of_turn === nextPos.rate_of_turn
  );
});
