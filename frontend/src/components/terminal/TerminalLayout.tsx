/**
 * TerminalLayout Component
 * 
 * Main terminal layout container managing all zones using CSS Grid.
 * Implements the EVA terminal interface layout structure.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 * - Status bar fixed at top spanning full width
 * - Map as central main element occupying largest screen area
 * - Permanent function blocks on left and right sides
 * - Terminal dialog box fixed at bottom
 * - Support AI position switching (bottom/right)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { usePersistedState } from '../../hooks/usePersistedState';

export type AIPosition = 'bottom' | 'right';

export interface TerminalLayoutProps {
  /** Status bar content */
  statusBar: React.ReactNode;
  /** Left function block content (globe, vessel info, gauges) */
  leftBlock: React.ReactNode;
  /** Main content area (map) */
  mainContent: React.ReactNode;
  /** Right function block content (track chart, radar) */
  rightBlock: React.ReactNode;
  /** Terminal dialog content (AI chat) */
  terminalDialog: React.ReactNode;
  /** AI dialog position */
  aiPosition?: AIPosition;
  /** Callback when AI position changes */
  onAIPositionChange?: (position: AIPosition) => void;
  /** Combined left+right block content when AI is on right */
  combinedBlock?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/** Layout configuration constants */
const LAYOUT_CONFIG = {
  statusBarHeight: '48px',
  leftBlockWidth: '300px',
  rightBlockWidth: '300px',
  terminalDialogHeight: '300px',
  terminalDialogWidthRight: '320px',
  minMainWidth: '400px',
  minMainHeight: '300px',
  // Responsive breakpoints
  breakpoints: {
    compact: 1024,    // Hide side blocks
    medium: 1280,     // Narrower side blocks
    large: 1440,      // Full width side blocks
  },
  // Responsive side block widths
  responsiveWidths: {
    medium: '220px',
    large: '260px',
  },
} as const;

/**
 * TerminalLayout Component
 * 
 * Renders the main terminal interface layout with CSS Grid.
 * Supports responsive sizing and AI position switching.
 */
