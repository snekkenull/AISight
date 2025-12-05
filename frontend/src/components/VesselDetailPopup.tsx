/**
 * VesselDetailPopup Component - Modern vessel detail card on map
 *
 * Displays vessel details as a Leaflet popup anchored to the vessel marker.
 * Features a modern, visually appealing design with smooth interactions.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 8.2
 */

import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { VesselWithPosition } from '../types';
import {
  getVesselPosition,
  hasValidPosition,
  formatPositionAge,
  classifyPositionStatus,
  PositionDataStatus,
} from '../utils/positionUtils';
import {
  getNavStatusInfo,
  decodeRateOfTurn,
  classifyVesselBehavior,
} from '../utils/navigationUtils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import {
  X,
  MapPin,
  Copy,
  ChevronDown,
  ChevronUp,
  Ship,
  Anchor,
  Gauge,
  Compass,
  Clock,
  Check,
  Route,
  Crosshair,
  RotateCw,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Props for VesselDetailPopup component
 */
export interface VesselDetailPopupProps {
  vessel: VesselWithPosition | null;
  onClose: () => void;
  onCenterMap: () => void;
  onShowTrack: () => void;
  isTrackVisible?: boolean;
  /** Whether continuous tracking is active for this vessel */
  isContinuousTracking?: boolean;
  /** Callback to toggle continuous tracking */
  onToggleContinuousTracking?: () => void;
  /** Callback to open AI analysis with default prompt */
  onSmartAnalysis?: (vessel: VesselWithPosition) => void;
  /** Function to close the Leaflet popup (injected by DirectionalVesselMarker) */
  closePopup?: () => void;
}

// HUD-style data formatting - Requirements: 6.1, 6.3, 6.4
function formatPosition(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  // Format with degree symbols and directional indicators
  return `${Math.abs(latitude).toFixed(5)}° ${latDir} / ${Math.abs(longitude).toFixed(5)}° ${lonDir}`;
}

function formatSpeed(sog: number): string {
  // Bracketed label format
  return `${sog.toFixed(1)} KN`;
}

function formatCourse(cog: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(cog / 45) % 8;
  // Format with degree symbol and direction
  return `${cog.toFixed(0)}° ${directions[index]}`;
}

// 24-hour military time format - Requirements: 6.4
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  // Military format: YYYY-MM-DD HH:MM:SS
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getVesselTypeName(type: number | undefined | null): string {
  if (type === undefined || type === null) return '';
  
  const types: Record<number, string> = {
    30: 'Fishing',
    31: 'Towing',
    32: 'Towing (large)',
    33: 'Dredging',
    34: 'Diving',
    35: 'Military',
    36: 'Sailing',
    37: 'Pleasure Craft',
    40: 'High Speed Craft',
    50: 'Pilot Vessel',
    51: 'Search & Rescue',
    52: 'Tug',
    53: 'Port Tender',
    54: 'Anti-pollution',
    55: 'Law Enforcement',
    60: 'Passenger',
    70: 'Cargo',
    80: 'Tanker',
    90: 'Other',
  };
  return types[type] || '';
}

function getVesselDimensions(vessel: VesselWithPosition): string | null {
  const { dimension_a, dimension_b, dimension_c, dimension_d } = vessel;
  if (!dimension_a && !dimension_b && !dimension_c && !dimension_d) return null;
  const length = (dimension_a || 0) + (dimension_b || 0);
  const width = (dimension_c || 0) + (dimension_d || 0);
  return length && width ? `${length}m × ${width}m` : null;
}

/**
 * Hook to access Leaflet map instance safely
 * Returns null if not within MapContainer context
 */
function useLeafletMap() {
  // useMap must be called unconditionally, but we handle errors gracefully
  const map = useMap();
  return map;
}

/**
 * VesselDetailPopup Component
 */
