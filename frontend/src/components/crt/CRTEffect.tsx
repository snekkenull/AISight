/**
 * CRT Effect Component
 * 
 * Full-screen CRT monitor simulation overlay providing:
 * - Barrel distortion (curved glass effect)
 * - Chromatic aberration (RGB color separation)
 * - Scan lines overlay
 * - Phosphor glow filter
 * - Vignette effect
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import React, { useMemo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import '../../styles/crt-effects.css';

export interface CRTEffectProps {
  /** Enable/disable all CRT effects */
  enabled?: boolean;
  /** Barrel distortion intensity (0-1) - simulates curved CRT glass */
  curvature?: number;
  /** RGB color separation intensity at screen edges (0-1) */
  chromaticAberration?: number;
  /** Scan line opacity (0-1) */
  scanLineIntensity?: number;
  /** Phosphor glow intensity (0-1) */
  phosphorGlow?: number;
  /** Edge darkening intensity (0-1) */
  vignetteIntensity?: number;
  /** Enable subtle screen flicker animation */
  flickerEnabled?: boolean;
  /** Children to wrap with CRT effects */
  children?: React.ReactNode;
}

/** Default CRT configuration values */
export const DEFAULT_CRT_CONFIG = {
  enabled: true,
  curvature: 0.3,
  chromaticAberration: 0.2,
  scanLineIntensity: 0.05,
  phosphorGlow: 0.3,
  vignetteIntensity: 0.4,
  flickerEnabled: false,
};

/**
 * CRT Effect Component
 * 
 * Wraps content with authentic CRT monitor visual effects.
 * Respects prefers-reduced-motion by disabling animated effects.
 */
