/**
 * TrackChart Component
 * 
 * Vessel trajectory visualization as a line chart showing position history.
 * Displays in the right function block when a vessel is selected.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * - Display track chart in right function block when vessel selected
 * - Display vessel's position history as a line graph
 * - Display axis labels with coordinate or time information
 * - Apply terminal styling with grid lines and monospace labels
 * - Display placeholder or idle state message when no vessel selected
 */

import { useMemo } from 'react';
import { TerminalColorScheme } from '../../types/terminal-theme';

/**
 * Position data point for track history
 */
export interface TrackPosition {
  latitude: number;
  longitude: number;
  timestamp: string;
  sog?: number;
  cog?: number;
}

/**
 * Props for TrackChart component
 */
export interface TrackChartProps {
  /** Track history positions */
  trackHistory: TrackPosition[];
  /** Terminal color scheme */
  colorScheme: TerminalColorScheme;
  /** Whether to show grid lines */
  showGrid?: boolean;
  /** Whether to show axis labels */
  showLabels?: boolean;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Calculate bounds from track positions
 */
function calculateBounds(positions: TrackPosition[]): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  if (positions.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }

  let minLat = positions[0].latitude;
  let maxLat = positions[0].latitude;
  let minLon = positions[0].longitude;
  let maxLon = positions[0].longitude;

  for (const pos of positions) {
    minLat = Math.min(minLat, pos.latitude);
    maxLat = Math.max(maxLat, pos.latitude);
    minLon = Math.min(minLon, pos.longitude);
    maxLon = Math.max(maxLon, pos.longitude);
  }

  // Add padding to bounds
  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  const lonPadding = (maxLon - minLon) * 0.1 || 0.01;

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLon: minLon - lonPadding,
    maxLon: maxLon + lonPadding,
  };
}

/**
 * Format coordinate for display
 */
