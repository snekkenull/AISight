/**
 * DigitalGauge Component
 * 
 * Seven-segment or dot-matrix style numeric display for fleet statistics.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * - Display digital gauges for fleet status metrics
 * - Use seven-segment or dot-matrix style numeric displays
 * - Animate digit transitions with rolling/flickering effect
 * - Use uppercase monospace text with terminal styling for labels
 * - Apply current terminal color scheme
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { TerminalColorScheme } from '../../types/terminal-theme';

/**
 * Props for DigitalGauge component
 */
export interface DigitalGaugeProps {
  /** Current value to display */
  value: number;
  /** Label text (displayed in uppercase) */
  label: string;
  /** Custom format function for the value */
  format?: (value: number) => string;
  /** Number of digits to display (pads with leading zeros) */
  digits?: number;
  /** Display style */
  style?: 'seven-segment' | 'dot-matrix';
  /** Terminal color scheme */
  colorScheme: TerminalColorScheme;
  /** Whether to animate value changes */
  animated?: boolean;
  /** Horizontal layout (label on left, value on right) */
  horizontal?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Seven-segment digit patterns
 * Each segment is represented as: [top, topRight, bottomRight, bottom, bottomLeft, topLeft, middle]
 */
const SEVEN_SEGMENT_PATTERNS: Record<string, boolean[]> = {
  '0': [true, true, true, true, true, true, false],
  '1': [false, true, true, false, false, false, false],
  '2': [true, true, false, true, true, false, true],
  '3': [true, true, true, true, false, false, true],
  '4': [false, true, true, false, false, true, true],
  '5': [true, false, true, true, false, true, true],
  '6': [true, false, true, true, true, true, true],
  '7': [true, true, true, false, false, false, false],
  '8': [true, true, true, true, true, true, true],
  '9': [true, true, true, true, false, true, true],
  '-': [false, false, false, false, false, false, true],
  ' ': [false, false, false, false, false, false, false],
  '.': [false, false, false, false, false, false, false], // Handled separately
};

/**
 * Single seven-segment digit component
 */
interface SevenSegmentDigitProps {
  digit: string;
  color: string;
  dimColor: string;
  glowColor: string;
  size?: number;
  flickering?: boolean;
}

/**
 * Creates a hexagonal/beveled segment path for authentic LED look
 */
function createSegmentPath(
  x: number,
  y: number,
  length: number,
  thickness: number,
  horizontal: boolean
): string {
  const bevel = thickness * 0.4;
  
  if (horizontal) {
    // Horizontal segment (pointed ends like < >)
    return `M ${x + bevel} ${y}
            L ${x + length - bevel} ${y}
            L ${x + length} ${y + thickness / 2}
            L ${x + length - bevel} ${y + thickness}
            L ${x + bevel} ${y + thickness}
            L ${x} ${y + thickness / 2}
            Z`;
  } else {
    // Vertical segment (pointed ends like ^ v)
    return `M ${x} ${y + bevel}
            L ${x + thickness / 2} ${y}
            L ${x + thickness} ${y + bevel}
            L ${x + thickness} ${y + length - bevel}
            L ${x + thickness / 2} ${y + length}
            L ${x} ${y + length - bevel}
            Z`;
  }
}

function SevenSegmentDigit({
  digit,
  color,
  dimColor,
  glowColor,
  size = 24,
  flickering = false,
}: SevenSegmentDigitProps): JSX.Element {
  const pattern = SEVEN_SEGMENT_PATTERNS[digit] || SEVEN_SEGMENT_PATTERNS[' '];
  
  // Sizing for better readability - carefully calculated to fit viewBox
  const segmentThickness = 3;
  const hSegmentLength = 10;
  const vSegmentLength = 9;
  const gap = 0.8;
  const padding = 1.5;
  
  // Calculate viewBox dimensions based on segment layout
  const viewBoxWidth = padding * 2 + segmentThickness + gap * 2 + hSegmentLength;
  const viewBoxHeight = padding * 2 + segmentThickness * 3 + gap * 4 + vSegmentLength * 2;
  
  // Segment definitions: [x, y, length, horizontal]
  const segmentDefs: [number, number, number, boolean][] = [
    // Top horizontal (a)
    [padding + segmentThickness / 2 + gap, padding, hSegmentLength, true],
    // Top right vertical (b)
    [padding + segmentThickness / 2 + gap + hSegmentLength + gap, padding + segmentThickness / 2 + gap, vSegmentLength, false],
    // Bottom right vertical (c)
    [padding + segmentThickness / 2 + gap + hSegmentLength + gap, padding + segmentThickness * 1.5 + gap * 2 + vSegmentLength, vSegmentLength, false],
    // Bottom horizontal (d)
    [padding + segmentThickness / 2 + gap, padding + segmentThickness * 2 + gap * 3 + vSegmentLength * 2, hSegmentLength, true],
    // Bottom left vertical (e)
    [padding, padding + segmentThickness * 1.5 + gap * 2 + vSegmentLength, vSegmentLength, false],
    // Top left vertical (f)
    [padding, padding + segmentThickness / 2 + gap, vSegmentLength, false],
    // Middle horizontal (g)
    [padding + segmentThickness / 2 + gap, padding + segmentThickness + gap * 2 + vSegmentLength - segmentThickness / 2, hSegmentLength, true],
  ];

  const flickerOpacity = flickering ? 0.8 + Math.random() * 0.2 : 1;
  const displayWidth = size * 0.55;
  const displayHeight = size;

  return (
    <svg
      width={displayWidth}
      height={displayHeight}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      style={{ display: 'inline-block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {segmentDefs.map(([x, y, length, horizontal], i) => {
        const isOn = pattern[i];
        const segColor = isOn ? color : dimColor;
        const opacity = isOn ? flickerOpacity : 0.08;
        const path = createSegmentPath(x, y, length, segmentThickness, horizontal);
        
        return (
          <path
            key={i}
            d={path}
            fill={segColor}
            opacity={opacity}
            style={{
              filter: isOn ? `drop-shadow(0 0 2px ${glowColor}) drop-shadow(0 0 4px ${glowColor})` : 'none',
              transition: 'opacity 0.1s ease',
            }}
          />
        );
      })}
      {/* Decimal point indicator */}
      {digit === '.' && (
        <circle
          cx={viewBoxWidth - padding - segmentThickness / 2}
          cy={viewBoxHeight - padding - segmentThickness / 2}
          r={segmentThickness * 0.6}
          fill={color}
          style={{ filter: `drop-shadow(0 0 2px ${glowColor})` }}
        />
      )}
    </svg>
  );
}