export function CRTEffect({
  enabled = DEFAULT_CRT_CONFIG.enabled,
  curvature = DEFAULT_CRT_CONFIG.curvature,
  chromaticAberration = DEFAULT_CRT_CONFIG.chromaticAberration,
  scanLineIntensity = DEFAULT_CRT_CONFIG.scanLineIntensity,
  phosphorGlow = DEFAULT_CRT_CONFIG.phosphorGlow,
  vignetteIntensity = DEFAULT_CRT_CONFIG.vignetteIntensity,
  flickerEnabled = DEFAULT_CRT_CONFIG.flickerEnabled,
  children,
}: CRTEffectProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  // Disable animated effects when reduced motion is preferred
  const shouldAnimate = !prefersReducedMotion;
  const shouldFlicker = flickerEnabled && shouldAnimate;

  // Generate scan line pattern CSS
  const scanLineStyle = useMemo(() => {
    if (scanLineIntensity <= 0) return {};
    return {
      backgroundImage: `repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, ${scanLineIntensity}) 0px,
        transparent 1px,
        transparent 2px,
        rgba(0, 0, 0, ${scanLineIntensity}) 3px
      )`,
      backgroundSize: '100% 3px',
    };
  }, [scanLineIntensity]);

  // Generate vignette gradient CSS
  const vignetteStyle = useMemo(() => {
    if (vignetteIntensity <= 0) return {};
    return {
      background: `radial-gradient(
        ellipse at center,
        transparent 0%,
        transparent 40%,
        rgba(0, 0, 0, ${vignetteIntensity * 0.5}) 70%,
        rgba(0, 0, 0, ${vignetteIntensity}) 100%
      )`,
    };
  }, [vignetteIntensity]);

  // Generate barrel distortion CSS transform
  const barrelDistortionStyle = useMemo(() => {
    if (curvature <= 0) return {};
    // Use perspective and subtle rotateX to simulate curved glass
    const perspectiveValue = 1000 - (curvature * 500);
    return {
      perspective: `${perspectiveValue}px`,
      perspectiveOrigin: 'center center',
    };
  }, [curvature]);

  // Generate content wrapper style for barrel effect
  const contentWrapperStyle = useMemo(() => {
    if (curvature <= 0) return {};
    const rotateAmount = curvature * 2;
    return {
      transform: `rotateX(${rotateAmount}deg)`,
    };
  }, [curvature]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      className="crt-effect-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        // Ensure black background behind barrel distortion to prevent white edges
        backgroundColor: 'var(--terminal-bg, #0a0a0a)',
        ...barrelDistortionStyle,
      }}
      data-crt-enabled="true"
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      {/* Content wrapper with barrel distortion */}
      <div
        className="crt-content-wrapper"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          ...contentWrapperStyle,
        }}
      >
        {children}
      </div>

      {/* CRT Effects Overlay Layer */}
      <div
        className="crt-effects-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
        aria-hidden="true"
      >
        {/* Scan Lines - Requirements: 1.5 */}
        {scanLineIntensity > 0 && (
          <div
            className="crt-scan-lines"
            data-testid="crt-scan-lines"
            style={{
              position: 'absolute',
              inset: 0,
              ...scanLineStyle,
            }}
          />
        )}

        {/* Vignette Effect - Requirements: 1.6 */}
        {vignetteIntensity > 0 && (
          <div
            className="crt-vignette"
            data-testid="crt-vignette"
            style={{
              position: 'absolute',
              inset: 0,
              ...vignetteStyle,
            }}
          />
        )}

        {/* Chromatic Aberration - Requirements: 1.3 */}
        {/* RGB color separation at screen edges simulating lens distortion */}
        {chromaticAberration > 0 && (
          <>
            {/* Left edge - Red channel offset */}
            <div
              className="crt-chromatic-aberration crt-chromatic-left"
              data-testid="crt-chromatic-aberration"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: `${10 + chromaticAberration * 20}%`,
                background: `linear-gradient(
                  to right,
                  rgba(255, 0, 0, ${chromaticAberration * 0.08}) 0%,
                  transparent 100%
                )`,
                pointerEvents: 'none',
              }}
            />
            {/* Right edge - Cyan channel offset */}
            <div
              className="crt-chromatic-aberration crt-chromatic-right"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: `${10 + chromaticAberration * 20}%`,
                background: `linear-gradient(
                  to left,
                  rgba(0, 255, 255, ${chromaticAberration * 0.08}) 0%,
                  transparent 100%
                )`,
                pointerEvents: 'none',
              }}
            />
            {/* Top edge - slight blue tint */}
            <div
              className="crt-chromatic-aberration crt-chromatic-top"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: `${5 + chromaticAberration * 10}%`,
                background: `linear-gradient(
                  to bottom,
                  rgba(0, 0, 255, ${chromaticAberration * 0.05}) 0%,
                  transparent 100%
                )`,
                pointerEvents: 'none',
              }}
            />
            {/* Bottom edge - slight yellow tint */}
            <div
              className="crt-chromatic-aberration crt-chromatic-bottom"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${5 + chromaticAberration * 10}%`,
                background: `linear-gradient(
                  to top,
                  rgba(255, 255, 0, ${chromaticAberration * 0.03}) 0%,
                  transparent 100%
                )`,
                pointerEvents: 'none',
              }}
            />
          </>
        )}

        {/* Phosphor Glow Filter - Requirements: 1.4 */}
        {/* Applies subtle ambient glow from terminal color scheme */}
        {phosphorGlow > 0 && (
          <div
            className="crt-phosphor-glow"
            data-testid="crt-phosphor-glow"
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(
                ellipse at center,
                color-mix(in srgb, var(--terminal-glow, #ff6600) ${Math.round(phosphorGlow * 8)}%, transparent) 0%,
                transparent 70%
              )`,
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Screen Flicker Animation - Requirements: 1.7 (disabled with reduced motion) */}
        {shouldFlicker && (
          <div
            className="crt-flicker"
            data-testid="crt-flicker"
            style={{
              position: 'absolute',
              inset: 0,
              animation: 'crt-flicker-animation 0.15s infinite',
              opacity: 0,
            }}
          />
        )}
      </div>

      {/* Inline styles for animations and dynamic phosphor glow */}
      <style>{`
        @keyframes crt-flicker-animation {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.02; background: rgba(255, 255, 255, 0.03); }
        }
        
        /* Phosphor glow for bright text elements within CRT container */
        /* Requirements: 1.4 - Apply glow color from current terminal scheme */
        .crt-effect-container .terminal-glow,
        .crt-effect-container .crt-phosphor-text,
        .crt-effect-container [data-phosphor-glow="true"] {
          text-shadow: 
            0 0 ${Math.round(phosphorGlow * 3)}px var(--terminal-glow, #ff6600),
            0 0 ${Math.round(phosphorGlow * 6)}px var(--terminal-glow, #ff6600),
            0 0 ${Math.round(phosphorGlow * 12)}px color-mix(in srgb, var(--terminal-glow, #ff6600) 60%, transparent);
        }
        
        /* Phosphor glow for box/container elements */
        .crt-effect-container .terminal-box-glow,
        .crt-effect-container .crt-phosphor-box,
        .crt-effect-container [data-box-glow="true"] {
          box-shadow: 
            0 0 ${Math.round(phosphorGlow * 4)}px var(--terminal-glow, #ff6600),
            0 0 ${Math.round(phosphorGlow * 8)}px color-mix(in srgb, var(--terminal-glow, #ff6600) 50%, transparent),
            inset 0 0 ${Math.round(phosphorGlow * 2)}px color-mix(in srgb, var(--terminal-glow, #ff6600) 20%, transparent);
        }
        
        /* Subtle glow variants */
        .crt-effect-container .terminal-glow-subtle,
        .crt-effect-container .crt-phosphor-text-subtle {
          text-shadow: 
            0 0 ${Math.round(phosphorGlow * 2)}px var(--terminal-glow, #ff6600),
            0 0 ${Math.round(phosphorGlow * 4)}px color-mix(in srgb, var(--terminal-glow, #ff6600) 40%, transparent);
        }
        
        .crt-effect-container .terminal-box-glow-subtle,
        .crt-effect-container .crt-phosphor-box-subtle {
          box-shadow: 
            0 0 ${Math.round(phosphorGlow * 2)}px var(--terminal-glow, #ff6600),
            0 0 ${Math.round(phosphorGlow * 4)}px color-mix(in srgb, var(--terminal-glow, #ff6600) 30%, transparent);
        }
      `}</style>
    </div>
  );
}

export default CRTEffect;
