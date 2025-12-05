/**
 * EarthGlobe Component
 * 
 * P5.js rendered 3D Earth globe with GeoJSON boundaries.
 * Highlights current map viewport location.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * - Display P5.js rendered 3D Earth globe
 * - Load and display GeoJSON country boundaries
 * - Highlight current viewport location on globe
 * - Apply EVA terminal color styling (wireframe aesthetic)
 * - Animate with slow rotation when idle
 * - Replace with vessel info panel when vessel selected
 */

import { useRef, useEffect, useState } from 'react';
import p5 from 'p5';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { TerminalColorScheme } from '../../types/terminal-theme';

/**
 * Viewport bounds for highlighting on globe
 */
export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Props for EarthGlobe component
 */
export interface EarthGlobeProps {
  /** Current map viewport bounds to highlight */
  viewportBounds?: ViewportBounds;
  /** Terminal color scheme to apply */
  colorScheme: TerminalColorScheme;
  /** Rotation speed multiplier (default: 1) */
  rotationSpeed?: number;
  /** Whether to show country boundaries (default: true) */
  showCountries?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Simplified world GeoJSON data (major landmasses as polygons)
 * Coordinates are [lon, lat] pairs in nested arrays
 */
const SIMPLIFIED_WORLD_DATA: Array<{
  name: string;
  coordinates: Array<[number, number]>;
}> = [
  // North America
  {
    name: 'North America',
    coordinates: [
      [-170, 65], [-140, 70], [-100, 70], [-80, 70], [-60, 50],
      [-80, 25], [-100, 20], [-120, 30], [-130, 40], [-170, 55], [-170, 65]
    ]
  },
  // South America
  {
    name: 'South America',
    coordinates: [
      [-80, 10], [-60, 5], [-35, -5], [-40, -20], [-55, -25],
      [-70, -55], [-75, -45], [-80, -5], [-80, 10]
    ]
  },
  // Europe
  {
    name: 'Europe',
    coordinates: [
      [-10, 35], [0, 40], [10, 45], [30, 45], [40, 50],
      [30, 70], [10, 70], [-10, 60], [-10, 35]
    ]
  },
  // Africa
  {
    name: 'Africa',
    coordinates: [
      [-20, 35], [10, 35], [35, 30], [50, 10], [50, -10],
      [35, -35], [20, -35], [10, -20], [-10, 5], [-20, 15], [-20, 35]
    ]
  },
  // Asia
  {
    name: 'Asia',
    coordinates: [
      [40, 45], [60, 50], [80, 50], [100, 55], [130, 60],
      [170, 65], [170, 50], [140, 35], [120, 25], [100, 10],
      [80, 10], [60, 25], [40, 35], [40, 45]
    ]
  },
  // Australia
  {
    name: 'Australia',
    coordinates: [
      [115, -20], [130, -15], [150, -15], [155, -25],
      [150, -40], [135, -35], [115, -30], [115, -20]
    ]
  },
  // Antarctica (simplified)
  {
    name: 'Antarctica',
    coordinates: [
      [-180, -65], [-90, -70], [0, -70], [90, -70], [180, -65],
      [180, -85], [-180, -85], [-180, -65]
    ]
  }
];

/**
 * Convert lat/lon to 3D coordinates on a sphere
 * Uses standard spherical coordinate conversion:
 * - phi (polar angle): measured from north pole (0° at north, 180° at south)
 * - theta (azimuthal angle): measured from prime meridian
 */
function latLonToXYZ(lat: number, lon: number, radius: number): [number, number, number] {
  // Convert latitude to polar angle (0 at north pole, PI at south pole)
  const phi = (90 - lat) * (Math.PI / 180);
  // Convert longitude to azimuthal angle (rotate to align with P5.js coordinate system)
  const theta = lon * (Math.PI / 180);
  
  // Standard spherical to Cartesian conversion
  // x: east-west (positive = east)
  // y: up-down (negative = north/up in P5.js WEBGL where +y is down)
  // z: forward-back (positive = toward viewer)
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = -radius * Math.cos(phi); // Negate because P5.js WEBGL has +y pointing down
  const z = radius * Math.sin(phi) * Math.cos(theta);
  
  return [x, y, z];
}

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ];
  }
  return [255, 255, 255];
}

/**
 * EarthGlobe Component
 * 
 * Renders a 3D wireframe globe using P5.js with WEBGL.
 * Shows country boundaries and highlights the current map viewport.
 */
