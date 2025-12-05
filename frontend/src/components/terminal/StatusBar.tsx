/**
 * StatusBar Component
 * 
 * Top status bar with navigation buttons and system status indicators.
 * Replaces the collapsible side dock navigation pattern.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 14.6, 14.7
 * - Text-based buttons for all navigation functions
 * - System status indicators (connection, vessel count, time)
 * - Color scheme switcher button
 * - Sound toggle button
 * - Terminal-style bordered button styling with monospace text
 */

import { useState, useEffect, useCallback } from 'react';
import { TerminalButton } from './TerminalButton';
import { useTerminalTheme } from '../../hooks/useTerminalTheme';
import { useSoundEffects } from '../../hooks/useSoundEffects';

export type StatusBarPanel = 
  | 'search' 
  | 'vessels' 
  | 'tracking' 
  | 'weather' 
  | 'coverage'
  | 'theme'
  | null;

export interface StatusBarProps {
  /** Current connection status */
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
  /** Total vessel count */
  vesselCount?: number;
  /** Currently active panel */
  activePanel?: StatusBarPanel;
  /** Callback when a panel button is clicked */
  onPanelChange?: (panel: StatusBarPanel) => void;
  /** Number of tracked vessels */
  trackedVesselCount?: number;
  /** Callback when fullscreen is toggled */
  onFullscreenToggle?: () => void;
  /** Whether fullscreen is active */
  isFullscreen?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Format current time in terminal style (HH:MM:SS)
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Get connection status display text and color
 */
function getConnectionDisplay(status: StatusBarProps['connectionStatus']): {
  text: string;
  colorClass: string;
} {
  switch (status) {
    case 'connected':
      return { text: 'ONLINE', colorClass: 'terminal-text-success' };
    case 'connecting':
      return { text: 'SYNC...', colorClass: 'terminal-text-accent' };
    case 'disconnected':
      return { text: 'OFFLINE', colorClass: 'terminal-text-dim' };
    case 'error':
      return { text: 'ERROR', colorClass: 'terminal-text-error' };
    default:
      return { text: 'UNKNOWN', colorClass: 'terminal-text-dim' };
  }
}

/**
 * StatusBar Component
 * 
 * Renders the top status bar with navigation and status indicators.
 */
export function StatusBar({
  connectionStatus = 'disconnected',
  vesselCount = 0,
  activePanel = null,
  onPanelChange,
  trackedVesselCount = 0,
  onFullscreenToggle,
  isFullscreen = false,
  className = '',
  'data-testid': testId,
}: StatusBarProps): JSX.Element {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  
  // Get terminal theme context
  const { schemeId, setScheme, availableSchemes } = useTerminalTheme();
  
  // Get sound effects context - Requirements: 14.6, 14.7
  const { enabled: soundEnabled, toggleEnabled: toggleSound } = useSoundEffects();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle panel button click
  const handlePanelClick = useCallback((panel: StatusBarPanel) => {
    if (onPanelChange) {
      // Toggle panel if clicking the same one
      onPanelChange(activePanel === panel ? null : panel);
    }
  }, [activePanel, onPanelChange]);

  // Handle theme selection
  const handleThemeSelect = useCallback((themeId: string) => {
    setScheme(themeId);
    setShowThemeMenu(false);
  }, [setScheme]);

  // Close theme menu when clicking outside
  useEffect(() => {
    if (!showThemeMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.theme-menu-container')) {
        setShowThemeMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showThemeMenu]);

  const connectionDisplay = getConnectionDisplay(connectionStatus);

  return (
    <div
      className={`status-bar ${className}`}
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: '0 0.75rem',
        backgroundColor: 'var(--terminal-bg)',
        borderBottom: '1px solid var(--terminal-accent)',
        fontFamily: "'Share Tech Mono', 'Courier New', monospace",
        gap: '0.5rem',
      }}
    >
      {/* Left Section: Navigation Buttons - Requirements: 3.1, 3.4, 3.5 */}
      <div
        className="status-bar-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <TerminalButton
          onClick={() => handlePanelClick('search')}
          active={activePanel === 'search'}
          size="sm"
          data-testid="status-bar-search"
        >
          [SEARCH]
        </TerminalButton>

        <TerminalButton
          onClick={() => handlePanelClick('vessels')}
          active={activePanel === 'vessels'}
          size="sm"
          data-testid="status-bar-vessels"
        >
          [VESSELS]
        </TerminalButton>

        <TerminalButton
          onClick={() => handlePanelClick('tracking')}
          active={activePanel === 'tracking'}
          size="sm"
          badge={trackedVesselCount > 0 ? trackedVesselCount : undefined}
          data-testid="status-bar-tracking"
        >
          [TRACK]
        </TerminalButton>

        <TerminalButton
          onClick={() => handlePanelClick('weather')}
          active={activePanel === 'weather'}
          size="sm"
          data-testid="status-bar-weather"
        >
          [WEATHER]
        </TerminalButton>

        <TerminalButton
          onClick={() => handlePanelClick('coverage')}
          active={activePanel === 'coverage'}
          size="sm"
          data-testid="status-bar-coverage"
        >
          [COVERAGE]
        </TerminalButton>
      </div>

      {/* Center Section: System Title */}
      <div
        className="status-bar-title"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--terminal-accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}
      >
        <span style={{ color: 'var(--terminal-dim)' }}>{'<'}</span>
        <span>AISIGHT</span>
        <span style={{ color: 'var(--terminal-dim)' }}>{'>'}</span>
      </div>

