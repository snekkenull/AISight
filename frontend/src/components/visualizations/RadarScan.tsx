/**
 * RadarScan Component
 * 
 * Animated radar sweep display showing nearby vessels relative to a selected vessel.
 * Displays in the right function block when a vessel is selected.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 14.5
 * - Display radar scan visualization in right function block when vessel selected
 * - Display circular radar sweep animation
 * - Show nearby vessels as blips relative to selected vessel's position
 * - Display range rings with distance labels
 * - Apply terminal color scheme with phosphor glow effects
 * - Display idle scanning animation or placeholder when no vessel selected
 * - Play radar ping sound on sweep
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TerminalColorScheme } from '../../types/terminal-theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { soundService } from '../../services/SoundService';

/**
 * Vessel data for radar display
 */
export interface RadarVessel {
  mmsi: string;
  name?: string;
  latitude: number;
  longitude: number;
  sog?: number;
  cog?: number;
}

/**
 * Props for RadarScan component
 */
export interface RadarScanProps {
  /** Center vessel (selected vessel) */
  centerVessel?: RadarVessel;
  /** Nearby vessels to display as blips */
  nearbyVessels: RadarVessel[];
  /** Range in nautical miles */
  range: number;
  /** Terminal color scheme */
  colorScheme: TerminalColorScheme;
  /** Sweep speed in degrees per second */
  sweepSpeed?: number;
  /** Whether to show range rings */
  showRangeRings?: boolean;
  /** Component width */
  width?: number;
  /** Component height */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Calculate distance between two coordinates in nautical miles
 */
function calculateDistanceNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing from one coordinate to another in degrees
 */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;
  return bearing;
}

/**
 * Convert polar coordinates to cartesian for SVG
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  // Adjust angle so 0 degrees is at top (north)
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * RadarScan Component
 * 
 * Renders an animated radar sweep display with vessel blips
 * and terminal-style visual effects.
 */
