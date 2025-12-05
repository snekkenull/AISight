import React from 'react';

/**
 * EVA Effects Component
 * Requirements: 3.1, 3.2, 3.4
 * 
 * Global overlay component providing CRT/terminal effects including:
 * - Scan lines overlay
 * - Vignette effect
 * - Respects prefers-reduced-motion
 */

interface EvaEffectsProps {
  enableScanLines?: boolean;
  enableVignette?: boolean;
  scanLineOpacity?: number;
  vignetteIntensity?: number;
}

export function EvaEffects({
  enableScanLines = true,
  enableVignette = true,
  scanLineOpacity = 0.03,
  vignetteIntensity = 0.3,
}: EvaEffectsProps): JSX.Element {
  // Check for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Disable effects if user prefers reduced motion
  const shouldShowScanLines = enableScanLines && !prefersReducedMotion;
  const shouldShowVignette = enableVignette && !prefersReducedMotion;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    >
      {/* Scan Lines Overlay - Requirements: 3.1, 3.4 */}
      {shouldShowScanLines && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, ${scanLineOpacity}) 0px,
              transparent 1px,
              transparent 2px,
              rgba(0, 0, 0, ${scanLineOpacity}) 3px
            )`,
            backgroundSize: '100% 2px',
          }}
        />
      )}

      {/* Vignette Effect - Requirements: 3.2 */}
      {shouldShowVignette && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(
              circle at center,
              transparent 0%,
              transparent 50%,
              rgba(0, 0, 0, ${vignetteIntensity}) 100%
            )`,
          }}
        />
      )}
    </div>
  );
}

/**
 * EVA Loader Component
 * Requirements: 5.3
 * 
 * Hexagonal spinner with rotation animation
 * Supports size variants (sm, md, lg)
 */

interface EvaLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const sizeMap = {
  sm: 24,
  md: 48,
  lg: 72,
};

export function EvaLoader({ 
  size = 'md', 
  color = 'var(--eva-accent-orange)' 
}: EvaLoaderProps): JSX.Element {
  const dimension = sizeMap[size];
  
  return (
    <div 
      className="inline-flex items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 100 100"
        className="animate-spin"
        style={{ animationDuration: '2s' }}
      >
        {/* Hexagon path */}
        <polygon
          points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner hexagon for depth */}
        <polygon
          points="50,20 75,35 75,65 50,80 25,65 25,35"
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.5"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * EVA Counter Component
 * Requirements: 5.2
 * 
 * Animated number counter that counts from 0 to target value
 * Supports custom duration and format functions
 */

interface EvaCounterProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}

export function EvaCounter({ 
  value, 
  duration = 1000,
  format = (n) => n.toString()
}: EvaCounterProps): JSX.Element {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = 
      typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // If reduced motion, just set the value immediately
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    // Animate from current display value to target value
    const startValue = displayValue;
    const difference = value - startValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuad = 1 - Math.pow(1 - progress, 2);
      const currentValue = startValue + (difference * easeOutQuad);
      
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className="tabular-nums" aria-live="polite">
      {format(displayValue)}
    </span>
  );
}

/**
 * EVA Warning Border Component
 * Requirements: 5.4
 * 
 * Wrapper component that adds pulsing/flashing border animation
 * Supports color variants (orange, red, purple)
 */

interface EvaWarningBorderProps {
  active: boolean;
  color?: 'orange' | 'red' | 'purple';
  children: React.ReactNode;
}

const colorMap = {
  orange: 'var(--eva-accent-orange)',
  red: 'var(--eva-accent-red)',
  purple: 'var(--eva-accent-purple)',
};

export function EvaWarningBorder({ 
  active, 
  color = 'orange',
  children 
}: EvaWarningBorderProps): JSX.Element {
  const borderColor = colorMap[color];

  // Check for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div 
      className="relative"
      style={{
        border: active ? `2px solid ${borderColor}` : 'none',
        animation: active && !prefersReducedMotion 
          ? 'eva-warning-pulse 1s ease-in-out infinite' 
          : 'none',
      }}
    >
      {children}
      
      {/* Inline keyframe animation */}
      {active && !prefersReducedMotion && (
        <style>{`
          @keyframes eva-warning-pulse {
            0%, 100% {
              box-shadow: 0 0 0 0 ${borderColor}80;
              border-color: ${borderColor};
            }
            50% {
              box-shadow: 0 0 20px 5px ${borderColor}40;
              border-color: ${borderColor}CC;
            }
          }
        `}</style>
      )}
    </div>
  );
}

/**
 * EVA Flash Animation Component
 * Requirements: 12.1, 12.3
 * 
 * Provides a brief flash animation for significant actions
 * Can be used as a wrapper or triggered programmatically
 */

interface EvaFlashProps {
  trigger: boolean;
  color?: 'orange' | 'red' | 'purple' | 'green';
  duration?: number;
  children: React.ReactNode;
  onComplete?: () => void;
}

const flashColorMap = {
  orange: 'var(--eva-accent-orange)',
  red: 'var(--eva-accent-red)',
  purple: 'var(--eva-accent-purple)',
  green: 'var(--eva-accent-green)',
};

export function EvaFlash({ 
  trigger, 
  color = 'orange',
  duration = 500,
  children,
  onComplete
}: EvaFlashProps): JSX.Element {
  const [isFlashing, setIsFlashing] = React.useState(false);
  const flashColor = flashColorMap[color];

  // Check for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  React.useEffect(() => {
    if (trigger && !prefersReducedMotion) {
      setIsFlashing(true);
      const timer = setTimeout(() => {
        setIsFlashing(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, duration, onComplete, prefersReducedMotion]);

  return (
    <div 
      className="relative h-full w-full"
      style={{
        animation: isFlashing 
          ? `eva-flash ${duration}ms ease-out` 
          : 'none',
      }}
    >
      {children}
      
      {/* Inline keyframe animation */}
      {isFlashing && (
        <style>{`
          @keyframes eva-flash {
            0% {
              box-shadow: 0 0 0 0 ${flashColor}00;
            }
            50% {
              box-shadow: 0 0 30px 10px ${flashColor}80;
            }
            100% {
              box-shadow: 0 0 0 0 ${flashColor}00;
            }
          }
        `}</style>
      )}
    </div>
  );
}

/**
 * EVA Highlight Animation Component
 * Requirements: 12.1, 12.3
 * 
 * Provides a highlight animation for data updates
 * Useful for drawing attention to changed values
 */

interface EvaHighlightProps {
  trigger: boolean;
  color?: 'orange' | 'red' | 'purple' | 'green' | 'cyan';
  duration?: number;
  children: React.ReactNode;
}

const highlightColorMap = {
  orange: 'var(--eva-accent-orange)',
  red: 'var(--eva-accent-red)',
  purple: 'var(--eva-accent-purple)',
  green: 'var(--eva-accent-green)',
  cyan: 'var(--eva-accent-cyan)',
};

export function EvaHighlight({ 
  trigger, 
  color = 'cyan',
  duration = 1000,
  children
}: EvaHighlightProps): JSX.Element {
  const [isHighlighting, setIsHighlighting] = React.useState(false);
  const highlightColor = highlightColorMap[color];

  // Check for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  React.useEffect(() => {
    if (trigger && !prefersReducedMotion) {
      setIsHighlighting(true);
      const timer = setTimeout(() => {
        setIsHighlighting(false);
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, duration, prefersReducedMotion]);

  return (
    <div 
      className="relative transition-all"
      style={{
        backgroundColor: isHighlighting 
          ? `${highlightColor}20` 
          : 'transparent',
        transition: `background-color ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}