export function EarthGlobe({
  viewportBounds,
  colorScheme,
  rotationSpeed = 1,
  showCountries = true,
  className = '',
  'data-testid': testId,
}: EarthGlobeProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const [dimensions, setDimensions] = useState({ width: 250, height: 250 });
  
  // Store props in refs for access in sketch
  const viewportBoundsRef = useRef(viewportBounds);
  const colorSchemeRef = useRef(colorScheme);
  const rotationSpeedRef = useRef(rotationSpeed);
  const showCountriesRef = useRef(showCountries);
  const reducedMotionRef = useRef(prefersReducedMotion);
  
  // Update refs when props change
  useEffect(() => {
    viewportBoundsRef.current = viewportBounds;
  }, [viewportBounds]);
  
  useEffect(() => {
    colorSchemeRef.current = colorScheme;
  }, [colorScheme]);
  
  useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);
  
  useEffect(() => {
    showCountriesRef.current = showCountries;
  }, [showCountries]);
  
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  // Handle resize and visibility changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Only update if container has valid dimensions
        if (rect.width > 0 && rect.height > 0) {
          const size = Math.min(rect.width, rect.height, 250);
          setDimensions({ width: size, height: size });
        }
      }
    };
    
    // Initial update with a small delay to ensure container is rendered
    const initialTimer = setTimeout(updateDimensions, 50);
    
    // Also update when container becomes visible
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      clearTimeout(initialTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Create P5 sketch
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Don't create sketch if dimensions are invalid
    if (dimensions.width <= 0 || dimensions.height <= 0) return;
    
    // Clean up existing instance and any orphaned canvases
    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    }
    
    // Also remove any existing canvas elements in the container
    if (containerRef.current) {
      const existingCanvases = containerRef.current.querySelectorAll('canvas');
      existingCanvases.forEach(canvas => canvas.remove());
    }
    
    const sketch = (p: p5) => {
      let rotationY = 0;
      const rotationX = -0.3; // Slight tilt
      const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
      
      p.setup = () => {
        const canvas = p.createCanvas(dimensions.width, dimensions.height, p.WEBGL);
        // Center the canvas within the container
        canvas.style('display', 'block');
        canvas.style('margin', '0 auto');
        canvas.style('position', 'absolute');
        canvas.style('left', '50%');
        canvas.style('top', '50%');
        canvas.style('transform', 'translate(-50%, -50%)');
        p.frameRate(30);
      };
      
      p.draw = () => {
        const scheme = colorSchemeRef.current;
        const bgColor = hexToRgb(scheme.colors.background);
        const fgColor = hexToRgb(scheme.colors.foreground);
        const dimColor = hexToRgb(scheme.colors.dim);
        const accentColor = hexToRgb(scheme.colors.accent);
        
        p.background(bgColor[0], bgColor[1], bgColor[2]);
        
        // Apply rotation - Requirements: 5.5
        if (!reducedMotionRef.current) {
          rotationY += 0.003 * rotationSpeedRef.current;
        }
        
        p.rotateX(rotationX);
        p.rotateY(rotationY);
        
        // Draw wireframe sphere - Requirements: 5.4
        p.noFill();
        p.stroke(dimColor[0], dimColor[1], dimColor[2], 100);
        p.strokeWeight(0.5);
        
        // Draw latitude lines
        for (let lat = -80; lat <= 80; lat += 20) {
          p.beginShape();
          for (let lon = -180; lon <= 180; lon += 10) {
            const [x, y, z] = latLonToXYZ(lat, lon, radius);
            p.vertex(x, y, z);
          }
          p.endShape();
        }
        
        // Draw longitude lines
        for (let lon = -180; lon < 180; lon += 20) {
          p.beginShape();
          for (let lat = -90; lat <= 90; lat += 10) {
            const [x, y, z] = latLonToXYZ(lat, lon, radius);
            p.vertex(x, y, z);
          }
          p.endShape();
        }
        
        // Draw country boundaries - Requirements: 5.2
        if (showCountriesRef.current) {
          p.stroke(fgColor[0], fgColor[1], fgColor[2], 200);
          p.strokeWeight(1);
          
          for (const region of SIMPLIFIED_WORLD_DATA) {
            p.beginShape();
            for (const coord of region.coordinates) {
              const [lon, lat] = coord;
              const [x, y, z] = latLonToXYZ(lat, lon, radius * 1.01);
              p.vertex(x, y, z);
            }
            p.endShape(p.CLOSE);
          }
        }
        
        // Draw viewport highlight - Requirements: 5.3
        const bounds = viewportBoundsRef.current;
        if (bounds) {
          p.stroke(accentColor[0], accentColor[1], accentColor[2], 255);
          p.strokeWeight(2);
          
          // Draw viewport rectangle on globe
          const highlightRadius = radius * 1.02;
          
          // Top edge
          p.beginShape();
          for (let lon = bounds.west; lon <= bounds.east; lon += 5) {
            const [x, y, z] = latLonToXYZ(bounds.north, lon, highlightRadius);
            p.vertex(x, y, z);
          }
          p.endShape();
          
          // Bottom edge
          p.beginShape();
          for (let lon = bounds.west; lon <= bounds.east; lon += 5) {
            const [x, y, z] = latLonToXYZ(bounds.south, lon, highlightRadius);
            p.vertex(x, y, z);
          }
          p.endShape();
          
          // Left edge
          p.beginShape();
          for (let lat = bounds.south; lat <= bounds.north; lat += 5) {
            const [x, y, z] = latLonToXYZ(lat, bounds.west, highlightRadius);
            p.vertex(x, y, z);
          }
          p.endShape();
          
          // Right edge
          p.beginShape();
          for (let lat = bounds.south; lat <= bounds.north; lat += 5) {
            const [x, y, z] = latLonToXYZ(lat, bounds.east, highlightRadius);
            p.vertex(x, y, z);
          }
          p.endShape();
          
          // Draw corner markers
          const corners: Array<[number, number]> = [
            [bounds.north, bounds.west],
            [bounds.north, bounds.east],
            [bounds.south, bounds.west],
            [bounds.south, bounds.east],
          ];
          
          p.strokeWeight(4);
          for (const [lat, lon] of corners) {
            const [x, y, z] = latLonToXYZ(lat, lon, highlightRadius);
            p.point(x, y, z);
          }
        }
      };
      
      p.windowResized = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const size = Math.min(rect.width, rect.height, 250);
          p.resizeCanvas(size, size);
        }
      };
    };
    
    p5InstanceRef.current = new p5(sketch, containerRef.current);
    
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [dimensions.width, dimensions.height]);

  return (
    <div
      ref={containerRef}
      className={`earth-globe ${className}`}
      data-testid={testId}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    />
  );
}

export default EarthGlobe;
