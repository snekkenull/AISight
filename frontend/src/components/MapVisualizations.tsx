/**
 * MapVisualizations Component
 * 
 * Renders map visualizations from AI analysis results.
 * Supports circles, lines, and points with custom styling.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import React from 'react';
import { Circle, Polyline, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type {
  MapVisualization,
  CircleVisualization,
  LineVisualization,
  PointVisualization,
} from '../types';

/**
 * Props for MapVisualizations component
 */
export interface MapVisualizationsProps {
  visualizations: MapVisualization[];
}

/**
 * Create a custom icon for point visualizations - terminal style
 */
function createPointIcon(icon?: string, color?: string): L.DivIcon {
  const displayIcon = icon || 'X';
  const iconColor = color || '#3b82f6';
  
  // Terminal-style marker with angular edges
  return L.divIcon({
    html: `<div style="
      font-size: 10px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-weight: bold;
      text-align: center;
      line-height: 24px;
      background-color: #0a0a0a;
      border: 2px solid ${iconColor};
      color: ${iconColor};
      clip-path: polygon(0 0, 100% 0, 100% 80%, 80% 100%, 0 100%);
      padding: 0 6px;
      min-width: 24px;
      height: 24px;
      box-shadow: 0 0 8px ${iconColor}, inset 0 0 4px rgba(0,0,0,0.5);
      text-shadow: 0 0 4px ${iconColor};
    ">${displayIcon}</div>`,
    className: 'visualization-marker eva-viz-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Render a circle visualization
 */
const CircleVisualizationComponent: React.FC<{
  viz: MapVisualization;
  data: CircleVisualization;
}> = ({ viz, data }) => {
  const center: [number, number] = [data.center.latitude, data.center.longitude];
  
  return (
    <Circle
      center={center}
      radius={data.radiusMeters}
      pathOptions={{
        color: viz.style.color,
        opacity: viz.style.opacity,
        weight: viz.style.weight || 2,
        fillColor: viz.style.fillColor || viz.style.color,
        fillOpacity: viz.style.fillOpacity || 0.2,
      }}
    >
      {viz.label && (
        <Tooltip 
          permanent 
          direction="top" 
          offset={[0, -10]}
          className="eva-viz-tooltip"
        >
          {viz.label}
        </Tooltip>
      )}
    </Circle>
  );
};

/**
 * Render a line visualization - terminal style with dashed pattern
 */
const LineVisualizationComponent: React.FC<{
  viz: MapVisualization;
  data: LineVisualization;
}> = ({ viz, data }) => {
  const positions: [number, number][] = data.points.map((point) => [
    point.latitude,
    point.longitude,
  ]);
  
  // Check if this is a projected path visualization
  const isProjectedPath = viz.label?.toLowerCase().includes('projected path');
  
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: viz.style.color,
        opacity: viz.style.opacity,
        weight: viz.style.weight || 3,
        dashArray: isProjectedPath ? '8, 4' : undefined,
        lineCap: 'square',
        className: isProjectedPath ? 'eva-projected-path' : undefined,
      }}
    >
      {viz.label && (
        <Tooltip 
          permanent 
          direction="top" 
          offset={[0, -10]}
          className="eva-viz-tooltip"
        >
          {viz.label}
        </Tooltip>
      )}
    </Polyline>
  );
};

/**
 * Render a point visualization - terminal style
 */
const PointVisualizationComponent: React.FC<{
  viz: MapVisualization;
  data: PointVisualization;
}> = ({ viz, data }) => {
  const position: [number, number] = [data.position.latitude, data.position.longitude];
  const icon = createPointIcon(data.icon, viz.style.color);
  
  // Check if this is a CPA warning point
  const isCpaWarning = viz.label?.toLowerCase().includes('cpa');
  
  return (
    <Marker position={position} icon={icon}>
      {viz.label && (
        <Tooltip 
          permanent 
          direction="top" 
          offset={[0, -20]}
          className={isCpaWarning ? 'eva-cpa-tooltip' : 'eva-viz-tooltip'}
        >
          {viz.label}
        </Tooltip>
      )}
    </Marker>
  );
};

/**
 * MapVisualizations Component
 * 
 * Renders all active visualizations on the map
 */
export const MapVisualizations: React.FC<MapVisualizationsProps> = ({ visualizations }) => {
  // Don't render anything if no visualizations
  if (!visualizations || visualizations.length === 0) {
    return null;
  }

  return (
    <>
      {visualizations.map((viz) => {
        switch (viz.type) {
          case 'circle':
            return (
              <CircleVisualizationComponent
                key={viz.id}
                viz={viz}
                data={viz.data as CircleVisualization}
              />
            );
          
          case 'line':
            return (
              <LineVisualizationComponent
                key={viz.id}
                viz={viz}
                data={viz.data as LineVisualization}
              />
            );
          
          case 'point':
            return (
              <PointVisualizationComponent
                key={viz.id}
                viz={viz}
                data={viz.data as PointVisualization}
              />
            );
          
          default:
            console.warn(`Unknown visualization type: ${viz.type}`);
            return null;
        }
      })}
    </>
  );
};
