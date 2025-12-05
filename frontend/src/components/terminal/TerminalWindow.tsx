/**
 * TerminalWindow Component
 * 
 * Reusable terminal window frame with ASCII-style borders.
 * Provides consistent terminal aesthetics across the application.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 * - Bordered terminal window frame with title bar
 * - ASCII-style or single-line box-drawing characters
 * - Uppercase monospace title text
 * - Consistent padding and monospace typography
 * - No rounded corners or gradient backgrounds
 */

import React from 'react';

/** Border style character sets */
const BORDER_CHARS = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    titleLeft: '┤',
    titleRight: '├',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    titleLeft: '╡',
    titleRight: '╞',
  },
  ascii: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    horizontal: '-',
    vertical: '|',
    titleLeft: '+',
    titleRight: '+',
  },
} as const;

export type BorderStyle = keyof typeof BORDER_CHARS;

export interface TerminalWindowProps {
  /** Window title displayed in the title bar */
  title: string;
  /** Content to render inside the window */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Border character style */
  borderStyle?: BorderStyle;
  /** Whether to show the title bar */
  showTitleBar?: boolean;
  /** Optional close button handler */
  onClose?: () => void;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Overflow behavior for inner content area */
  innerOverflow?: 'auto' | 'hidden' | 'visible';
  /** Whether to use flex layout for inner content (allows children to fill height) */
  innerFlex?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
}


/**
 * TerminalWindow Component
 * 
 * Renders a bordered terminal window with optional title bar.
 * Uses CSS variables from terminal-theme.css for colors.
 */
export function TerminalWindow({
  title,
  children,
  className = '',
  borderStyle = 'single',
  showTitleBar = true,
  onClose,
  style,
  innerOverflow = 'auto',
  innerFlex = false,
  'data-testid': testId,
}: TerminalWindowProps): JSX.Element {
  const chars = BORDER_CHARS[borderStyle];

  return (
    <div
      className={`terminal-window ${className}`}
      data-testid={testId}
      data-border-style={borderStyle}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--terminal-bg)',
        color: 'var(--terminal-fg)',
        fontFamily: "'Share Tech Mono', 'Courier New', monospace",
        position: 'relative',
        borderRadius: 0,
        background: 'var(--terminal-bg)',
        ...style,
      }}
    >
      {/* Title Bar - Requirements: 4.1, 4.2, 4.3 */}
      {showTitleBar && (
        <div
          className="terminal-window-title-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            borderBottom: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {/* Top border with title */}
          <span
            className="terminal-window-border-top"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              color: 'var(--terminal-accent)',
            }}
          >
            <span>{chars.topLeft}</span>
            <span>{chars.horizontal.repeat(2)}</span>
            <span>{chars.titleRight}</span>
            <span
              className="terminal-window-title"
              style={{
                padding: '0 0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '0.75rem',
                color: 'var(--terminal-fg)',
              }}
            >
              {title}
            </span>
            <span>{chars.titleLeft}</span>
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
              }}
            >
              {chars.horizontal.repeat(100)}
            </span>
            {onClose && (
              <>
                <span>{chars.titleRight}</span>
                <button
                  onClick={onClose}
                  className="terminal-window-close"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--terminal-fg)',
                    cursor: 'pointer',
                    padding: '0 0.25rem',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                  aria-label="Close window"
                >
                  X
                </button>
                <span>{chars.titleLeft}</span>
              </>
            )}
            <span>{chars.topRight}</span>
          </span>
        </div>
      )}

      {/* Content Area - Requirements: 4.4 */}
      <div
        className="terminal-window-content"
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left border */}
        <span
          className="terminal-window-border-left"
          style={{
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--terminal-accent)',
            width: '1ch',
            flexShrink: 0,
          }}
        >
          {!showTitleBar && <span>{chars.topLeft}</span>}
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              writingMode: 'vertical-lr',
              lineHeight: 1,
            }}
          >
            {chars.vertical.repeat(50)}
          </span>
        </span>

        {/* Main content */}
        <div
          className="terminal-window-inner"
          style={{
            flex: 1,
            padding: innerFlex ? '0' : '0.5rem 0.75rem',
            overflow: innerOverflow,
            minHeight: 0,
            fontFamily: "'Share Tech Mono', 'Courier New', monospace",
            ...(innerFlex && {
              display: 'flex',
              flexDirection: 'column' as const,
            }),
          }}
        >
          {children}
        </div>

        {/* Right border */}
        <span
          className="terminal-window-border-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--terminal-accent)',
            width: '1ch',
            flexShrink: 0,
          }}
        >
          {!showTitleBar && <span>{chars.topRight}</span>}
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              writingMode: 'vertical-lr',
              lineHeight: 1,
            }}
          >
            {chars.vertical.repeat(50)}
          </span>
        </span>
      </div>

      {/* Bottom border */}
      <div
        className="terminal-window-border-bottom"
        style={{
          display: 'flex',
          color: 'var(--terminal-accent)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <span>{chars.bottomLeft}</span>
        <span style={{ flex: 1, overflow: 'hidden' }}>
          {chars.horizontal.repeat(200)}
        </span>
        <span>{chars.bottomRight}</span>
      </div>
    </div>
  );
}

export default TerminalWindow;

/** Export border characters for external use */
export { BORDER_CHARS };
