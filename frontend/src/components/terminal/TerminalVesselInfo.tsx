/**
 * TerminalVesselInfo Component
 * 
 * Terminal-styled vessel information panel for the left function block.
 * Displays vessel details in authentic terminal aesthetics.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 * - Display vessel details in terminal window styling
 * - No emoji or unicode pictographic characters (ASCII only)
 * - Text labels and ASCII-compatible symbols only
 * - Bracketed label-value pairs format
 * - Monospace typography throughout
 * - Text abbreviations for vessel types
 */

import { TerminalWindow } from './TerminalWindow';
import { TerminalButton } from './TerminalButton';

/**
 * Vessel type code to text abbreviation mapping
 * Requirements: 9.6 - Use text abbreviations
 */
const VESSEL_TYPE_ABBREV: Record<number, string> = {
  0: 'UNKN',
  30: 'FISH',
  31: 'TOW',
  32: 'TOW-L',
  33: 'DREDG',
  34: 'DIVE',
  35: 'MIL',
  36: 'SAIL',
  37: 'PLEAS',
  40: 'HSC',
  50: 'PILOT',
  51: 'SAR',
  52: 'TUG',
  53: 'TEND',
  54: 'APOL',
  55: 'LAW',
  58: 'MED',
  59: 'NCOM',
  60: 'PASS',
  70: 'CARGO',
  80: 'TANK',
  90: 'OTHER',
};

/**
 * Get vessel type abbreviation from code
 */
function getVesselTypeAbbrev(typeCode: number): string {
  // Check for exact match first
  if (VESSEL_TYPE_ABBREV[typeCode]) {
    return VESSEL_TYPE_ABBREV[typeCode];
  }
  // Check for range-based types (60-69 = Passenger, 70-79 = Cargo, 80-89 = Tanker)
  if (typeCode >= 60 && typeCode < 70) return 'PASS';
  if (typeCode >= 70 && typeCode < 80) return 'CARGO';
  if (typeCode >= 80 && typeCode < 90) return 'TANK';
  return 'UNKN';
}

/**
 * Navigational status code to text mapping
 * Requirements: 9.3 - ASCII-compatible text only
 */
const NAV_STATUS_TEXT: Record<number, string> = {
  0: 'UNDERWAY-ENG',
  1: 'ANCHORED',
  2: 'NOT-CMD',
  3: 'RESTRICTED',
  4: 'CONSTRAINED',
  5: 'MOORED',
  6: 'AGROUND',
  7: 'FISHING',
  8: 'UNDERWAY-SAIL',
  9: 'RESERVED-9',
  10: 'RESERVED-10',
  11: 'TOWING-ASTERN',
  12: 'TOWING-PUSH',
  13: 'RESERVED-13',
  14: 'AIS-SART',
  15: 'UNDEFINED',
};

/**
 * Get navigational status text
 */
function getNavStatusText(status: number | undefined): string {
  if (status === undefined) return 'N/A';
  return NAV_STATUS_TEXT[status] || 'UNKN';
}

/**
 * Format position for terminal display
 * Requirements: 9.3 - ASCII-compatible only
 */