export function TerminalLayout({
  statusBar,
  leftBlock,
  mainContent,
  rightBlock,
  terminalDialog,
  aiPosition: controlledAIPosition,
  onAIPositionChange,
  combinedBlock,
  className = '',
  'data-testid': testId,
}: TerminalLayoutProps): JSX.Element {
  // Use persisted state for AI position if not controlled
  const [persistedAIPosition, setPersistedAIPosition] = usePersistedState<AIPosition>(
    'terminal-ai-position',
    'bottom'
  );

  // Use controlled position if provided, otherwise use persisted
  const aiPosition = controlledAIPosition ?? persistedAIPosition;

  // Handle AI position change - exposed via context for child components
  const setAIPosition = useCallback((newPosition: AIPosition) => {
    if (onAIPositionChange) {
      onAIPositionChange(newPosition);
    } else {
      setPersistedAIPosition(newPosition);
    }
  }, [onAIPositionChange, setPersistedAIPosition]);

  // Track viewport size for responsive adjustments
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Update viewport size on resize - Requirements: 2.7
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine layout mode based on viewport width - Requirements: 2.7
  const isCompact = viewportSize.width < LAYOUT_CONFIG.breakpoints.compact;
  const isMedium = viewportSize.width >= LAYOUT_CONFIG.breakpoints.compact &&
    viewportSize.width < LAYOUT_CONFIG.breakpoints.medium;

  // Get responsive side block width
  const getSideBlockWidth = () => {
    if (isMedium) return LAYOUT_CONFIG.responsiveWidths.medium;
    return LAYOUT_CONFIG.responsiveWidths.large;
  };

  // Build grid template based on AI position - Requirements: 2.7
  const getGridTemplate = () => {
    const sideWidth = getSideBlockWidth();

    if (aiPosition === 'right') {
      // AI dialog on right side - merge left and right blocks into single left column
      // Use minmax(0, 1fr) to properly constrain height and prevent overflow
      return {
        gridTemplateColumns: `${sideWidth} 1fr ${LAYOUT_CONFIG.terminalDialogWidthRight}`,
        gridTemplateRows: `${LAYOUT_CONFIG.statusBarHeight} minmax(0, 1fr)`,
        gridTemplateAreas: `
          "status status status"
          "left main dialog"
        `,
      };
    }

    // AI dialog at bottom (default)
    return {
      gridTemplateColumns: `${sideWidth} 1fr ${sideWidth}`,
      gridTemplateRows: `${LAYOUT_CONFIG.statusBarHeight} 1fr auto`,
      gridTemplateAreas: `
        "status status status"
        "left main right"
        "dialog dialog dialog"
      `,
    };
  };

  // Get compact grid template for smaller viewports
  const getCompactGridTemplate = () => {
    if (aiPosition === 'right') {
      return {
        gridTemplateColumns: `1fr ${LAYOUT_CONFIG.terminalDialogWidthRight}`,
        gridTemplateRows: `${LAYOUT_CONFIG.statusBarHeight} 1fr`,
        gridTemplateAreas: `
          "status status"
          "main dialog"
        `,
      };
    }

    return {
      gridTemplateColumns: '1fr',
      gridTemplateRows: `${LAYOUT_CONFIG.statusBarHeight} 1fr auto`,
      gridTemplateAreas: `
        "status"
        "main"
        "dialog"
      `,
    };
  };

  const gridTemplate = isCompact ? getCompactGridTemplate() : getGridTemplate();

  // Context value for child components
  const contextValue: TerminalLayoutContextValue = {
    aiPosition,
    setAIPosition,
    isCompact,
  };

  return (
    <TerminalLayoutContext.Provider value={contextValue}>
      <div
        className={`terminal-layout ${className}`}
        data-testid={testId}
        data-ai-position={aiPosition}
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate.gridTemplateColumns,
          gridTemplateRows: gridTemplate.gridTemplateRows,
          gridTemplateAreas: gridTemplate.gridTemplateAreas,
          width: '100%',
          height: '100vh',
          backgroundColor: 'var(--terminal-bg)',
          color: 'var(--terminal-fg)',
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Status Bar - Requirements: 2.1 */}
        <div
          className="terminal-layout-status"
          style={{
            gridArea: 'status',
            minHeight: LAYOUT_CONFIG.statusBarHeight,
            borderBottom: '1px solid var(--terminal-accent)',
            backgroundColor: 'var(--terminal-bg)',
            zIndex: 100,
          }}
        >
          {statusBar}
        </div>

        {/* Left Function Block - Requirements: 2.3 */}
        {/* When AI is on right, show combined block (left + right merged) */}
        {!isCompact && (
          <div
            className="terminal-layout-left terminal-scrollbar"
            style={{
              gridArea: 'left',
              borderRight: '1px solid var(--terminal-dim)',
              backgroundColor: 'var(--terminal-bg)',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            {aiPosition === 'right' && combinedBlock ? combinedBlock : leftBlock}
          </div>
        )}

        {/* Main Content (Map) - Requirements: 2.2 */}
        <div
          className="terminal-layout-main"
          style={{
            gridArea: 'main',
            backgroundColor: 'var(--terminal-bg)',
            overflow: 'hidden',
            position: 'relative',
            minWidth: isCompact ? undefined : LAYOUT_CONFIG.minMainWidth,
            minHeight: LAYOUT_CONFIG.minMainHeight,
            height: '100%',
            width: '100%',
          }}
        >
          {mainContent}
        </div>

        {/* Right Function Block - Requirements: 2.4 */}
        {/* Hide right block when AI is on right (content merged into left) */}
        {!isCompact && aiPosition !== 'right' && (
          <div
            className="terminal-layout-right terminal-scrollbar"
            style={{
              gridArea: 'right',
              borderLeft: '1px solid var(--terminal-dim)',
              backgroundColor: 'var(--terminal-bg)',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            {rightBlock}
          </div>
        )}

        {/* Terminal Dialog (AI Chat) - Requirements: 2.5 */}
        <div
          className="terminal-layout-dialog"
          style={{
            gridArea: 'dialog',
            borderTop: aiPosition === 'bottom' ? '1px solid var(--terminal-accent)' : undefined,
            borderLeft: aiPosition === 'right' ? '1px solid var(--terminal-accent)' : undefined,
            backgroundColor: 'var(--terminal-bg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {terminalDialog}
        </div>
      </div>
    </TerminalLayoutContext.Provider>
  );
}

/**
 * Context for sharing AI position state across components
 */
export interface TerminalLayoutContextValue {
  aiPosition: AIPosition;
  setAIPosition: (position: AIPosition) => void;
  isCompact: boolean;
}

export const TerminalLayoutContext = React.createContext<TerminalLayoutContextValue | undefined>(
  undefined
);

/**
 * Hook to access terminal layout context
 */
export function useTerminalLayout(): TerminalLayoutContextValue {
  const context = React.useContext(TerminalLayoutContext);
  if (context === undefined) {
    throw new Error('useTerminalLayout must be used within a TerminalLayout');
  }
  return context;
}

export default TerminalLayout;
