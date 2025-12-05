/**
 * TerminalButton Component
 * 
 * Terminal-styled button with monospace text and hover glow effects.
 * 
 * Requirements: 3.5, 14.1, 15.1, 15.2
 * - Bordered button with monospace text
 * - Hover glow effect using current theme colors
 * - Click feedback animation
 * - Click sound effect
 */

import React, { useState, useCallback } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { soundService } from '../../services/SoundService';

export interface TerminalButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Button variant */
  variant?: 'default' | 'primary' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Active/selected state */
  active?: boolean;
  /** Badge count to display */
  badge?: number;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * TerminalButton Component
 * 
 * Renders a terminal-styled button with hover glow and click feedback.
 * Respects prefers-reduced-motion for animations.
 */
export function TerminalButton({
  children,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  variant = 'default',
  size = 'md',
  active = false,
  badge,
  'data-testid': testId,
}: TerminalButtonProps): JSX.Element {
  const [isPressed, setIsPressed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleMouseDown = useCallback(() => {
    if (!disabled) {
      setIsPressed(true);
      // Play click sound - Requirements: 14.1
      soundService.play('click');
    }
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Size-based padding
  const sizeStyles = {
    sm: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
    md: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
    lg: { padding: '0.5rem 1rem', fontSize: '1rem' },
  };

  // Variant-based colors
  const variantColors = {
    default: {
      border: 'var(--terminal-accent)',
      text: 'var(--terminal-fg)',
      glow: 'var(--terminal-glow)',
    },
    primary: {
      border: 'var(--terminal-success)',
      text: 'var(--terminal-success)',
      glow: 'var(--terminal-success)',
    },
    danger: {
      border: 'var(--terminal-error)',
      text: 'var(--terminal-error)',
      glow: 'var(--terminal-error)',
    },
  };

  const colors = variantColors[variant];
  const sizing = sizeStyles[size];

  // Determine the appropriate CSS class for animations
  const interactiveClass = prefersReducedMotion ? '' : 'terminal-interactive';
  const activeClass = active && !prefersReducedMotion ? 'terminal-glow-pulse' : '';

  return (
    <>
      <style>{`
        .terminal-button:focus-visible {
          outline: 2px solid var(--terminal-accent);
          outline-offset: 2px;
          box-shadow: 0 0 8px var(--terminal-glow), 0 0 16px color-mix(in srgb, var(--terminal-glow) 50%, transparent);
        }
        
        @media (prefers-reduced-motion: reduce) {
          .terminal-button:focus-visible {
            box-shadow: none;
          }
        }
      `}</style>
      <button
        type={type}
        onClick={onClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        className={`terminal-button terminal-button-${variant} terminal-button-${size} ${interactiveClass} ${activeClass} ${className}`}
        data-testid={testId}
        data-pressed={isPressed}
        style={{
          // Base styles
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          
          // No rounded corners - Requirements: 4.5
          borderRadius: 0,
          
          // Border styling
          border: `1px solid ${disabled ? 'var(--terminal-dim)' : colors.border}`,
          
          // Colors - active state shows highlighted background
          backgroundColor: active 
            ? `color-mix(in srgb, ${colors.border} 25%, var(--terminal-bg))`
            : isPressed 
              ? `color-mix(in srgb, ${colors.border} 20%, var(--terminal-bg))` 
              : 'var(--terminal-bg)',
          color: disabled ? 'var(--terminal-dim)' : colors.text,
          
          // Active state glow (when not using CSS animation class)
          boxShadow: active && prefersReducedMotion 
            ? `0 0 6px ${colors.glow}, inset 0 0 4px color-mix(in srgb, ${colors.glow} 30%, transparent)` 
            : undefined,
          
          // Size
          ...sizing,
          
          // Press feedback - Requirements: 15.2
          transform: isPressed && !prefersReducedMotion ? 'scale(0.98)' : 'none',
          
          // Opacity for disabled
          opacity: disabled ? 0.5 : 1,
        } as React.CSSProperties}
      >
      {/* Button content */}
      <span>{children}</span>
      
        {/* Badge indicator */}
        {badge !== undefined && badge > 0 && (
          <span
            style={{
              marginLeft: '0.25rem',
              padding: '0 0.25rem',
              backgroundColor: 'var(--terminal-accent)',
              color: 'var(--terminal-bg)',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              minWidth: '1rem',
              textAlign: 'center',
            }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    </>
  );
}

export default TerminalButton;