function formatPosition(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}${latDir} ${Math.abs(lon).toFixed(4)}${lonDir}`;
}

/**
 * Format timestamp for terminal display
 * Requirements: 9.3 - ASCII-compatible only
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format date for terminal display
 */
function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Vessel information for display
 */
export interface VesselInfo {
  mmsi: string;
  name: string;
  vesselType: number;
  callSign?: string;
  imoNumber?: number;
  destination?: string;
  eta?: string;
  draught?: number;
  dimensionA?: number;
  dimensionB?: number;
  dimensionC?: number;
  dimensionD?: number;
  position?: {
    latitude: number;
    longitude: number;
    sog: number;
    cog: number;
    trueHeading?: number;
    navStatus?: number;
    rateOfTurn?: number;
    timestamp: string;
  };
}

/**
 * Props for TerminalVesselInfo component
 */
export interface TerminalVesselInfoProps {
  /** Vessel information to display */
  vessel: VesselInfo;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Callback when center map button is clicked */
  onCenterMap?: (position: { lat: number; lon: number }) => void;
  /** Callback when track button is clicked */
  onTrack?: (mmsi: string) => void;
  /** Callback when analysis button is clicked */
  onAnalysis?: (mmsi: string) => void;
  /** Whether vessel is currently being tracked */
  isTracked?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}


/**
 * Data field component for consistent formatting
 * Requirements: 9.4 - Bracketed label-value pairs
 */
interface DataFieldProps {
  label: string;
  value: string | number | undefined;
  unit?: string;
}

function DataField({ label, value, unit }: DataFieldProps): JSX.Element | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  const displayValue = unit ? `${value} ${unit}` : String(value);
  
  return (
    <div
      className="terminal-vessel-field"
      style={{
        marginBottom: '6px',
        lineHeight: '1.4',
      }}
    >
      <span
        style={{
          color: 'var(--terminal-dim)',
        }}
      >
        [{label}]:
      </span>
      {' '}
      <span
        style={{
          color: 'var(--terminal-fg)',
        }}
      >
        {displayValue}
      </span>
    </div>
  );
}

/**
 * Section separator for visual grouping
 */
function SectionSeparator(): JSX.Element {
  return (
    <div
      style={{
        margin: '8px 0',
        color: 'var(--terminal-dim)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {'- '.repeat(20)}
    </div>
  );
}

/**
 * TerminalVesselInfo Component
 * 
 * Displays vessel information in terminal-styled format.
 * Uses ASCII-only characters and bracketed label-value pairs.
 */
export function TerminalVesselInfo({
  vessel,
  onClose,
  onCenterMap,
  onTrack,
  onAnalysis,
  isTracked = false,
  className = '',
  'data-testid': testId,
}: TerminalVesselInfoProps): JSX.Element {
  const hasPosition = vessel.position !== undefined;
  
  // Calculate vessel dimensions if available
  const length = (vessel.dimensionA || 0) + (vessel.dimensionB || 0);
  const beam = (vessel.dimensionC || 0) + (vessel.dimensionD || 0);
  const hasDimensions = length > 0 || beam > 0;
  
  // Handle center map click
  const handleCenterMap = () => {
    if (vessel.position && onCenterMap) {
      onCenterMap({
        lat: vessel.position.latitude,
        lon: vessel.position.longitude,
      });
    }
  };

  // Handle track button click
  const handleTrack = () => {
    if (onTrack) {
      onTrack(vessel.mmsi);
    }
  };

  // Handle analysis button click
  const handleAnalysis = () => {
    if (onAnalysis) {
      onAnalysis(vessel.mmsi);
    }
  };

  return (
    <TerminalWindow
      title="VESSEL INFO"
      borderStyle="single"
      onClose={onClose}
      className={className}
      data-testid={testId}
    >
      <div
        className="terminal-vessel-info"
        style={{
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontSize: '11px',
          lineHeight: '1.5',
          padding: '4px',
        }}
      >
        {/* Identity Section */}
        <DataField label="MMSI" value={vessel.mmsi} />
        <DataField label="NAME" value={vessel.name || 'UNKNOWN'} />
        <DataField label="TYPE" value={getVesselTypeAbbrev(vessel.vesselType)} />
        {vessel.callSign && (
          <DataField label="CALL" value={vessel.callSign} />
        )}
        {vessel.imoNumber && (
          <DataField label="IMO" value={vessel.imoNumber} />
        )}

        {/* Position Section */}
        {hasPosition && vessel.position && (
          <>
            <SectionSeparator />
            <DataField
              label="POS"
              value={formatPosition(
                vessel.position.latitude,
                vessel.position.longitude
              )}
            />
            <DataField label="SOG" value={vessel.position.sog.toFixed(1)} unit="KTS" />
            <DataField label="COG" value={vessel.position.cog.toFixed(1)} unit="DEG" />
            {vessel.position.trueHeading !== undefined && (
              <DataField label="HDG" value={vessel.position.trueHeading} unit="DEG" />
            )}
            <DataField
              label="NAV"
              value={getNavStatusText(vessel.position.navStatus)}
            />
            {vessel.position.rateOfTurn !== undefined && vessel.position.rateOfTurn !== -128 && (
              <DataField
                label="ROT"
                value={vessel.position.rateOfTurn > 0 ? `+${vessel.position.rateOfTurn}` : vessel.position.rateOfTurn}
                unit="DEG/MIN"
              />
            )}
          </>
        )}

        {/* Voyage Section */}
        {(vessel.destination || vessel.eta) && (
          <>
            <SectionSeparator />
            {vessel.destination && (
              <DataField label="DEST" value={vessel.destination.toUpperCase()} />
            )}
            {vessel.eta && (
              <DataField label="ETA" value={`${formatDate(vessel.eta)} ${formatTimestamp(vessel.eta)}`} />
            )}
          </>
        )}

        {/* Dimensions Section */}
        {(hasDimensions || vessel.draught) && (
          <>
            <SectionSeparator />
            {length > 0 && (
              <DataField label="LEN" value={length} unit="M" />
            )}
            {beam > 0 && (
              <DataField label="BEAM" value={beam} unit="M" />
            )}
            {vessel.draught && (
              <DataField label="DRFT" value={vessel.draught.toFixed(1)} unit="M" />
            )}
          </>
        )}

        {/* Last Update */}
        {hasPosition && vessel.position && (
          <>
            <SectionSeparator />
            <DataField
              label="UPD"
              value={`${formatDate(vessel.position.timestamp)} ${formatTimestamp(vessel.position.timestamp)}`}
            />
          </>
        )}

        {/* Action Buttons - Vertically stacked with equal width */}
        <div
          className="terminal-vessel-info-buttons"
          style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {onTrack && (
            <TerminalButton
              onClick={handleTrack}
              active={isTracked}
              className="terminal-vessel-info-track-btn terminal-vessel-info-btn-full"
            >
              {isTracked ? '[TRACKING]' : '[TRACK]'}
            </TerminalButton>
          )}
          {onAnalysis && (
            <TerminalButton
              onClick={handleAnalysis}
              className="terminal-vessel-info-analysis-btn terminal-vessel-info-btn-full"
            >
              [ANALYSIS]
            </TerminalButton>
          )}
          {hasPosition && onCenterMap && (
            <TerminalButton
              onClick={handleCenterMap}
              className="terminal-vessel-info-center-btn terminal-vessel-info-btn-full"
            >
              [CENTER MAP]
            </TerminalButton>
          )}
        </div>
        
        {/* Button full-width styles */}
        <style>{`
          .terminal-vessel-info-btn-full {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
        `}</style>
      </div>
    </TerminalWindow>
  );
}

export default TerminalVesselInfo;
