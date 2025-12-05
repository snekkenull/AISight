/**
 * TerminalInput Component
 * 
 * Command-line style input with blinking cursor effect.
 * 
 * Requirements: 13.5, 14.2
 * - Command-line style input with blinking cursor
 * - Monospace font and terminal colors
 * - Focus glow effect
 * - Keystroke sound effects
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { soundService } from '../../services/SoundService';

export interface TerminalInputProps {
  /** Current input value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Submit handler (Enter key) */
  onSubmit?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Command prompt prefix */
  prompt?: string;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * TerminalInput Component
 * 
 * Renders a command-line style input with blinking cursor.
 * Respects prefers-reduced-motion for cursor animation.
 */
export function TerminalInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  prompt = '>',
  className = '',
  disabled = false,
  autoFocus = false,
  'data-testid': testId,
}: TerminalInputProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Play keystroke sound - Requirements: 14.2
      soundService.play('keystroke');
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSubmit && value.trim()) {
        e.preventDefault();
        onSubmit(value);
      }
    },
    [onSubmit, value]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Click on container focuses input
  const handleContainerClick = useCallback(() => {
    if (inputRef.current && !disabled) {
      // Use setTimeout to ensure focus happens after other events (like map click handling)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [disabled]);

  // Also handle mouse down to ensure focus starts immediately
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent default to avoid losing focus if clicking on container padding
    // but allow default if clicking on input itself
    if (e.target !== inputRef.current) {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  // Use CSS class for hover/focus animations - Requirements: 15.1
  const interactiveClass = prefersReducedMotion ? '' : 'terminal-interactive-subtle';

  return (
    <div
      className={`terminal-input-container ${interactiveClass} ${className}`}
      data-testid={testId}
      data-focused={isFocused}
      onClick={handleContainerClick}
      onMouseDown={handleMouseDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: 'var(--terminal-bg)',
        border: `1px solid ${isFocused ? 'var(--terminal-accent)' : 'var(--terminal-dim)'}`,
        borderRadius: 0,
        fontFamily: "'Share Tech Mono', 'Courier New', monospace",
        cursor: disabled ? 'not-allowed' : 'text',
        // Focus glow effect - enhanced when focused
        boxShadow: isFocused && !prefersReducedMotion
          ? '0 0 8px var(--terminal-glow), 0 0 16px color-mix(in srgb, var(--terminal-glow) 30%, transparent)'
          : undefined,
      }}
    >
      {/* Command prompt */}
      <span
        className="terminal-input-prompt"
        style={{
          color: 'var(--terminal-accent)',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {prompt}
      </span>

      {/* Input wrapper with cursor */}
      <div
        className="terminal-input-wrapper"
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="terminal-input-field"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--terminal-fg)',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            padding: '4px 0',
            margin: 0,
            caretColor: 'var(--terminal-fg)', // Show native caret for better UX
            minHeight: '24px',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        {/* Custom blinking cursor removed - using native caret for better UX */}
      </div>

      {/* Cursor blink animation and focus styles */}
      <style>{`
        @keyframes terminal-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        .terminal-input-field::placeholder {
          color: var(--terminal-dim);
        }
        
        .terminal-input-container:focus-within {
          outline: 2px solid var(--terminal-accent);
          outline-offset: 2px;
        }
        
        @media (prefers-reduced-motion: reduce) {
          @keyframes terminal-cursor-blink {
            0%, 100% { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}

export default TerminalInput;
