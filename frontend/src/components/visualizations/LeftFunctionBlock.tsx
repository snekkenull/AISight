/**
 * LeftFunctionBlock Component
 * 
 * Container component for the left function block that manages
 * state transitions between globe/gauges view and vessel info view.
 * 
 * Requirements: 5.6, 6.1, 9.1, 15.3
 * - Hide globe when vessel is selected
 * - Show vessel info panel instead
 * - Restore globe when vessel is deselected
 * - Display digital gauges for fleet status metrics when no vessel selected
 * - Display vessel details in the left function block replacing the globe
 * - Animate panel open/close with terminal-style effects
 */

import { useRef, useEffect, useState } from 'react';
import { EarthGlobe, ViewportBounds } from './EarthGlobe';
import { DigitalGauge } from './DigitalGauge';
import { TerminalColorScheme } from '../../types/terminal-theme';
import { TerminalWindow } from '../terminal/TerminalWindow';
import { TerminalVesselInfo, VesselInfo } from '../terminal/TerminalVesselInfo';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Fleet statistics for gauge display
 */
export interface FleetStats {
  totalVessels: number;
  activeVessels: number;
  trackedVessels: number;
  /** Total vessels in database (from health API) */
  databaseTotalVessels?: number;
}

/**
 * Fleet status breakdown by navigational status
 */
export interface FleetStatusBreakdown {
  underway: number;
  anchored: number;
  moored: number;
  fishing: number;
  restricted: number;
  notUnderCommand: number;
  other: number;
}

/**
 * Selected vessel info (simplified for display)
 * Extended to support full vessel information display
 */
export interface SelectedVesselInfo {
  mmsi: string;
  name: string;
  vesselType: string | number;
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
 * Props for LeftFunctionBlock component
 */
export interface LeftFunctionBlockProps {
  /** Currently selected vessel (null if none) */
  selectedVessel: SelectedVesselInfo | null;
  /** Current map viewport bounds */
  viewportBounds?: ViewportBounds;
  /** Terminal color scheme */
  colorScheme: TerminalColorScheme;
  /** Fleet statistics for gauges */
  fleetStats?: FleetStats;
  /** Fleet status breakdown by navigational status */
  fleetStatusBreakdown?: FleetStatusBreakdown;
  /** Callback when close button is clicked */
  onCloseVesselInfo?: () => void;
  /** Callback when center map button is clicked */
  onCenterMap?: (position: { lat: number; lon: number }) => void;
  /** Callback when track button is clicked */
  onTrack?: (mmsi: string) => void;
  /** Callback when analysis button is clicked */
  onAnalysis?: (mmsi: string) => void;
  /** Whether selected vessel is being tracked */
  isVesselTracked?: boolean;
  /** Right block content to merge when AI is on right */
  rightBlockContent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Convert SelectedVesselInfo to VesselInfo format
 */
function toVesselInfo(vessel: SelectedVesselInfo): VesselInfo {
  return {
    mmsi: vessel.mmsi,
    name: vessel.name,
    vesselType: typeof vessel.vesselType === 'number' 
      ? vessel.vesselType 
      : 0, // Default to unknown if string
    callSign: vessel.callSign,
    imoNumber: vessel.imoNumber,
    destination: vessel.destination,
    eta: vessel.eta,
    draught: vessel.draught,
    dimensionA: vessel.dimensionA,
    dimensionB: vessel.dimensionB,
    dimensionC: vessel.dimensionC,
    dimensionD: vessel.dimensionD,
    position: vessel.position ? {
      latitude: vessel.position.latitude,
      longitude: vessel.position.longitude,
      sog: vessel.position.sog,
      cog: vessel.position.cog,
      trueHeading: vessel.position.trueHeading,
      navStatus: vessel.position.navStatus,
      rateOfTurn: vessel.position.rateOfTurn,
      timestamp: vessel.position.timestamp,
    } : undefined,
  };
}

/**
 * LeftFunctionBlock Component
 * 
 * Manages the state transition between globe view and vessel info view.
 * When no vessel is selected, shows the Earth globe and fleet gauges.
 * When a vessel is selected, shows the vessel information panel.
 */
export function LeftFunctionBlock({
  selectedVessel,
  viewportBounds,
  colorScheme,
  fleetStats,
  fleetStatusBreakdown,
  onCloseVesselInfo,
  onCenterMap,
  onTrack,
  onAnalysis,
  isVesselTracked = false,
  rightBlockContent,
  className = '',
  'data-testid': testId,
}: LeftFunctionBlockProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [currentView, setCurrentView] = useState<'globe' | 'vessel'>(
    selectedVessel ? 'vessel' : 'globe'
  );
  const [animationClass, setAnimationClass] = useState('');
  const prevVesselRef = useRef<SelectedVesselInfo | null>(null);

  // Handle view transitions with animation - Requirements: 15.3
  useEffect(() => {
    const hasVessel = !!selectedVessel;
    const hadVessel = !!prevVesselRef.current;
    
    if (hasVessel !== hadVessel && !prefersReducedMotion) {
      // Trigger animation on view change
      setAnimationClass('terminal-panel-enter');
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 200);
      
      setCurrentView(hasVessel ? 'vessel' : 'globe');
      prevVesselRef.current = selectedVessel;
      
      return () => clearTimeout(timer);
    }
    
    setCurrentView(hasVessel ? 'vessel' : 'globe');
    prevVesselRef.current = selectedVessel;
    return undefined;
  }, [selectedVessel, prefersReducedMotion]);