function formatCoord(value: number, isLat: boolean): string {
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${Math.abs(value).toFixed(2)}${dir}`;
}

/**
 * Format time for display
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * TrackChart Component
 * 
 * Renders a line chart visualization of vessel position history
 * with terminal-style grid lines and monospace labels.
 */
export function TrackChart({
  trackHistory,
  colorScheme,
  showGrid = true,
  showLabels = true,
  width = 280,
  height = 200,
  className = '',
  'data-testid': testId,
}: TrackChartProps): JSX.Element {
  // Chart margins for labels
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate bounds and scale positions
  const { bounds, scaledPositions, pathData } = useMemo(() => {
    if (trackHistory.length === 0) {
      return { bounds: null, scaledPositions: [], pathData: '' };
    }

    const bounds = calculateBounds(trackHistory);
    const latRange = bounds.maxLat - bounds.minLat;
    const lonRange = bounds.maxLon - bounds.minLon;

    const scaledPositions = trackHistory.map((pos, index) => {
      const x = lonRange > 0 
        ? ((pos.longitude - bounds.minLon) / lonRange) * chartWidth 
        : chartWidth / 2;
      const y = latRange > 0 
        ? chartHeight - ((pos.latitude - bounds.minLat) / latRange) * chartHeight 
        : chartHeight / 2;
      return { x, y, pos, index };
    });

    // Create SVG path data
    const pathData = scaledPositions
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return { bounds, scaledPositions, pathData };
  }, [trackHistory, chartWidth, chartHeight]);

  // Generate grid lines - MUST be called before any early return to follow React hooks rules
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const gridCount = 4;

    // Horizontal grid lines (latitude)
    for (let i = 0; i <= gridCount; i++) {
      const y = (i / gridCount) * chartHeight;
      lines.push(
        <line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={chartWidth}
          y2={y}
          stroke={colorScheme.colors.dim}
          strokeWidth={0.5}
          strokeDasharray="2,4"
          opacity={0.3}
        />
      );
    }

    // Vertical grid lines (longitude)
    for (let i = 0; i <= gridCount; i++) {
      const x = (i / gridCount) * chartWidth;
      lines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={chartHeight}
          stroke={colorScheme.colors.dim}
          strokeWidth={0.5}
          strokeDasharray="2,4"
          opacity={0.3}
        />
      );
    }

    return lines;
  }, [chartWidth, chartHeight, colorScheme.colors.dim]);

  // Generate axis labels
  const axisLabels = useMemo(() => {
    if (!showLabels || !bounds) return null;

    const labels: JSX.Element[] = [];
    const labelCount = 3;

    // Y-axis labels (latitude)
    for (let i = 0; i <= labelCount; i++) {
      const lat = bounds.minLat + ((bounds.maxLat - bounds.minLat) * (labelCount - i)) / labelCount;
      const y = (i / labelCount) * chartHeight;
      labels.push(
        <text
          key={`lat-${i}`}
          x={-5}
          y={y + 3}
          textAnchor="end"
          fill={colorScheme.colors.dim}
          fontSize="8px"
          fontFamily="'Share Tech Mono', monospace"
        >
          {formatCoord(lat, true)}
        </text>
      );
    }

    // X-axis labels (longitude)
    for (let i = 0; i <= labelCount; i++) {
      const lon = bounds.minLon + ((bounds.maxLon - bounds.minLon) * i) / labelCount;
      const x = (i / labelCount) * chartWidth;
      labels.push(
        <text
          key={`lon-${i}`}
          x={x}
          y={chartHeight + 12}
          textAnchor="middle"
          fill={colorScheme.colors.dim}
          fontSize="8px"
          fontFamily="'Share Tech Mono', monospace"
        >
          {formatCoord(lon, false)}
        </text>
      );
    }

    return labels;
  }, [showLabels, bounds, chartWidth, chartHeight, colorScheme.colors.dim]);

  // Time labels for first and last points
  const timeLabels = useMemo(() => {
    if (!showLabels || trackHistory.length < 2) return null;

    const firstTime = formatTime(trackHistory[0].timestamp);
    const lastTime = formatTime(trackHistory[trackHistory.length - 1].timestamp);

    return (
      <text
        x={chartWidth / 2}
        y={chartHeight + 24}
        textAnchor="middle"
        fill={colorScheme.colors.dim}
        fontSize="8px"
        fontFamily="'Share Tech Mono', monospace"
      >
        {firstTime} - {lastTime}
      </text>
    );
  }, [showLabels, trackHistory, chartWidth, chartHeight, colorScheme.colors.dim]);

  // Requirements: 7.5 - Display placeholder when no data
  if (trackHistory.length === 0 || !bounds) {
    return (
      <div
        className={`track-chart track-chart-idle ${className}`}
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
        }}
      >
        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          NO TRACK DATA
        </div>
        <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          SELECT VESSEL TO VIEW TRAJECTORY
        </div>
      </div>
    );
  }

  return (
    <div
      className={`track-chart ${className}`}
      data-testid={testId}
      style={{
        width,
        height,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        border: `1px solid ${colorScheme.colors.dim}`,
      }}
    >
      <svg width={width} height={height}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines - Requirements: 7.4 */}
          {showGrid && gridLines}

          {/* Track path - Requirements: 7.2 */}
          <path
            d={pathData}
            fill="none"
            stroke={colorScheme.colors.foreground}
            strokeWidth={1.5}
            style={{
              filter: `drop-shadow(0 0 3px ${colorScheme.phosphorGlow})`,
            }}
          />

          {/* Position points */}
          {scaledPositions.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === scaledPositions.length - 1 ? 4 : 2}
              fill={i === scaledPositions.length - 1 
                ? colorScheme.colors.accent 
                : colorScheme.colors.foreground}
              style={{
                filter: i === scaledPositions.length - 1 
                  ? `drop-shadow(0 0 4px ${colorScheme.phosphorGlow})` 
                  : 'none',
              }}
            />
          ))}

          {/* Start marker */}
          {scaledPositions.length > 0 && (
            <text
              x={scaledPositions[0].x}
              y={scaledPositions[0].y - 8}
              textAnchor="middle"
              fill={colorScheme.colors.dim}
              fontSize="8px"
              fontFamily="'Share Tech Mono', monospace"
            >
              START
            </text>
          )}

          {/* End marker */}
          {scaledPositions.length > 1 && (
            <text
              x={scaledPositions[scaledPositions.length - 1].x}
              y={scaledPositions[scaledPositions.length - 1].y - 8}
              textAnchor="middle"
              fill={colorScheme.colors.accent}
              fontSize="8px"
              fontFamily="'Share Tech Mono', monospace"
            >
              NOW
            </text>
          )}

          {/* Axis labels - Requirements: 7.3 */}
          {axisLabels}
          {timeLabels}
        </g>
      </svg>
    </div>
  );
}

export default TrackChart;