/**
 * Format value to string with specified digits
 */
function formatValue(value: number, digits: number, format?: (value: number) => string): string {
  if (format) {
    return format(value);
  }
  const absValue = Math.abs(Math.floor(value));
  const str = String(absValue).padStart(digits, '0');
  return value < 0 ? '-' + str.slice(1) : str;
}

/**
 * DigitalGauge Component
 * 
 * Displays a numeric value in seven-segment or dot-matrix style
 * with optional animation for value transitions.
 */
export function DigitalGauge({
  value,
  label,
  format,
  digits = 5,
  style = 'seven-segment',
  colorScheme,
  animated = true,
  horizontal = false,
  className = '',
  'data-testid': testId,
}: DigitalGaugeProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const previousValueRef = useRef(value);

  // Determine if we should animate
  const shouldAnimate = animated && !prefersReducedMotion;

  // Animate value changes - Requirements: 6.3
  useEffect(() => {
    if (!shouldAnimate || value === previousValueRef.current) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startValue = previousValueRef.current;
    const endValue = value;
    const duration = 500; // ms
    const startTime = performance.now();

    setIsAnimating(true);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuad);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
        previousValueRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, shouldAnimate]);

  // Update previous value ref when animation is disabled
  useEffect(() => {
    if (!shouldAnimate) {
      previousValueRef.current = value;
    }
  }, [value, shouldAnimate]);

  // Format the display string
  const displayString = useMemo(() => {
    return formatValue(displayValue, digits, format);
  }, [displayValue, digits, format]);

  // Render seven-segment display
  const renderSevenSegment = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        padding: '6px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        border: `1px solid ${colorScheme.colors.dim}`,
        borderRadius: '2px',
      }}
    >
      {displayString.split('').map((char, i) => (
        <SevenSegmentDigit
          key={i}
          digit={char}
          color={colorScheme.colors.foreground}
          dimColor={colorScheme.colors.dim}
          glowColor={colorScheme.phosphorGlow}
          size={28}
          flickering={isAnimating}
        />
      ))}
    </div>
  );

  // Render dot-matrix display
  const renderDotMatrix = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${colorScheme.colors.dim}`,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '24px',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.1em',
        color: colorScheme.colors.foreground,
        textShadow: `0 0 5px ${colorScheme.phosphorGlow}, 0 0 10px ${colorScheme.phosphorGlow}`,
        opacity: isAnimating ? 0.7 + Math.random() * 0.3 : 1,
        transition: 'opacity 0.1s ease',
      }}
    >
      {displayString}
    </div>
  );

  // Horizontal layout: label on left, value on right
  if (horizontal) {
    return (
      <div
        className={`digital-gauge digital-gauge-horizontal ${className}`}
        data-testid={testId}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '4px 8px',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          border: `1px solid ${colorScheme.colors.dim}`,
        }}
      >
        {/* Label - Requirements: 6.4 */}
        <div
          className="digital-gauge-label"
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: colorScheme.colors.accent,
            minWidth: '70px',
          }}
        >
          {label}
        </div>
        
        {/* Gauge display */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {style === 'seven-segment' ? renderSevenSegment() : renderDotMatrix()}
        </div>
      </div>
    );
  }

  // Vertical layout (default): value on top, label below
  return (
    <div
      className={`digital-gauge ${className}`}
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {/* Gauge display */}
      {style === 'seven-segment' ? renderSevenSegment() : renderDotMatrix()}
      
      {/* Label - Requirements: 6.4 */}
      <div
        className="digital-gauge-label"
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: colorScheme.colors.dim,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default DigitalGauge;