  // Requirements: 5.6, 9.1 - Show vessel info when vessel is selected
  if (currentView === 'vessel' && selectedVessel) {
    const vesselInfo = toVesselInfo(selectedVessel);
    
    return (
      <div
        className={`left-function-block vessel-info-view ${animationClass} ${className}`}
        data-testid={testId}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '8px',
          gap: '8px',
        }}
      >
        <TerminalVesselInfo
          vessel={vesselInfo}
          onClose={onCloseVesselInfo}
          onCenterMap={onCenterMap}
          onTrack={onTrack}
          onAnalysis={onAnalysis}
          isTracked={isVesselTracked}
          data-testid="terminal-vessel-info"
        />
        {/* Right block content merged when AI is on right */}
        {rightBlockContent}
      </div>
    );
  }

  // Requirements: 5.1, 6.1 - Show globe and gauges when no vessel selected
  return (
    <div
      className={`left-function-block globe-view ${animationClass} ${className}`}
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '8px',
        gap: '8px',
      }}
    >
      {/* Earth Globe - Requirements: 5.1 */}
      <TerminalWindow title="GLOBAL VIEW" borderStyle="single">
        <div style={{ 
          height: rightBlockContent ? '160px' : '220px', 
          width: '100%',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <EarthGlobe
            key="earth-globe-main"
            viewportBounds={viewportBounds}
            colorScheme={colorScheme}
            showCountries={true}
            data-testid="earth-globe"
          />
        </div>
      </TerminalWindow>

      {/* Fleet Status - Requirements: 6.1 */}
      {fleetStats && (
        <TerminalWindow title="FLEET STATUS" borderStyle="single">
          <div style={{ padding: '4px', fontSize: '11px', fontFamily: "'Share Tech Mono', monospace" }}>
            {/* Summary Gauges - Vertical Layout */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '8px',
                width: '100%',
              }}
            >
              <DigitalGauge
                value={fleetStats.databaseTotalVessels ?? fleetStats.totalVessels}
                label="TOTAL"
                digits={5}
                style="seven-segment"
                colorScheme={colorScheme}
                animated={true}
                horizontal={true}
                data-testid="gauge-total"
              />
              <DigitalGauge
                value={fleetStats.activeVessels}
                label="IN VIEW"
                digits={5}
                style="seven-segment"
                colorScheme={colorScheme}
                animated={true}
                horizontal={true}
                data-testid="gauge-active"
              />
              <DigitalGauge
                value={fleetStats.trackedVessels}
                label="TRACKED"
                digits={5}
                style="seven-segment"
                colorScheme={colorScheme}
                animated={true}
                horizontal={true}
                data-testid="gauge-tracked"
              />
            </div>

            {/* Status Breakdown - hide when right block is merged to save space */}
            {fleetStatusBreakdown && !rightBlockContent && (
              <div style={{ borderTop: '1px solid var(--terminal-dim)', paddingTop: '8px' }}>
                <div style={{ color: 'var(--terminal-dim)', fontSize: '10px', marginBottom: '6px' }}>
                  // NAV STATUS BREAKDOWN
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {fleetStatusBreakdown.underway > 0 && (
                    <FleetStatusRow label="UNDERWAY" count={fleetStatusBreakdown.underway} total={fleetStats.totalVessels} color="var(--terminal-success)" />
                  )}
                  {fleetStatusBreakdown.anchored > 0 && (
                    <FleetStatusRow label="ANCHORED" count={fleetStatusBreakdown.anchored} total={fleetStats.totalVessels} color="var(--terminal-accent)" />
                  )}
                  {fleetStatusBreakdown.moored > 0 && (
                    <FleetStatusRow label="MOORED" count={fleetStatusBreakdown.moored} total={fleetStats.totalVessels} color="var(--terminal-dim)" />
                  )}
                  {fleetStatusBreakdown.fishing > 0 && (
                    <FleetStatusRow label="FISHING" count={fleetStatusBreakdown.fishing} total={fleetStats.totalVessels} color="var(--terminal-success)" />
                  )}
                  {fleetStatusBreakdown.restricted > 0 && (
                    <FleetStatusRow label="RESTRICTED" count={fleetStatusBreakdown.restricted} total={fleetStats.totalVessels} color="var(--terminal-warning)" />
                  )}
                  {fleetStatusBreakdown.notUnderCommand > 0 && (
                    <FleetStatusRow label="NOT CMD" count={fleetStatusBreakdown.notUnderCommand} total={fleetStats.totalVessels} color="var(--terminal-error)" />
                  )}
                  {fleetStatusBreakdown.other > 0 && (
                    <FleetStatusRow label="OTHER" count={fleetStatusBreakdown.other} total={fleetStats.totalVessels} color="var(--terminal-dim)" />
                  )}
                </div>
              </div>
            )}
          </div>
        </TerminalWindow>
      )}

      {/* Right block content merged when AI is on right */}
      {rightBlockContent}
    </div>
  );
}

/**
 * Fleet Status Row Component
 */
function FleetStatusRow({ 
  label, 
  count, 
  total, 
  color 
}: { 
  label: string; 
  count: number; 
  total: number; 
  color: string;
}): JSX.Element {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 4px',
        borderLeft: `2px solid ${color}`,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
      }}
    >
      <span style={{ color: 'var(--terminal-fg)', fontSize: '10px' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color, fontWeight: 'bold', fontSize: '11px' }}>{count}</span>
        <span style={{ color: 'var(--terminal-dim)', fontSize: '9px' }}>({percentage}%)</span>
      </div>
    </div>
  );
}

export default LeftFunctionBlock;