export function RadarScan({
  centerVessel,
  nearbyVessels,
  range,
  colorScheme,
  sweepSpeed = 30,
  showRangeRings = true,
  width = 280,
  height = 280,
  className = '',
  'data-testid': testId,
}: RadarScanProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [sweepAngle, setSweepAngle] = useState(0);

  // Radar dimensions
  const padding = 30;
  const radarRadius = Math.min(width, height) / 2 - padding;
  const centerX = width / 2;
  const centerY = height / 2;

  // Track last ping time to avoid too frequent pings
  const lastPingRef = useRef<number>(0);

  // Animate sweep - Requirements: 8.2, 14.5, 15.5
  useEffect(() => {
    if (prefersReducedMotion || !centerVessel) {
      return;
    }

    const interval = setInterval(() => {
      setSweepAngle((prev) => {
        const newAngle = (prev + sweepSpeed / 60) % 360;
        
        // Play radar ping when sweep passes north (0 degrees) - Requirements: 14.5
        // Only ping once per rotation (every ~12 seconds at 30 deg/sec)
        const now = Date.now();
        if (prev > 350 && newAngle < 10 && now - lastPingRef.current > 5000) {
          soundService.play('radar-ping');
          lastPingRef.current = now;
        }
        
        return newAngle;
      });
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(interval);
  }, [prefersReducedMotion, sweepSpeed, centerVessel]);

  // Calculate vessel blips - Requirements: 8.3
  const vesselBlips = useMemo(() => {
    if (!centerVessel) return [];

    return nearbyVessels
      .filter((v) => v.mmsi !== centerVessel.mmsi)
      .map((vessel) => {
        const distance = calculateDistanceNm(
          centerVessel.latitude,
          centerVessel.longitude,
          vessel.latitude,
          vessel.longitude
        );
        const bearing = calculateBearing(
          centerVessel.latitude,
          centerVessel.longitude,
          vessel.latitude,
          vessel.longitude
        );

        // Scale distance to radar radius
        const scaledDistance = (distance / range) * radarRadius;
        const position = polarToCartesian(centerX, centerY, scaledDistance, bearing);

        // Check if within range
        const inRange = distance <= range;

        return {
          ...vessel,
          distance,
          bearing,
          x: position.x,
          y: position.y,
          inRange,
        };
      })
      .filter((v) => v.inRange);
  }, [centerVessel, nearbyVessels, range, radarRadius, centerX, centerY]);

  // Generate range rings - Requirements: 8.4
  const rangeRings = useMemo(() => {
    if (!showRangeRings) return [];

    const ringCount = 4;
    const rings = [];

    for (let i = 1; i <= ringCount; i++) {
      const ringRadius = (radarRadius / ringCount) * i;
      const ringRange = (range / ringCount) * i;
      rings.push({
        radius: ringRadius,
        range: ringRange,
      });
    }

    return rings;
  }, [showRangeRings, radarRadius, range]);

  // Generate sweep gradient for afterglow trail - Requirements: 8.2
  const sweepGradientId = `radar-sweep-gradient-${testId || 'default'}`;

  // Calculate sweep line end point
  const sweepEnd = polarToCartesian(centerX, centerY, radarRadius, sweepAngle);

  // Generate afterglow arc path
  const generateAfterglowPath = useCallback(
    (startAngle: number, endAngle: number, radius: number): string => {
      const start = polarToCartesian(centerX, centerY, radius, startAngle);
      const end = polarToCartesian(centerX, centerY, radius, endAngle);
      const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

      return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
    },
    [centerX, centerY]
  );

  // Requirements: 8.6 - Display idle state when no vessel selected
  if (!centerVessel) {
    return (
      <div
        className={`radar-scan radar-scan-idle ${className}`}
        data-testid={testId}
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Share Tech Mono', monospace",
          color: colorScheme.colors.dim,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          border: `1px solid ${colorScheme.colors.dim}`,
          position: 'relative',
        }}
      >
        {/* Idle radar display */}
        <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radarRadius}
            fill="none"
            stroke={colorScheme.colors.dim}
            strokeWidth={1}
            opacity={0.3}
          />
          {/* Cross hairs */}
          <line
            x1={centerX - radarRadius}
            y1={centerY}
            x2={centerX + radarRadius}
            y2={centerY}
            stroke={colorScheme.colors.dim}
            strokeWidth={0.5}
            opacity={0.3}
          />
          <line
            x1={centerX}
            y1={centerY - radarRadius}
            x2={centerX}
            y2={centerY + radarRadius}
            stroke={colorScheme.colors.dim}
            strokeWidth={0.5}
            opacity={0.3}
          />
        </svg>
        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', zIndex: 1 }}>
          RADAR STANDBY
        </div>
        <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7, zIndex: 1 }}>
          SELECT VESSEL TO ACTIVATE
        </div>
      </div>
    );
  }

  return (
    <div
      className={`radar-scan ${className}`}
      data-testid={testId}
      style={{
        width,
        height,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        border: `1px solid ${colorScheme.colors.dim}`,
        position: 'relative',
      }}
    >
      <svg width={width} height={height}>
        <defs>
          {/* Sweep gradient for afterglow effect - Requirements: 8.2 */}
          <linearGradient
            id={sweepGradientId}
            gradientUnits="userSpaceOnUse"
            x1={centerX}
            y1={centerY}
            x2={sweepEnd.x}
            y2={sweepEnd.y}
          >
            <stop offset="0%" stopColor={colorScheme.phosphorGlow} stopOpacity="0" />
            <stop offset="100%" stopColor={colorScheme.phosphorGlow} stopOpacity="0.8" />
          </linearGradient>

          {/* Glow filter for phosphor effect - Requirements: 8.5 */}
          <filter id={`radar-glow-${testId || 'default'}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Radar background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radarRadius}
          fill="rgba(0, 0, 0, 0.3)"
          stroke={colorScheme.colors.dim}
          strokeWidth={1}
        />

        {/* Range rings - Requirements: 8.4 */}
        {rangeRings.map((ring, index) => (
          <g key={`ring-${index}`}>
            <circle
              cx={centerX}
              cy={centerY}
              r={ring.radius}
              fill="none"
              stroke={colorScheme.colors.dim}
              strokeWidth={0.5}
              strokeDasharray="4,4"
              opacity={0.4}
            />
            {/* Range label */}
            <text
              x={centerX + ring.radius + 3}
              y={centerY - 3}
              fill={colorScheme.colors.dim}
              fontSize="8px"
              fontFamily="'Share Tech Mono', monospace"
              opacity={0.7}
            >
              {ring.range.toFixed(1)}NM
            </text>
          </g>
        ))}

        {/* Cross hairs */}
        <line
          x1={centerX - radarRadius}
          y1={centerY}
          x2={centerX + radarRadius}
          y2={centerY}
          stroke={colorScheme.colors.dim}
          strokeWidth={0.5}
          opacity={0.3}
        />
        <line
          x1={centerX}
          y1={centerY - radarRadius}
          x2={centerX}
          y2={centerY + radarRadius}
          stroke={colorScheme.colors.dim}
          strokeWidth={0.5}
          opacity={0.3}
        />

        {/* Cardinal direction labels */}
        <text
          x={centerX}
          y={centerY - radarRadius - 5}
          textAnchor="middle"
          fill={colorScheme.colors.foreground}
          fontSize="10px"
          fontFamily="'Share Tech Mono', monospace"
        >
          N
        </text>
        <text
          x={centerX}
          y={centerY + radarRadius + 12}
          textAnchor="middle"
          fill={colorScheme.colors.dim}
          fontSize="10px"
          fontFamily="'Share Tech Mono', monospace"
        >
          S
        </text>
        <text
          x={centerX + radarRadius + 8}
          y={centerY + 3}
          textAnchor="start"
          fill={colorScheme.colors.dim}
          fontSize="10px"
          fontFamily="'Share Tech Mono', monospace"
        >
          E
        </text>
        <text
          x={centerX - radarRadius - 8}
          y={centerY + 3}
          textAnchor="end"
          fill={colorScheme.colors.dim}
          fontSize="10px"
          fontFamily="'Share Tech Mono', monospace"
        >
          W
        </text>

        {/* Sweep afterglow trail - Requirements: 8.2 */}
        {!prefersReducedMotion && (
          <path
            d={generateAfterglowPath(sweepAngle - 45, sweepAngle, radarRadius)}
            fill={colorScheme.phosphorGlow}
            opacity={0.15}
          />
        )}

        {/* Sweep line - Requirements: 8.2 */}
        <line
          x1={centerX}
          y1={centerY}
          x2={sweepEnd.x}
          y2={sweepEnd.y}
          stroke={colorScheme.phosphorGlow}
          strokeWidth={2}
          opacity={prefersReducedMotion ? 0.5 : 1}
          style={{
            filter: `drop-shadow(0 0 4px ${colorScheme.phosphorGlow})`,
          }}
        />

        {/* Vessel blips - Requirements: 8.3 */}
        {vesselBlips.map((blip) => {
          // Calculate if blip was recently swept (for glow effect)
          const blipAngle = blip.bearing;
          const angleDiff = ((sweepAngle - blipAngle + 360) % 360);
          const recentlySweep = angleDiff < 90 && angleDiff > 0;
          const blipOpacity = prefersReducedMotion ? 0.8 : (recentlySweep ? 1 : 0.4 + (1 - angleDiff / 360) * 0.4);

          return (
            <g key={blip.mmsi}>
              {/* Blip dot */}
              <circle
                cx={blip.x}
                cy={blip.y}
                r={4}
                fill={colorScheme.colors.foreground}
                opacity={blipOpacity}
                style={{
                  filter: recentlySweep && !prefersReducedMotion
                    ? `drop-shadow(0 0 6px ${colorScheme.phosphorGlow})`
                    : 'none',
                }}
              />
              {/* Blip label */}
              <text
                x={blip.x + 6}
                y={blip.y - 6}
                fill={colorScheme.colors.foreground}
                fontSize="7px"
                fontFamily="'Share Tech Mono', monospace"
                opacity={blipOpacity * 0.8}
              >
                {blip.name?.substring(0, 8) || blip.mmsi.substring(0, 6)}
              </text>
            </g>
          );
        })}

        {/* Center point (selected vessel) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={5}
          fill={colorScheme.colors.accent}
          style={{
            filter: `drop-shadow(0 0 4px ${colorScheme.phosphorGlow})`,
          }}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill="none"
          stroke={colorScheme.colors.accent}
          strokeWidth={1}
          opacity={0.5}
        />
      </svg>

      {/* Status text */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 8,
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '8px',
          color: colorScheme.colors.dim,
          textTransform: 'uppercase',
        }}
      >
        RNG: {range}NM | TGT: {vesselBlips.length}
      </div>
    </div>
  );
}

export default RadarScan;