export const VesselDetailPopup: React.FC<VesselDetailPopupProps> = ({
  vessel,
  onClose,
  onCenterMap,
  onShowTrack,
  isTrackVisible = false,
  isContinuousTracking = false,
  onToggleContinuousTracking,
  onSmartAnalysis,
  closePopup,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const map = useLeafletMap();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!vessel) return null;

  const hasPosition = hasValidPosition(vessel);
  const position = getVesselPosition(vessel);
  const positionStatus = classifyPositionStatus(vessel);
  const isStale =
    positionStatus === PositionDataStatus.STALE ||
    positionStatus === PositionDataStatus.VERY_STALE;
  const dimensions = getVesselDimensions(vessel);
  const vesselTypeName = getVesselTypeName(vessel.vessel_type);

  const handleCopyMmsi = async () => {
    try {
      await navigator.clipboard.writeText(vessel.mmsi);
      setCopySuccess(true);
      toast.success('MMSI copied to clipboard');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      toast.error('Failed to copy MMSI');
    }
  };

  const handleCenterMap = () => {
    if (!hasPosition || !position) {
      toast.error('No position data available');
      return;
    }

    if (map) {
      map.setView([position.lat, position.lon], 14, {
        animate: true,
        duration: 0.5,
      });
      toast.success('Map centered on vessel');
    }
    onCenterMap();
  };

  const handleShowTrack = () => {
    if (!hasPosition) {
      toast.error('No position data available');
      return;
    }
    onShowTrack();
    // Only show toast if not using continuous tracking (which has its own toasts)
    if (!onToggleContinuousTracking) {
      toast.success(isTrackVisible ? 'Track hidden' : 'Loading vessel track...');
    }
  };

  // Mobile: bottom sheet with EVA styling
  if (isMobile) {
    return (
      <Sheet open={!!vessel} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="vessel-detail-popup max-h-[85vh] overflow-y-auto eva-clip-corner bg-eva-bg-tertiary border-t-2 border-eva-accent-orange px-5 pb-8"
        >
          <SheetHeader className="text-left pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 eva-clip-corner-sm bg-eva-bg-secondary border-2 border-eva-accent-orange flex items-center justify-center shadow-eva-glow-orange">
                <Ship className="w-6 h-6 text-eva-accent-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-bold truncate uppercase tracking-eva-normal text-eva-text-primary font-eva-display">
                  {vessel.name || 'Unknown Vessel'}
                </SheetTitle>
                <SheetDescription className="font-eva-mono text-sm text-eva-text-secondary">
                  [MMSI: {vessel.mmsi}]
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={hasPosition ? (isStale ? 'eva-orange' : 'eva-green') : 'eva-red'}
                className="text-xs"
              >
                {hasPosition ? (isStale ? 'STALE' : 'ACTIVE') : 'NO POSITION'}
              </Badge>
              {vesselTypeName && (
                <Badge variant="eva-cyan" className="text-xs">
                  {vesselTypeName.toUpperCase()}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <MobileContent
            vessel={vessel}
            hasPosition={hasPosition}
            position={position}
            isStale={isStale}
            isExpanded={isExpanded}
            dimensions={dimensions}
            onToggleExpanded={() => setIsExpanded(!isExpanded)}
            onCopyMmsi={handleCopyMmsi}
            onSmartAnalysis={() => onSmartAnalysis?.(vessel)}
            onCenterMap={handleCenterMap}
            onShowTrack={handleShowTrack}
            isTrackVisible={isTrackVisible}
            isContinuousTracking={isContinuousTracking}
            onToggleContinuousTracking={onToggleContinuousTracking}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: floating card with EVA styling
  return (
    <div className="vessel-detail-popup w-[400px] eva-clip-corner bg-eva-bg-tertiary shadow-eva-glow border border-eva-border-accent overflow-hidden relative before:absolute before:top-0 before:left-0 before:w-4 before:h-4 before:border-t-2 before:border-l-2 before:border-eva-accent-orange before:z-10 after:absolute after:bottom-0 after:right-0 after:w-4 after:h-4 after:border-b-2 after:border-r-2 after:border-eva-accent-orange after:z-10">
      {/* Header with EVA gradient and warning stripe */}
      <div className="relative h-28 bg-gradient-to-br from-eva-bg-secondary via-eva-bg-tertiary to-eva-bg-secondary flex items-center justify-center border-b-2 border-eva-accent-orange">
        {/* Warning stripe pattern */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,102,0,0.05)_10px,rgba(255,102,0,0.05)_20px)] opacity-50" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 eva-clip-corner-sm bg-eva-bg-tertiary border-2 border-eva-accent-orange flex items-center justify-center shadow-eva-glow-orange">
            <Ship className="w-9 h-9 text-eva-accent-orange" strokeWidth={1.5} />
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (closePopup) {
              closePopup();
            }
            onClose();
          }}
          className="absolute top-4 right-4 w-9 h-9 eva-clip-corner-sm bg-eva-bg-tertiary/80 hover:bg-eva-accent-orange/20 border border-eva-border-accent backdrop-blur-sm flex items-center justify-center transition-all hover:shadow-eva-glow-orange z-50"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-eva-accent-orange" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title & MMSI */}
        <div className="mb-5">
          <h3 className="text-xl font-eva-display uppercase tracking-eva-normal text-eva-text-primary truncate mb-1">
            {vessel.name || 'Unknown Vessel'}
          </h3>
          <p className="text-sm text-eva-text-secondary font-eva-mono flex items-center gap-2">
            [MMSI: {vessel.mmsi}]
            {copySuccess && (
              <span className="text-eva-accent-green flex items-center gap-1 text-xs">
                <Check className="w-3 h-3" /> COPIED
              </span>
            )}
          </p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mb-5">
          <Badge
            variant={hasPosition ? (isStale ? 'eva-orange' : 'eva-green') : 'eva-red'}
            className="text-xs font-medium px-3 py-1"
          >
            {hasPosition ? (isStale ? 'STALE DATA' : 'ACTIVE') : 'NO POSITION'}
          </Badge>
          {vesselTypeName && (
            <Badge variant="eva-cyan" className="text-xs font-medium px-3 py-1">
              {vesselTypeName.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Navigational Status & Behavior - Prominent placement */}
        {hasPosition && vessel.position?.navigational_status !== undefined && (
          <NavStatusDisplay 
            navStatus={vessel.position.navigational_status}
            sog={vessel.position.sog}
            rot={vessel.position.rate_of_turn}
          />
        )}

        {/* Stale warning */}
        {isStale && vessel.position?.timestamp && (
          <div className="mb-5 p-4 bg-eva-bg-secondary border-2 border-eva-accent-orange eva-clip-corner-sm animate-eva-pulse">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 shrink-0 text-eva-accent-orange mt-0.5" />
              <div>
                <p className="text-sm font-medium text-eva-accent-orange uppercase tracking-eva-tight">
                  [WARNING] Position data is stale
                </p>
                <p className="text-xs text-eva-text-secondary font-eva-mono mt-1">
                  Last updated {formatPositionAge(new Date(vessel.position.timestamp))} ago
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rate of Turn Indicator */}
        {hasPosition && vessel.position?.rate_of_turn !== undefined && vessel.position.rate_of_turn !== -128 && (
          <RotIndicator rot={vessel.position.rate_of_turn} />
        )}

        {/* Stats Grid - EVA design */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard
            icon={<Gauge className="w-4 h-4" />}
            label="Speed"
            value={hasPosition && vessel.position ? formatSpeed(vessel.position.sog) : 'N/A'}
          />
          <StatCard
            icon={<Compass className="w-4 h-4" />}
            label="Course"
            value={hasPosition && vessel.position ? formatCourse(vessel.position.cog) : 'N/A'}
          />
        </div>

        {/* Position - EVA HUD card */}
        <div className="mb-6 p-4 bg-eva-bg-secondary eva-clip-corner-sm border border-eva-border-accent">
          <div className="flex items-center gap-2 text-xs font-medium text-eva-accent-orange mb-2 uppercase tracking-eva-tight">
            <MapPin className="w-4 h-4" />
            [Position]
          </div>
          <p className="font-eva-mono text-sm text-eva-text-primary leading-relaxed">
            {hasPosition && position ? formatPosition(position.lat, position.lon) : 'N/A'}
          </p>
          {hasPosition && vessel.position?.timestamp && (
            <p className="text-xs text-eva-text-secondary font-eva-mono mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {formatPositionAge(new Date(vessel.position.timestamp))} ago
            </p>
          )}
        </div>

        {/* Destination - EVA HUD style */}
        {vessel.destination && (
          <div className="mb-6 p-4 bg-eva-bg-secondary eva-clip-corner-sm border border-eva-accent-cyan shadow-eva-glow-cyan">
            <div className="flex items-center gap-2 text-xs font-medium text-eva-accent-cyan mb-2 uppercase tracking-eva-tight">
              <Anchor className="w-4 h-4" />
              [Destination]
            </div>
            <p className="text-base font-semibold text-eva-text-primary font-eva-mono uppercase">
              {vessel.destination}
            </p>
            {vessel.eta && (
              <p className="text-xs text-eva-text-secondary font-eva-mono mt-2">
                ETA: {formatTimestamp(vessel.eta)}
              </p>
            )}
          </div>
        )}

        {/* Expandable Details */}
        {(vessel.call_sign || vessel.imo_number || dimensions || vessel.draught) && (
          <div className="mb-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-sm font-medium text-eva-text-secondary hover:text-eva-accent-orange transition-colors py-3 px-1 eva-clip-corner-sm hover:bg-eva-bg-secondary uppercase tracking-eva-tight"
            >
              <span className="flex items-center gap-2">
                <Ship className="w-4 h-4" />
                [Vessel Details]
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-3 text-sm bg-eva-bg-secondary eva-clip-corner-sm p-4 border border-eva-border-default">
                {vessel.call_sign && (
                  <DetailRow label="Call Sign" value={vessel.call_sign} mono />
                )}
                {vessel.imo_number && (
                  <DetailRow label="IMO" value={String(vessel.imo_number)} mono />
                )}
                {dimensions && <DetailRow label="Dimensions" value={dimensions} />}
                {vessel.draught && (
                  <DetailRow label="Draught" value={`${vessel.draught.toFixed(1)}m`} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3 mb-4">
          <Button
            variant="eva-ghost"
            size="sm"
            onClick={handleCopyMmsi}
            className="flex-1 h-11"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy MMSI
          </Button>
          <Button
            variant="eva-ghost"
            size="sm"
            onClick={() => onSmartAnalysis?.(vessel)}
            disabled={!onSmartAnalysis}
            className="flex-1 h-11 border-eva-accent-purple text-eva-accent-purple hover:border-eva-accent-purple hover:text-eva-accent-purple hover:shadow-eva-glow-purple"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Smart Analysis
          </Button>
        </div>

        {/* Primary Actions - EVA buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleCenterMap}
            disabled={!hasPosition}
            variant="eva-primary"
            size="sm"
            className="flex-1 h-12"
          >
            <Crosshair className="w-5 h-5 mr-2" />
            Center
          </Button>
          <Button
            onClick={() => {
              if (onToggleContinuousTracking) {
                onToggleContinuousTracking();
              } else {
                handleShowTrack();
              }
            }}
            disabled={!hasPosition}
            variant={isContinuousTracking ? 'eva-warning' : 'eva-primary'}
            size="sm"
            className={`flex-1 h-12 ${isContinuousTracking ? 'animate-eva-pulse' : ''}`}
          >
            <Route className={`w-5 h-5 mr-2 ${isContinuousTracking ? 'animate-spin' : ''}`} />
            {isContinuousTracking ? 'Tracking...' : 'Track'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper Components

// Navigational Status Display
const NavStatusDisplay: React.FC<{
  navStatus: number;
  sog?: number;
  rot?: number;
}> = ({ navStatus, sog, rot }) => {
  const statusInfo = getNavStatusInfo(navStatus);
  const behavior = classifyVesselBehavior(navStatus, sog, rot);
  
  return (
    <div className={`mb-5 p-4 eva-clip-corner-sm border-2 ${statusInfo.bgColor} border-opacity-50 shadow-eva-glow bg-eva-bg-secondary`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 eva-clip-corner-sm bg-eva-bg-tertiary border border-eva-border-accent flex items-center justify-center">
          <span className="text-2xl">{statusInfo.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate uppercase tracking-eva-tight font-eva-mono" style={{ color: statusInfo.color }}>
            {statusInfo.name}
          </p>
          <p className="text-xs text-eva-text-secondary font-eva-mono">{statusInfo.description}</p>
        </div>
        {statusInfo.priority === 'critical' && (
          <Badge variant="eva-red" className="text-[10px] px-2 py-0.5 font-bold">
            ALERT
          </Badge>
        )}
        {statusInfo.priority === 'warning' && (
          <Badge variant="eva-orange" className="text-[10px] px-2 py-0.5 font-bold">
            CAUTION
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-eva-text-secondary pl-1 font-eva-mono">
        <Navigation className="w-3.5 h-3.5" />
        <span className="font-medium">{behavior.icon} {behavior.description}</span>
      </div>
    </div>
  );
};

// Rate of Turn Indicator
const RotIndicator: React.FC<{ rot: number }> = ({ rot }) => {
  const rotInfo = decodeRateOfTurn(rot);
  
  if (rotInfo.direction === 'unknown' || rotInfo.intensity === 'none') {
    return null;
  }
  
  const intensityColor = rotInfo.intensity === 'sharp' ? 'text-eva-accent-red' : 
                         rotInfo.intensity === 'moderate' ? 'text-eva-accent-orange' : 'text-eva-accent-green';
  const borderColor = rotInfo.intensity === 'sharp' ? 'border-eva-accent-red' : 
                  rotInfo.intensity === 'moderate' ? 'border-eva-accent-orange' : 'border-eva-accent-green';
  
  return (
    <div className={`mb-4 p-3 eva-clip-corner-sm bg-eva-bg-secondary border ${borderColor}`}>
      <div className="flex items-center gap-2">
        <RotateCw className={`w-4 h-4 ${intensityColor} ${rotInfo.direction === 'left' ? 'scale-x-[-1]' : ''}`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${intensityColor} uppercase tracking-eva-tight font-eva-mono`}>
            Turning {rotInfo.direction === 'right' ? 'Starboard' : 'Port'}
          </p>
          <p className="text-xs text-eva-text-secondary font-eva-mono">
            {rotInfo.degreesPerMinute !== null 
              ? `${Math.abs(rotInfo.degreesPerMinute).toFixed(1)}°/min` 
              : 'Rate unknown'}
            {rotInfo.intensity === 'sharp' && ' - Sharp turn!'}
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="p-4 bg-eva-bg-secondary eva-clip-corner-sm border border-eva-border-default hover:border-eva-border-accent transition-all">
    <div className="flex items-center gap-2 text-xs font-medium text-eva-accent-orange mb-2 uppercase tracking-eva-tight">
      {icon}
      [{label}]
    </div>
    <p className="text-xl font-bold text-eva-text-primary font-eva-mono">{value}</p>
  </div>
);

const DetailRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}> = ({ label, value, mono, icon }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-eva-text-secondary flex items-center gap-2 text-xs font-medium uppercase tracking-eva-tight">
      {icon}
      [{label}]
    </span>
    <span className={`text-eva-text-primary font-medium ${mono ? 'font-eva-mono text-sm' : 'text-sm font-eva-mono'}`}>{value}</span>
  </div>
);

// Mobile Content Component
const MobileContent: React.FC<{
  vessel: VesselWithPosition;
  hasPosition: boolean;
  position: { lat: number; lon: number } | null;
  isStale: boolean;
  isExpanded: boolean;
  dimensions: string | null;
  onToggleExpanded: () => void;
  onCopyMmsi: () => void;
  onSmartAnalysis: () => void;
  onCenterMap: () => void;
  onShowTrack: () => void;
  isTrackVisible: boolean;
  isContinuousTracking?: boolean;
  onToggleContinuousTracking?: () => void;
}> = ({
  vessel,
  hasPosition,
  position,
  isStale,
  isExpanded,
  dimensions,
  onToggleExpanded,
  onCopyMmsi,
  onSmartAnalysis,
  onCenterMap,
  onShowTrack,
  isTrackVisible: _isTrackVisible,
  isContinuousTracking = false,
  onToggleContinuousTracking,
}) => (
  <div className="space-y-5">
    {/* Navigational Status & Behavior */}
    {hasPosition && vessel.position?.navigational_status !== undefined && (
      <NavStatusDisplay 
        navStatus={vessel.position.navigational_status}
        sog={vessel.position.sog}
        rot={vessel.position.rate_of_turn}
      />
    )}

    {/* Stale warning */}
    {isStale && vessel.position?.timestamp && (
      <div className="p-4 bg-eva-bg-secondary border-2 border-eva-accent-orange eva-clip-corner-sm animate-eva-pulse">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 shrink-0 text-eva-accent-orange mt-0.5" />
          <div>
            <p className="text-sm font-medium text-eva-accent-orange uppercase tracking-eva-tight">
              [WARNING] Position data is stale
            </p>
            <p className="text-xs text-eva-text-secondary font-eva-mono mt-1">
              Last updated {formatPositionAge(new Date(vessel.position.timestamp))} ago
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Rate of Turn Indicator */}
    {hasPosition && vessel.position?.rate_of_turn !== undefined && vessel.position.rate_of_turn !== -128 && (
      <RotIndicator rot={vessel.position.rate_of_turn} />
    )}

    {/* Stats */}
    <div className="grid grid-cols-2 gap-4">
      <StatCard
        icon={<Gauge className="w-4 h-4" />}
        label="Speed"
        value={hasPosition && vessel.position ? formatSpeed(vessel.position.sog) : 'N/A'}
      />
      <StatCard
        icon={<Compass className="w-4 h-4" />}
        label="Course"
        value={hasPosition && vessel.position ? formatCourse(vessel.position.cog) : 'N/A'}
      />
    </div>

    {/* Position */}
    <div className="p-4 bg-eva-bg-secondary eva-clip-corner-sm border border-eva-border-accent">
      <div className="flex items-center gap-2 text-xs font-medium text-eva-accent-orange mb-2 uppercase tracking-eva-tight">
        <MapPin className="w-4 h-4" />
        [Position]
      </div>
      <p className="font-eva-mono text-sm text-eva-text-primary leading-relaxed">
        {hasPosition && position ? formatPosition(position.lat, position.lon) : 'N/A'}
      </p>
      {hasPosition && vessel.position?.timestamp && (
        <p className="text-xs text-eva-text-secondary font-eva-mono mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Updated {formatPositionAge(new Date(vessel.position.timestamp))} ago
        </p>
      )}
    </div>

    {/* Destination - EVA HUD style */}
    {vessel.destination && (
      <div className="p-4 bg-eva-bg-secondary eva-clip-corner-sm border border-eva-accent-cyan shadow-eva-glow-cyan">
        <div className="flex items-center gap-2 text-xs font-medium text-eva-accent-cyan mb-2 uppercase tracking-eva-tight">
          <Anchor className="w-4 h-4" />
          [Destination]
        </div>
        <p className="text-base font-semibold text-eva-text-primary font-eva-mono uppercase">
          {vessel.destination}
        </p>
        {vessel.eta && (
          <p className="text-xs text-eva-text-secondary font-eva-mono mt-2">
            ETA: {formatTimestamp(vessel.eta)}
          </p>
        )}
      </div>
    )}

    {/* Expandable Details */}
    {(vessel.call_sign || vessel.imo_number || dimensions || vessel.draught) && (
      <div>
        <button
          onClick={onToggleExpanded}
          className="w-full flex items-center justify-between text-sm font-medium text-eva-text-secondary hover:text-eva-accent-orange transition-colors py-3 px-1 eva-clip-corner-sm hover:bg-eva-bg-secondary uppercase tracking-eva-tight"
        >
          <span className="flex items-center gap-2">
            <Ship className="w-4 h-4" />
            [Vessel Details]
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3 text-sm bg-eva-bg-secondary eva-clip-corner-sm p-4 border border-eva-border-default">
            {vessel.call_sign && <DetailRow label="Call Sign" value={vessel.call_sign} mono />}
            {vessel.imo_number && <DetailRow label="IMO" value={String(vessel.imo_number)} mono />}
            {dimensions && <DetailRow label="Dimensions" value={dimensions} />}
            {vessel.draught && (
              <DetailRow label="Draught" value={`${vessel.draught.toFixed(1)}m`} />
            )}
          </div>
        )}
      </div>
    )}

    {/* Quick Actions */}
    <div className="flex gap-3">
      <Button variant="eva-ghost" size="sm" onClick={onCopyMmsi} className="flex-1 h-11">
        <Copy className="w-4 h-4 mr-2" />
        Copy MMSI
      </Button>
      <Button
        variant="eva-ghost"
        size="sm"
        onClick={onSmartAnalysis}
        className="flex-1 h-11 border-eva-accent-purple text-eva-accent-purple hover:border-eva-accent-purple hover:text-eva-accent-purple hover:shadow-eva-glow-purple"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Smart Analysis
      </Button>
    </div>

    {/* Primary Actions */}
    <div className="flex gap-3 pt-2">
      <Button
        onClick={onCenterMap}
        disabled={!hasPosition}
        variant="eva-primary"
        className="flex-1 h-12"
      >
        <Crosshair className="w-5 h-5 mr-2" />
        Center
      </Button>
      <Button
        onClick={() => {
          if (onToggleContinuousTracking) {
            onToggleContinuousTracking();
          } else {
            onShowTrack();
          }
        }}
        disabled={!hasPosition}
        variant={isContinuousTracking ? 'eva-warning' : 'eva-primary'}
        className={`flex-1 h-12 ${isContinuousTracking ? 'animate-eva-pulse' : ''}`}
      >
        <Route className={`w-5 h-5 mr-2 ${isContinuousTracking ? 'animate-spin' : ''}`} />
        {isContinuousTracking ? 'Tracking...' : 'Track'}
      </Button>
    </div>
  </div>
);