      {/* Right Section: Status Indicators - Requirements: 3.2, 3.3 */}
      <div
        className="status-bar-status"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* Connection Status */}
        <div
          className="status-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.7rem',
          }}
        >
          <span style={{ color: 'var(--terminal-dim)' }}>[NET]:</span>
          <span className={connectionDisplay.colorClass}>
            {connectionDisplay.text}
          </span>
        </div>

        {/* Vessel Count */}
        <div
          className="status-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.7rem',
          }}
        >
          <span style={{ color: 'var(--terminal-dim)' }}>[VSL]:</span>
          <span style={{ color: 'var(--terminal-fg)' }}>
            {vesselCount.toString().padStart(4, '0')}
          </span>
        </div>

        {/* Current Time */}
        <div
          className="status-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.7rem',
          }}
        >
          <span style={{ color: 'var(--terminal-dim)' }}>[UTC]:</span>
          <span style={{ color: 'var(--terminal-fg)' }}>
            {formatTime(currentTime)}
          </span>
        </div>

        {/* Sound Toggle - Requirements: 14.6, 14.7 */}
        <TerminalButton
          onClick={toggleSound}
          active={soundEnabled}
          size="sm"
          data-testid="status-bar-sound"
        >
          {soundEnabled ? '[SND:ON]' : '[SND:OFF]'}
        </TerminalButton>

        {/* Fullscreen Toggle */}
        {onFullscreenToggle && (
          <TerminalButton
            onClick={onFullscreenToggle}
            active={isFullscreen}
            size="sm"
            data-testid="status-bar-fullscreen"
          >
            {isFullscreen ? '[EXIT FS]' : '[FULLSCREEN]'}
          </TerminalButton>
        )}

        {/* Theme Switcher - Requirements: 3.3 */}
        <div className="theme-menu-container" style={{ position: 'relative' }}>
          <TerminalButton
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            active={showThemeMenu}
            size="sm"
            data-testid="status-bar-theme"
          >
            [THEME]
          </TerminalButton>

          {/* Theme Selection Menu */}
          {showThemeMenu && (
            <div
              className="theme-menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.25rem',
                backgroundColor: 'var(--terminal-bg)',
                border: '1px solid var(--terminal-accent)',
                padding: '0.25rem',
                zIndex: 1000,
                minWidth: '150px',
              }}
            >
              {availableSchemes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => handleThemeSelect(themeOption.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.375rem 0.5rem',
                    backgroundColor: schemeId === themeOption.id 
                      ? 'var(--terminal-dim)' 
                      : 'transparent',
                    border: 'none',
                    color: 'var(--terminal-fg)',
                    fontFamily: "'Share Tech Mono', 'Courier New', monospace",
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (schemeId !== themeOption.id) {
                      e.currentTarget.style.backgroundColor = 'var(--terminal-dim)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (schemeId !== themeOption.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: themeOption.phosphorGlow,
                      border: '1px solid var(--terminal-dim)',
                    }}
                  />
                  <span>{themeOption.name}</span>
                  {schemeId === themeOption.id && (
                    <span style={{ marginLeft: 'auto', color: 'var(--terminal-accent)' }}>*</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatusBar;
